package kernel

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
)

type OperationKind string

const (
	KindRead  OperationKind = "read"
	KindWrite OperationKind = "write"
)

// Handler runs one business operation inside the invoking transaction.
type Handler func(ctx context.Context, ec ExecutionContext, input map[string]any) (any, error)

// Operation is one governed unit of business logic.
type Operation struct {
	Name       string        `json:"name"`
	Summary    string        `json:"summary"`
	Permission string        `json:"permission"`
	Kind       OperationKind `json:"kind"`
	Entity     string        `json:"entity,omitempty"`
	Handler    Handler       `json:"-"`
}

// OperationSource supplies operations that exist only while their data does, such as entity CRUD.
type OperationSource interface {
	// Operation returns the named operation, or nil when this source does not own the name.
	Operation(ctx context.Context, name string) (*Operation, error)
	Operations(ctx context.Context) ([]Operation, error)
}

// Identified is implemented by operation outputs that name the resource they produced.
type Identified interface{ ResourceID() string }

// Engine is the single governed execution path every entry point uses.
type Engine interface {
	Register(ops ...Operation)
	AddSource(src OperationSource)
	Lookup(ctx context.Context, name string) (*Operation, error)
	List(ctx context.Context) ([]Operation, error)
	// Invoke authorizes, runs and audits an operation in one transaction with its events.
	Invoke(ctx context.Context, ec ExecutionContext, name string, input map[string]any) (any, error)
	// SetOnInvoke registers a hook called after every Invoke with the duration and outcome (SLO counters).
	SetOnInvoke(hook func(operation string, d time.Duration, failed bool))
}

type engine struct {
	db      *gorm.DB
	auditor Auditor

	mu       sync.RWMutex
	ops      map[string]Operation
	sources  []OperationSource
	onInvoke func(operation string, d time.Duration, failed bool)
}

func NewEngine(db *gorm.DB, auditor Auditor) Engine {
	return &engine{db: db, auditor: auditor, ops: map[string]Operation{}}
}

func (e *engine) SetOnInvoke(hook func(operation string, d time.Duration, failed bool)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.onInvoke = hook
}

func (e *engine) Register(ops ...Operation) {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, op := range ops {
		e.ops[op.Name] = op
	}
}

func (e *engine) AddSource(src OperationSource) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.sources = append(e.sources, src)
}

func (e *engine) Lookup(ctx context.Context, name string) (*Operation, error) {
	e.mu.RLock()
	op, ok := e.ops[name]
	sources := slices.Clone(e.sources)
	e.mu.RUnlock()
	if ok {
		return &op, nil
	}
	for _, src := range sources {
		found, err := src.Operation(ctx, name)
		if err != nil {
			return nil, err
		}
		if found != nil {
			return found, nil
		}
	}
	return nil, nil
}

func (e *engine) List(ctx context.Context) ([]Operation, error) {
	e.mu.RLock()
	out := make([]Operation, 0, len(e.ops))
	for _, op := range e.ops {
		out = append(out, op)
	}
	sources := slices.Clone(e.sources)
	e.mu.RUnlock()
	slices.SortFunc(out, func(a, b Operation) int { return strings.Compare(a.Name, b.Name) })
	for _, src := range sources {
		more, err := src.Operations(ctx)
		if err != nil {
			return nil, err
		}
		out = append(out, more...)
	}
	return out, nil
}

func (e *engine) Invoke(ctx context.Context, ec ExecutionContext, name string, input map[string]any) (any, error) {
	if input == nil {
		input = map[string]any{}
	}
	op, err := e.Lookup(ctx, name)
	if err != nil {
		return nil, err
	}
	if op == nil {
		return nil, NotFound("Unknown business operation %s", name).WithTrace(ec.TraceID)
	}
	if !ec.Permissions.Has(op.Permission) {
		if err := e.auditor.RecordDetached(ctx, ec, name, subjectOf(op), OutcomeDenied, "Missing permission "+op.Permission); err != nil {
			return nil, err
		}
		return nil, Forbidden("%s lacks permission %s for %s", ec.Actor.Name, op.Permission, name).WithTrace(ec.TraceID)
	}
	start := time.Now()
	var output any
	err = postgres.InTx(ctx, e.db, func(ctx context.Context) error {
		out, err := op.Handler(ctx, ec, input)
		if err != nil {
			return err
		}
		output = out
		return e.auditor.Record(ctx, ec, name, describeResource(op, input, out), OutcomeAllowed, "")
	})
	e.mu.RLock()
	hook := e.onInvoke
	e.mu.RUnlock()
	if hook != nil {
		hook(name, time.Since(start), err != nil)
	}
	if err == nil {
		return output, nil
	}
	apiErr, isAPI := AsError(err)
	// A nested denial was already audited by the inner Invoke.
	if isAPI && apiErr.Status == http.StatusForbidden {
		return nil, err
	}
	detail := "Unexpected error"
	if isAPI {
		detail = apiErr.Message
	}
	if auditErr := e.auditor.RecordDetached(ctx, ec, name, subjectOf(op), OutcomeFailed, detail); auditErr != nil {
		return nil, errors.Join(err, auditErr)
	}
	if isAPI && apiErr.TraceID == "" {
		return nil, apiErr.WithTrace(ec.TraceID)
	}
	return nil, fmt.Errorf("%s: %w", name, err)
}

func subjectOf(op *Operation) string {
	if op.Entity != "" {
		return op.Entity
	}
	return strings.SplitN(op.Name, ".", 2)[0]
}

func describeResource(op *Operation, input map[string]any, output any) string {
	id := ""
	if o, ok := output.(Identified); ok {
		id = o.ResourceID()
	}
	if id == "" {
		id, _ = input["id"].(string)
	}
	if id == "" {
		return subjectOf(op)
	}
	return subjectOf(op) + "/" + id
}
