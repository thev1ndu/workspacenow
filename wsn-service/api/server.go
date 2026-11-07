// Package api mounts the module handlers on the routes generated from openapi.yaml.
package api

//go:generate sh ../scripts/gen-unimplemented.sh

import (
	"net/http"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/ai"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/bizops"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/flow"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/obs"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/seed"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/stream"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/studio"
)

// BasePath is where the public API is served.
const BasePath = "/api/v1"

// Modules are the handlers that together serve the contract.
type Modules struct {
	Identity *identity.Handler
	Demo     *seed.Handler
	Data     *data.Handler
	BizOps   *bizops.Handler
	Connect  *connect.Handler
	Stream   *stream.Hub
	Studio   *studio.Handler
	Obs      *obs.Handler
	AI       *ai.Handler
	Flow     *flow.Handler
}

// Aliases give each embedded module handler a distinct field name.
type (
	identityAPI = identity.Handler
	demoAPI     = seed.Handler
	dataAPI     = data.Handler
	bizopsAPI   = bizops.Handler
	connectAPI  = connect.Handler
	streamAPI   = stream.Hub
	studioAPI   = studio.Handler
	obsAPI      = obs.Handler
	aiAPI       = ai.Handler
	flowAPI     = flow.Handler
)

// Server embeds module handlers above the 501 fallback, so a module's method always wins.
type Server struct {
	*identityAPI
	*demoAPI
	*dataAPI
	*bizopsAPI
	*connectAPI
	*streamAPI
	*studioAPI
	*obsAPI
	*aiAPI
	*flowAPI
	fallback //nolint:unused // safety net: promotes the generated 501 stubs in unimplemented_gen.go when an operation has no module yet
}

type fallback struct{ unimplemented } //nolint:unused // see Server.fallback

var _ oapi.ServerInterface = (*Server)(nil)

// Routes registers the API on mux under BasePath.
func Routes(mux *http.ServeMux, m Modules) {
	server := &Server{identityAPI: m.Identity, demoAPI: m.Demo, dataAPI: m.Data, bizopsAPI: m.BizOps, connectAPI: m.Connect, streamAPI: m.Stream, studioAPI: m.Studio, obsAPI: m.Obs, aiAPI: m.AI, flowAPI: m.Flow}
	oapi.HandlerWithOptions(server, oapi.StdHTTPServerOptions{
		BaseURL:    BasePath,
		BaseRouter: mux,
		ErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			httpx.Error(w, r, kernel.Invalid("%s", err.Error()))
		},
	})
	// The status page is public and also lives at the root, outside the API base path (contract: GET /status).
	mux.HandleFunc("GET /status", server.obsAPI.StatusPage)
	// Anything else under the base path answers in the contract's error shape.
	mux.HandleFunc(BasePath+"/", func(w http.ResponseWriter, r *http.Request) { noRoute(mux, w, r) })
}

// noRoute answers 405 when the path exists for another method, 404 otherwise.
func noRoute(mux *http.ServeMux, w http.ResponseWriter, r *http.Request) {
	for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete} {
		if method == r.Method {
			continue
		}
		probe := r.Clone(r.Context())
		probe.Method = method
		if _, pattern := mux.Handler(probe); pattern != "" && !strings.HasSuffix(pattern, BasePath+"/") {
			httpx.JSON(w, http.StatusMethodNotAllowed, map[string]any{
				"status": http.StatusMethodNotAllowed, "code": kernel.CodeNotFound, "message": "No route for " + r.Method + " " + strings.TrimPrefix(r.URL.Path, BasePath),
			})
			return
		}
	}
	httpx.Error(w, r, kernel.NotFound("No route for %s %s", r.Method, strings.TrimPrefix(r.URL.Path, BasePath)))
}

func notImplemented(w http.ResponseWriter, r *http.Request) { //nolint:unused // called by generated stubs in unimplemented_gen.go
	httpx.JSON(w, http.StatusNotImplemented, map[string]any{
		"status": http.StatusNotImplemented, "code": kernel.CodeInvalidState, "message": r.Method + " " + strings.TrimPrefix(r.URL.Path, BasePath) + " is not available yet",
	})
}
