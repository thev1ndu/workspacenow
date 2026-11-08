// Package identity owns users, roles, group mappings, departments, teams and environments.
package identity

//go:generate moq -rm -fmt goimports -skip-ensure -pkg identitymocks -out identitymocks/service_mock.go . Service:ServiceMock

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/seed"
)

// Claims are the identity-provider facts the platform keeps about a user.
type Claims struct {
	Subject string
	Name    string
	Email   string
	Groups  []string
}

// Bootstrap names the first administrators (by IdP email), so installation never needs an IdP group.
type Bootstrap struct {
	AdminEmails []string
	AdminRole   string
}

// Service resolves callers and manages organization and access data.
type Service interface {
	// Caller resolves a known user, for demo tokens; an unknown user is unauthenticated.
	Caller(ctx context.Context, userID string) (*kernel.Caller, error)
	// CallerFromClaims records the user an access token describes and resolves them.
	CallerFromClaims(ctx context.Context, claims Claims) (*kernel.Caller, error)
	// PermissionsForGroups returns the permissions a set of group claims grants, without caching.
	PermissionsForGroups(ctx context.Context, groups []string) (kernel.Permissions, error)

	Organization(ctx context.Context) (*oapi.Organization, error)
	Departments(ctx context.Context) ([]oapi.Department, error)
	Teams(ctx context.Context) ([]oapi.Team, error)
	Users(ctx context.Context) ([]oapi.UserWithRoles, error)
	Personas(ctx context.Context) ([]oapi.User, error)
	Roles(ctx context.Context) ([]oapi.Role, error)
	GroupMappings(ctx context.Context) ([]oapi.GroupRoleMapping, error)
	Environments(ctx context.Context) ([]oapi.Environment, error)
	UpdateGroupMappings(ctx context.Context, ec kernel.ExecutionContext, mappings []oapi.GroupRoleMapping) ([]oapi.GroupRoleMapping, error)
	// UpdateUserRoles sets the roles explicitly assigned to a user, on top of group-mapped roles.
	UpdateUserRoles(ctx context.Context, ec kernel.ExecutionContext, userID string, roleIDs []string) (*oapi.UserWithRoles, error)
	Groups(ctx context.Context) ([]oapi.Group, error)
	CreateGroup(ctx context.Context, ec kernel.ExecutionContext, in oapi.GroupInput) (*oapi.Group, error)
	UpdateGroup(ctx context.Context, ec kernel.ExecutionContext, groupID string, in oapi.GroupInput) (*oapi.Group, error)
	DeleteGroup(ctx context.Context, ec kernel.ExecutionContext, groupID string) error

	// InvalidateAccess drops every cached permission resolution, on every replica.
	InvalidateAccess(ctx context.Context)
	// OrganizationTheme is the installation's white-label theme (GET/PUT /organization/theme).
	OrganizationTheme(ctx context.Context) (*oapi.Theme, error)
	UpdateOrganizationTheme(ctx context.Context, ec kernel.ExecutionContext, t oapi.Theme) (*oapi.Theme, error)
}

type service struct {
	db        *gorm.DB
	cache     cache.Cache
	auditor   kernel.Auditor
	bootstrap Bootstrap
	org       *docstore.Collection[oapi.Organization]
	depts     *docstore.Collection[oapi.Department]
	teams     *docstore.Collection[oapi.Team]
	groups    *docstore.Collection[oapi.Group]
	users     *docstore.Collection[oapi.User]
	roles     *docstore.Collection[oapi.Role]
	mappings  *docstore.Collection[oapi.GroupRoleMapping]
	envs      *docstore.Collection[oapi.Environment]
	settings  *docstore.Collection[map[string]any]
}

func NewService(db *gorm.DB, c cache.Cache, auditor kernel.Auditor, bootstrap Bootstrap) Service {
	return &service{
		db:        db,
		cache:     c,
		auditor:   auditor,
		bootstrap: bootstrap,
		org:       docstore.NewCollection(db, "organization", func(*oapi.Organization) string { return seed.OrganizationID }),
		depts:     docstore.NewCollection(db, "departments", func(d *oapi.Department) string { return d.Id }),
		groups:    docstore.NewCollection(db, "groups", func(g *oapi.Group) string { return g.Id }),
		teams:     docstore.NewCollection(db, "teams", func(t *oapi.Team) string { return t.Id }),
		users:     docstore.NewCollection(db, "users", func(u *oapi.User) string { return u.Id }),
		roles:     docstore.NewCollection(db, "roles", func(r *oapi.Role) string { return r.Id }),
		mappings:  docstore.NewCollection(db, "group_mappings", func(m *oapi.GroupRoleMapping) string { return m.Group + "|" + m.RoleId }),
		envs:      docstore.NewCollection(db, "environments", func(e *oapi.Environment) string { return string(e.Key) }),
		settings:  docstore.NewCollection(db, "org_settings", func(*map[string]any) string { return themeSettingsKey }),
	}
}

