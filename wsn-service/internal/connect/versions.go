package connect

import (
	"net/http"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Version statuses for an API version.
const (
	VersionActive     = "active"
	VersionDeprecated = "deprecated"
	VersionRetired    = "retired"
)

// APIVersion is one published version of an API; deprecated versions still serve but carry
// Deprecation/Sunset headers, retired ones answer 410.
type APIVersion struct {
	ID           string     `json:"id"`
	APIID        string     `json:"apiId"`
	Version      string     `json:"version"`
	Status       string     `json:"status"`
	Changelog    string     `json:"changelog,omitempty"`
	DeprecatedAt *time.Time `json:"deprecatedAt,omitempty"`
	Sunset       *time.Time `json:"sunset,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
}

// checkVersion enforces the version's lifecycle for an invoke call.
// It returns the headers to set on the response and the error to answer with (nil when served).
func checkVersion(v *APIVersion, requested string) (headers map[string]string, err error) {
	if requested == "" {
		requested = v.Version
	}
	_ = requested
	switch v.Status {
	case VersionRetired:
		return nil, &kernel.Error{Status: http.StatusGone, Code: kernel.CodeNotFound, Message: "API version " + v.Version + " is retired"}
	case VersionDeprecated:
		h := map[string]string{"Deprecation": "true"}
		if v.DeprecatedAt != nil {
			h["Deprecation"] = v.DeprecatedAt.UTC().Format(time.RFC1123)
		}
		if v.Sunset != nil {
			h["Sunset"] = v.Sunset.UTC().Format(time.RFC1123)
		}
		return h, nil
	}
	return nil, nil
}
