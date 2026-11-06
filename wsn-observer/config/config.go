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
	Port      int    // HTTP port serving ingest (/v1/...) and queries (/api/v1/...)
	Token     string // optional shared bearer token; when empty, the NetworkPolicy is the only guard
	Retention int    // max entries kept per signal (spans, logs, metrics)
	LogLevel  string
}

// Load reads the process environment.
func Load() (Config, error) {
	return load(os.Getenv)
}

func load(getenv func(string) string) (Config, error) {
	cfg := Config{Port: 9098, Retention: 10000, LogLevel: "INFO"}
	var errs []error
	if v := getenv("WSN_OBSERVER_PORT"); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil || p < 1 || p > 65535 {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_PORT %q is not a valid port", v))
		} else {
			cfg.Port = p
		}
	}
	if v := getenv("WSN_OBSERVER_RETENTION"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			errs = append(errs, fmt.Errorf("WSN_OBSERVER_RETENTION %q is not a positive integer", v))
		} else {
			cfg.Retention = n
		}
	}
	cfg.Token = getenv("WSN_OBSERVER_TOKEN")
	if v := getenv("WSN_OBSERVER_LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	return cfg, errors.Join(errs...)
}
