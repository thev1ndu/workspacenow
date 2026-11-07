// Package migrations evolves the schema; append new migrations, never edit shipped ones.
package migrations

import (
	"fmt"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
)

// Run applies every pending migration.
func Run(db *gorm.DB) error {
	m := gormigrate.New(db, &gormigrate.Options{TableName: "migration_history", IDColumnName: "id", IDColumnSize: 64, UseTransaction: true}, all)
	if err := m.Migrate(); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}

var all = []*gormigrate.Migration{
	{ID: "001_initial_schema", Migrate: initialSchema},
	{ID: "002_data_platform_depth", Migrate: dataPlatformDepth},
}

// Pending returns the IDs of migrations not yet recorded in schema_migrations.
func Pending(db *gorm.DB) ([]string, error) {
	var applied []string
	if err := db.Raw("SELECT id FROM schema_migrations ORDER BY id").Scan(&applied).Error; err != nil {
		return nil, fmt.Errorf("read schema_migrations: %w", err)
	}
	ids := make([]string, 0, len(all))
	for _, m := range all {
		ids = append(ids, m.ID)
	}
	return PendingIDs(applied, ids), nil
}

// PendingIDs is the pure comparison behind Pending (unit-tested).
func PendingIDs(applied, all []string) []string {
	done := map[string]bool{}
	for _, a := range applied {
		done[a] = true
	}
	var out []string
	for _, m := range all {
		if !done[m] {
			out = append(out, m)
		}
	}
	return out
}

// dataPlatformDepth adds soft deletes, record history and entity version snapshots.
func dataPlatformDepth(tx *gorm.DB) error {
	if err := tx.Migrator().AddColumn(&models.Record{}, "DeletedAt"); err != nil {
		return fmt.Errorf("records.deleted_at: %w", err)
	}
	if err := tx.Migrator().AddColumn(&models.Record{}, "DeletedBy"); err != nil {
		return fmt.Errorf("records.deleted_by: %w", err)
	}
	if err := tx.Migrator().CreateIndex(&models.Record{}, "records_deleted"); err != nil {
		return err
	}
	return tx.Migrator().CreateTable(&models.RecordHistory{}, &models.EntityVersion{})
}

func initialSchema(tx *gorm.DB) error {
	for _, table := range docstore.Collections {
		if err := tx.Table(table).Migrator().CreateTable(&models.Document{}); err != nil {
			return fmt.Errorf("create %s: %w", table, err)
		}
	}
	return tx.Migrator().CreateTable(&models.Record{}, &models.AuditRecord{}, &models.Event{}, &models.OutboxMessage{})
}
