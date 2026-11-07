package netutil

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAssertPublicHTTPURL(t *testing.T) {
	for _, bad := range []string{
		"http://127.0.0.1/x", "http://localhost/x", "http://169.254.169.254/latest/meta-data",
		"http://10.0.0.5/", "http://192.168.1.1/", "http://[::1]/", "http://0.0.0.0/",
		"https://internal.corp.local/", "ftp://example.com/", "not a url", "http://",
	} {
		assert.Error(t, AssertPublicHTTPURL(bad), bad)
	}
	assert.NoError(t, AssertPublicHTTPURL("https://hooks.example.com/x"))
	assert.NoError(t, AssertPublicHTTPURL("http://example.com/path?q=1"))
}
