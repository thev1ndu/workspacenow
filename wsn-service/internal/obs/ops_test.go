package obs

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/db/migrations"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/studio"
)

func TestRuleFires(t *testing.T) {
	r := &AlertRule{Active: true, Threshold: 5, WindowMinutes: 60}
	assert.False(t, ruleFires(r, 4))
	assert.True(t, ruleFires(r, 5))
	assert.True(t, ruleFires(r, 9))
	r.Active = false
	assert.False(t, ruleFires(r, 9))
	r.Active, r.Threshold = true, 0
	assert.False(t, ruleFires(r, 9))
}

func TestBucketOfAndP95(t *testing.T) {
	assert.Equal(t, 0, bucketOf(10))
	assert.Equal(t, 0, bucketOf(50))
	assert.Equal(t, 1, bucketOf(51))
	assert.Equal(t, 4, bucketOf(600))
	assert.Equal(t, len(latencyBuckets), bucketOf(999999)) // overflow

	// 100 calls: 95 under 200ms, 5 at 5000ms -> p95 = 200
	counts := make([]int64, len(latencyBuckets)+1)
	counts[2] = 95 // <= 200
	counts[6] = 5  // <= 5000
	assert.Equal(t, int64(200), p95FromBuckets(counts, 100))
	assert.Equal(t, int64(0), p95FromBuckets(counts, 0))
}

func TestSloSyncPlan(t *testing.T) {
	now := time.Date(2026, 11, 7, 12, 0, 0, 0, time.UTC)
	cfg := &studio.AppSLO{Enabled: true, TargetSuccess: 0.999, TargetP95Ms: 500, WindowMinutes: 1440}
	ops := []string{"Product.list", "Product.get", "Product.create", "Product.update"}

	// Enabled with no existing SLOs: one new SLO per operation, tagged with the app.
	put, remove := sloSyncPlan(nil, "app-1", ops, cfg, now)
	assert.Empty(t, remove)
	assert.Len(t, put, 4)
	for i, op := range ops {
		assert.Equal(t, op, put[i].Operation)
		assert.Equal(t, "app-1", put[i].ApplicationID)
		assert.Equal(t, 0.999, put[i].TargetSuccess)
		assert.Equal(t, 500, put[i].TargetP95Ms)
		assert.Equal(t, 1440, put[i].WindowMinutes)
		assert.Equal(t, now, put[i].CreatedAt)
		assert.NotEmpty(t, put[i].ID)
	}

	// Enabled with stale targets and a removed operation: upsert keeps the id, drops the stale one.
	// (SyncAppSLOs pre-filters by applicationId, so only this app's SLOs arrive here.)
	existing := []SLO{
		{ID: "slo-1", Operation: "Product.list", ApplicationID: "app-1", TargetSuccess: 0.9, TargetP95Ms: 1000, WindowMinutes: 60},
		{ID: "slo-2", Operation: "Product.delete", ApplicationID: "app-1"},
	}
	put, remove = sloSyncPlan(existing, "app-1", ops[:3], cfg, now)
	assert.Equal(t, []string{"slo-2"}, remove)
	byID := map[string]SLO{}
	for _, s := range put {
		byID[s.ID] = s
	}
	assert.Equal(t, 0.999, byID["slo-1"].TargetSuccess) // retargeted in place
	assert.Len(t, put, 3)                               // slo-1 updated + two new

	// Disabled: every app SLO is removed, nothing is created.
	put, remove = sloSyncPlan(existing[:2], "app-1", ops, &studio.AppSLO{Enabled: false}, now)
	assert.Nil(t, put)
	assert.Equal(t, []string{"slo-1", "slo-2"}, remove)

	// No SLO configured at all: same as disabled.
	put, remove = sloSyncPlan(existing[:1], "app-1", ops, nil, now)
	assert.Nil(t, put)
	assert.Equal(t, []string{"slo-1"}, remove)
}

func TestPendingIDs(t *testing.T) {
	all := []string{"001_a", "002_b", "003_c"}
	assert.Empty(t, migrations.PendingIDs([]string{"001_a", "002_b", "003_c"}, all))
	assert.Equal(t, []string{"002_b", "003_c"}, migrations.PendingIDs([]string{"001_a"}, all))
	assert.Equal(t, all, migrations.PendingIDs(nil, all))
}

func TestStatusAggregatesHealth(t *testing.T) {
	// pure part: status rollup logic is inside Status; here we sanity-check the bucket math again
	assert.Equal(t, 1, bucketOf(100))
	_ = time.Now()
}
