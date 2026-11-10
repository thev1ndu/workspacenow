package identity

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache/cachemocks"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

func TestSessionKeyHashesToken(t *testing.T) {
	k := sessionKey("secret-token")
	assert.True(t, strings.HasPrefix(k, sessionKeyPrefix))
	assert.NotContains(t, k, "secret-token", "the raw token must never sit in the key")
	assert.Equal(t, k, sessionKey("secret-token"), "deterministic")
	assert.NotEqual(t, k, sessionKey("other-token"))
}

func TestUserStatusDefaultsToActive(t *testing.T) {
	assert.Equal(t, "active", userStatus(&oapi.User{}), "missing status means active")
	active := oapi.UserStatus("active")
	disabled := oapi.UserStatus("disabled")
	assert.Equal(t, "active", userStatus(&oapi.User{Status: &active}))
	assert.Equal(t, "disabled", userStatus(&oapi.User{Status: &disabled}))
	assert.False(t, mustChangePassword(&oapi.User{}))
	flag := true
	assert.True(t, mustChangePassword(&oapi.User{MustChangePassword: &flag}))
}

func TestLoginAllowedLimitsAndFailsClosed(t *testing.T) {
	ctx := context.Background()

	under := &service{cache: &cachemocks.CacheMock{
		IncrWindowFunc: func(context.Context, string, time.Duration) (int64, error) { return 3, nil },
	}}
	assert.NoError(t, under.loginAllowed(ctx, "a@x.io", "10.0.0.1"))

	over := &service{cache: &cachemocks.CacheMock{
		IncrWindowFunc: func(context.Context, string, time.Duration) (int64, error) { return loginAttemptsMax + 1, nil },
	}}
	err := over.loginAllowed(ctx, "a@x.io", "10.0.0.1")
	var kerr *kernel.Error
	assert.ErrorAs(t, err, &kerr)
	assert.Equal(t, http.StatusTooManyRequests, kerr.Status, "over the limit is a 429")

	down := &service{cache: &cachemocks.CacheMock{
		IncrWindowFunc: func(context.Context, string, time.Duration) (int64, error) { return 0, errors.New("valkey down") },
	}}
	err = down.loginAllowed(ctx, "a@x.io", "10.0.0.1")
	assert.ErrorAs(t, err, &kerr)
	assert.Equal(t, http.StatusServiceUnavailable, kerr.Status, "an unavailable limiter fails closed")
}
