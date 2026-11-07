// Package secrets reads integration credentials from OpenBao; the platform stores only their paths.
package secrets

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
)

// ErrNotFound is returned when no secret exists at a path.
var ErrNotFound = errors.New("secret not found")

// sanitizePath rejects traversal segments so a caller-controlled path stays inside the KV mount.
func sanitizePath(path string) (string, error) {
	cleaned := strings.Trim(path, "/")
	for _, seg := range strings.Split(cleaned, "/") {
		if seg == ".." || seg == "." || strings.ContainsRune(seg, 0) {
			return "", fmt.Errorf("invalid secret path %q", path)
		}
	}
	return cleaned, nil
}

// Reader reads a secret's key/value data from a path in the KV v2 mount.
type Reader interface {
	Read(ctx context.Context, path string) (map[string]string, error)
	// List returns the full references (mount/key) of secrets under prefix, without values.
	List(ctx context.Context, prefix string) ([]string, error)
}

// serviceAccountToken is where Kubernetes mounts the pod's service account token.
const serviceAccountToken = "/var/run/secrets/kubernetes.io/serviceaccount/token"

type openBao struct {
	cfg    config.OpenBaoConfig
	client *http.Client

	mu      sync.Mutex
	token   string
	expires time.Time
}

// NewOpenBao reads secrets with a static token in development, or Kubernetes auth when a role is set.
func NewOpenBao(cfg config.OpenBaoConfig) Reader {
	return &openBao{cfg: cfg, client: &http.Client{Timeout: 10 * time.Second}}
}

func (b *openBao) Read(ctx context.Context, path string) (map[string]string, error) {
	token, err := b.login(ctx)
	if err != nil {
		return nil, err
	}
	path, err = sanitizePath(strings.TrimPrefix(path, b.cfg.Mount+"/"))
	if err != nil {
		return nil, err
	}
	path = strings.TrimPrefix(path, "vault://")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/v1/%s/data/%s", strings.TrimRight(b.cfg.Addr, "/"), b.cfg.Mount, strings.TrimPrefix(path, "/")), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Vault-Token", token)
	resp, err := b.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("read secret: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("read secret: status %d", resp.StatusCode)
	}
	var body struct {
		Data struct {
			Data map[string]any `json:"data"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode secret: %w", err)
	}
	out := make(map[string]string, len(body.Data.Data))
	for k, v := range body.Data.Data {
		out[k] = fmt.Sprint(v)
	}
	return out, nil
}

// List implements KV v2 metadata LIST: full references like "<mount>/integrations/delivery-hmac".
func (b *openBao) List(ctx context.Context, prefix string) ([]string, error) {
	token, err := b.login(ctx)
	if err != nil {
		return nil, err
	}
	prefix = strings.TrimPrefix(prefix, b.cfg.Mount+"/")
	prefix = strings.TrimPrefix(prefix, "vault://")
	if prefix, err = sanitizePath(prefix); err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, "LIST", fmt.Sprintf("%s/v1/%s/metadata/%s", strings.TrimRight(b.cfg.Addr, "/"), b.cfg.Mount, strings.TrimPrefix(prefix, "/")), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Vault-Token", token)
	resp, err := b.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list secrets: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode == http.StatusNotFound {
		return []string{}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list secrets: status %d", resp.StatusCode)
	}
	var body struct {
		Data struct {
			Keys []string `json:"keys"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode secret list: %w", err)
	}
	out := make([]string, 0, len(body.Data.Keys))
	for _, k := range body.Data.Keys {
		if strings.HasSuffix(k, "/") {
			continue // subfolder; drill in with a more specific prefix
		}
		out = append(out, b.cfg.Mount+"/"+strings.TrimPrefix(prefix, "/")+k)
	}
	return out, nil
}

// login returns a token, exchanging the pod's service account token for one when a role is set.
func (b *openBao) login(ctx context.Context) (string, error) {
	if b.cfg.Role == "" {
		if b.cfg.Token == "" {
			return "", errors.New("OpenBao is not configured: set OPENBAO_ROLE or OPENBAO_TOKEN")
		}
		return b.cfg.Token, nil
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.token != "" && time.Now().Before(b.expires) {
		return b.token, nil
	}
	jwt, err := os.ReadFile(serviceAccountToken)
	if err != nil {
		return "", fmt.Errorf("read service account token: %w", err)
	}
	payload, _ := json.Marshal(map[string]string{"role": b.cfg.Role, "jwt": string(jwt)})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(b.cfg.Addr, "/")+"/v1/auth/kubernetes/login", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	resp, err := b.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("openbao login: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openbao login: status %d", resp.StatusCode)
	}
	var body struct {
		Auth struct {
			ClientToken   string `json:"client_token"`
			LeaseDuration int    `json:"lease_duration"`
		} `json:"auth"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", fmt.Errorf("decode openbao login: %w", err)
	}
	b.token = body.Auth.ClientToken
	b.expires = time.Now().Add(time.Duration(body.Auth.LeaseDuration)*time.Second - time.Minute)
	return b.token, nil
}
