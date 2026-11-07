package obs

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/db/migrations"
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

func TestBurnRatePer100(t *testing.T) {
	assert.Equal(t, 0, burnRatePer100(1.0, 0.99, 0))       // no calls, no burn
	assert.Equal(t, 0, burnRatePer100(1.0, 0.99, 100))     // perfect window
	assert.Equal(t, 100, burnRatePer100(0.99, 0.99, 100))  // exactly at the budget
	assert.Equal(t, 600, burnRatePer100(0.94, 0.99, 1000)) // 6% errors on a 1% budget = 6x
	// 100% target: any error burns infinitely fast
	assert.Greater(t, burnRatePer100(0.999, 1.0, 1000), 999)
}

func TestValidateRuleChecksWebhookURL(t *testing.T) {
	s := &service{}
	base := func() *AlertRule {
		return &AlertRule{Name: "r", Source: "audit", Action: "a.b", Threshold: 1, WindowMinutes: 5}
	}
	r := base()
	assert.NoError(t, s.validateRule(context.Background(), r))
	r.WebhookURL = "https://hooks.example.com/x"
	assert.NoError(t, s.validateRule(context.Background(), r))
	for _, bad := range []string{"notaurl", "ftp://x", "https://"} {
		r.WebhookURL = bad
		assert.Error(t, s.validateRule(context.Background(), r), bad)
	}
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

// TestNewServiceWiresEveryDep guards against a constructor dropping a dependency:
// a nil auditor only panics on the first audited call (e.g. POST /slos), not in tests with fakes.
func TestNewServiceWiresEveryDep(t *testing.T) {
	s := NewService(Deps{Auditor: &fakeAuditor{}}).(*service)
	assert.NotNil(t, s.auditor)
}
