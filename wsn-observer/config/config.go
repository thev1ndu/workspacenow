// Package config loads wsn-observer settings from the environment, with no globals.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
)

// Version is stamped at build time with -ldflags "-X .../config.Version=<v>".
var Version = "dev"

// Config is the observer's runtime configuration.
type Config struct {
	Port     int    // HTTP port serving ingest (/v1/...) and queries (/api/v1/...)
	Token    string // optional shared bearer token; when empty, the NetworkPolicy is the only guard
	LogLevel string
	// All telemetry (traces, logs, metrics) is stored as append-only segment files under DataDir.
	DataDir        string // segment root, one subdirectory per signal; no database involved
	RetentionBytes int64  // max bytes kept per signal; oldest segments are pruned past it
	SegmentBytes   int64  // roll the active segment past this size
	ScanLimit      int    // max records a query scans per signal, newest first
	ReplicaURL string // when set, sealed segments are replicated to this observer

}

// Load reads the process environment.
func Load() (Config, error) { return load(os.LookupEnv) }

func load(lookup func(string) (string, bool)) (Config, error) {
	cfg := Config{
		Port:           9098,
		ReplicaURL:     "",
		LogLevel:       "INFO",
		DataDir:        "./data",
		RetentionBytes: 256 << 20, // 256 MiB per signal
		SegmentBytes:   32 << 20,  // 32 MiB segments
		ScanLimit:      100000,
	}
	var errs []error
	if v, ok := lookup("WSN_OBSERVER_DATA_DIR"); ok {
		if v == "" {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_DATA_DIR must not be empty: telemetry is stored as segment files, not in a database or memory"))
		} else {
			cfg.DataDir = v
		}
	}
	if v, ok := lookup("WSN_OBSERVER_RETENTION_BYTES"); ok && v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n < 1 {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_RETENTION_BYTES %q is not a positive integer", v))
		} else {
			cfg.RetentionBytes = n
		}
	}
	if v, ok := lookup("WSN_OBSERVER_SEGMENT_BYTES"); ok && v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n < 1 {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_SEGMENT_BYTES %q is not a positive integer", v))
		} else {
			cfg.SegmentBytes = n
		}
	}
	if v, ok := lookup("WSN_OBSERVER_REPLICA_URL"); ok {
		cfg.ReplicaURL = v
	}
	if v, ok := lookup("WSN_OBSERVER_SCAN_LIMIT"); ok && v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_SCAN_LIMIT %q is not a positive integer", v))
		} else {
			cfg.ScanLimit = n
		}
	}
	if v, ok := lookup("WSN_OBSERVER_PORT"); ok && v != "" {
		p, err := strconv.Atoi(v)
		if err != nil || p < 1 || p > 65535 {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_PORT %q is not a valid port", v))
		} else {
			cfg.Port = p
		}
	}
	if v, ok := lookup("WSN_OBSERVER_TOKEN"); ok {
		cfg.Token = v
	}
	if v, ok := lookup("WSN_OBSERVER_LOG_LEVEL"); ok && v != "" {
		cfg.LogLevel = v
	}
	return cfg, errors.Join(errs...)
}
