package data

import (
	"context"
	"fmt"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

var verbs = []string{"list", "get", "create", "update", "delete"}

// operationSource gives every entity its generated CRUD operations, guarded by the entity's permissions.
type operationSource struct{ rt Runtime }

func NewOperationSource(rt Runtime) kernel.OperationSource { return &operationSource{rt: rt} }

func (s *operationSource) Operation(ctx context.Context, name string) (*kernel.Operation, error) {
	entityName, verb, ok := strings.Cut(name, ".")
	if !ok || entityName == "" || entityName[0] < 'A' || entityName[0] > 'Z' {
		return nil, nil
	}
	e, err := s.rt.Entity(ctx, entityName)
	if err != nil {
		if apiErr, ok := kernel.AsError(err); ok && apiErr.Code == kernel.CodeNotFound {
			return nil, nil
		}
		return nil, err
	}
	return entityOperation(s.rt, e, verb), nil
}

func (s *operationSource) Operations(ctx context.Context) ([]kernel.Operation, error) {
	entities, err := s.rt.Entities(ctx)
	if err != nil {
		return nil, err
	}
	var out []kernel.Operation
	for i := range entities {
		for _, verb := range verbs {
			out = append(out, *entityOperation(s.rt, &entities[i], verb))
		}
	}
	return out, nil
}

func entityOperation(rt Runtime, e *Entity, verb string) *kernel.Operation {
	op := &kernel.Operation{Name: e.Name + "." + verb, Entity: e.Name, Kind: kernel.KindWrite, Permission: e.WritePermission}
	name := e.Name
	switch verb {
	case "list":
		op.Summary, op.Kind, op.Permission = "List "+e.Label+" records", kernel.KindRead, e.ReadPermission
		op.Handler = func(ctx context.Context, _ kernel.ExecutionContext, _ map[string]any) (any, error) {
			return rt.Records(ctx, name)
		}
	case "get":
		op.Summary, op.Kind, op.Permission = "Get a "+e.Label+" record", kernel.KindRead, e.ReadPermission
		op.Handler = func(ctx context.Context, _ kernel.ExecutionContext, in map[string]any) (any, error) {
			return rt.Record(ctx, name, fmt.Sprint(in["id"]))
		}
	case "create":
		op.Summary = "Create a " + e.Label + " record"
		op.Handler = func(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
			return rt.Create(ctx, ec, name, valuesOf(in))
		}
	case "update":
		op.Summary = "Update a " + e.Label + " record"
		op.Handler = func(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
			return rt.Update(ctx, ec, name, fmt.Sprint(in["id"]), valuesOf(in))
		}
	case "delete":
		op.Summary = "Delete a " + e.Label + " record"
		op.Handler = func(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
			return rt.Delete(ctx, ec, name, fmt.Sprint(in["id"]))
		}
	default:
		return nil
	}
	return op
}

func valuesOf(in map[string]any) map[string]any {
	if v, ok := in["values"].(map[string]any); ok {
		return v
	}
	return map[string]any{}
}
