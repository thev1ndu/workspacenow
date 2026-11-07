package connect

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
)

// AuthConfig is how an integration authenticates to its target.
type AuthConfig struct {
	Type            string   `json:"type"` // "none", "bearer", "oauth2"
	Token           string   `json:"token,omitempty"`
	TokenURL        string   `json:"tokenUrl,omitempty"` // oauth2 client credentials / refresh
	ClientID        string   `json:"clientId,omitempty"`
	ClientSecretRef string   `json:"clientSecretRef,omitempty"` // OpenBao ref resolved by the caller
	Scopes          []string `json:"scopes,omitempty"`
	RefreshToken    string   `json:"refreshToken,omitempty"` // for refresh_token grants
}

// tokenResponse is the OAuth2 token endpoint's answer.
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
}

// tokenSource fetches and caches OAuth2 client-credentials tokens in Valkey.
type tokenSource struct {
	cache cache.Cache
	http  *http.Client
}

func newTokenSource(c cache.Cache, httpClient *http.Client) *tokenSource {
	return &tokenSource{cache: c, http: httpClient}
}

// token returns a valid access token for the auth config, fetching and caching when needed.
func (t *tokenSource) token(ctx context.Context, auth *AuthConfig, clientSecret string) (string, error) {
	if auth == nil || auth.Type != "oauth2" {
		return "", nil
	}
	cacheKey := "wsn:oauth2:" + auth.TokenURL + ":" + auth.ClientID
	if v, found, err := t.cache.Get(ctx, cacheKey); err == nil && found && v != "" {
		return v, nil
	}
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {auth.ClientID},
		"client_secret": {clientSecret},
	}
	if len(auth.Scopes) > 0 {
		form.Set("scope", strings.Join(auth.Scopes, " "))
	}
	if auth.RefreshToken != "" {
		form.Set("grant_type", "refresh_token")
		form.Set("refresh_token", auth.RefreshToken)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, auth.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := t.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token endpoint answered %d", resp.StatusCode)
	}
	var tr tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return "", fmt.Errorf("decode token response: %w", err)
	}
	if tr.AccessToken == "" {
		return "", fmt.Errorf("token endpoint returned no access_token")
	}
	ttl := time.Duration(tr.ExpiresIn-60) * time.Second
	if ttl < time.Minute {
		ttl = time.Minute
	}
	_ = t.cache.SetJSON(ctx, cacheKey, tr.AccessToken, ttl)
	return tr.AccessToken, nil
}
