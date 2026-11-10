package connect

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"gorm.io/gorm"
)

// APIKey is a developer-portal credential: the raw key is shown once at creation, only the
// SHA-256 hash is stored. Calls authenticate with the X-API-Key header and are quota-limited
// per key per hour in Valkey.
type APIKey struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Prefix       string     `json:"prefix"` // first 8 chars of the raw key, for lookup display
	KeyHash      string     `json:"-"`
	Permissions  []string   `json:"permissions"`
	QuotaPerHour int        `json:"quotaPerHour"`
	Revoked      bool       `json:"revoked"`
	CreatedAt    time.Time  `json:"createdAt"`
	LastUsedAt   *time.Time `json:"lastUsedAt,omitempty"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	OwnerID      string     `json:"ownerId,omitempty"`
}

// CreatedKey is the creation response: the raw key appears exactly here.
type CreatedKey struct {
	APIKey
	RawKey string `json:"rawKey"`
}

const apiKeyPrefix = "wsn_"

// issueKey creates a new random key, returns it once, stores the hash.
func issueKey(db *gorm.DB, name, ownerID string, permissions []string, quotaPerHour int, expiresAt *time.Time) (*CreatedKey, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	key := apiKeyPrefix + hex.EncodeToString(raw)
	sum := sha256.Sum256([]byte(key))
	rec := &APIKey{
		ID: kernel.NewID("key"), Name: name, Prefix: key[:len(apiKeyPrefix)+8],
		KeyHash: hex.EncodeToString(sum[:]), Permissions: permissions, QuotaPerHour: quotaPerHour,
		CreatedAt: time.Now().UTC(), ExpiresAt: expiresAt, OwnerID: ownerID,
	}
	c := docstore.NewCollection(db, "api_keys", func(k *APIKey) string { return k.ID })
	if err := c.Put(context.Background(), rec); err != nil {
		return nil, err
	}
	return &CreatedKey{APIKey: *rec, RawKey: key}, nil
}

// VerifyKey resolves an X-API-Key value to the stored key, enforcing revocation and the hourly
// quota. On success it also stamps lastUsedAt. Returns the key or an *kernel.Error (401/429).
func VerifyKey(ctx context.Context, db *gorm.DB, c cache.Cache, raw string) (*APIKey, error) {
	if !strings.HasPrefix(raw, apiKeyPrefix) {
		return nil, kernel.Unauthenticated("invalid API key")
	}
	sum := sha256.Sum256([]byte(raw))
	hash := hex.EncodeToString(sum[:])
	col := docstore.NewCollection(db, "api_keys", func(k *APIKey) string { return k.ID })
	all, err := col.List(ctx)
	if err != nil {
		return nil, err
	}
	for i := range all {
		if all[i].KeyHash == hash {
			if all[i].Revoked {
				return nil, kernel.Unauthenticated("API key revoked")
			}
			if all[i].ExpiresAt != nil && !time.Now().Before(*all[i].ExpiresAt) {
				return nil, kernel.Unauthenticated("API key expired")
			}
			if all[i].QuotaPerHour > 0 {
				key := fmt.Sprintf("wsn:apikey:%s:%d", all[i].ID, time.Now().Unix()/3600)
				n, err := c.IncrWindow(ctx, key, time.Hour)
				if err == nil && n > int64(all[i].QuotaPerHour) {
					return nil, &kernel.Error{Status: http.StatusTooManyRequests, Code: kernel.CodeInvalidState, Message: "API key hourly quota reached"}
				}
			}
			now := time.Now().UTC()
			all[i].LastUsedAt = &now
			_ = col.Put(ctx, &all[i])
			return &all[i], nil
		}
	}
	return nil, kernel.Unauthenticated("invalid API key")
}
