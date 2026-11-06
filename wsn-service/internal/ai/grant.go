package ai

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Errors the grant check reports to the ai-service as an ErrorBody.
var (
	ErrGrantMalformed = errors.New("The run grant is not valid")
	ErrGrantExpired   = errors.New("The run grant has expired")
)

// Grant is everything the ai-service may do for one agent run. It travels as one
// signed token; the internal tool API accepts a call only when the grant stands.
type Grant struct {
	RunID         string    `json:"runId"` // also the AgentRun id
	TraceID       string    `json:"traceId"`
	AgentID       string    `json:"agentId"`
	AgentName     string    `json:"agentName"`
	OnBehalfOf    string    `json:"onBehalfOf,omitempty"` // caller's name for acts-as-caller runs
	Permissions   []string  `json:"permissions"`          // agent intersect caller for acts-as-caller
	Tools         []string  `json:"tools"`                // MCP tool names this run may call
	ApplicationID string    `json:"applicationId,omitempty"`
	Budget        int       `json:"budget"`                // tool calls the run may still make
	ExpiresAt     time.Time `json:"expiresAt"` // RFC 3339; checked against Verify's clock
}

// Signer issues run grants with the platform's Ed25519 run grant key.
type Signer struct {
	key ed25519.PrivateKey
}

// GenerateSigner creates a fresh key pair, for a process with no configured key.
func GenerateSigner() *Signer {
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		panic("ai: generate run grant key: " + err.Error())
	}
	return &Signer{key: priv}
}

// LoadSigner reads the base64 Ed25519 seed (32 bytes) from RUN_GRANT_KEY.
func LoadSigner(seedB64 string) (*Signer, error) {
	if seedB64 == "" {
		return nil, errors.New("the run grant key is empty")
	}
	seed, err := base64.StdEncoding.DecodeString(seedB64)
	if err != nil {
		return nil, fmt.Errorf("decode base64 seed: %w", err)
	}
	if len(seed) != ed25519.SeedSize {
		return nil, fmt.Errorf("the seed is %d bytes, want %d", len(seed), ed25519.SeedSize)
	}
	return &Signer{key: ed25519.NewKeyFromSeed(seed)}, nil
}

// Verifier checks run grants issued by the matching signer.
type Verifier struct{ pub ed25519.PublicKey }

// Verifier returns the public half of the signer.
func (s *Signer) Verifier() *Verifier { return &Verifier{pub: s.key.Public().(ed25519.PublicKey)} }

// Sign renders the grant as <base64url(payload)>.<base64url(signature)>.
func (s *Signer) Sign(g Grant) (string, error) {
	payload, err := json.Marshal(g)
	if err != nil {
		return "", fmt.Errorf("encode grant: %w", err)
	}
	sig := ed25519.Sign(s.key, payload)
	return base64.RawURLEncoding.EncodeToString(payload) + "." + base64.RawURLEncoding.EncodeToString(sig), nil
}

// Verify parses and checks the token. Its clock is the returned error's author.
func (v *Verifier) Verify(token string) (*Grant, error) {
	payloadB64, sigB64, ok := strings.Cut(token, ".")
	if !ok {
		return nil, ErrGrantMalformed
	}
	payload, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, ErrGrantMalformed
	}
	sig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return nil, ErrGrantMalformed
	}
	if !ed25519.Verify(v.pub, payload, sig) {
		return nil, ErrGrantMalformed
	}
	var g Grant
	if err := json.Unmarshal(payload, &g); err != nil {
		return nil, ErrGrantMalformed
	}
	if !g.ExpiresAt.After(time.Now().UTC()) {
		return nil, ErrGrantExpired
	}
	return &g, nil
}

// Permits reports whether the grant names the tool; nil slices permit nothing.
func (g *Grant) Permits(tool string) bool {
	for _, t := range g.Tools {
		if t == tool {
			return true
		}
	}
	return false
}

// ExecutionContext rebuilds the run's execution context for a tool call.
// func (g *Grant) ExecutionContext() kernel.ExecutionContext { ... } is in internal.go,
// which keeps this file free of kernel imports.
