package data

import (
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

func TestViewAccess(t *testing.T) {
	owner := kernel.ExecutionContext{Actor: kernel.Actor{ID: "u-owner"}}
	other := kernel.ExecutionContext{Actor: kernel.Actor{ID: "u-other"}}
	private := &SavedView{OwnerID: "u-owner"}
	shared := &SavedView{OwnerID: "u-owner", Shared: true}
	if viewAccess(private, owner) != viewOwner || viewAccess(shared, owner) != viewOwner {
		t.Fatal("owners may always change their own views")
	}
	if viewAccess(private, other) != viewHidden {
		t.Fatal("someone else's private view is hidden")
	}
	if viewAccess(shared, other) != viewShared {
		t.Fatal("a shared view needs data.manage to change")
	}
	if viewAccess(&SavedView{}, kernel.ExecutionContext{}) != viewHidden {
		t.Fatal("an ownerless private view is not owned by an empty actor")
	}
}
