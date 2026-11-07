package app

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/obs"
)

func TestPickBackup(t *testing.T) {
	t0 := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	records := []obs.BackupRecord{
		{ID: "bak-1", StartedAt: t0, Status: "done", S3Key: "backups/a.dump"},
		{ID: "bak-2", StartedAt: t0.Add(24 * time.Hour), Status: "done", S3Key: "backups/b.dump"},
		{ID: "bak-3", StartedAt: t0.Add(48 * time.Hour), Status: "running", S3Key: "backups/c.dump"},
	}
	latest, err := pickBackup(records, "")
	assert.NoError(t, err)
	assert.Equal(t, "bak-2", latest.ID) // newest done, not the running one

	byID, err := pickBackup(records, "bak-1")
	assert.NoError(t, err)
	assert.Equal(t, "backups/a.dump", byID.S3Key)

	_, err = pickBackup(records, "bak-3")
	assert.ErrorContains(t, err, "no completed backup")
	_, err = pickBackup(records, "bak-x")
	assert.ErrorContains(t, err, "no completed backup")
	_, err = pickBackup(nil, "")
	assert.ErrorContains(t, err, "no completed backups")
}
