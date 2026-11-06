package studio

import (
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Applications)
}

func (h *Handler) GetApplication(w http.ResponseWriter, r *http.Request, id string) {
	reply(w, r, http.StatusOK)(h.svc.Application(r.Context(), id))
}

func (h *Handler) PlanApplication(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Prompt string `json:"prompt"`
	}
	if !decode(w, r, &body) {
		return
	}
	reply(w, r, http.StatusCreated)(h.svc.PlanApplication(r.Context(), studioContext(r), body.Prompt))
}

type planBody struct {
	Plan Plan `json:"plan"`
}

func (h *Handler) ApplyApplicationPlan(w http.ResponseWriter, r *http.Request) {
	var body planBody
	if !decode(w, r, &body) {
		return
	}
	reply(w, r, http.StatusCreated)(h.svc.Apply(r.Context(), studioContext(r), body.Plan))
}

func (h *Handler) UpdateApplication(w http.ResponseWriter, r *http.Request, id string) {
	var body planBody
	if !decode(w, r, &body) {
		return
	}
	reply(w, r, http.StatusOK)(h.svc.Update(r.Context(), studioContext(r), id, body.Plan))
}

func (h *Handler) ListReleases(w http.ResponseWriter, r *http.Request, id string) {
	releases, err := h.svc.Releases(r.Context(), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, releases)
}

func (h *Handler) CreateRelease(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		Notes string `json:"notes"`
	}
	if !decode(w, r, &body) {
		return
	}
	reply(w, r, http.StatusCreated)(h.svc.CreateRelease(r.Context(), studioContext(r), id, body.Notes))
}

func (h *Handler) ListDeployments(w http.ResponseWriter, r *http.Request, params oapi.ListDeploymentsParams) {
	appID := ""
	if params.ApplicationId != nil {
		appID = *params.ApplicationId
	}
	deployments, err := h.svc.Deployments(r.Context(), appID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, deployments)
}

func (h *Handler) CreateDeployment(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ApplicationID string `json:"applicationId"`
		Environment   string `json:"environment"`
		Version       string `json:"version"`
	}
	if !decode(w, r, &body) {
		return
	}
	ec := httpx.Caller(r).Context(kernel.EntryControl, "")
	reply(w, r, http.StatusCreated)(h.svc.Deploy(r.Context(), ec, body.ApplicationID, body.Environment, body.Version))
}

func (h *Handler) ListPinnedApplications(w http.ResponseWriter, r *http.Request) {
	pins(w, r)(h.svc.Pins(r.Context(), httpx.Caller(r).UserID))
}

func (h *Handler) PinApplication(w http.ResponseWriter, r *http.Request, id string) {
	pins(w, r)(h.svc.Pin(r.Context(), httpx.Caller(r).UserID, id))
}

func (h *Handler) UnpinApplication(w http.ResponseWriter, r *http.Request, id string) {
	pins(w, r)(h.svc.Unpin(r.Context(), httpx.Caller(r).UserID, id))
}

func studioContext(r *http.Request) kernel.ExecutionContext {
	return httpx.Caller(r).Context(kernel.EntryStudio, "")
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := httpx.Decode(r, v); err != nil {
		httpx.Error(w, r, err)
		return false
	}
	return true
}

func reply(w http.ResponseWriter, r *http.Request, status int) func(any, error) {
	return func(v any, err error) {
		if err != nil {
			httpx.Error(w, r, err)
			return
		}
		httpx.JSON(w, status, v)
	}
}

func pins(w http.ResponseWriter, r *http.Request) func([]string, error) {
	return func(ids []string, err error) {
		if err != nil {
			httpx.Error(w, r, err)
			return
		}
		httpx.List(w, ids)
	}
}
