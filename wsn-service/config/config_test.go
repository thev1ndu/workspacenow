package config

import (
	"strings"
	"testing"
)

// productionConfig fills every variable the production rules require.
func productionEnv(t *testing.T) {
	t.Helper()
	t.Setenv("WSN_ENV", "production")
	t.Setenv("OIDC_JWKS_URL", "https://idp.example.com/keys")
	t.Setenv("OIDC_ISSUER", "https://idp.example.com")
	t.Setenv("OIDC_AUDIENCE", "workspacenow")
	t.Setenv("AI_SERVICE_TOKEN", "svc-token")
	t.Setenv("RUN_GRANT_KEY", "a2V5")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://console.example.com")
}

func TestValidateProductionRequiresOIDCAndSecrets(t *testing.T) {
	productionEnv(t)
	if _, err := Load(); err != nil {
		t.Fatalf("fully configured production must load: %v", err)
	}

	t.Setenv("OIDC_AUDIENCE", "")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "OIDC_AUDIENCE") {
		t.Fatalf("production without OIDC_AUDIENCE must fail, got %v", err)
	}
	productionEnv(t)
	t.Setenv("OIDC_ISSUER", "")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "OIDC_ISSUER") {
		t.Fatalf("production without OIDC_ISSUER must fail, got %v", err)
	}
	productionEnv(t)
	t.Setenv("AI_SERVICE_TOKEN", "")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "AI_SERVICE_TOKEN") {
		t.Fatalf("production without AI_SERVICE_TOKEN must fail, got %v", err)
	}
	productionEnv(t)
	t.Setenv("RUN_GRANT_KEY", "")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "RUN_GRANT_KEY") {
		t.Fatalf("production without RUN_GRANT_KEY must fail, got %v", err)
	}
	productionEnv(t)
	t.Setenv("CORS_ALLOWED_ORIGINS", "*")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "CORS_ALLOWED_ORIGINS") {
		t.Fatalf("production with a wildcard CORS origin must fail, got %v", err)
	}
}

func TestDemoModeRequiresDevelopmentEnv(t *testing.T) {
	t.Setenv("WSN_ENV", "production")
	t.Setenv("WSN_DEMO_MODE", "true")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "WSN_DEMO_MODE") {
		t.Fatalf("demo mode outside development must fail, got %v", err)
	}
}

func TestBootstrapAdminEmailsAreLowercased(t *testing.T) {
	t.Setenv("WSN_ENV", "development")
	t.Setenv("WSN_DEMO_MODE", "true")
	t.Setenv("WSN_BOOTSTRAP_ADMIN_EMAILS", " Admin@Example.COM , other@x.io ")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	want := []string{"admin@example.com", "other@x.io"}
	if len(cfg.Bootstrap.AdminEmails) != len(want) {
		t.Fatalf("admin emails: %v", cfg.Bootstrap.AdminEmails)
	}
	for i := range want {
		if cfg.Bootstrap.AdminEmails[i] != want[i] {
			t.Fatalf("admin emails: %v, want %v", cfg.Bootstrap.AdminEmails, want)
		}
	}
}
