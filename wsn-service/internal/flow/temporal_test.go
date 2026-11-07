package flow

import (
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.temporal.io/sdk/testsuite"
)

func strptr(s string) *string { return &s }

func opStep(id, next, op string) Step {
	return Step{ID: id, Kind: "operation", Name: id, BusinessOperation: op, Next: to(next)}
}

// happyPath runs operation → notify → end and asserts the activities ran in order.
func TestExecutionWorkflowHappyPath(t *testing.T) {
	env := (&testsuite.WorkflowTestSuite{}).NewTestWorkflowEnvironment()
	acts := &Activities{}

	in := ExecutionInput{TraceID: "trace-1", Context: map[string]any{}, Workflow: Workflow{
		ID: "wf-1",
		Definition: Definition{
			Name:  "test",
			Start: strptr("s1"),
			Steps: []Step{
				opStep("s1", "s2", "inventory.recordSale"),
				{ID: "s2", Kind: "notify", Name: "notify", Next: Link{}},
			},
		},
	}}

	var order []string
	env.OnActivity(acts.Begin, mock.Anything, mock.Anything).Return(in, nil)
	env.OnActivity(acts.StepStarted, mock.Anything, mock.Anything, mock.Anything).Run(func(mock.Arguments) { order = append(order, "start") }).Return(nil)
	env.OnActivity(acts.Operation, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(mock.Arguments) { order = append(order, "operation") }).
		Return(StepResult{Detail: "sold", Context: map[string]any{"receipt": "KDY-T0001"}}, nil)
	env.OnActivity(acts.Notify, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(mock.Arguments) { order = append(order, "notify") }).
		Return(StepResult{}, nil)
	env.OnActivity(acts.StepEnded, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	env.OnActivity(acts.Finish, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) { order = append(order, "finish:"+args.String(2)) }).
		Return(nil)

	env.ExecuteWorkflow(ExecutionWorkflow, in)
	require.True(t, env.IsWorkflowCompleted())
	require.NoError(t, env.GetWorkflowError())
	require.Equal(t, []string{"start", "operation", "start", "notify", "finish:completed"}, order)
}

