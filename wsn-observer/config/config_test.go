package config

import "testing"

func env(pairs map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) { v, ok := pairs[key]; return v, ok }
}

func TestDefaults(t *testing.T) {
	cfg, err := load(env(nil))
	if err != nil {
		t.Fatalf("defaults must load: %v", err)
	}
	if cfg.Port != 9098 || cfg.LogLevel != "INFO" || cfg.Token != "" {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
	if cfg.DataDir != "./data" || cfg.RetentionBytes != 256<<20 || cfg.SegmentBytes != 32<<20 || cfg.ScanLimit != 100000 {
		t.Fatalf("storage defaults: %+v", cfg)
	}
}

func TestOverrides(t *testing.T) {
	cfg, err := load(env(map[string]string{
		"WSN_OBSERVER_PORT":            "9999",
		"WSN_OBSERVER_TOKEN":           "tok",
		"WSN_OBSERVER_LOG_LEVEL":       "DEBUG",
		"WSN_OBSERVER_DATA_DIR":        "/var/lib/wsn-observer",
		"WSN_OBSERVER_RETENTION_BYTES": "1024",
		"WSN_OBSERVER_SEGMENT_BYTES":   "512",
		"WSN_OBSERVER_SCAN_LIMIT":      "42",
	}))
	if err != nil {
		t.Fatalf("valid env must load: %v", err)
	}
	if cfg.Port != 9999 || cfg.Token != "tok" || cfg.LogLevel != "DEBUG" {
		t.Fatalf("unexpected config: %+v", cfg)
	}
	if cfg.DataDir != "/var/lib/wsn-observer" || cfg.RetentionBytes != 1024 || cfg.SegmentBytes != 512 || cfg.ScanLimit != 42 {
		t.Fatalf("storage config: %+v", cfg)
	}
}

func TestInvalidValuesAreJoinedErrors(t *testing.T) {
	_, err := load(env(map[string]string{
		"WSN_OBSERVER_PORT":            "not-a-port",
		"WSN_OBSERVER_RETENTION_BYTES": "-3",
	}))
	if err == nil {
		t.Fatal("expected an error")
	}
	if got := err.Error(); !contains(got, "WSN_OBSERVER_PORT") || !contains(got, "WSN_OBSERVER_RETENTION_BYTES") {
		t.Fatalf("both problems should be reported, got: %v", err)
	}
}

func TestEmptyDataDirIsRejected(t *testing.T) {
	if _, err := load(env(map[string]string{"WSN_OBSERVER_DATA_DIR": ""})); err == nil {
		t.Fatal("telemetry must not fall back to memory or a database: empty data dir must be rejected")
	}
}

func TestInvalidStorageValuesAreRejected(t *testing.T) {
	for key, v := range map[string]string{
		"WSN_OBSERVER_RETENTION_BYTES": "0",
		"WSN_OBSERVER_SEGMENT_BYTES":   "-1",
		"WSN_OBSERVER_SCAN_LIMIT":      "zero",
	} {
		if _, err := load(env(map[string]string{key: v})); err == nil {
			t.Fatalf("%s=%s must be rejected", key, v)
		}
	}
}

func TestPortBoundaries(t *testing.T) {
	for _, v := range []string{"0", "65536", "-1"} {
		if _, err := load(env(map[string]string{"WSN_OBSERVER_PORT": v})); err == nil {
			t.Fatalf("port %q must be rejected", v)
		}
	}
	if _, err := load(env(map[string]string{"WSN_OBSERVER_PORT": "65535"})); err != nil {
		t.Fatalf("port 65535 is valid: %v", err)
	}
}

func TestLoadReadsTheProcessEnvironment(t *testing.T) {
	t.Setenv("WSN_OBSERVER_PORT", "9100")
	t.Setenv("WSN_OBSERVER_TOKEN", "from-env")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Port != 9100 || cfg.Token != "from-env" {
		t.Fatalf("Load did not read the environment: %+v", cfg)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
