package flow

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

const (
	WorkflowName   = "ExecutionWorkflow"
	SignalDecision = "approval-decided"
)

// ExecutionInput starts one run; an empty ExecutionID means a schedule started it.
type ExecutionInput struct {
	ExecutionID string         `json:"executionId"`
	TraceID     string         `json:"traceId"`
	Workflow    Workflow       `json:"workflow"`
	Context     map[string]any `json:"context"`
}

// Decision is the approval-decided signal.
type Decision struct {
	ApprovalID string `json:"approvalId"`
	Approved   bool   `json:"approved"`
	DecidedBy  string `json:"decidedBy"`
	Comment    string `json:"comment"`
}

// StepResult is what a step activity hands back to the workflow.
type StepResult struct {
	Detail  string         `json:"detail"`
	Context map[string]any `json:"context"`
	Failed  bool           `json:"failed"`
}

// ExecutionWorkflow walks the step graph deterministically; all side effects happen in activities.
func ExecutionWorkflow(ctx workflow.Context, in ExecutionInput) error {
	ctx = workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: 3 * time.Minute,
		RetryPolicy:         &temporal.RetryPolicy{MaximumAttempts: 5, InitialInterval: time.Second, BackoffCoefficient: 2},
	})
	var a *Activities
	if in.ExecutionID == "" {
		in.ExecutionID = workflow.GetInfo(ctx).WorkflowExecution.ID
	}
	if err := workflow.ExecuteActivity(ctx, a.Begin, in).Get(ctx, &in); err != nil {
		return err
	}
	runCtx := in.Context
	steps := in.Workflow.Steps
	decisions := workflow.GetSignalChannel(ctx, SignalDecision)

	current := startStep(steps, in.Workflow.Start)
	for guard := 0; current != "" && guard <= len(steps); guard++ {
		step, ok := stepByID(steps, current)
		if !ok {
			return finish(ctx, in, "failed", "Step "+current+" no longer exists")
		}
		if err := workflow.ExecuteActivity(ctx, a.StepStarted, in.ExecutionID, step.ID).Get(ctx, nil); err != nil {
			return err
		}
		next := nextStep(steps, step)
		var res StepResult
		var err error
		switch step.Kind {
		case "operation":
			err = workflow.ExecuteActivity(ctx, a.Operation, in, step, runCtx).Get(ctx, &res)
		case "agent":
			err = workflow.ExecuteActivity(ctx, a.Agent, in, step, runCtx).Get(ctx, &res)
		case "notify":
			err = workflow.ExecuteActivity(ctx, a.Notify, in, step, runCtx).Get(ctx, &res)
		case "condition":
			next, res.Detail = step.Otherwise.To, "Condition did not hold"
			if conditionHolds(readPath(runCtx, step.Field), step.Operator, step.Value) {
				next, res.Detail = step.Then.To, "Condition held"
			}
		case "wait":
			if err = workflow.Sleep(ctx, time.Duration(step.Minutes*float64(time.Minute))); err == nil {
				res.Detail = fmt.Sprintf("Waited %g min", step.Minutes)
			}
		case "approval":
			var approvalID string
			if err = workflow.ExecuteActivity(ctx, a.RequestApproval, in, step, runCtx).Get(ctx, &approvalID); err != nil {
				break
			}
			var d Decision
			for d.ApprovalID != approvalID {
				decisions.Receive(ctx, &d)
			}
			verdict := "Approved"
			runCtx["approval"] = "approved"
			if !d.Approved {
				verdict, next = "Rejected", step.OnReject.To
				runCtx["approval"] = "rejected"
			}
			res.Detail = verdict + " by " + d.DecidedBy
			if d.Comment != "" {
				res.Detail += ": " + d.Comment
			}
		default:
			res = StepResult{Failed: true, Detail: "Unknown step kind " + step.Kind}
		}
		if err != nil {
			res = StepResult{Failed: true, Detail: failure(err)}
		}
		for k, v := range res.Context {
			runCtx[k] = v
		}
		status := "completed"
		if res.Failed {
			status = "failed"
		}
		if err := workflow.ExecuteActivity(ctx, a.StepEnded, in.ExecutionID, step.ID, status, res.Detail, runCtx).Get(ctx, nil); err != nil {
			return err
		}
		if res.Failed {
			return finish(ctx, in, "failed", step.Name+": "+res.Detail)
		}
		current = next
	}
	return finish(ctx, in, "completed", "")
}

