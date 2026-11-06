package config

import "testing"

func env(pairs map[string]string) func(string) string {
	return func(key string) string { return pairs[key] }
}

func TestDefaults(t *testing.T) {
	cfg, err := load(env(nil))
	if err != nil {
		t.Fatalf("defaults must load: %v", err)
	}
	if cfg.Port != 9098 || cfg.Retention != 10000 || cfg.LogLevel != "INFO" || cfg.Token != "" {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestOverrides(t *testing.T) {
	cfg, err := load(env(map[string]string{
		"WSN_OBSERVER_PORT":      "9999",
		"WSN_OBSERVER_RETENTION": "42",
		"WSN_OBSERVER_TOKEN":     "tok",
		"WSN_OBSERVER_LOG_LEVEL": "DEBUG",
	}))
	if err != nil {
		t.Fatalf("valid env must load: %v", err)
	}
	if cfg.Port != 9999 || cfg.Retention != 42 || cfg.Token != "tok" || cfg.LogLevel != "DEBUG" {
		t.Fatalf("unexpected config: %+v", cfg)
	}
}

func TestInvalidValuesAreJoinedErrors(t *testing.T) {
	_, err := load(env(map[string]string{
		"WSN_OBSERVER_PORT":      "not-a-port",
		"WSN_OBSERVER_RETENTION": "-3",
	}))
	if err == nil {
		t.Fatal("expected an error")
	}
	if got := err.Error(); !contains(got, "WSN_OBSERVER_PORT") || !contains(got, "WSN_OBSERVER_RETENTION") {
		t.Fatalf("both problems should be reported, got: %v", err)
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