// approvalApproved waits for the decision signal, takes the approved branch, and completes.
func TestExecutionWorkflowApprovalApproved(t *testing.T) {
	env := (&testsuite.WorkflowTestSuite{}).NewTestWorkflowEnvironment()
	acts := &Activities{}

	in := ExecutionInput{TraceID: "trace-2", Context: map[string]any{}, Workflow: Workflow{
		ID: "wf-2",
		Definition: Definition{
			Name:  "approve-flow",
			Start: strptr("s1"),
			Steps: []Step{
				{ID: "s1", Kind: "approval", Name: "approve", Permission: "procurement.approve", Next: to("s2"), OnReject: to("s3")},
				opStep("s2", "", "procurement.createPurchaseOrder"),
				{ID: "s3", Kind: "notify", Name: "rejected", Next: Link{}},
			},
		},
	}}

	env.OnActivity(acts.Begin, mock.Anything, mock.Anything).Return(in, nil)
	env.OnActivity(acts.StepStarted, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	env.OnActivity(acts.RequestApproval, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return("ap-1", nil)
	env.OnActivity(acts.Operation, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(StepResult{Detail: "ordered"}, nil)
	env.OnActivity(acts.Notify, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(StepResult{}, nil)
	env.OnActivity(acts.StepEnded, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	var finishStatus string
	env.OnActivity(acts.Finish, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) { finishStatus = args.String(2) }).
		Return(nil)

	// The approval decision arrives while the workflow waits on the signal channel.
	env.RegisterDelayedCallback(func() {
		env.SignalWorkflow(SignalDecision, Decision{ApprovalID: "ap-1", Approved: true, DecidedBy: "Ruwan", Comment: "go"})
	}, time.Minute)

	env.ExecuteWorkflow(ExecutionWorkflow, in)
	require.True(t, env.IsWorkflowCompleted())
	require.NoError(t, env.GetWorkflowError())
	require.Equal(t, "completed", finishStatus)
}

// approvalRejected takes OnReject and the workflow finishes failed.
func TestExecutionWorkflowApprovalRejected(t *testing.T) {
	env := (&testsuite.WorkflowTestSuite{}).NewTestWorkflowEnvironment()
	acts := &Activities{}

	in := ExecutionInput{TraceID: "trace-3", Context: map[string]any{}, Workflow: Workflow{
		ID: "wf-3",
		Definition: Definition{
			Name:  "reject-flow",
			Start: strptr("s1"),
			Steps: []Step{
				{ID: "s1", Kind: "approval", Name: "approve", Permission: "procurement.approve", Next: to("s2"), OnReject: to("s3")},
				opStep("s2", "", "procurement.createPurchaseOrder"),
				{ID: "s3", Kind: "notify", Name: "rejected", Next: Link{}},
			},
		},
	}}

	env.OnActivity(acts.Begin, mock.Anything, mock.Anything).Return(in, nil)
	env.OnActivity(acts.StepStarted, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	env.OnActivity(acts.RequestApproval, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return("ap-2", nil)
	var ran []string
	env.OnActivity(acts.Operation, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(mock.Arguments) { ran = append(ran, "operation") }).Return(StepResult{}, nil)
	env.OnActivity(acts.Notify, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(mock.Arguments) { ran = append(ran, "notify") }).Return(StepResult{}, nil)
	var ended []string
	env.OnActivity(acts.StepEnded, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) { ended = append(ended, args.String(2)+":"+args.String(4)) }).Return(nil)
	var finishStatus string
	env.OnActivity(acts.Finish, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) { finishStatus = args.String(2) }).
		Return(nil)

	env.RegisterDelayedCallback(func() {
		env.SignalWorkflow(SignalDecision, Decision{ApprovalID: "ap-2", Approved: false, DecidedBy: "Ruwan"})
	}, time.Minute)

	env.ExecuteWorkflow(ExecutionWorkflow, in)
	require.True(t, env.IsWorkflowCompleted())
	require.NoError(t, env.GetWorkflowError())
	require.Equal(t, []string{"notify"}, ran) // the purchase order step never ran
	require.Equal(t, "completed", finishStatus)
	require.Contains(t, ended, "s1:Rejected by Ruwan")
}

// conditionHolds drives the pure branch logic without any activity.
func TestExecutionWorkflowCondition(t *testing.T) {
	env := (&testsuite.WorkflowTestSuite{}).NewTestWorkflowEnvironment()
	acts := &Activities{}

	in := ExecutionInput{TraceID: "trace-4", Context: map[string]any{"total": 120.0}, Workflow: Workflow{
		ID: "wf-4",
		Definition: Definition{
			Name:  "cond",
			Start: strptr("c1"),
			Steps: []Step{
				{ID: "c1", Kind: "condition", Name: "big?", Field: "total", Operator: "gte", Value: "100", Then: to("big"), Otherwise: to("small")},
				{ID: "big", Kind: "notify", Name: "big", Next: Link{Set: true}},
				{ID: "small", Kind: "notify", Name: "small", Next: Link{Set: true}},
			},
		},
	}}

	env.OnActivity(acts.Begin, mock.Anything, mock.Anything).Return(in, nil)
	env.OnActivity(acts.StepStarted, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	var notified string
	env.OnActivity(acts.Notify, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) { notified = args.Get(2).(Step).ID }).
		Return(StepResult{}, nil)
	env.OnActivity(acts.StepEnded, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	env.OnActivity(acts.Finish, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	env.ExecuteWorkflow(ExecutionWorkflow, in)
	require.True(t, env.IsWorkflowCompleted())
	require.NoError(t, env.GetWorkflowError())
	require.Equal(t, "big", notified)
}
