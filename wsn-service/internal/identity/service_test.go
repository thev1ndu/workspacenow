package identity

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

func TestUnionGranted(t *testing.T) {
	mappings := []oapi.GroupRoleMapping{
		{Group: "admins", RoleId: "role-admin"},
		{Group: "devs", RoleId: "role-dev"},
	}
	// group grant only
	assert.Equal(t, map[string]bool{"role-admin": true}, unionGranted([]string{"admins"}, nil, mappings))
	// explicit assignment unions with the group grant, deduped
	assert.Equal(t, map[string]bool{"role-admin": true, "role-auditor": true},
		unionGranted([]string{"admins"}, []string{"role-auditor", "role-admin"}, mappings))
	// explicit only
	assert.Equal(t, map[string]bool{"role-dev": true}, unionGranted(nil, []string{"role-dev"}, mappings))
	// neither
	assert.Empty(t, unionGranted([]string{"nobody"}, nil, mappings))
}

func TestRolesKey(t *testing.T) {
	ids := []string{"b", "a"}
	assert.Equal(t, rolesKey(&ids), rolesKey(&[]string{"a", "b"})) // order-insensitive
	assert.Equal(t, "[]", rolesKey(nil))
}

func TestBootstrapGrants(t *testing.T) {
	b := Bootstrap{AdminEmails: []string{"admin@example.com"}, AdminRole: "role-admin"}
	assert.True(t, b.grants("admin@example.com"))
	assert.True(t, b.grants("  Admin@Example.com ")) // case/space-insensitive
	assert.False(t, b.grants("other@example.com"))
	assert.False(t, Bootstrap{}.grants("admin@example.com")) // no list configured
}
