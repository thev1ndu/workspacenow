package data

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// ViewFromTextResult is the response of POST /entities/{name}/views/from-text.
type ViewFromTextResult struct {
	View        *SavedView `json:"view"`
	Explanation string     `json:"explanation"`
}

var (
	nlSortRe  = regexp.MustCompile(`(?:ordered|order|sorted)\s+by\s+([a-z0-9_ ]+?)(?:\s+(asc|desc|ascending|descending))?(?:\s|,|\.|$)`)
	nlLimitRe = regexp.MustCompile(`(?:limit|top|first)\s+(\d+)`)
	nlNumRe   = regexp.MustCompile(`-?\d+(?:\.\d+)?`)
	nlQuoteRe = regexp.MustCompile(`"([^"]+)"|'([^']+)'`)
)

// opPhrases maps natural-language comparison phrases to FilterOp ops, longest first.
var opPhrases = []struct {
	phrase string
	op     string
}{
	{"less than or equal to", "lte"},
	{"greater than or equal to", "gte"},
	{"at least", "gte"},
	{"at most", "lte"},
	{"not equal to", "neq"},
	{"less than", "lt"},
	{"greater than", "gt"},
	{"below", "lt"},
	{"under", "lt"},
	{"above", "gt"},
	{"over", "gt"},
	{"more than", "gt"},
	{"contains", "contains"},
	{"equal to", "eq"},
	{"equals", "eq"},
	{"is", "eq"},
	{"=", "eq"},
	{"<", "lt"},
	{">", "gt"},
	{"<=", "lte"},
	{">=", "gte"},
	{"!=", "neq"},
}

// ViewFromText parses a natural-language phrase into a SavedView using rule-based parsing.
// Supported shapes: "<field> below 10", "below reorder level", "stock below 10 ordered by supplier desc, limit 20".
func ViewFromText(e Entity, text string) (*SavedView, string, error) {
	lower := strings.ToLower(text)

	var sortField string
	sortDesc := false
	if m := nlSortRe.FindStringSubmatch(lower); m != nil {
		if f := matchField(e, strings.TrimSpace(m[1])); f != nil {
			sortField = f.Name
			sortDesc = strings.HasPrefix(m[2], "desc")
		}
	}
	limit := 0
	if m := nlLimitRe.FindStringSubmatch(lower); m != nil {
		limit, _ = strconv.Atoi(m[1])
		if limit > 200 {
			limit = 200
		}
	}

	var filters []FilterOp
	for _, f := range e.Fields {
		for _, variant := range fieldVariants(f) {
			idx := strings.Index(lower, variant)
			if idx < 0 {
				continue
			}
			op, value, ok := parseCondition(lower, idx, len(variant))
			if !ok {
				continue
			}
			filters = append(filters, FilterOp{Field: f.Name, Op: op, Value: value})
			break
		}
	}
	if len(filters) == 0 {
		return nil, "", fmt.Errorf("could not find a condition on any field of %s; try \"<field> below 10\" or \"<field> contains 'x'\"", e.Name)
	}

	name := "NL: " + text
	if len(name) > 63 {
		name = name[:60] + "..."
	}
	v := &SavedView{
		Name:      name,
		Filters:   filters,
		SortField: sortField,
		SortDesc:  sortDesc,
		Limit:     limit,
	}
	return v, explainView(e, v), nil
}

// fieldVariants returns the lowercase match variants of a field: its name and label.
func fieldVariants(f Field) []string {
	out := []string{strings.ToLower(f.Name)}
	if f.Label != "" {
		out = append(out, strings.ToLower(f.Label))
	}
	return out
}

// matchField finds the entity field whose name or label matches s.
func matchField(e Entity, s string) *Field {
	s = strings.ToLower(strings.TrimSpace(s))
	for i := range e.Fields {
		for _, variant := range fieldVariants(e.Fields[i]) {
			if variant == s {
				return &e.Fields[i]
			}
		}
	}
	// tolerate partial: "supplier" matches field "supplierId"
	for i := range e.Fields {
		for _, variant := range fieldVariants(e.Fields[i]) {
			if strings.HasPrefix(variant, s) || strings.HasPrefix(s, variant) {
				return &e.Fields[i]
			}
		}
	}
	return nil
}

// parseCondition extracts the comparison op and value around the field occurrence at idx.
// The op phrase must sit directly before the field ("below stock 10") or directly after it
// ("stock below 10"); the value is the first quoted string or number beyond the op.
func parseCondition(lower string, idx, fieldLen int) (op string, value any, ok bool) {
	before := lower[max(0, idx-30):idx]
	after := ""
	if idx+fieldLen <= len(lower) {
		after = lower[idx+fieldLen:]
	}
	trimmedBefore := strings.TrimRight(before, " ")
	for _, p := range opPhrases {
		if strings.HasSuffix(trimmedBefore, p.phrase) {
			v := extractValue(after)
			if v == nil {
				return "", nil, false
			}
			return p.op, v, true
		}
	}
	afterWindow := after
	if len(afterWindow) > 15 {
		afterWindow = afterWindow[:15]
	}
	for _, p := range opPhrases {
		if i := strings.Index(afterWindow, p.phrase); i >= 0 {
			v := extractValue(afterWindow[i+len(p.phrase):])
			if v == nil {
				return "", nil, false
			}
			return p.op, v, true
		}
	}
	return "", nil, false
}

// extractValue pulls the first quoted string or number out of s; nil when there is none.
func extractValue(s string) any {
	if m := nlQuoteRe.FindStringSubmatch(s); m != nil {
		if m[1] != "" {
			return m[1]
		}
		return m[2]
	}
	if m := nlNumRe.FindString(s); m != "" {
		if strings.Contains(m, ".") {
			f, err := strconv.ParseFloat(m, 64)
			if err == nil {
				return f
			}
		}
		n, err := strconv.Atoi(m)
		if err == nil {
			return n
		}
	}
	return nil
}

func explainView(e Entity, v *SavedView) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Shows %s where ", e.Label)
	for i, f := range v.Filters {
		if i > 0 {
			b.WriteString(" and ")
		}
		fmt.Fprintf(&b, "%s %s %v", f.Field, f.Op, f.Value)
	}
	if v.SortField != "" {
		dir := "ascending"
		if v.SortDesc {
			dir = "descending"
		}
		fmt.Fprintf(&b, ", ordered by %s %s", v.SortField, dir)
	}
	if v.Limit > 0 {
		fmt.Fprintf(&b, ", limit %d", v.Limit)
	}
	return b.String()
}
