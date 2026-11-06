// Package postgres opens the database and carries the current transaction in the context.
package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
)

// Open connects to Postgres and checks the connection.
func Open(ctx context.Context, cfg config.DatabaseConfig) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.URL), &gorm.Config{
		SkipDefaultTransaction: true,
		Logger:                 gormlogger.NewSlogLogger(slog.Default(), gormlogger.Config{SlowThreshold: 500 * time.Millisecond, LogLevel: gormlogger.Warn, IgnoreRecordNotFoundError: true}),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database handle: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}

type txKey struct{}

// InTx runs fn in a transaction, joining one already in ctx so nested operations stay atomic.
func InTx(ctx context.Context, db *gorm.DB, fn func(ctx context.Context) error) error {
	if _, ok := ctx.Value(txKey{}).(*gorm.DB); ok {
		return fn(ctx)
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(context.WithValue(ctx, txKey{}, tx))
	})
}

// DB returns the transaction in ctx, or the database when there is none.
func DB(ctx context.Context, db *gorm.DB) *gorm.DB {
	if tx, ok := ctx.Value(txKey{}).(*gorm.DB); ok {
		return tx
	}
	return db.WithContext(ctx)
}

// Detached returns the database outside ctx's transaction, for writes that must survive a rollback.
func Detached(ctx context.Context, db *gorm.DB) *gorm.DB {
	return db.WithContext(context.WithoutCancel(ctx))
}
