// Package identity owns users, roles, group mappings, departments, teams and environments.
package identity

//go:generate moq -rm -fmt goimports -skip-ensure -pkg identitymocks -out identitymocks/service_mock.go . Service:ServiceMock

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
	"golang.org/x/crypto/bcrypt"
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
	Subject       string
	Name          string
	Email         string
	EmailVerified bool
	Groups        []string
}

// Bootstrap names the first administrators (by IdP email or the local system user), so
// installation never needs an IdP group.
type Bootstrap struct {
	AdminEmails          []string
	AdminRole            string
	DefaultAdminEmail    string
	DefaultAdminPassword string
}

// localEnabled reports whether the local system user login is configured.
func (b Bootstrap) localEnabled() bool {
	return b.DefaultAdminEmail != "" && b.DefaultAdminPassword != ""
}

// Service resolves callers and manages organization and access data.
type Service interface {
	// Caller resolves a known user, for demo tokens; an unknown user is unauthenticated.
	Caller(ctx context.Context, userID string) (*kernel.Caller, error)
	// CallerFromClaims records the user an access token describes and resolves them.
	CallerFromClaims(ctx context.Context, claims Claims) (*kernel.Caller, error)
	// LocalLogin checks the system-user credentials (no OIDC configured), provisions the admin
	// user on first login and returns a session token. Attempts are rate-limited per email and
	// per client IP, and allowed/denied outcomes are audited. mustChangePassword reports the
	// configured default password is still in use and must be rotated.
	LocalLogin(ctx context.Context, email, password, clientIP string) (token string, mustChangePassword bool, err error)
	// SessionUser resolves a session token issued by LocalLogin to its user ID, sliding the TTL.
	SessionUser(ctx context.Context, token string) (userID string, err error)
	// Logout revokes a session token; the user's session version bump also revokes their other sessions.
	Logout(ctx context.Context, token string) error
	// ChangePassword rotates the local system user's password to a bcrypt hash and clears the
	// must-change flag; the configured default password stops working.
	ChangePassword(ctx context.Context, ec kernel.ExecutionContext, userID, oldPassword, newPassword string) error
	// SetUserStatus enables or disables an account; a disabled user's sessions stop resolving.
	SetUserStatus(ctx context.Context, ec kernel.ExecutionContext, userID, status string) (*oapi.UserWithRoles, error)
	// PermissionsForGroups returns the permissions a set of group claims grants, without caching.
	PermissionsForGroups(ctx context.Context, groups []string) (kernel.Permissions, error)

	Organization(ctx context.Context) (*oapi.Organization, error)
	Departments(ctx context.Context) ([]oapi.Department, error)
	// CreateDepartment adds a department (an application owner); requires control.manage.
	CreateDepartment(ctx context.Context, ec kernel.ExecutionContext, in oapi.DepartmentInput) (*oapi.Department, error)
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
	firstSight := user == nil
	if firstSight {
		user = &oapi.User{Id: claims.Subject}
	}
	changed := user.Name != claims.Name || string(user.Email) != claims.Email || !slices.Equal(user.Groups, claims.Groups)
	if changed {
		user.Name, user.Email, user.Groups = claims.Name, openapi_types.Email(claims.Email), claims.Groups
		if user.Groups == nil {
			user.Groups = []string{}
		}
	}
	// Bootstrap: a listed, verified email gets the admin role once, on first sight — no IdP group
	// setup needed, and an admin removing the role later is not undone on the next login.
	if firstSight && claims.EmailVerified && s.bootstrap.grants(claims.Email) && !slices.Contains(deref(user.RoleIds), s.bootstrap.AdminRole) {
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

// grants reports whether an email is a bootstrap administrator (IdP list or local system user).
func (b Bootstrap) grants(email string) bool {
	e := strings.ToLower(strings.TrimSpace(email))
	return slices.Contains(b.AdminEmails, e) || (b.localEnabled() && e == strings.ToLower(strings.TrimSpace(b.DefaultAdminEmail)))
}

const (
	sessionKeyPrefix     = "wsn:session:"    // + sha256(token): the raw token never sits in Valkey
	sessionVersionPrefix = "wsn:sessionver:" // per-user counter; bumping it revokes all their sessions
	sessionTTL           = 24 * time.Hour
	loginAttemptsMax     = 10 // per window, per email and per client IP
	loginWindow          = 15 * time.Minute
)

// session is the Valkey value behind a login token.
type session struct {
	UserID  string `json:"userId"`
	Version int64  `json:"version"`
}

// sessionKey hashes the token so a Valkey dump cannot be replayed as a session.
func sessionKey(token string) string {
	sum := sha256.Sum256([]byte(token))
	return sessionKeyPrefix + hex.EncodeToString(sum[:])
}

// LocalLogin authenticates the local system user when no OIDC is configured, provisions the
// account with the admin role on first login, and returns a bearer session token. Login attempts
// are rate-limited per email and per client IP and audited both ways; sessions key on sha256(token),
// carry a version that logout/revoke bumps, and slide their TTL on every use.
func (s *service) LocalLogin(ctx context.Context, email, password, clientIP string) (string, bool, error) {
	if !s.bootstrap.localEnabled() {
		return "", false, kernel.NotFound("local login is not enabled")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	ec := kernel.ExecutionContext{Actor: kernel.Actor{Kind: kernel.ActorSystem, ID: "login", Name: "Login"}, TraceID: kernel.TraceIDFrom(ctx), EntryPoint: kernel.EntryAPI}
	if err := s.loginAllowed(ctx, email, clientIP); err != nil {
		_ = s.auditor.RecordDetached(ctx, ec, "auth.login", "auth/login", kernel.OutcomeDenied, "rate limited: "+email)
		return "", false, err
	}
	emailOK := subtle.ConstantTimeCompare([]byte(email), []byte(strings.ToLower(strings.TrimSpace(s.bootstrap.DefaultAdminEmail)))) == 1
	passOK, mustChange, err := s.checkAdminPassword(ctx, password)
	if err != nil {
		return "", false, err
	}
	if !emailOK || !passOK {
		_ = s.auditor.RecordDetached(ctx, ec, "auth.login", "auth/login", kernel.OutcomeDenied, "invalid credentials: "+email)
		return "", false, kernel.Unauthenticated("Invalid credentials")
	}
	if err := s.ensureAdminRole(ctx); err != nil {
		return "", false, err
	}
	name := strings.Split(email, "@")[0]
	caller, err := s.CallerFromClaims(ctx, Claims{Subject: "local:" + email, Name: name, Email: email, EmailVerified: true})
	if err != nil {
		return "", false, err
	}
	// the rotation flag follows the password check: the configured default demands a change
	if user, uerr := s.users.Get(ctx, caller.UserID); uerr == nil && (user.MustChangePassword == nil || *user.MustChangePassword != mustChange) {
		user.MustChangePassword = &mustChange
		if perr := s.users.Put(ctx, user); perr != nil {
			return "", false, perr
		}
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", false, err
	}
	token := hex.EncodeToString(raw)
	version, err := s.cache.Incr(ctx, sessionVersionPrefix+caller.UserID)
	if err != nil {
		return "", false, err
	}
	if err := s.cache.SetJSON(ctx, sessionKey(token), session{UserID: caller.UserID, Version: version}, sessionTTL); err != nil {
		return "", false, err
	}
	_ = s.auditor.RecordDetached(ctx, ec, "auth.login", "auth/login", kernel.OutcomeAllowed, email)
	return token, mustChange, nil
}

// loginAllowed enforces the per-email and per-client-IP login limiter, failing closed when the
// cache is down (an unavailable limiter must not become an open door).
func (s *service) loginAllowed(ctx context.Context, email, clientIP string) error {
	for _, k := range []string{"wsn:login:email:" + email, "wsn:login:ip:" + clientIP} {
		n, err := s.cache.IncrWindow(ctx, k, loginWindow)
		if err != nil {
			return &kernel.Error{Status: http.StatusServiceUnavailable, Code: kernel.CodeInvalidState, Message: "Sign-in is temporarily unavailable; try again shortly"}
		}
		if n > loginAttemptsMax {
			return &kernel.Error{Status: http.StatusTooManyRequests, Code: kernel.CodeInvalidState, Message: "Too many login attempts; wait a few minutes and try again"}
		}
	}
	return nil
}

// checkAdminPassword verifies the system-user password against the rotated bcrypt hash when one
// was stored, else against the configured default; mustChange reports the default is still in use.
func (s *service) checkAdminPassword(ctx context.Context, password string) (ok bool, mustChange bool, err error) {
	if hash, ok := s.storedPasswordHash(ctx); ok {
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil {
			return true, false, nil
		}
		return false, false, nil
	}
	if subtle.ConstantTimeCompare([]byte(password), []byte(s.bootstrap.DefaultAdminPassword)) == 1 {
		return true, true, nil
	}
	return false, false, nil
}

// storedPasswordHash returns the rotated bcrypt hash from the org settings doc, if one was set.
func (s *service) storedPasswordHash(ctx context.Context) (string, bool) {
	doc, err := s.settings.Get(ctx, themeSettingsKey)
	if err != nil {
		return "", false
	}
	h, _ := (*doc)["defaultAdminPasswordHash"].(string)
	return h, h != ""
}

// storePasswordHash writes the rotated bcrypt hash into the org settings doc, preserving other keys.
func (s *service) storePasswordHash(ctx context.Context, hash string) error {
	doc, err := s.settings.Get(ctx, themeSettingsKey)
	var m map[string]any
	if errors.Is(err, docstore.ErrNotFound) {
		m = map[string]any{}
	} else if err != nil {
		return err
	} else {
		m = *doc
	}
	m["defaultAdminPasswordHash"] = hash
	return s.settings.Put(ctx, &m)
}

// ChangePassword rotates the local system user's password: the current one must match, the new one
// is stored as a bcrypt hash (the configured default stops working) and the rotation flag clears.
func (s *service) ChangePassword(ctx context.Context, ec kernel.ExecutionContext, userID, oldPassword, newPassword string) error {
	if !strings.HasPrefix(userID, "local:") {
		return kernel.Invalid("Only the local system user has a password to change here")
	}
	if len(newPassword) < 12 {
		return kernel.Invalid("The new password needs at least 12 characters")
	}
	ok, _, err := s.checkAdminPassword(ctx, oldPassword)
	if err != nil {
		return err
	}
	if !ok {
		_ = s.auditor.RecordDetached(ctx, ec, "auth.password", "auth/password", kernel.OutcomeDenied, "wrong current password")
		return kernel.Unauthenticated("The current password is not correct")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.storePasswordHash(ctx, string(hash)); err != nil {
		return err
	}
	if user, uerr := s.users.Get(ctx, userID); uerr == nil && user.MustChangePassword != nil {
		user.MustChangePassword = nil
		if perr := s.users.Put(ctx, user); perr != nil {
			return perr
		}
	}
	s.InvalidateAccess(ctx)
	return s.auditor.Record(ctx, ec, "auth.password", "auth/password", kernel.OutcomeAllowed, "")
}

// SessionUser resolves a local session token to its user ID, rejecting revoked (version-bumped)
// sessions and sliding the TTL on every use.
func (s *service) SessionUser(ctx context.Context, token string) (string, error) {
	var v session
	found, err := s.cache.GetJSON(ctx, sessionKey(token), &v)
	if err != nil {
		return "", err
	}
	if !found || v.UserID == "" {
		return "", kernel.Unauthenticated("Sign in to continue")
	}
	ver, _, err := s.cache.Get(ctx, sessionVersionPrefix+v.UserID)
	if err != nil {
		return "", err
	}
	if ver != "" {
		if n, perr := strconv.ParseInt(ver, 10, 64); perr == nil && n != v.Version {
			return "", kernel.Unauthenticated("Sign in to continue")
		}
	}
	if err := s.cache.SetJSON(ctx, sessionKey(token), v, sessionTTL); err != nil {
		slog.WarnContext(ctx, "slide session TTL", "error", err)
	}
	return v.UserID, nil
}

// Logout revokes a session token and bumps the user's session version, revoking their other sessions too.
func (s *service) Logout(ctx context.Context, token string) error {
	var v session
	found, err := s.cache.GetJSON(ctx, sessionKey(token), &v)
	if err != nil {
		return err
	}
	if !found {
		return nil // already gone: logout is idempotent
	}
	if err := s.cache.Del(ctx, sessionKey(token)); err != nil {
		return err
	}
	_, _ = s.cache.Incr(ctx, sessionVersionPrefix+v.UserID)
	return nil
}

// ensureAdminRole creates the bootstrap admin role (all permissions) when it does not exist yet.
func (s *service) ensureAdminRole(ctx context.Context) error {
	roleID := s.bootstrap.AdminRole
	if roleID == "" {
		roleID = "workspacenow-admin"
	}
	if _, err := s.roles.Get(ctx, roleID); err == nil {
		return nil
	} else if !errors.Is(err, docstore.ErrNotFound) {
		return err
	}
	role := &oapi.Role{Id: roleID, Name: "Administrator", Description: "Full platform access (system bootstrap role)", Permissions: []oapi.Permission{"*"}}
	return s.roles.Put(ctx, role)
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

// userStatus is the account state; documents written before the field existed are active.
func userStatus(u *oapi.User) string {
	if u.Status == nil || *u.Status == "" {
		return "active"
	}
	return string(*u.Status)
}

// withRolesStatus converts the User status enum to the UserWithRoles one (same underlying values).
func withRolesStatus(s *oapi.UserStatus) *oapi.UserWithRolesStatus {
	if s == nil {
		return nil
	}
	v := oapi.UserWithRolesStatus(*s)
	return &v
}

// mustChangePassword reports whether the user must rotate their password before anything else.
func mustChangePassword(u *oapi.User) bool {
	return u.MustChangePassword != nil && *u.MustChangePassword
}

// resolve returns the user's roles and permissions, cached per user until access data changes.
// Disabled accounts never resolve, so their sessions and tokens stop working on every replica
// once the access cache is invalidated.
func (s *service) resolve(ctx context.Context, user *oapi.User) (*kernel.Caller, error) {
	if userStatus(user) == "disabled" {
		return nil, kernel.Unauthenticated("This account has been disabled")
	}
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
	return &kernel.Caller{UserID: user.Id, Name: user.Name, Roles: a.Roles, Permissions: kernel.NewPermissions(a.Permissions...), MustChangePassword: mustChangePassword(user)}, nil
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
	current := deref(user.RoleIds)
	for _, id := range roleIDs {
		if !slices.Contains(current, id) {
			if err := s.mayGrant(ctx, ec, roles, id, "user/"+userID); err != nil {
				return nil, err
			}
		}
	}
	if holdsWildcard(roles, current) && !holdsWildcard(roles, roleIDs) {
		users, err := s.users.List(ctx)
		if err != nil {
			return nil, err
		}
		if wildcardHolders(roles, users, userID) == 0 {
			_ = s.auditor.RecordDetached(ctx, ec, "user.roles", "user/"+userID, kernel.OutcomeDenied, "Would remove the last administrator")
			return nil, kernel.InvalidState("%s is the last administrator; give someone else full access first", user.Name).WithTrace(ec.TraceID)
		}
	}
	// removing the bootstrap admin role is a security event worth its own audit row
	if s.bootstrap.AdminRole != "" && slices.Contains(current, s.bootstrap.AdminRole) && !slices.Contains(roleIDs, s.bootstrap.AdminRole) {
		_ = s.auditor.RecordDetached(ctx, ec, "bootstrap.admin", "user/"+userID, kernel.OutcomeAllowed, "removed "+s.bootstrap.AdminRole)
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
		Status: withRolesStatus(user.Status), MustChangePassword: user.MustChangePassword,
	}, nil
}

// SetUserStatus enables or disables an account. A disabled user cannot sign in and their sessions
// stop resolving on every replica once the access cache is invalidated; the last administrator
// cannot be disabled.
func (s *service) SetUserStatus(ctx context.Context, ec kernel.ExecutionContext, userID, status string) (*oapi.UserWithRoles, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "user.status", "user/"+userID); err != nil {
		return nil, err
	}
	if status != "active" && status != "disabled" {
		return nil, kernel.Invalid("status must be active or disabled")
	}
	user, err := s.users.Get(ctx, userID)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("No user %s", userID)
	}
	if err != nil {
		return nil, err
	}
	if status == "disabled" && userStatus(user) == "active" {
		roles, err := s.roles.List(ctx)
		if err != nil {
			return nil, err
		}
		if holdsWildcard(roles, deref(user.RoleIds)) {
			users, err := s.users.List(ctx)
			if err != nil {
				return nil, err
			}
			if wildcardHolders(roles, users, userID) == 0 {
				_ = s.auditor.RecordDetached(ctx, ec, "user.status", "user/"+userID, kernel.OutcomeDenied, "Would disable the last administrator")
				return nil, kernel.InvalidState("%s is the last administrator; give someone else full access first", user.Name).WithTrace(ec.TraceID)
			}
		}
	}
	st := oapi.UserStatus(status)
	user.Status = &st
	if err := s.users.Put(ctx, user); err != nil {
		return nil, err
	}
	s.InvalidateAccess(ctx)
	if err := s.auditor.Record(ctx, ec, "user.status", "user/"+userID, kernel.OutcomeAllowed, status); err != nil {
		return nil, err
	}
	names, _, err := s.rolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	return &oapi.UserWithRoles{
		Id: user.Id, Name: user.Name, Email: user.Email, Title: user.Title, DepartmentId: user.DepartmentId, TeamId: user.TeamId, Groups: user.Groups, RoleIds: user.RoleIds, Roles: names,
		Status: withRolesStatus(user.Status), MustChangePassword: user.MustChangePassword,
	}, nil
}

// mayGrant refuses a role whose permissions the granter does not all hold, so access can't be escalated
// by handing out a stronger role (including the "*" administrator role).
func (s *service) mayGrant(ctx context.Context, ec kernel.ExecutionContext, roles []oapi.Role, roleID, resource string) error {
	for _, r := range roles {
		if r.Id != roleID {
			continue
		}
		for _, p := range r.Permissions {
			if !ec.Permissions.Has(string(p)) {
				_ = s.auditor.RecordDetached(ctx, ec, "role.grant", resource, kernel.OutcomeDenied, "Granter lacks "+string(p)+" from role "+roleID)
				return kernel.Forbidden("You can't grant %s because it includes %s, which you don't hold", r.Name, p).WithTrace(ec.TraceID)
			}
		}
	}
	return nil
}

// holdsWildcard reports whether any of roleIDs is a role with every permission.
func holdsWildcard(roles []oapi.Role, roleIDs []string) bool {
	for _, r := range roles {
		if slices.Contains(roleIDs, r.Id) && slices.Contains(r.Permissions, oapi.Permission("*")) {
			return true
		}
	}
	return false
}

// wildcardHolders counts users other than except explicitly assigned a role with every permission.
func wildcardHolders(roles []oapi.Role, users []oapi.User, except string) int {
	n := 0
	for _, u := range users {
		if u.Id != except && holdsWildcard(roles, deref(u.RoleIds)) {
			n++
		}
	}
	return n
}

// addsMembers reports whether after contains anyone not in before.
func addsMembers(before, after []string) bool {
	for _, m := range after {
		if !slices.Contains(before, m) {
			return true
		}
	}
	return false
}

// mayGrantToMembers checks the roles mapped to a group before new members join it.
func (s *service) mayGrantToMembers(ctx context.Context, ec kernel.ExecutionContext, groupName string, before, after []string) error {
	if !addsMembers(before, after) {
		return nil
	}
	mappings, err := s.mappings.List(ctx)
	if err != nil {
		return err
	}
	roles, err := s.roles.List(ctx)
	if err != nil {
		return err
	}
	for _, m := range mappings {
		if m.Group == groupName {
			if err := s.mayGrant(ctx, ec, roles, m.RoleId, "group/"+groupName); err != nil {
				return err
			}
		}
	}
	return nil
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
	if err := s.mayGrantToMembers(ctx, ec, strings.TrimSpace(in.Name), nil, in.MemberIds); err != nil {
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
	before := g.MemberIds
	if g.Name != strings.TrimSpace(in.Name) {
		before = nil // a renamed group picks up the new name's mappings for every member
	}
	if err := s.mayGrantToMembers(ctx, ec, strings.TrimSpace(in.Name), before, in.MemberIds); err != nil {
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

// CreateDepartment adds a department; audited as department.create.
func (s *service) CreateDepartment(ctx context.Context, ec kernel.ExecutionContext, in oapi.DepartmentInput) (*oapi.Department, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "department.create", "departments"); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, kernel.Invalid("Department name is required")
	}
	desc := ""
	if in.Description != nil {
		desc = *in.Description
	}
	d := &oapi.Department{Id: "dep-" + slugify(name), Name: name, Description: desc}
	if err := s.depts.Put(ctx, d); err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "department.create", "department/"+d.Id, kernel.OutcomeAllowed, d.Name); err != nil {
		return nil, err
	}
	return d, nil
}

// slugify lowercases and replaces non-alphanumerics with dashes.
func slugify(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if b.Len() > 0 && !strings.HasSuffix(b.String(), "-") {
			b.WriteByte('-')
		}
	}
	return strings.Trim(b.String(), "-")
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
			Status: withRolesStatus(u.Status), MustChangePassword: u.MustChangePassword,
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
	existing, err := s.mappings.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, m := range mappings {
		if !slices.Contains(existing, m) {
			if err := s.mayGrant(ctx, ec, roles, m.RoleId, "group-mappings"); err != nil {
				return nil, err
			}
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
