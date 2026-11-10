package stream

import (
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

func TestEventFilter(t *testing.T) {
	read := map[string]string{"PurchaseRequest": "procurement.read"}
	clerk := &kernel.Caller{UserID: "u-clerk", Name: "Clerk", Permissions: kernel.NewPermissions("inventory.read")}
	buyer := &kernel.Caller{UserID: "u-buyer", Name: "Buyer", Permissions: kernel.NewPermissions("procurement.read")}
	auditor := &kernel.Caller{UserID: "u-audit", Name: "Auditor", Permissions: kernel.NewPermissions("audit.read")}

	entity := kernel.Event{ID: "e1", Type: "PurchaseRequest.Submitted", Payload: map[string]any{"amount": 900}}
	if _, ok := eventFilter(read, clerk)(entity); ok {
		t.Fatal("entity events are hidden without the entity's read permission")
	}
	if got, ok := eventFilter(read, buyer)(entity); !ok || got.Payload["amount"] != 900 {
		t.Fatalf("readers get the full entity event: %+v %v", got, ok)
	}

	run := kernel.Event{ID: "e2", Type: "AgentRun.Completed", Payload: map[string]any{"run": "secret prompt"},
		Actor: &kernel.Actor{Kind: kernel.ActorAgent, ID: "agent-sidekick", OnBehalfOf: "Buyer"}}
	got, ok := eventFilter(read, clerk)(run)
	if !ok || got.Payload != nil || got.Actor != nil || got.Type != "AgentRun.Completed" {
		t.Fatalf("others see only that a run happened, so views refresh: %+v", got)
	}
	if got, _ := eventFilter(read, buyer)(run); got.Payload["run"] != "secret prompt" {
		t.Fatal("the person the run acted for sees it in full")
	}
	if got, _ := eventFilter(read, auditor)(run); got.Payload == nil {
		t.Fatal("auditors see every event in full")
	}
}
