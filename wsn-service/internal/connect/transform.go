package connect

import (
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Transform renames/maps fields around an operation call: output field -> dotted source
// path ("values.total", "output.id"). Applied before the engine call (request) and after (response).
type Transform struct {
	Request  map[string]string `json:"request,omitempty"`
	Response map[string]string `json:"response,omitempty"`
}

// lookupPath reads a dotted path from a nested map, e.g. "values.total".
func lookupPath(doc map[string]any, path string) (any, bool) {
	var cur any = doc
	for _, part := range strings.Split(path, ".") {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		cur, ok = m[part]
		if !ok {
			return nil, false
		}
	}
	return cur, true
}

// applyTransform builds a new map with each target field set from its source path.
// Sources that do not resolve are dropped; untouched fields are kept when keepRest is true.
func applyTransform(doc map[string]any, mapping map[string]string, keepRest bool) map[string]any {
	out := map[string]any{}
	if keepRest {
		for k, v := range doc {
			out[k] = v
		}
	}
	for target, src := range mapping {
		if v, ok := lookupPath(doc, src); ok {
			out[target] = v
		}
	}
	return out
}

// transformRequest maps an operation's input through the request transform.
func transformRequest(in map[string]any, t *Transform) (map[string]any, error) {
	if t == nil || len(t.Request) == 0 {
		return in, nil
	}
	return applyTransform(in, t.Request, false), nil
}

// transformResponse maps an operation's output through the response transform.
func transformResponse(out any, t *Transform) (any, error) {
	if t == nil || len(t.Response) == 0 {
		return out, nil
	}
	doc, ok := out.(map[string]any)
	if !ok {
		return nil, kernel.InvalidState("transform.response needs a JSON object output")
	}
	return applyTransform(doc, t.Response, false), nil
}