func finish(ctx workflow.Context, in ExecutionInput, status, detail string) error {
	var a *Activities
	return workflow.ExecuteActivity(ctx, a.Finish, in, status, detail).Get(ctx, nil)
}

// failure turns an activity error into the message the console shows on the step.
func failure(err error) string {
	var app *temporal.ApplicationError
	if errors.As(err, &app) {
		return app.Message()
	}
	return err.Error()
}

// AgentRunner runs an agent step under the workflow's service identity; wsn-ai-service implements it.
type AgentRunner interface {
	RunForWorkflow(ctx context.Context, req AgentStepRequest) (*AgentStepResult, error)
}

type AgentStepRequest struct {
	AgentID      string
	Prompt       string
	Context      map[string]any
	TraceID      string
	WorkflowID   string
	WorkflowName string
}

type AgentStepResult struct {
	RunID   string
	Failed  bool
	Answer  string
	Created []Subject
}

// Activities are the workflow's side effects; each one is safe to retry.
type Activities struct {
	db         *gorm.DB
	engine     kernel.Engine
	auditor    kernel.Auditor
	events     kernel.Publisher
	rt         data.Runtime
	agents     AgentRunner
	executions *docstore.Collection[Execution]
	approvals  *docstore.Collection[Approval]
}

func NewActivities(db *gorm.DB, engine kernel.Engine, auditor kernel.Auditor, events kernel.Publisher, rt data.Runtime, agents AgentRunner) *Activities {
	return &Activities{
		db: db, engine: engine, auditor: auditor, events: events, rt: rt, agents: agents,
		executions: docstore.NewCollection(db, "executions", func(e *Execution) string { return e.ID }),
		approvals:  docstore.NewCollection(db, "approvals", func(a *Approval) string { return a.ID }),
	}
}

// identity is the workflow's own service identity; it never borrows a caller's permissions.
func identity(in ExecutionInput) kernel.ExecutionContext {
	return kernel.ExecutionContext{
		Actor:       kernel.Actor{Kind: kernel.ActorWorkflow, ID: in.Workflow.ID, Name: in.Workflow.Name},
		Permissions: kernel.NewPermissions(in.Workflow.Permissions...),
		TraceID:     in.TraceID,
		EntryPoint:  kernel.EntryWorkflow,
	}
}

// Begin records the execution if a schedule started it, and audits the start once.
func (a *Activities) Begin(ctx context.Context, in ExecutionInput) (ExecutionInput, error) {
	if in.TraceID == "" {
		in.TraceID = kernel.NewTraceID()
	}
	if in.Context == nil {
		in.Context = map[string]any{"triggeredBy": "schedule"}
	}
	err := postgres.InTx(ctx, a.db, func(ctx context.Context) error {
		if _, err := a.executions.Get(ctx, in.ExecutionID); err == nil {
			return nil
		} else if !errors.Is(err, docstore.ErrNotFound) {
			return err
		}
		if err := a.executions.Put(ctx, newExecution(in)); err != nil {
			return err
		}
		return a.auditor.Record(ctx, identity(in), "workflow.start", "workflow/"+in.Workflow.ID, kernel.OutcomeAllowed, fmt.Sprint("Triggered by ", in.Context["triggeredBy"]))
	})
	return in, err
}

func newExecution(in ExecutionInput) *Execution {
	steps := make([]ExecutionStep, 0, len(in.Workflow.Steps))
	for _, s := range in.Workflow.Steps {
		steps = append(steps, ExecutionStep{StepID: s.ID, Status: "pending"})
	}
	return &Execution{ID: in.ExecutionID, WorkflowID: in.Workflow.ID, TraceID: in.TraceID, Status: "running", Context: in.Context, Steps: steps, StartedAt: time.Now().UTC()}
}

