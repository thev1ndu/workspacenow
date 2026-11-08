package flow

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"go.temporal.io/api/enums/v1"
	"go.temporal.io/sdk/client"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Service manages workflows and starts, steers and reports their executions.
type Service interface {
	Workflows(ctx context.Context) ([]Workflow, error)
	Workflow(ctx context.Context, id string) (*Workflow, error)
	Save(ctx context.Context, ec kernel.ExecutionContext, id string, def Definition) (*Workflow, error)
	SetStatus(ctx context.Context, ec kernel.ExecutionContext, id, status string) (*Workflow, error)
	Start(ctx context.Context, caller *kernel.Caller, id string, input map[string]any) (*Execution, error)
	// StartForEvent starts every active workflow the event triggers; the event id keeps redelivery harmless.
	StartForEvent(ctx context.Context, e kernel.Event) error
	Executions(ctx context.Context, workflowID string) ([]Execution, error)
	Execution(ctx context.Context, id string) (*Execution, error)
	Approvals(ctx context.Context, status, applicationID string, limit, offset int) ([]Approval, int, error)
	Decide(ctx context.Context, caller *kernel.Caller, id string, approved bool, comment string) (*Approval, error)
	// Simulate dry-runs a workflow against a sample event, without side effects.
	Simulate(ctx context.Context, ec kernel.ExecutionContext, workflowID string, event map[string]any) (*Simulation, error)
}

type role struct {
	Permissions []string `json:"permissions"`
}

type agentRef struct {
	ID string `json:"id"`
}

type service struct {
	db         *gorm.DB
	engine     kernel.Engine
	auditor    kernel.Auditor
	temporal   client.Client
	taskQueue  string
	workflows  *docstore.Collection[Workflow]
	executions *docstore.Collection[Execution]
	approvals  *docstore.Collection[Approval]
	roles      *docstore.Collection[role]
	agents     *docstore.Collection[agentRef]
}

func NewService(db *gorm.DB, engine kernel.Engine, auditor kernel.Auditor, tc client.Client, taskQueue string) Service {
	return &service{
		db: db, engine: engine, auditor: auditor, temporal: tc, taskQueue: taskQueue,
		workflows:  docstore.NewCollection(db, "workflows", func(w *Workflow) string { return w.ID }),
		executions: docstore.NewCollection(db, "executions", func(e *Execution) string { return e.ID }),
		approvals:  docstore.NewCollection(db, "approvals", func(a *Approval) string { return a.ID }),
		roles:      docstore.NewCollection(db, "roles", func(*role) string { return "" }),
		agents:     docstore.NewCollection(db, "agents", func(a *agentRef) string { return a.ID }),
	}
}

func (s *service) Workflows(ctx context.Context) ([]Workflow, error) { return s.workflows.List(ctx) }

func (s *service) Workflow(ctx context.Context, id string) (*Workflow, error) {
	w, err := s.workflows.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Workflow %s not found", id)
	}
	return w, err
}

func (s *service) references(ctx context.Context) (References, error) {
	var refs References
	agents, err := s.agents.List(ctx)
	if err != nil {
		return refs, err
	}
	for _, a := range agents {
		refs.AgentIDs = append(refs.AgentIDs, a.ID)
	}
	ops, err := s.engine.List(ctx)
	if err != nil {
		return refs, err
	}
	for _, op := range ops {
		refs.BusinessOperations = append(refs.BusinessOperations, op.Name)
	}
	roles, err := s.roles.List(ctx)
	if err != nil {
		return refs, err
	}
	for _, r := range roles {
		for _, p := range r.Permissions {
			if !slices.Contains(refs.Permissions, p) {
				refs.Permissions = append(refs.Permissions, p)
			}
		}
	}
	return refs, nil
}

