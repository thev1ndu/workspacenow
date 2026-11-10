// Package cache wraps Redis, shared by every replica, for caches, counters and rate limits.
package cache

//go:generate moq -rm -fmt goimports -skip-ensure -pkg cachemocks -out cachemocks/cache_mock.go . Cache:CacheMock

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache is the subset of Redis the platform uses.
type Cache interface {
	// GetJSON decodes the value at key into v; found is false when the key does not exist.
	GetJSON(ctx context.Context, key string, v any) (found bool, err error)
	SetJSON(ctx context.Context, key string, v any, ttl time.Duration) error
	// Get returns a string value; found is false when the key does not exist.
	Get(ctx context.Context, key string) (value string, found bool, err error)
	Incr(ctx context.Context, key string) (int64, error)
	// IncrWindow increments a counter that expires ttl after its first increment.
	IncrWindow(ctx context.Context, key string, ttl time.Duration) (int64, error)
	// Del removes a key; deleting a missing key is not an error.
	Del(ctx context.Context, key string) error
	Ping(ctx context.Context) error
	Close() error
}

type redisCache struct{ c *redis.Client }

// Open connects to Redis (or Valkey) from a redis:// URL.
func Open(ctx context.Context, url string) (Cache, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	c := redis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := c.Ping(pingCtx).Err(); err != nil {
		_ = c.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	return &redisCache{c: c}, nil
}

func (r *redisCache) GetJSON(ctx context.Context, key string, v any) (bool, error) {
	b, err := r.c.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal(b, v)
}

func (r *redisCache) SetJSON(ctx context.Context, key string, v any, ttl time.Duration) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return r.c.Set(ctx, key, b, ttl).Err()
}

func (r *redisCache) Get(ctx context.Context, key string) (string, bool, error) {
	v, err := r.c.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	}
	return v, err == nil, err
}

func (r *redisCache) Incr(ctx context.Context, key string) (int64, error) {
	return r.c.Incr(ctx, key).Result()
}

func (r *redisCache) IncrWindow(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	pipe := r.c.TxPipeline()
	incr := pipe.Incr(ctx, key)
	pipe.ExpireNX(ctx, key, ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return 0, err
	}
	return incr.Val(), nil
}

func (r *redisCache) Del(ctx context.Context, key string) error { return r.c.Del(ctx, key).Err() }

func (r *redisCache) Ping(ctx context.Context) error { return r.c.Ping(ctx).Err() }

func (r *redisCache) Close() error { return r.c.Close() }
