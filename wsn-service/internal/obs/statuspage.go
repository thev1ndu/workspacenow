package obs

import (
	_ "embed"
	"html/template"
	"net/http"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
)

//go:embed statuspage.html
var statusPageHTML string

var statusPageTmpl = template.Must(template.New("status").Parse(statusPageHTML))

// writeStatusPage answers the public status endpoint: the HTML skin when the client asks for HTML
// (a browser's Accept header), the JSON payload otherwise.
func writeStatusPage(w http.ResponseWriter, r *http.Request, payload map[string]any) {
	if !strings.Contains(r.Header.Get("Accept"), "text/html") {
		httpx.OK(w, payload)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = statusPageTmpl.Execute(w, payload)
}
