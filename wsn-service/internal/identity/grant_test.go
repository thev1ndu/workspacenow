package identity

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

type recordingAuditor struct{ denied []string }

func (a *recordingAuditor) Record(context.Context, kernel.ExecutionContext, string, string, kernel.Outcome, string) error {
	return nil
}
func (a *recordingAuditor) RecordDetached(_ context.Context, _ kernel.ExecutionContext, action, _ string, outcome kernel.Outcome, _ string) error {
	if outcome == kernel.OutcomeDenied {
		a.denied = append(a.denied, action)
	}
	return nil
}

var grantRoles = []oapi.Role{
	{Id: "role-admin", Name: "Administrator", Permissions: []oapi.Permission{"*"}},
	{Id: "role-control", Name: "Access admin", Permissions: []oapi.Permission{"control.manage"}},
	{Id: "role-buyer", Name: "Buyer", Permissions: []oapi.Permission{"procurement.read", "procurement.approve"}},
}

func TestMayGrantRefusesRolesStrongerThanTheGranter(t *testing.T) {
	aud := &recordingAuditor{}
	s := &service{auditor: aud}
	ctx := context.Background()
	accessAdmin := kernel.ExecutionContext{Actor: kernel.Actor{Name: "Access admin"}, Permissions: kernel.NewPermissions("control.manage", "procurement.read")}

	assert.NoError(t, s.mayGrant(ctx, accessAdmin, grantRoles, "role-control", "user/u1"), "holding every permission of the role")
	assert.Error(t, s.mayGrant(ctx, accessAdmin, grantRoles, "role-admin", "user/u1"), "the * role needs the * holder")
	assert.Error(t, s.mayGrant(ctx, accessAdmin, grantRoles, "role-buyer", "user/u1"), "procurement.approve is not held")
	assert.Equal(t, []string{"role.grant", "role.grant"}, aud.denied, "denials are audited")

	admin := kernel.ExecutionContext{Permissions: kernel.NewPermissions("*")}
	assert.NoError(t, s.mayGrant(ctx, admin, grantRoles, "role-admin", "user/u1"))
}

func TestLastAdministratorIsProtected(t *testing.T) {
	admins := func(ids ...string) *[]string { return &ids }
	users := []oapi.User{
		{Id: "u-root", RoleIds: admins("role-admin")},
		{Id: "u-ops", RoleIds: admins("role-control")},
	}
	assert.True(t, holdsWildcard(grantRoles, []string{"role-buyer", "role-admin"}))
	assert.False(t, holdsWildcard(grantRoles, []string{"role-control"}))
	assert.Equal(t, 0, wildcardHolders(grantRoles, users, "u-root"), "u-root is the only administrator")
	users = append(users, oapi.User{Id: "u-second", RoleIds: admins("role-admin")})
	assert.Equal(t, 1, wildcardHolders(grantRoles, users, "u-root"))
}

func TestAddsMembers(t *testing.T) {
	assert.False(t, addsMembers([]string{"a", "b"}, []string{"b"}), "removing members grants nothing")
	assert.True(t, addsMembers([]string{"a"}, []string{"a", "c"}))
	assert.True(t, addsMembers(nil, []string{"a"}))
}