const (
	accessVersionKey = "wsn:access:version"
	accessTTL        = 5 * time.Minute
)

type access struct {
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
}

func (s *service) Caller(ctx context.Context, userID string) (*kernel.Caller, error) {
	user, err := s.users.Get(ctx, userID)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.Unauthenticated("Sign in to continue")
	}
	if err != nil {
		return nil, err
	}
	return s.resolve(ctx, user)
}

func (s *service) CallerFromClaims(ctx context.Context, claims Claims) (*kernel.Caller, error) {
	user, err := s.users.Get(ctx, claims.Subject)
	if err != nil && !errors.Is(err, docstore.ErrNotFound) {
		return nil, err
	}
	if user == nil {
		user = &oapi.User{Id: claims.Subject}
	}
	changed := user.Name != claims.Name || string(user.Email) != claims.Email || !slices.Equal(user.Groups, claims.Groups)
	if changed {
		user.Name, user.Email, user.Groups = claims.Name, openapi_types.Email(claims.Email), claims.Groups
		if user.Groups == nil {
			user.Groups = []string{}
		}
	}
	// Bootstrap: a listed email gets the admin role on first login — no IdP group setup needed.
	if s.bootstrap.grants(claims.Email) && !slices.Contains(deref(user.RoleIds), s.bootstrap.AdminRole) {
		ids := append(deref(user.RoleIds), s.bootstrap.AdminRole)
		user.RoleIds = &ids
		changed = true
		if err := s.auditor.Record(ctx, kernel.ExecutionContext{Actor: kernel.Actor{Kind: kernel.ActorSystem, ID: "bootstrap", Name: "Bootstrap"}, TraceID: kernel.TraceIDFrom(ctx)}, "bootstrap.admin", "user/"+user.Id, kernel.OutcomeAllowed, "granted "+s.bootstrap.AdminRole); err != nil {
			return nil, err
		}
	}
	if changed {
		if err := s.users.Put(ctx, user); err != nil {
			return nil, err
		}
	}
	return s.resolve(ctx, user)
}

// grants reports whether an IdP email is a bootstrap administrator.
func (b Bootstrap) grants(email string) bool {
	return slices.Contains(b.AdminEmails, strings.ToLower(strings.TrimSpace(email)))
}

// nativeGroupNames lists the WorkspaceNow groups the user belongs to.
func (s *service) nativeGroupNames(ctx context.Context, userID string) []string {
	groups, err := s.groups.List(ctx)
	if err != nil {
		slog.WarnContext(ctx, "list groups for resolution", "error", err)
		return nil
	}
	names := []string{}
	for _, g := range groups {
		if slices.Contains(g.MemberIds, userID) {
			names = append(names, g.Name)
		}
	}
	return names
}

// resolve returns the user's roles and permissions, cached per user until access data changes.
func (s *service) resolve(ctx context.Context, user *oapi.User) (*kernel.Caller, error) {
	version, _, err := s.cache.Get(ctx, accessVersionKey)
	if err != nil {
		slog.WarnContext(ctx, "access cache unavailable; resolving from the database", "error", err)
	}
	native := s.nativeGroupNames(ctx, user.Id)
	allGroups := append(slices.Clone(user.Groups), native...)
	key := fmt.Sprintf("wsn:access:%s:%s:%s:%s", version, user.Id, groupsKey(allGroups), rolesKey(user.RoleIds))
	var a access
	found := false
	if err == nil {
		found, _ = s.cache.GetJSON(ctx, key, &a)
	}
	if !found {
		roles, perms, err := s.rolesAndPermissions(ctx, &oapi.User{Id: user.Id, Groups: allGroups, RoleIds: user.RoleIds})
		if err != nil {
			return nil, err
		}
		a = access{Roles: roles, Permissions: perms.List()}
		if err := s.cache.SetJSON(ctx, key, a, accessTTL); err != nil {
			slog.WarnContext(ctx, "cache access", "error", err)
		}
	}
	return &kernel.Caller{UserID: user.Id, Name: user.Name, Roles: a.Roles, Permissions: kernel.NewPermissions(a.Permissions...)}, nil
}

