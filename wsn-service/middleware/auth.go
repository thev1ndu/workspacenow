package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// CallerResolver turns an authenticated identity into a caller with roles and permissions.
type CallerResolver interface {
	Caller(ctx context.Context, userID string) (*kernel.Caller, error)
	CallerFromClaims(ctx context.Context, claims identity.Claims) (*kernel.Caller, error)
}

const demoTokenPrefix = "demo."

// Authenticate puts the bearer token's caller in the context; demo mode also accepts demo.<userId>.
func Authenticate(cfg config.OIDCConfig, demoMode bool, resolver CallerResolver, public func(r *http.Request) bool) Middleware {
	var verifier *jwtVerifier
	if cfg.JWKSURL != "" {
		verifier = newJWTVerifier(cfg)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if public(r) {
				next.ServeHTTP(w, r)
				return
			}
			token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !ok || token == "" {
				httpx.Error(w, r, kernel.Unauthenticated("Sign in to continue"))
				return
			}
			var (
				caller *kernel.Caller
				err    error
			)
			switch {
			case demoMode && strings.HasPrefix(token, demoTokenPrefix):
				caller, err = resolver.Caller(r.Context(), strings.TrimPrefix(token, demoTokenPrefix))
			case verifier != nil:
				var claims identity.Claims
				claims, err = verifier.verify(r.Context(), token)
				if err == nil {
					caller, err = resolver.CallerFromClaims(r.Context(), claims)
				}
			default:
				err = kernel.Unauthenticated("Sign in to continue")
			}
			if err != nil {
				if _, isAPI := kernel.AsError(err); !isAPI {
					// Token problems are the caller's; anything else is ours and is logged by httpx.
					if errors.Is(err, errInvalidToken) {
						err = kernel.Unauthenticated("Your session is not valid. Sign in again.")
					}
				}
				httpx.Error(w, r, err)
				return
			}
			next.ServeHTTP(w, r.WithContext(kernel.WithCaller(r.Context(), caller)))
		})
	}
}

var errInvalidToken = errors.New("invalid token")

// jwtVerifier checks IdP access tokens against the JWKS, refetching keys at most once a minute.
type jwtVerifier struct {
	cfg    config.OIDCConfig
	client *http.Client

	mu        sync.Mutex
	keys      map[string]any
	fetchedAt time.Time
}

func newJWTVerifier(cfg config.OIDCConfig) *jwtVerifier {
	return &jwtVerifier{cfg: cfg, client: &http.Client{Timeout: 10 * time.Second}, keys: map[string]any{}}
}

func (v *jwtVerifier) verify(ctx context.Context, raw string) (identity.Claims, error) {
	opts := []jwt.ParserOption{jwt.WithValidMethods([]string{"RS256", "RS384", "RS512", "ES256", "ES384", "PS256"}), jwt.WithExpirationRequired()}
	if v.cfg.Issuer != "" {
		opts = append(opts, jwt.WithIssuer(v.cfg.Issuer))
	}
	if v.cfg.Audience != "" {
		opts = append(opts, jwt.WithAudience(v.cfg.Audience))
	}
	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		return v.key(ctx, kid)
	}, opts...)
	if err != nil {
		return identity.Claims{}, fmt.Errorf("%w: %w", errInvalidToken, err)
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return identity.Claims{}, fmt.Errorf("%w: no subject", errInvalidToken)
	}
	out := identity.Claims{Subject: sub, Groups: []string{}}
	out.Name, _ = claims["name"].(string)
	if out.Name == "" {
		out.Name, _ = claims["preferred_username"].(string)
	}
	out.Email, _ = claims["email"].(string)
	if groups, ok := claims[v.cfg.GroupsClaim].([]any); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				out.Groups = append(out.Groups, strings.TrimPrefix(s, "/"))
			}
		}
	}
	return out, nil
}

func (v *jwtVerifier) key(ctx context.Context, kid string) (any, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if k, ok := v.keys[kid]; ok && time.Since(v.fetchedAt) < time.Hour {
		return k, nil
	}
	if time.Since(v.fetchedAt) > time.Minute || len(v.keys) == 0 {
		if err := v.refresh(ctx); err != nil {
			return nil, err
		}
	}
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, fmt.Errorf("unknown signing key %q", kid)
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func (v *jwtVerifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.cfg.JWKSURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch JWKS: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch JWKS: status %d", resp.StatusCode)
	}
	var set struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}
	keys := map[string]any{}
	for _, k := range set.Keys {
		if k.Use != "" && k.Use != "sig" {
			continue
		}
		if pub, err := k.publicKey(); err == nil {
			keys[k.Kid] = pub
		}
	}
	v.keys, v.fetchedAt = keys, time.Now()
	return nil
}

func (k jwk) publicKey() (any, error) {
	b := func(s string) (*big.Int, error) {
		raw, err := base64.RawURLEncoding.DecodeString(s)
		if err != nil {
			return nil, err
		}
		return new(big.Int).SetBytes(raw), nil
	}
	switch k.Kty {
	case "RSA":
		n, err := b(k.N)
		if err != nil {
			return nil, err
		}
		e, err := b(k.E)
		if err != nil {
			return nil, err
		}
		return &rsa.PublicKey{N: n, E: int(e.Int64())}, nil
	case "EC":
		curves := map[string]elliptic.Curve{"P-256": elliptic.P256(), "P-384": elliptic.P384(), "P-521": elliptic.P521()}
		curve, ok := curves[k.Crv]
		if !ok {
			return nil, fmt.Errorf("unsupported curve %s", k.Crv)
		}
		x, err := b(k.X)
		if err != nil {
			return nil, err
		}
		y, err := b(k.Y)
		if err != nil {
			return nil, err
		}
		size := (curve.Params().BitSize + 7) / 8
		point := make([]byte, 1+2*size)
		point[0] = 0x04
		x.FillBytes(point[1 : 1+size])
		y.FillBytes(point[1+size:])
		return ecdsa.ParseUncompressedPublicKey(curve, point)
	}
	return nil, fmt.Errorf("unsupported key type %s", k.Kty)
}