// update changes the execution projection and announces it, so the console refreshes live.
func (a *Activities) update(ctx context.Context, id string, change func(*Execution)) error {
	return postgres.InTx(ctx, a.db, func(ctx context.Context) error {
		e, err := a.executions.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		change(e)
		if err := a.executions.Put(ctx, e); err != nil {
			return err
		}
		system := kernel.ExecutionContext{Actor: kernel.Actor{Kind: kernel.ActorSystem, ID: "flow", Name: "Flow"}, TraceID: e.TraceID}
		_, err = a.events.Publish(ctx, system, "Execution.Updated", "workflow:"+e.WorkflowID, map[string]any{"executionId": e.ID, "status": e.Status})
		return err
	})
}

func (a *Activities) StepStarted(ctx context.Context, executionID, stepID string) error {
	now := time.Now().UTC()
	return a.update(ctx, executionID, func(e *Execution) {
		for i := range e.Steps {
			if e.Steps[i].StepID == stepID {
				e.Steps[i] = ExecutionStep{StepID: stepID, Status: "running", StartedAt: &now}
			}
		}
		e.Status = "running"
	})
}

func (a *Activities) StepEnded(ctx context.Context, executionID, stepID, status, detail string, runCtx map[string]any) error {
	now := time.Now().UTC()
	return a.update(ctx, executionID, func(e *Execution) {
		for i := range e.Steps {
			if e.Steps[i].StepID == stepID {
				e.Steps[i].Status, e.Steps[i].EndedAt, e.Steps[i].Detail = status, &now, detail
			}
		}
		e.Status, e.Context = "running", runCtx
	})
}

func (a *Activities) Finish(ctx context.Context, in ExecutionInput, status, detail string) error {
	now := time.Now().UTC()
	err := a.update(ctx, in.ExecutionID, func(e *Execution) {
		for i := range e.Steps {
			if e.Steps[i].Status == "pending" {
				e.Steps[i].Status = "skipped"
			}
		}
		e.Status, e.EndedAt = status, &now
	})
	if err != nil {
		return err
	}
	outcome, action := kernel.OutcomeAllowed, "workflow.complete"
	if status == "failed" {
		outcome, action = kernel.OutcomeFailed, "workflow.fail"
	}
	return a.auditor.RecordDetached(ctx, identity(in), action, "workflow/"+in.Workflow.ID, outcome, detail)
}

// Operation runs a business operation with the run's context as its input.
func (a *Activities) Operation(ctx context.Context, in ExecutionInput, step Step, runCtx map[string]any) (StepResult, error) {
	out, err := a.engine.Invoke(ctx, identity(in), step.BusinessOperation, runCtx)
	if err != nil {
		if _, ok := kernel.AsError(err); ok {
			return StepResult{Failed: true, Detail: err.Error()}, nil
		}
		return StepResult{}, err
	}
	res := StepResult{Detail: "Done", Context: map[string]any{}}
	if rec, ok := out.(*data.Record); ok {
		_, verb, _ := strings.Cut(step.BusinessOperation, ".")
		res.Context[verb+"Id"] = rec.ID
		res.Context["subject"] = map[string]any{"entity": rec.Entity, "recordId": rec.ID}
		for k, v := range rec.Values {
			if _, taken := runCtx[k]; !taken {
				res.Context[k] = v
			}
		}
		res.Detail = "Created " + rec.ID
		if n, ok := rec.Values["orderNumber"].(string); ok {
			res.Detail = "Created " + n
		}
	}
	return res, nil
}

// Agent runs an agent with the rendered prompt; the records it creates become the run's subject.
func (a *Activities) Agent(ctx context.Context, in ExecutionInput, step Step, runCtx map[string]any) (StepResult, error) {
	result, err := a.agents.RunForWorkflow(ctx, AgentStepRequest{
		AgentID: step.AgentID, Prompt: render(step.Prompt, runCtx), Context: runCtx, TraceID: in.TraceID, WorkflowID: in.Workflow.ID, WorkflowName: in.Workflow.Name,
	})
	if err != nil {
		return StepResult{}, temporal.NewApplicationError(err.Error(), "agent")
	}
	res := StepResult{Detail: result.Answer, Failed: result.Failed, Context: map[string]any{"agentRunId": result.RunID}}
	created := make([]any, 0, len(result.Created))
	for _, c := range result.Created {
		created = append(created, map[string]any{"entity": c.Entity, "recordId": c.RecordID})
		res.Context[lowerFirst(c.Entity)+"Id"] = c.RecordID
	}
	if n := len(result.Created); n > 0 {
		last := result.Created[n-1]
		res.Context["subject"] = map[string]any{"entity": last.Entity, "recordId": last.RecordID}
	}
	res.Context["created"] = created
	return res, nil
}

