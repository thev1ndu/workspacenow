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
	{ID: "003_missing_doc_tables", Migrate: missingDocTables},
}

// missingDocTables creates any document collection table an older build of 001 did not include
// (groups, org_settings, templates); guarded so it is a no-op on fresh installs.
func missingDocTables(tx *gorm.DB) error {
	m := tx.Migrator()
	for _, table := range docstore.Collections {
		if !m.HasTable(table) {
			if err := tx.Table(table).Migrator().CreateTable(&models.Document{}); err != nil {
				return fmt.Errorf("create %s: %w", table, err)
			}
		}
	}
	return nil
}

// Pending returns the IDs of migrations not yet recorded in migration_history (gormigrate's table).
func Pending(db *gorm.DB) ([]string, error) {
	var applied []string
	if err := db.Raw("SELECT id FROM migration_history ORDER BY id").Scan(&applied).Error; err != nil {
		return nil, fmt.Errorf("read migration_history: %w", err)
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
// Every step is guarded so the migration is idempotent: 001 already creates records with
// deleted_at/deleted_by (they are fields on the Record model), and a database that ran an
// earlier build of 002 must not fail on a second pass either.
func dataPlatformDepth(tx *gorm.DB) error {
	m := tx.Migrator()
	if !m.HasColumn(&models.Record{}, "DeletedAt") {
		if err := m.AddColumn(&models.Record{}, "DeletedAt"); err != nil {
			return fmt.Errorf("records.deleted_at: %w", err)
		}
	}
	if !m.HasColumn(&models.Record{}, "DeletedBy") {
		if err := m.AddColumn(&models.Record{}, "DeletedBy"); err != nil {
			return fmt.Errorf("records.deleted_by: %w", err)
		}
	}
	if !m.HasIndex(&models.Record{}, "records_deleted") {
		if err := m.CreateIndex(&models.Record{}, "records_deleted"); err != nil {
			return fmt.Errorf("records_deleted index: %w", err)
		}
	}
	if !m.HasTable(&models.RecordHistory{}) {
		if err := m.CreateTable(&models.RecordHistory{}); err != nil {
			return fmt.Errorf("record_history: %w", err)
		}
	}
	if !m.HasTable(&models.EntityVersion{}) {
		if err := m.CreateTable(&models.EntityVersion{}); err != nil {
			return fmt.Errorf("entity_versions: %w", err)
		}
	}
	return nil
}

func initialSchema(tx *gorm.DB) error {
	for _, table := range docstore.Collections {
		if err := tx.Table(table).Migrator().CreateTable(&models.Document{}); err != nil {
			return fmt.Errorf("create %s: %w", table, err)
		}
	}
	return tx.Migrator().CreateTable(&models.Record{}, &models.AuditRecord{}, &models.Event{}, &models.OutboxMessage{})
}
