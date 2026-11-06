package data

import (
	"context"
	"fmt"
	"math"
	"slices"
	"strconv"
	"strings"
)

// checks answers the questions validation needs from storage.
type checks interface {
	recordExists(ctx context.Context, entity, id string) (bool, error)
	valueTaken(ctx context.Context, entity, field string, value any, exceptID string) (bool, error)
}

// withDefaults fills missing or empty values from each field's default, on create only.
func withDefaults(e *Entity, values map[string]any) map[string]any {
	out := make(map[string]any, len(values))
	for k, v := range values {
		out[k] = v
	}
	for _, f := range e.Fields {
		if v, ok := out[f.Name]; (!ok || v == "") && f.DefaultValue != nil {
			out[f.Name] = f.DefaultValue
		}
	}
	return out
}

// validate normalizes values against the entity's fields, keeping only declared fields.
func validate(ctx context.Context, c checks, e *Entity, values map[string]any, recordID string) (map[string]any, error) {
	var problems []string
	out := make(map[string]any, len(e.Fields))
	for _, f := range e.Fields {
		raw := values[f.Name]
		if raw == nil || raw == "" {
			if f.Required {
				problems = append(problems, f.Label+" is required")
			}
			out[f.Name] = nil
			continue
		}
		switch f.Type {
		case FieldNumber, FieldInteger:
			n, ok := toNumber(raw)
			switch {
			case !ok:
				problems = append(problems, f.Label+" must be a number")
			case f.Type == FieldInteger && n != math.Trunc(n):
				problems = append(problems, f.Label+" must be a whole number")
			}
			out[f.Name] = n
		case FieldBoolean:
			out[f.Name] = raw == true || raw == "true"
		case FieldEnum:
			s := fmt.Sprint(raw)
			if !slices.Contains(f.EnumValues, s) {
				problems = append(problems, fmt.Sprintf("%s must be one of %s", f.Label, strings.Join(f.EnumValues, ", ")))
			}
			out[f.Name] = s
		case FieldReference:
			s := fmt.Sprint(raw)
			exists, err := c.recordExists(ctx, f.Reference, s)
			if err != nil {
				return nil, err
			}
			if !exists {
				problems = append(problems, fmt.Sprintf("%s references a missing %s", f.Label, f.Reference))
			}
			out[f.Name] = s
		default:
			out[f.Name] = fmt.Sprint(raw)
		}
		if f.Unique {
			taken, err := c.valueTaken(ctx, e.Name, f.Name, out[f.Name], recordID)
			if err != nil {
				return nil, err
			}
			if taken {
				problems = append(problems, f.Label+" must be unique")
			}
		}
	}
	if len(problems) > 0 {
		return nil, invalid(problems)
	}
	return out, nil
}

func toNumber(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, !math.IsNaN(n)
	case int:
		return float64(n), true
	case bool:
		if n {
			return 1, true
		}
		return 0, true
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(n), 64)
		return f, err == nil
	}
	return 0, false
}