// RequestApproval records an approval for the run's subject; the workflow then waits for the decision.
func (a *Activities) RequestApproval(ctx context.Context, in ExecutionInput, step Step, runCtx map[string]any) (string, error) {
	id := "appr-" + in.ExecutionID + "-" + step.ID
	if existing, err := a.approvals.Get(ctx, id); err == nil {
		return existing.ID, nil
	}
	approval := &Approval{
		ID: id, ExecutionID: in.ExecutionID, WorkflowID: in.Workflow.ID, StepID: step.ID, TraceID: in.TraceID, Title: step.Name,
		Summary: render(step.Description, runCtx), Permission: step.Permission, Status: "pending", RequestedAt: time.Now().UTC(),
	}
	if v, ok := in.Context["triggeredById"].(string); ok {
		approval.RequestedBy = v
	}
	if v, ok := in.Context["triggeredByName"].(string); ok {
		approval.RequestedByName = v
	} else if approval.RequestedBy != "" {
		approval.RequestedByName, _ = in.Context["triggeredBy"].(string)
	}
	if s, ok := runCtx["subject"].(map[string]any); ok {
		approval.Subject = &Subject{Entity: fmt.Sprint(s["entity"]), RecordID: fmt.Sprint(s["recordId"]), ApplicationID: in.Workflow.ApplicationID}
		approval.Summary = a.describe(ctx, approval.Subject, approval.Summary)
	}
	err := postgres.InTx(ctx, a.db, func(ctx context.Context) error {
		if err := a.approvals.Put(ctx, approval); err != nil {
			return err
		}
		err := a.update(ctx, in.ExecutionID, func(e *Execution) {
			e.Status = "waiting"
			for i := range e.Steps {
				if e.Steps[i].StepID == step.ID {
					e.Steps[i].Status = "waiting"
				}
			}
		})
		if err != nil {
			return err
		}
		if err := a.auditor.Record(ctx, identity(in), "approval.request", "approval/"+id, kernel.OutcomeAllowed, approval.Summary); err != nil {
			return err
		}
		_, err = a.events.Publish(ctx, identity(in), "Approval.Requested", "workflow:"+in.Workflow.ID, map[string]any{"approvalId": id})
		return err
	})
	return id, err
}

// describe adds the subject's own details to an approval summary, so approvers see what they decide on.
func (a *Activities) describe(ctx context.Context, s *Subject, summary string) string {
	rec, err := a.rt.Record(ctx, s.Entity, s.RecordID)
	if err != nil {
		return summary
	}
	var parts []string
	for _, key := range []string{"quantity", "store", "estimatedCost", "justification"} {
		if v, ok := rec.Values[key]; ok && v != nil && v != "" {
			parts = append(parts, fmt.Sprintf("%s: %v", key, v))
		}
	}
	if len(parts) == 0 {
		return summary
	}
	return strings.TrimSpace(summary + " " + strings.Join(parts, ", "))
}

func (a *Activities) Notify(ctx context.Context, in ExecutionInput, step Step, runCtx map[string]any) (StepResult, error) {
	message := render(step.Message, runCtx)
	err := postgres.InTx(ctx, a.db, func(ctx context.Context) error {
		if _, err := a.events.Publish(ctx, identity(in), "Notification.Sent", "workflow:"+in.Workflow.ID, map[string]any{"channel": step.Channel, "message": message}); err != nil {
			return err
		}
		return a.auditor.Record(ctx, identity(in), "notify", step.Channel, kernel.OutcomeAllowed, message)
	})
	return StepResult{Detail: "Sent to " + step.Channel}, err
}

func lowerFirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToLower(s[:1]) + s[1:]
}
