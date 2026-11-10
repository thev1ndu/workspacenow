package connect

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Minimal GraphQL-style gateway: supports
//   query { Entity(where: {field: value, ...}, first: N) { field ... } }
// resolved against entity records with the caller's read permission. Anything else is a
// GraphQL-style error in {"errors": [...]}.

type gqlField struct {
	name string
	args map[string]any
	body []string
}

// parseQuery extracts the top-level fields of a query document.
func parseQuery(doc string) ([]gqlField, error) {
	doc = strings.TrimSpace(doc)
	doc = strings.TrimPrefix(doc, "query")
	doc = strings.TrimSpace(doc)
	doc = strings.TrimSuffix(doc, "}")
	doc = strings.TrimPrefix(doc, "{")
	var fields []gqlField
	for _, raw := range splitTopLevel(doc) {
		f, err := parseField(strings.TrimSpace(raw))
		if err != nil {
			return nil, err
		}
		if f != nil {
			fields = append(fields, *f)
		}
	}
	if len(fields) == 0 {
		return nil, fmt.Errorf("no fields selected")
	}
	return fields, nil
}

// splitTopLevel splits into top-level field blocks; braces inside (...) args do not count.
func splitTopLevel(doc string) []string {
	var out []string
	depth, paren, start := 0, 0, 0
	for i, r := range doc {
		switch r {
		case '(':
			paren++
		case ')':
			paren--
		case '{':
			if paren == 0 {
				depth++
			}
		case '}':
			if paren == 0 {
				depth--
				if depth == 0 {
					out = append(out, doc[start:i+1])
					start = i + 1
				}
			}
		}
	}
	if rest := strings.TrimSpace(doc[start:]); rest != "" && depth == 0 {
		out = append(out, rest)
	}
	return out
}

// parseField parses `Name(arg: value, ...) { a b c }` or bare `Name`.
func parseField(s string) (*gqlField, error) {
	if s == "" {
		return nil, nil
	}
	name := s
	args := map[string]any{}
	body := []string{}
	if i := strings.IndexAny(s, "({"); i >= 0 {
		name = strings.TrimSpace(s[:i])
		rest := s[i:]
		if strings.HasPrefix(rest, "(") {
			j := strings.Index(rest, ")")
			if j < 0 {
				return nil, fmt.Errorf("unclosed args in %q", s)
			}
			args = parseArgs(rest[1:j])
			rest = rest[j+1:]
		}
		rest = strings.TrimSpace(rest)
		if strings.HasPrefix(rest, "{") && strings.HasSuffix(rest, "}") {
			body = strings.Fields(rest[1 : len(rest)-1])
		}
	}
	if name == "" {
		return nil, fmt.Errorf("empty field name")
	}
	return &gqlField{name: name, args: args, body: body}, nil
}

func parseArgs(s string) map[string]any {
	out := map[string]any{}
	for _, pair := range splitArgs(s) {
		kv := strings.SplitN(strings.TrimSpace(pair), ":", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		val := strings.TrimSpace(kv[1])
		out[key] = parseValue(val)
	}
	return out
}

// splitArgs splits on top-level commas, ignoring commas inside {} or "".
func splitArgs(s string) []string {
	var out []string
	depth, start, inStr := 0, 0, false
	for i, r := range s {
		switch {
		case r == '"':
			inStr = !inStr
		case inStr:
		case r == '{':
			depth++
		case r == '}':
			depth--
		case r == ',' && depth == 0:
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	if rest := strings.TrimSpace(s[start:]); rest != "" {
		out = append(out, rest)
	}
	return out
}

func parseValue(val string) any {
	if strings.HasPrefix(val, "{") && strings.HasSuffix(val, "}") {
		return parseArgs(val[1 : len(val)-1])
	}
	if strings.HasPrefix(val, `"`) {
		return strings.Trim(val, `"`)
	}
	if n, err := strconv.Atoi(val); err == nil {
		return n
	}
	if f, err := strconv.ParseFloat(val, 64); err == nil {
		return f
	}
	if val == "true" || val == "false" {
		return val == "true"
	}
	return val
}

// graphql resolves a parsed field list against entity records.
func (s *service) graphql(ctx context.Context, ec kernel.ExecutionContext, fields []gqlField) (map[string]any, []map[string]string) {
	out := map[string]any{}
	var errs []map[string]string
	for _, f := range fields {
		// each field reads an entity, so it needs that entity's read permission like the records API
		if e, err := s.rt.Entity(ctx, f.name); err == nil {
			if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, "graphql.query", "entity/"+f.name); err != nil {
				errs = append(errs, map[string]string{"message": err.Error()})
				continue
			}
		}
		records, err := s.rt.RecordsAs(ctx, ec, f.name, false)
		if err != nil {
			if apiErr, ok := kernel.AsError(err); ok && apiErr.Status == http.StatusNotFound {
				errs = append(errs, map[string]string{"message": err.Error()})
				continue
			}
			errs = append(errs, map[string]string{"message": err.Error()})
			continue
		}
		// where: {field: value}
		if w, ok := f.args["where"]; ok {
			if wm, ok := w.(map[string]any); ok {
				records = filterRecords(records, wm)
			}
		}
		if n, ok := f.args["first"]; ok {
			if limit, ok := toInt(n); ok && limit < len(records) {
				records = records[:limit]
			}
		}
		rows := make([]map[string]any, 0, len(records))
		for _, r := range records {
			row := map[string]any{"id": r.ID}
			for _, bf := range f.body {
				if v, ok := r.Values[bf]; ok {
					row[bf] = v
				}
			}
			rows = append(rows, row)
		}
		out[f.name] = rows
	}
	return out, errs
}

func filterRecords(records []data.Record, where map[string]any) []data.Record {
	out := make([]data.Record, 0, len(records))
	for _, r := range records {
		ok := true
		for k, v := range where {
			if fmt.Sprint(r.Values[k]) != fmt.Sprint(v) {
				ok = false
				break
			}
		}
		if ok {
			out = append(out, r)
		}
	}
	return out
}

func toInt(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case float64:
		return int(n), true
	}
	return 0, false
}