// Save creates a workflow (paused until someone resumes it) or stores a new version of one.
func (s *service) Save(ctx context.Context, ec kernel.ExecutionContext, id string, def Definition) (*Workflow, error) {
	var existing *Workflow
	if id != "" {
		var err error
		if existing, err = s.Workflow(ctx, id); err != nil {
			return nil, err
		}
	}
	action, resource := "workflow.create", "workflow"
	if existing != nil {
		action, resource = "workflow.update", "workflow/"+existing.ID
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "flow.manage", action, resource); err != nil {
		return nil, err
	}
	refs, err := s.references(ctx)
	if err != nil {
		return nil, err
	}
	if problems := validateWorkflow(def, refs); len(problems) > 0 {
		return nil, kernel.Problems(problems).WithTrace(ec.TraceID)
	}
	// A workflow acts with exactly what its operation steps need, and no author may grant more than they hold.
	var needed []string
	for _, step := range def.Steps {
		if step.Kind != "operation" {
			continue
		}
		op, err := s.engine.Lookup(ctx, step.BusinessOperation)
		if err != nil {
			return nil, err
		}
		if op != nil && !slices.Contains(needed, op.Permission) {
			needed = append(needed, op.Permission)
		}
	}
	var granted []string
	for _, p := range needed {
		held := existing != nil && slices.Contains(existing.Permissions, p)
		if !held && !ec.Permissions.Has(p) {
			granted = append(granted, p)
		}
	}
	if len(granted) > 0 {
		if err := s.auditor.RecordDetached(ctx, ec, action, resource, kernel.OutcomeDenied, fmt.Sprintf("Would grant %v", granted)); err != nil {
			return nil, err
		}
		return nil, kernel.Forbidden("You cannot give a workflow permissions you do not hold: %v", granted).WithTrace(ec.TraceID)
	}
	if needed == nil {
		needed = []string{}
	}
	w := existing
	if w == nil {
		w = &Workflow{ID: kernel.NewID("wf"), Version: 0, Status: "paused"}
	}
	w.Definition, w.Permissions = def, needed
	w.Version++
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.workflows.Put(ctx, w); err != nil {
			return err
		}
		return s.auditor.Record(ctx, ec, action, "workflow/"+w.ID, kernel.OutcomeAllowed, fmt.Sprintf("Version %d", w.Version))
	})
	if err != nil {
		return nil, err
	}
	return w, s.syncSchedule(ctx, w)
}

func (s *service) SetStatus(ctx context.Context, ec kernel.ExecutionContext, id, status string) (*Workflow, error) {
	w, err := s.Workflow(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "flow.manage", "workflow.update", "workflow/"+w.ID); err != nil {
		return nil, err
	}
	if status == "active" || status == "paused" {
		w.Status = status
	}
	w.Version++
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.workflows.Put(ctx, w); err != nil {
			return err
		}
		return s.auditor.Record(ctx, ec, "workflow.update", "workflow/"+w.ID, kernel.OutcomeAllowed, "Status "+w.Status)
	})
	if err != nil {
		return nil, err
	}
	return w, s.syncSchedule(ctx, w)
}

// syncSchedule keeps the Temporal schedule of a scheduled workflow in step with its definition and status.
func (s *service) syncSchedule(ctx context.Context, w *Workflow) error {
	id := "schedule-" + w.ID
	_ = s.temporal.ScheduleClient().GetHandle(ctx, id).Delete(ctx)
	if w.Trigger.Kind != "schedule" || w.Status != "active" {
		return nil
	}
	_, err := s.temporal.ScheduleClient().Create(ctx, client.ScheduleOptions{
		ID:   id,
		Spec: client.ScheduleSpec{CronExpressions: []string{w.Trigger.Cron}},
		Action: &client.ScheduleWorkflowAction{
			ID: "exec-" + w.ID + "-scheduled", Workflow: WorkflowName, TaskQueue: s.taskQueue,
			Args: []any{ExecutionInput{Workflow: *w, Context: map[string]any{"triggeredBy": "schedule"}}},
		},
	})
	if err != nil {
		return fmt.Errorf("schedule %s: %w", w.ID, err)
	}
	return nil
}

func (s *service) Start(ctx context.Context, caller *kernel.Caller, id string, input map[string]any) (*Execution, error) {
	if s.temporal == nil {
		return nil, kernel.InvalidState("Workflow engine is not connected")
	}
	w, err := s.Workflow(ctx, id)
	if err != nil {
		return nil, err
	}
	ec := caller.ContextFrom(ctx, kernel.EntryWorkflow, "")
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "flow.manage", "workflow.run", "workflow/"+w.ID); err != nil {
		return nil, err
	}
	if w.Status != "active" {
		return nil, kernel.InvalidState("%s is %s", w.Name, w.Status)
	}
	runCtx := map[string]any{}
	for k, v := range input {
		runCtx[k] = v
	}
	runCtx["triggeredBy"] = caller.Name
	return s.launch(ctx, ExecutionInput{ExecutionID: kernel.NewID("exec"), TraceID: ec.TraceID, Workflow: *w, Context: runCtx})
}