func groupsKey(groups []string) string {
	g := slices.Clone(groups)
	slices.Sort(g)
	return fmt.Sprint(g)
}

func rolesKey(roleIDs *[]string) string {
	if roleIDs == nil {
		return "[]"
	}
	r := slices.Clone(*roleIDs)
	slices.Sort(r)
	return fmt.Sprint(r)
}

// rolesAndPermissions resolves a user's roles: explicit assignments union the roles their
// identity-provider groups grant, and permissions are the union of both sets.
func (s *service) rolesAndPermissions(ctx context.Context, user *oapi.User) ([]string, kernel.Permissions, error) {
	mappings, err := s.mappings.List(ctx)
	if err != nil {
		return nil, nil, err
	}
	roles, err := s.roles.List(ctx)
	if err != nil {
		return nil, nil, err
	}
	granted := unionGranted(user.Groups, deref(user.RoleIds), mappings)
	names := []string{}
	perms := kernel.Permissions{}
	for _, r := range roles {
		if !granted[r.Id] {
			continue
		}
		names = append(names, r.Name)
		for _, p := range r.Permissions {
			perms[string(p)] = struct{}{}
		}
	}
	return names, perms, nil
}

func (s *service) PermissionsForGroups(ctx context.Context, groups []string) (kernel.Permissions, error) {
	_, perms, err := s.rolesAndPermissions(ctx, &oapi.User{Groups: groups})
	return perms, err
}

// UpdateUserRoles replaces the roles explicitly assigned to a user (group-mapped roles stay).
func (s *service) UpdateUserRoles(ctx context.Context, ec kernel.ExecutionContext, userID string, roleIDs []string) (*oapi.UserWithRoles, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "user.roles", "user/"+userID); err != nil {
		return nil, err
	}
	roles, err := s.roles.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, id := range roleIDs {
		if !slices.ContainsFunc(roles, func(r oapi.Role) bool { return r.Id == id }) {
			return nil, kernel.Invalid("Unknown role %s", id)
		}
	}
	user, err := s.users.Get(ctx, userID)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("No user %s", userID)
	}
	if err != nil {
		return nil, err
	}
	user.RoleIds = &roleIDs
	if err := s.users.Put(ctx, user); err != nil {
		return nil, err
	}
	s.InvalidateAccess(ctx)
	if err := s.auditor.Record(ctx, ec, "user.roles", "user/"+userID, kernel.OutcomeAllowed, fmt.Sprintf("%d roles", len(roleIDs))); err != nil {
		return nil, err
	}
	names, _, err := s.rolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	return &oapi.UserWithRoles{
		Id: user.Id, Name: user.Name, Email: user.Email, Title: user.Title, DepartmentId: user.DepartmentId, TeamId: user.TeamId, Groups: user.Groups, RoleIds: user.RoleIds, Roles: names,
	}, nil
}

// unionGranted is the pure set behind role resolution: explicit assignments union group grants.
func unionGranted(groups, explicit []string, mappings []oapi.GroupRoleMapping) map[string]bool {
	granted := map[string]bool{}
	for _, m := range mappings {
		if slices.Contains(groups, m.Group) {
			granted[m.RoleId] = true
		}
	}
	for _, id := range explicit {
		granted[id] = true
	}
	return granted
}

