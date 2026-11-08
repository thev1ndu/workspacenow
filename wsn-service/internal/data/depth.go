package data

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// diffValues returns the field-level changes between two value maps: every key whose
// value differs, plus removed keys as nil.
func diffValues(before, after map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range after {
		if b, ok := before[k]; !ok || !equalValue(b, v) {
			out[k] = v
		}
	}
	for k := range before {
		if _, ok := after[k]; !ok {
			out[k] = nil
		}
	}
	return out
}

func equalValue(a, b any) bool {
	return fmt.Sprint(a) == fmt.Sprint(b) && typeOf(a) == typeOf(b)
}

func typeOf(v any) string {
	switch v.(type) {
	case nil:
		return "nil"
	case bool:
		return "bool"
	case float64, float32, int, int64:
		return "number"
	case string:
		return "string"
	default:
		return "other"
	}
}

// resolveActorValue expands "$actor.*" references in a row filter value.
func resolveActorValue(v any, actor kernel.Actor) any {
	s, ok := v.(string)
	if !ok {
		return v
	}
	switch s {
	case "$actor.id":
		return actor.ID
	case "$actor.name":
		return actor.Name
	case "$actor.kind":
		return string(actor.Kind)
	}
	return s
}

// rowFilterCond turns an entity's row filter into a SQL condition over the values JSONB,
// with the actor references resolved. Empty when the entity has no filter.
func rowFilterCond(e *Entity, actor kernel.Actor) (string, []any) {
	if e.RowFilter == nil || e.RowFilter.Field == "" {
		return "", nil
	}
	f := e.RowFilter
	val := resolveActorValue(f.Value, actor)
	switch f.Op {
	case "eq":
		b, err := jsonMarshal(val)
		if err != nil {
			return "1 = 0", nil // unresolvable value matches nothing
		}
		return "values -> ? = ?::jsonb", []any{f.Field, string(b)}
	case "neq":
		b, _ := jsonMarshal(val)
		return "(values -> ? IS NULL OR values -> ? <> ?::jsonb)", []any{f.Field, f.Field, string(b)}
	case "in":
		list, ok := val.([]any)
		if !ok {
			return "1 = 0", nil
		}
		var args []any
		placeholders := make([]string, 0, len(list))
		for _, item := range list {
			b, _ := jsonMarshal(item)
			placeholders = append(placeholders, "?::jsonb")
			args = append(args, string(b))
		}
		return "values -> ? IN (" + strings.Join(placeholders, ",") + ")", append([]any{f.Field}, args...)
	}
	return "", nil
}

// viewCond turns a saved view's filters into one SQL condition over values JSONB.
func viewCond(filters []FilterOp) (string, []any, error) {
	var conds []string
	var args []any
	for _, f := range filters {
		if f.Field == "" {
			return "", nil, fmt.Errorf("a filter needs a field")
		}
		b, err := jsonMarshal(f.Value)
		if err != nil {
			return "", nil, fmt.Errorf("filter %s: %w", f.Field, err)
		}
		switch f.Op {
		case "eq":
			conds = append(conds, "values -> ? = ?::jsonb")
			args = append(args, f.Field, string(b))
		case "neq":
			conds = append(conds, "(values -> ? IS NULL OR values -> ? <> ?::jsonb)")
			args = append(args, f.Field, f.Field, string(b))
		case "gt", "gte", "lt", "lte":
			op := map[string]string{"gt": ">", "gte": ">=", "lt": "<", "lte": "<="}[f.Op]
			conds = append(conds, "(values ->> ?)::numeric "+op+" ?")
			args = append(args, f.Field, fmt.Sprint(f.Value))
		case "contains":
			conds = append(conds, "values ->> ? ILIKE ?")
			args = append(args, f.Field, "%"+fmt.Sprint(f.Value)+"%")
		case "in":
			list, ok := f.Value.([]any)
			if !ok || len(list) == 0 {
				return "", nil, fmt.Errorf("filter %s: 'in' needs a non-empty list", f.Field)
			}
			var ph []string
			for _, item := range list {
				ib, _ := jsonMarshal(item)
				ph = append(ph, "?::jsonb")
				args = append(args, string(ib))
			}
			conds = append(conds, "values -> ? IN ("+strings.Join(ph, ",")+")")
			args = append([]any{f.Field}, args...)
		default:
			return "", nil, fmt.Errorf("filter %s: unknown op %q", f.Field, f.Op)
		}
	}
	if len(conds) == 0 {
		return "", nil, nil
	}
	return "(" + strings.Join(conds, " AND ") + ")", args, nil
}

