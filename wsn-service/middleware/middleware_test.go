package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestStatusRecorderUnwraps ensures http.ResponseController can flush through the recorder
// (SSE streams depend on it; without Unwrap the stream closes after the first write).
func TestStatusRecorderUnwraps(t *testing.T) {
	rec := &statusRecorder{ResponseWriter: httptest.NewRecorder(), status: 200}
	rc := http.NewResponseController(rec)
	if err := rc.Flush(); err != nil {
		t.Fatalf("flush through statusRecorder: %v", err)
	}
}
