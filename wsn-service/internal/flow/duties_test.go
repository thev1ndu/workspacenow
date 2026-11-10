package flow

import (
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

func TestRequesterOfEvent(t *testing.T) {
	ctx := map[string]any{}
	requesterOf(&kernel.Actor{Kind: kernel.ActorUser, ID: "u-officer", Name: "Officer"}, ctx)
	if ctx["triggeredById"] != "u-officer" || ctx["triggeredByName"] != "Officer" {
		t.Fatalf("a user event names its requester: %v", ctx)
	}
	agentCtx := map[string]any{}
	requesterOf(&kernel.Actor{Kind: kernel.ActorAgent, ID: "agent-sidekick", OnBehalfOf: "Officer"}, agentCtx)
	if agentCtx["triggeredByName"] != "Officer" || agentCtx["triggeredById"] != nil {
		t.Fatalf("an agent acting for someone counts as them: %v", agentCtx)
	}
	none := map[string]any{}
	requesterOf(nil, none)
	requesterOf(&kernel.Actor{Kind: kernel.ActorSystem, ID: "scheduler"}, none)
	if len(none) != 0 {
		t.Fatalf("system and unknown actors are no requester: %v", none)
	}
}

func TestRequesterCannotDecide(t *testing.T) {
	officer := &kernel.Caller{UserID: "u-officer", Name: "Officer"}
	approver := &kernel.Caller{UserID: "u-approver", Name: "Approver"}
	byID := &Approval{RequestedBy: "u-officer", RequestedByName: "Officer"}
	if !isRequester(byID, officer) || isRequester(byID, approver) {
		t.Fatal("the requester, and only the requester, is matched by id")
	}
	byName := &Approval{RequestedByName: "Officer"}
	if !isRequester(byName, officer) || isRequester(byName, approver) {
		t.Fatal("without an id the requester is matched by name")
	}
	if isRequester(&Approval{}, officer) {
		t.Fatal("an approval with no recorded requester blocks nobody")
	}
}
