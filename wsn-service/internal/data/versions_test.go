package data

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDiffEntityDocs(t *testing.T) {
	from := map[string]any{"fields": []any{
		map[string]any{"name": "sku", "label": "SKU", "type": "string", "required": true},
		map[string]any{"name": "price", "label": "Price", "type": "number"},
		map[string]any{"name": "legacy", "label": "Legacy", "type": "string"},
	}}
	to := map[string]any{"fields": []any{
		map[string]any{"name": "sku", "label": "SKU", "type": "string", "required": true},
		map[string]any{"name": "price", "label": "Unit price", "type": "number"},
		map[string]any{"name": "currency", "label": "Currency", "type": "enum", "enumValues": []any{"LKR", "USD"}},
	}}
	d := diffEntityDocs(1, 2, from, to)
	assert.Equal(t, 1, d.From)
	assert.Equal(t, 2, d.To)
	assert.Equal(t, []string{"currency"}, d.Added)
	assert.Equal(t, []string{"legacy"}, d.Removed)
	assert.Len(t, d.Changed, 1)
	assert.Equal(t, "price", d.Changed[0].Field)
	// identical docs -> empty diff
	same := diffEntityDocs(2, 2, to, to)
	assert.Empty(t, same.Added)
	assert.Empty(t, same.Removed)
	assert.Empty(t, same.Changed)
}
