// Package kernel holds what every entry point shares: actor, permissions, trace and audit.
package kernel

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"slices"
	"strings"
)

type ActorKind string

const (
	ActorUser     ActorKind = "user"
	ActorAgent    ActorKind = "agent"
	ActorWorkflow ActorKind = "workflow"
	ActorSystem   ActorKind = "system"
)

// Actor is whoever performed an action.
type Actor struct {
	Kind       ActorKind `json:"kind"`
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	OnBehalfOf string    `json:"onBehalfOf,omitempty"`
}

// EntryPoint is the interface through which an action was attempted.
type EntryPoint string

const (
	EntryStudio   EntryPoint = "studio"
	EntryAPI      EntryPoint = "api"
	EntryMCP      EntryPoint = "mcp"
	EntryAgent    EntryPoint = "agent"
	EntryWorkflow EntryPoint = "workflow"
	EntryControl  EntryPoint = "control"
	EntrySystem   EntryPoint = "system"
)

// Permissions is a set of permission names.
type Permissions map[string]struct{}

func NewPermissions(names ...string) Permissions {
	p := make(Permissions, len(names))
	for _, n := range names {
		p[n] = struct{}{}
	}
	return p
}

func (p Permissions) Has(name string) bool {
	_, ok := p[name]
	return ok
}

// Intersect returns the permissions held by both sets.
func (p Permissions) Intersect(other Permissions) Permissions {
	out := Permissions{}
	for n := range p {
		if other.Has(n) {
			out[n] = struct{}{}
		}
	}
	return out
}

// List returns the permission names, sorted.
func (p Permissions) List() []string {
	out := make([]string, 0, len(p))
	for n := range p {
		out = append(out, n)
	}
	slices.Sort(out)
	return out
}

// ExecutionContext is everything an attempted action is judged and audited by.
type ExecutionContext struct {
	Actor       Actor
	Permissions Permissions
	TraceID     string
	EntryPoint  EntryPoint
}

// Caller is the authenticated user behind a request.
type Caller struct {
	UserID      string
	Name        string
	Roles       []string
	Permissions Permissions
}

// Context returns the caller's execution context; an empty traceID starts a new trace.
func (c *Caller) Context(entry EntryPoint, traceID string) ExecutionContext {
	if traceID == "" {
		traceID = NewTraceID()
	}
	return ExecutionContext{
		Actor:       Actor{Kind: ActorUser, ID: c.UserID, Name: c.Name},
		Permissions: c.Permissions,
		TraceID:     traceID,
		EntryPoint:  entry,
	}
}

type callerKey struct{}

func WithCaller(ctx context.Context, c *Caller) context.Context {
	return context.WithValue(ctx, callerKey{}, c)
}

// CallerFrom returns the authenticated caller; the auth middleware guarantees one on protected routes.
func CallerFrom(ctx context.Context) (*Caller, bool) {
	c, ok := ctx.Value(callerKey{}).(*Caller)
	return c, ok
}

var idEncoding = base32.NewEncoding("0123456789abcdefghijklmnopqrstuv").WithPadding(base32.NoPadding)

// NewID returns a new identifier such as "evt-3k9d0q2m1a".
func NewID(prefix string) string {
	b := make([]byte, 7)
	_, _ = rand.Read(b)
	return prefix + "-" + strings.ToLower(idEncoding.EncodeToString(b))
}

func NewTraceID() string { return NewID("trace") }