// planMigration validates a schema migration against an entity and the record count.
// drop/retype need an empty table; add is always fine. Returns the new field list and problems.
func planMigration(e *Entity, recordCount int, m SchemaMigration) ([]Field, map[string]any, []string) {
	var problems []string
	fields := make([]Field, 0, len(e.Fields)+len(m.Add))
	fields = append(fields, e.Fields...)
	has := func(name string) bool {
		for _, f := range fields {
			if f.Name == name {
				return true
			}
		}
		return false
	}
	for _, f := range m.Add {
		if has(f.Name) {
			problems = append(problems, f.Name+": field already exists")
			continue
		}
		fields = append(fields, f)
	}
	for _, name := range m.Drop {
		if !has(name) {
			problems = append(problems, name+": no such field")
			continue
		}
		if recordCount > 0 {
			problems = append(problems, name+": cannot drop a field while the entity holds "+strconv.Itoa(recordCount)+" records; archive them first")
			continue
		}
		fields = removeField(fields, name)
	}
	for _, f := range m.Retype {
		i := -1
		for j, cur := range fields {
			if cur.Name == f.Name {
				i = j
			}
		}
		if i < 0 {
			problems = append(problems, f.Name+": no such field")
			continue
		}
		if fields[i].Type == f.Type {
			continue
		}
		if recordCount > 0 {
			problems = append(problems, f.Name+": cannot retype while the entity holds records; backfill and archive first")
			continue
		}
		fields[i].Type = f.Type
		fields[i].EnumValues = f.EnumValues
	}
	backfill := map[string]any{}
	for k, v := range m.Backfill {
		if has(k) {
			backfill[k] = v
		} else {
			problems = append(problems, "backfill "+k+": no such field")
		}
	}
	return fields, backfill, problems
}

func removeField(fields []Field, name string) []Field {
	out := make([]Field, 0, len(fields))
	for _, f := range fields {
		if f.Name != name {
			out = append(out, f)
		}
	}
	return out
}

// recordsToCSV renders records as CSV: the entity's field names as header, one row per record.
func recordsToCSV(e *Entity, records []Record) (string, error) {
	var b strings.Builder
	w := csv.NewWriter(&b)
	header := make([]string, 0, len(e.Fields)+1)
	header = append(header, "id")
	for _, f := range e.Fields {
		header = append(header, f.Name)
	}
	if err := w.Write(header); err != nil {
		return "", err
	}
	for _, r := range records {
		row := make([]string, 0, len(header))
		row = append(row, r.ID)
		for _, f := range e.Fields {
			row = append(row, csvCell(r.Values[f.Name]))
		}
		if err := w.Write(row); err != nil {
			return "", err
		}
	}
	w.Flush()
	return b.String(), w.Error()
}

func csvCell(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	default:
		return fmt.Sprint(t)
	}
}

// csvToValues parses CSV text (header row of field names, optional leading id column) into values maps.
func csvToValues(e *Entity, text string) ([]map[string]any, error) {
	r := csv.NewReader(strings.NewReader(text))
	rows, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parse csv: %w", err)
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("empty csv")
	}
	header := rows[0]
	idCol := -1
	if len(header) > 0 && header[0] == "id" {
		idCol = 0
	}
	cols := map[string]int{}
	for i, h := range header {
		if i != idCol {
			cols[h] = i
		}
	}
	fieldType := map[string]string{}
	for _, f := range e.Fields {
		fieldType[f.Name] = f.Type
	}
	out := make([]map[string]any, 0, len(rows)-1)
	for _, row := range rows[1:] {
		values := map[string]any{}
		for name, i := range cols {
			if i >= len(row) || row[i] == "" {
				continue
			}
			values[name] = coerce(fieldType[name], row[i])
		}
		out = append(out, values)
	}
	return out, nil
}

func coerce(typ, raw string) any {
	switch typ {
	case FieldNumber, FieldInteger:
		if n, err := strconv.ParseFloat(raw, 64); err == nil {
			return n
		}
	case FieldBoolean:
		if b, err := strconv.ParseBool(raw); err == nil {
			return b
		}
	}
	return raw
}

func jsonMarshal(v any) ([]byte, error) { return json.Marshal(v) }

// CreateViewFromText parses a natural-language phrase into a saved view and stores it.
func (s *service) CreateViewFromText(ctx context.Context, ec kernel.ExecutionContext, entity, text string) (*ViewFromTextResult, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(text) == "" {
		return nil, kernel.Invalid("text must not be empty")
	}
	v, explanation, err := ViewFromText(*e, text)
	if err != nil {
		return nil, kernel.Invalid("%s", err.Error())
	}
	saved, err := s.CreateView(ctx, ec, entity, *v)
	if err != nil {
		return nil, err
	}
	return &ViewFromTextResult{View: saved, Explanation: explanation}, nil
}

// InferEntitySchema proposes an entity from sample data. Requires data.manage.
func (s *service) InferEntitySchema(ctx context.Context, ec kernel.ExecutionContext, in InferInput) (*EntityInference, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", "entity.infer", "entities"); err != nil {
		return nil, err
	}
	out, err := InferEntity(in)
	if err != nil {
		return nil, kernel.Invalid("%s", err.Error())
	}
	_ = s.auditor.Record(ctx, ec, "entity.infer", "entities", kernel.OutcomeAllowed,
		fmt.Sprintf("%s: %d fields from %d rows", out.Name, len(out.Fields), out.Rows))
	return out, nil
}
