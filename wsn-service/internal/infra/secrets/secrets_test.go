package secrets

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSanitizePath(t *testing.T) {
	ok, err := sanitizePath("integrations/delivery-hmac")
	assert.NoError(t, err)
	assert.Equal(t, "integrations/delivery-hmac", ok)
	for _, bad := range []string{"../secrets", "a/../../b", "..", "a/./b"} {
		_, err := sanitizePath(bad)
		assert.Error(t, err, bad)
	}
}