func (s *service) StartForEvent(ctx context.Context, e kernel.Event) error {
	if s.temporal == nil {
		return kernel.InvalidState("Workflow engine is not connected")
	}
	active, err := s.workflows.Where(ctx, "doc->>'status' = 'active' AND doc->'trigger'->>'kind' = 'entity-event' AND doc->'trigger'->>'event' = ?", e.Type)
	if err != nil {
		return err
	}
	for _, w := range active {
		runCtx := map[string]any{"triggeredBy": e.Type}
		for k, v := range e.Payload {
			runCtx[k] = v
		}
		if _, err := s.launch(ctx, ExecutionInput{ExecutionID: "exec-" + w.ID + "-" + e.ID, TraceID: e.TraceID, Workflow: w, Context: runCtx}); err != nil {
			return err
		}
	}
	return nil
}

// launch records the execution, then hands it to Temporal; a duplicate start is a no-op.
func (s *service) launch(ctx context.Context, in ExecutionInput) (*Execution, error) {
	exec := newExecution(in)
	if existing, err := s.executions.Get(ctx, in.ExecutionID); err == nil {
		return existing, nil
	}
	if err := s.executions.Put(ctx, exec); err != nil {
		return nil, err
	}
	_, err := s.temporal.ExecuteWorkflow(ctx, client.StartWorkflowOptions{
		ID: in.ExecutionID, TaskQueue: s.taskQueue, WorkflowIDReusePolicy: enums.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
	}, WorkflowName, in)
	if err != nil {
		var started interface{ Error() string }
		if errors.As(err, &started) && isAlreadyStarted(err) {
			return exec, nil
		}
		return nil, fmt.Errorf("start execution: %w", err)
	}
	return exec, nil
}

func (s *service) Executions(ctx context.Context, workflowID string) ([]Execution, error) {
	var out []Execution
	var err error
	if workflowID == "" {
		out, err = s.executions.List(ctx)
	} else {
		out, err = s.executions.Where(ctx, "doc->>'workflowId' = ?", workflowID)
	}
	slices.SortFunc(out, func(a, b Execution) int { return b.StartedAt.Compare(a.StartedAt) })
	return out, err
}

func (s *service) Execution(ctx context.Context, id string) (*Execution, error) {
	e, err := s.executions.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Execution %s not found", id)
	}
	return e, err
}

func (s *service) Approvals(ctx context.Context, status, applicationID string, limit, offset int) ([]Approval, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	cond, args := "", []any{}
	if status != "" {
		cond = "doc->>'status' = ?"
		args = append(args, status)
	}
	if applicationID != "" {
		c := "doc->'subject'->>'applicationId' = ?"
		if cond != "" {
			cond += " AND " + c
		} else {
			cond = c
		}
		args = append(args, applicationID)
	}
	docs, total, err := s.approvals.Page(ctx, cond, limit, offset, args...)
	if err != nil {
		return nil, 0, err
	}
	return docs, int(total), nil
}

// Decide records a person's decision, acts on its subject as that person, and resumes the execution.
func (s *service) Decide(ctx context.Context, caller *kernel.Caller, id string, approved bool, comment string) (*Approval, error) {
	approval, err := s.approvals.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Approval %s not found", id)
	}
	if err != nil {
		return nil, err
	}
	ec := caller.ContextFrom(ctx, kernel.EntryStudio, approval.TraceID)
	if approval.Status != "pending" {
		return nil, kernel.InvalidState("Approval is already %s", approval.Status).WithTrace(ec.TraceID)
	}
	verb := "reject"
	if approved {
		verb = "approve"
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, approval.Permission, "approval."+verb, "approval/"+approval.ID); err != nil {
		return nil, err
	}
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if approval.Subject != nil && approval.Subject.Entity == "PurchaseRequest" {
			op := "procurement.rejectPurchaseRequest"
			if approved {
				op = "procurement.approvePurchaseRequest"
			}
			if _, err := s.engine.Invoke(ctx, ec, op, map[string]any{"purchaseRequestId": approval.Subject.RecordID}); err != nil {
				return err
			}
		}
		now := time.Now().UTC()
		approval.Status, approval.DecidedAt, approval.DecidedBy, approval.Comment = map[bool]string{true: "approved", false: "rejected"}[approved], &now, caller.Name, comment
		return s.approvals.Put(ctx, approval)
	})
	if err != nil {
		return nil, err
	}
	err = s.temporal.SignalWorkflow(ctx, approval.ExecutionID, "", SignalDecision, Decision{ApprovalID: approval.ID, Approved: approved, DecidedBy: caller.Name, Comment: comment})
	if err != nil {
		return nil, fmt.Errorf("resume execution: %w", err)
	}
	return approval, nil
}
