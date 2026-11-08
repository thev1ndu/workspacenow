package identity

import (
	"encoding/json"
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// Handler serves the session and Control (organization and access) endpoints.
type Handler struct {
	svc      Service
	demoMode bool
}

func NewHandler(svc Service, demoMode bool) *Handler { return &Handler{svc: svc, demoMode: demoMode} }

// Login serves POST /api/v1/auth/login: the local system user signs in with the credentials
// from the wsn-secrets Secret when no OIDC is configured, and receives a session token.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httpx.Error(w, r, kernel.Invalid("email and password are required"))
		return
	}
	token, err := h.svc.LocalLogin(r.Context(), in.Email, in.Password)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, map[string]string{"token": token})
}

func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	c := httpx.Caller(r)
	roles := c.Roles
	if roles == nil {
		roles = []string{}
	}
	httpx.OK(w, oapi.Session{
		Actor:       oapi.Actor{Kind: oapi.ActorKind(kernel.ActorUser), Id: c.UserID, Name: c.Name},
		Permissions: c.Permissions.List(),
		Roles:       roles,
	})
}

func (h *Handler) ListPersonas(w http.ResponseWriter, r *http.Request) {
	if !h.demoMode {
		httpx.Error(w, r, kernel.NotFound("No route for GET /personas"))
		return
	}
	httpx.ListFrom(w, r, h.svc.Personas)
}

func (h *Handler) GetOrganization(w http.ResponseWriter, r *http.Request) {
	org, err := h.svc.Organization(r.Context())
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, org)
}

func (h *Handler) ListDepartments(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Departments)
}
func (h *Handler) ListTeams(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Teams)
}
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Users)
}
func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Roles)
}
func (h *Handler) ListEnvironments(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Environments)
}

func (h *Handler) ListGroupMappings(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.GroupMappings)
}

func (h *Handler) UpdateUserRoles(w http.ResponseWriter, r *http.Request, userId string) {
	var body oapi.UpdateUserRolesJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	user, err := h.svc.UpdateUserRoles(r.Context(), ec, userId, body.Roles)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, user)
}

func (h *Handler) ListGroups(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Groups)
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	var body oapi.CreateGroupJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	g, err := h.svc.CreateGroup(r.Context(), ec, body)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, g)
}

func (h *Handler) UpdateGroup(w http.ResponseWriter, r *http.Request, groupId string) {
	var body oapi.UpdateGroupJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	g, err := h.svc.UpdateGroup(r.Context(), ec, groupId, body)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, g)
}

func (h *Handler) DeleteGroup(w http.ResponseWriter, r *http.Request, groupId string) {
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	if err := h.svc.DeleteGroup(r.Context(), ec, groupId); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) UpdateGroupMappings(w http.ResponseWriter, r *http.Request) {
	var body oapi.UpdateGroupMappingsJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	mappings, err := h.svc.UpdateGroupMappings(r.Context(), ec, body.Mappings)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, mappings)
}

// GetOrganizationTheme answers GET /organization/theme.
func (h *Handler) GetOrganizationTheme(w http.ResponseWriter, r *http.Request) {
	theme, err := h.svc.OrganizationTheme(r.Context())
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, theme)
}

// UpdateOrganizationTheme answers PUT /organization/theme.
func (h *Handler) UpdateOrganizationTheme(w http.ResponseWriter, r *http.Request) {
	var body oapi.Theme
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	theme, err := h.svc.UpdateOrganizationTheme(r.Context(), ec, body)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, theme)
}
