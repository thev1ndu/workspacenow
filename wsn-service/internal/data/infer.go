package data

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

// InferInput is the body of POST /entities/infer.
type InferInput struct {
	Name   string `json:"name,omitempty"`
	Format string `json:"format"` // json | csv
	Data   string `json:"data"`
}

// InferredField is one proposed entity field.
type InferredField struct {
	Name       string   `json:"name"`
	Label      string   `json:"label"`
	Type       string   `json:"type"`
	Required   bool     `json:"required"`
	Unique     bool     `json:"unique"`
	EnumValues []string `json:"enumValues,omitempty"`
}

// ImportMapping maps one source column to one entity field.
type ImportMapping struct {
	Column string `json:"column"`
	Field  string `json:"field"`
}

// EntityInference is the result of POST /entities/infer.
type EntityInference struct {
	Name          string          `json:"name"`
	Fields        []InferredField `json:"fields"`
	ImportMapping []ImportMapping `json:"importMapping"`
	Rows          int             `json:"rows"`
}

var (
	dateRe  = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$`)
	intRe   = regexp.MustCompile(`^-?\d+$`)
	floatRe = regexp.MustCompile(`^-?\d+\.\d+$`)
)

// InferEntity derives an entity proposal from sample rows (JSON array of objects or CSV text).
// Deterministic: no LLM involved.
func InferEntity(in InferInput) (*EntityInference, error) {
	rows, err := parseRows(in.Format, in.Data)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no data rows found")
	}
	var cols []string
	seen := map[string]bool{}
	for _, row := range rows {
		for k := range row {
			if !seen[k] {
				seen[k] = true
				cols = append(cols, k)
			}
		}
	}
	sort.Strings(cols)

	out := &EntityInference{Rows: len(rows)}
	if in.Name != "" {
		out.Name = pascal(in.Name)
	} else {
		out.Name = "ImportedEntity"
	}
	for _, col := range cols {
		var vals []string
		empty := 0
		for _, row := range rows {
			v, ok := row[col]
			s := strings.TrimSpace(anyToString(v))
			if !ok || s == "" {
				empty++
				continue
			}
			vals = append(vals, s)
		}
		if len(vals) == 0 {
			continue // column entirely empty: skip
		}
		f := InferredField{
			Name:     camel(col),
			Label:    label(col),
			Type:     inferType(vals),
			Required: empty == 0,
			Unique:   isUnique(col, vals),
		}
		if f.Type == FieldEnum {
			f.EnumValues = distinctSorted(vals)
		}
		out.Fields = append(out.Fields, f)
		out.ImportMapping = append(out.ImportMapping, ImportMapping{Column: col, Field: f.Name})
	}
	if len(out.Fields) == 0 {
		return nil, fmt.Errorf("no usable columns found")
	}
	return out, nil
}

func parseRows(format, data string) ([]map[string]any, error) {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "json":
		var rows []map[string]any
		if err := json.Unmarshal([]byte(data), &rows); err != nil {
			return nil, fmt.Errorf("data is not a JSON array of objects: %w", err)
		}
		return rows, nil
	case "csv":
		r := csv.NewReader(strings.NewReader(data))
		r.FieldsPerRecord = -1
		recs, err := r.ReadAll()
		if err != nil {
			return nil, fmt.Errorf("data is not valid CSV: %w", err)
		}
		if len(recs) < 2 {
			return nil, fmt.Errorf("CSV needs a header row and at least one data row")
		}
		header := recs[0]
		var rows []map[string]any
		for _, rec := range recs[1:] {
			m := map[string]any{}
			for i, h := range header {
				if i < len(rec) {
					m[h] = rec[i]
				}
			}
			rows = append(rows, m)
		}
		return rows, nil
	default:
		return nil, fmt.Errorf("format must be json or csv")
	}
}

// inferType picks the narrowest field type that fits every value.
func inferType(vals []string) string {
	allBool, allInt, allNum, allDate := true, true, true, true
	totalLen := 0
	for _, v := range vals {
		switch v {
		case "true", "false", "yes", "no":
			// bool-ish
		default:
			allBool = false
		}
		if !intRe.MatchString(v) {
			allInt = false
		}
		if !intRe.MatchString(v) && !floatRe.MatchString(v) {
			allNum = false
		}
		if !dateRe.MatchString(v) {
			allDate = false
		}
		totalLen += len(v)
	}
	switch {
	case allBool:
		return FieldBoolean
	case allInt:
		return FieldInteger
	case allNum:
		return FieldNumber
	case allDate:
		return FieldDate
	}
	distinct := map[string]bool{}
	for _, v := range vals {
		distinct[v] = true
	}
	if len(distinct) <= 10 && len(distinct) < len(vals) {
		return FieldEnum
	}
	if len(vals) > 0 && totalLen/len(vals) > 80 {
		return FieldText
	}
	return FieldString
}

// isUnique marks all-distinct id-like columns (id, code, sku, email, ...) as unique.
func isUnique(col string, vals []string) bool {
	if len(vals) < 2 {
		return false
	}
	lower := strings.ToLower(col)
	idLike := strings.Contains(lower, "id") || lower == "code" || lower == "sku" ||
		strings.Contains(lower, "email") || lower == "number" || lower == "ref"
	if !idLike {
		return false
	}
	seen := map[string]bool{}
	for _, v := range vals {
		if seen[v] {
			return false
		}
		seen[v] = true
	}
	return true
}

func distinctSorted(vals []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, v := range vals {
		if !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	sort.Strings(out)
	return out
}

func anyToString(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(t)
	case nil:
		return ""
	default:
		b, _ := json.Marshal(t)
		return string(b)
	}
}

func pascal(s string) string {
	var b strings.Builder
	upper := true
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			if upper {
				b.WriteRune(unicode.ToUpper(r))
				upper = false
			} else {
				b.WriteRune(r)
			}
		} else {
			upper = true
		}
	}
	return b.String()
}

func camel(s string) string {
	p := pascal(s)
	if p == "" {
		return p
	}
	return strings.ToLower(p[:1]) + p[1:]
}

func label(s string) string {
	p := pascal(s)
	// insert spaces before capitals: "ReorderLevel" -> "Reorder Level"
	var b strings.Builder
	for i, r := range p {
		if i > 0 && unicode.IsUpper(r) {
			b.WriteRune(' ')
		}
		b.WriteRune(r)
	}
	return b.String()
}
