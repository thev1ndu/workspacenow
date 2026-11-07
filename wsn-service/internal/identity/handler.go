package identity

import (
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
