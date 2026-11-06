package flow

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStepJSONKeepsUnsetAndNullLinksApart(t *testing.T) {
	var steps []Step
	require.NoError(t, json.Unmarshal([]byte(`[
		{"id":"a","name":"A","kind":"notify","channel":"email","message":"hi"},
		{"id":"b","name":"B","kind":"approval","permission":"p","description":"d","next":null,"onReject":"a"}
	]`), &steps))
	assert.False(t, steps[0].Next.Set)
	assert.True(t, steps[1].Next.Set)
	assert.Equal(t, "", steps[1].Next.To)
	assert.Equal(t, "b", nextStep(steps, steps[0]))
	assert.Equal(t, "", nextStep(steps, steps[1]))

	b, err := json.Marshal(steps[1])
	require.NoError(t, err)
	assert.JSONEq(t, `{"id":"b","name":"B","kind":"approval","permission":"p","description":"d","next":null,"onReject":"a"}`, string(b))
}

func TestConditionHolds(t *testing.T) {
	assert.True(t, conditionHolds(12.0, "gt", "10"))
	assert.False(t, conditionHolds("12", "lt", "10"))
	assert.True(t, conditionHolds("Kandy", "eq", "Kandy"))
	assert.True(t, conditionHolds("Low stock", "contains", "STOCK"))
	assert.False(t, conditionHolds("", "exists", ""))
	assert.False(t, conditionHolds("abc", "gt", "1"))
}

func TestRenderAndReadPath(t *testing.T) {
	ctx := map[string]any{"orderNumber": "PO-1001", "order": map[string]any{"total": 50.0}}
	assert.Equal(t, "PO PO-1001 for 50 ()", render("PO {{orderNumber}} for {{ order.total }} ({{missing}})", ctx))
}

func TestValidateWorkflowFindsLoopsAndOrphans(t *testing.T) {
	d := Definition{
		Name:    "Loop",
		Trigger: Trigger{Kind: "manual"},
		Steps: []Step{
			{ID: "a", Name: "A", Kind: "notify", Channel: "c", Message: "m", Next: to("b")},
			{ID: "b", Name: "B", Kind: "notify", Channel: "c", Message: "m", Next: to("a")},
			{ID: "c", Name: "C", Kind: "wait", Minutes: 0, Next: Link{Set: true}},
		},
	}
	assert.Equal(t, []string{
		"C: wait for at least one minute",
		"The flow loops back on itself; every path must reach an end",
		"C: not connected to the trigger",
	}, validateWorkflow(d, References{}))
}
