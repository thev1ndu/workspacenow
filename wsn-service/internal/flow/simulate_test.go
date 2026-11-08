package flow

import "testing"

func TestWalkDefinitionLinearAndApproval(t *testing.T) {
	steps := []Step{
		{ID: "s1", Name: "Record sale", Kind: "operation", BusinessOperation: "Sale.record", Next: to("s2")},
		{ID: "s2", Name: "Manager approval", Kind: "approval", Permission: "procurement.approve", Next: to("s3")},
		{ID: "s3", Name: "Create PO", Kind: "operation", BusinessOperation: "PurchaseOrder.create"},
	}
	sim := walkDefinition("low stock", steps, nil, nil)
	if len(sim.Steps) != 3 {
		t.Fatalf("steps: %+v", sim.Steps)
	}
	if sim.Steps[0].Outcome != "would-run" || sim.Steps[1].Outcome != "would-wait-approval" || sim.Steps[2].Outcome != "would-run" {
		t.Fatalf("outcomes: %+v", sim.Steps)
	}
	if sim.Summary == "" || sim.TraceID == "" {
		t.Fatalf("summary/trace: %+v", sim)
	}
}

func TestWalkDefinitionConditionBranches(t *testing.T) {
	steps := []Step{
		{ID: "c", Name: "Big enough?", Kind: "condition", Field: "amount", Operator: "gte", Value: "1000", Then: to("notify"), Otherwise: to("log")},
		{ID: "notify", Name: "Notify", Kind: "notify", Channel: "email"},
		{ID: "log", Name: "Log", Kind: "notify", Channel: "log"},
	}
	sim := walkDefinition("w", steps, nil, map[string]any{"amount": 5000})
	if sim.Steps[0].Outcome != "condition-true" || sim.Steps[1].Name != "Notify" || len(sim.Steps) != 2 {
		t.Fatalf("true branch: %+v", sim.Steps)
	}
	sim = walkDefinition("w", steps, nil, map[string]any{"amount": 5})
	if sim.Steps[0].Outcome != "condition-false" || sim.Steps[1].Name != "Log" {
		t.Fatalf("false branch: %+v", sim.Steps)
	}
}

func TestWalkDefinitionLoopGuard(t *testing.T) {
	steps := []Step{{ID: "a", Name: "loop", Kind: "wait", Minutes: 1, Next: to("a")}}
	sim := walkDefinition("w", steps, nil, nil)
	if len(sim.Steps) != 1 {
		t.Fatalf("loop must stop after one visit: %+v", sim.Steps)
	}
}