func deref(p *[]string) []string {
	if p == nil {
		return nil
	}
	return *p
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func (s *service) Groups(ctx context.Context) ([]oapi.Group, error) { return s.groups.List(ctx) }

func (s *service) validateGroup(ctx context.Context, in oapi.GroupInput) error {
	if strings.TrimSpace(in.Name) == "" {
		return kernel.Invalid("A group needs a name")
	}
	users, err := s.users.List(ctx)
	if err != nil {
		return err
	}
	for _, id := range in.MemberIds {
		if !slices.ContainsFunc(users, func(u oapi.User) bool { return u.Id == id }) {
			return kernel.Invalid("Unknown member %s", id)
		}
	}
	return nil
}

func (s *service) CreateGroup(ctx context.Context, ec kernel.ExecutionContext, in oapi.GroupInput) (*oapi.Group, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "group.create", "groups"); err != nil {
		return nil, err
	}
	if err := s.validateGroup(ctx, in); err != nil {
		return nil, err
	}
	g := &oapi.Group{Id: kernel.NewID("grp"), Name: strings.TrimSpace(in.Name), Description: derefStr(in.Description), MemberIds: in.MemberIds}
	if err := s.groups.Put(ctx, g); err != nil {
		return nil, err
	}
	s.InvalidateAccess(ctx)
	if err := s.auditor.Record(ctx, ec, "group.create", "group/"+g.Id, kernel.OutcomeAllowed, g.Name); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *service) UpdateGroup(ctx context.Context, ec kernel.ExecutionContext, groupID string, in oapi.GroupInput) (*oapi.Group, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "group.update", "group/"+groupID); err != nil {
		return nil, err
	}
	if err := s.validateGroup(ctx, in); err != nil {
		return nil, err
	}
	g, err := s.groups.Get(ctx, groupID)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("No group %s", groupID)
	}
	if err != nil {
		return nil, err
	}
	g.Name, g.Description, g.MemberIds = strings.TrimSpace(in.Name), derefStr(in.Description), in.MemberIds
	if err := s.groups.Put(ctx, g); err != nil {
		return nil, err
	}
	s.InvalidateAccess(ctx)
	if err := s.auditor.Record(ctx, ec, "group.update", "group/"+g.Id, kernel.OutcomeAllowed, g.Name); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *service) DeleteGroup(ctx context.Context, ec kernel.ExecutionContext, groupID string) error {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "group.delete", "group/"+groupID); err != nil {
		return err
	}
	if _, err := s.groups.Get(ctx, groupID); errors.Is(err, docstore.ErrNotFound) {
		return kernel.NotFound("No group %s", groupID)
	} else if err != nil {
		return err
	}
	if err := s.groups.Delete(ctx, groupID); err != nil {
		return err
	}
	s.InvalidateAccess(ctx)
	return s.auditor.Record(ctx, ec, "group.delete", "group/"+groupID, kernel.OutcomeAllowed, "")
}

func (s *service) Organization(ctx context.Context) (*oapi.Organization, error) {
	return s.org.Get(ctx, seed.OrganizationID)
}

func (s *service) Departments(ctx context.Context) ([]oapi.Department, error) {
	return s.depts.List(ctx)
}
func (s *service) Teams(ctx context.Context) ([]oapi.Team, error)    { return s.teams.List(ctx) }
func (s *service) Personas(ctx context.Context) ([]oapi.User, error) { return s.users.List(ctx) }
func (s *service) Roles(ctx context.Context) ([]oapi.Role, error)    { return s.roles.List(ctx) }
func (s *service) Environments(ctx context.Context) ([]oapi.Environment, error) {
	return s.envs.List(ctx)
}

func (s *service) GroupMappings(ctx context.Context) ([]oapi.GroupRoleMapping, error) {
	return s.mappings.List(ctx)
}

func (s *service) Users(ctx context.Context) ([]oapi.UserWithRoles, error) {
	users, err := s.users.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]oapi.UserWithRoles, 0, len(users))
	for _, u := range users {
		roles, _, err := s.rolesAndPermissions(ctx, &u)
		if err != nil {
			return nil, err
		}
		out = append(out, oapi.UserWithRoles{
			Id: u.Id, Name: u.Name, Email: u.Email, Title: u.Title, DepartmentId: u.DepartmentId, TeamId: u.TeamId, Groups: u.Groups, RoleIds: u.RoleIds, Roles: roles,
		})
	}
	return out, nil
}

func (s *service) UpdateGroupMappings(ctx context.Context, ec kernel.ExecutionContext, mappings []oapi.GroupRoleMapping) ([]oapi.GroupRoleMapping, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "access.update", "group-mappings"); err != nil {
		return nil, err
	}
	if mappings == nil {
		return nil, kernel.Invalid("mappings must be a list")
	}
	roles, err := s.roles.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, m := range mappings {
		if !slices.ContainsFunc(roles, func(r oapi.Role) bool { return r.Id == m.RoleId }) {
			return nil, kernel.Invalid("Unknown role %s", m.RoleId)
		}
	}
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.mappings.DeleteAll(ctx); err != nil {
			return err
		}
		for i := range mappings {
			if err := s.mappings.Put(ctx, &mappings[i]); err != nil {
				return err
			}
		}
		return s.auditor.Record(ctx, ec, "access.update", "group-mappings", kernel.OutcomeAllowed, fmt.Sprintf("%d mappings", len(mappings)))
	})
	if err != nil {
		return nil, err
	}
	s.InvalidateAccess(ctx)
	return mappings, nil
}

func (s *service) InvalidateAccess(ctx context.Context) {
	if _, err := s.cache.Incr(ctx, accessVersionKey); err != nil {
		slog.ErrorContext(ctx, "invalidate access cache; cached permissions expire within the TTL", "error", err)
	}
}
