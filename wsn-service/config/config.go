// Package config loads the platform's settings from the environment, with no globals.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Version is stamped at build time with -ldflags "-X .../config.Version=<v>".
var Version = "dev"

type Config struct {
	Env      string // "development" or "production"
	LogLevel string
	DemoMode bool // demo.<userId> tokens, GET /personas and POST /demo/reset

	HTTPAddr        string // public API, /api/v1
	InternalAddr    string // service-to-service API, /internal/v1 (ai-service tool calls)
	ShutdownTimeout time.Duration
	CORSOrigins     []string

	Database  DatabaseConfig
	Redis     RedisConfig
	NATS      NATSConfig
	Temporal  TemporalConfig
	S3        S3Config
	OpenBao   OpenBaoConfig
	OIDC      OIDCConfig
	Bootstrap BootstrapConfig
	AI        AIConfig
	Observer  ObserverConfig
}

// ObserverConfig points at wsn-observer, the central telemetry service; empty URL disables export.
type ObserverConfig struct {
	URL           string
	Token         string // shared bearer token for the observer's ingest and query APIs
	ServiceName   string // resource service.name sent with every signal
	FlushInterval time.Duration
}

type DatabaseConfig struct {
	URL          string
	MaxOpenConns int
	MaxIdleConns int
}

type RedisConfig struct {
	URL string
}

type NATSConfig struct {
	URL    string
	Stream string
}

type TemporalConfig struct {
	HostPort  string
	Namespace string
	TaskQueue string
}

type S3Config struct {
	Endpoint  string
	Region    string
	Bucket    string
	AccessKey string
	SecretKey string
	UseSSL    bool
}

type OpenBaoConfig struct {
	Addr  string
	Mount string // KV v2 mount holding integration credentials
	Role  string // Kubernetes auth role; empty means Token is used
	Token string // development only
}

type OIDCConfig struct {
	Issuer      string
	Audience    string
	JWKSURL     string
	GroupsClaim string // token claim that lists the user's groups
}

// BootstrapConfig names the first administrators: any user whose IdP email is listed gets the
// admin role on first login, so installation never requires creating an IdP group. When no IdP
// is configured (OIDC_JWKS_URL empty), LocalAdminEmail/LocalAdminPassword are the system login.
type BootstrapConfig struct {
	AdminEmails       []string // WSN_BOOTSTRAP_ADMIN_EMAILS, comma-separated
	AdminRole         string   // WSN_BOOTSTRAP_ADMIN_ROLE, the role ID granted (default workspacenow-admin)
	LocalAdminEmail   string   // WSN_LOCAL_ADMIN_EMAIL, system user login when no OIDC is configured
	LocalAdminPassword string // WSN_LOCAL_ADMIN_PASSWORD, its password (from the wsn-secrets Secret)
}

// LocalAuthEnabled reports whether the local system user can sign in. It stays available when
// OIDC is configured too (Rancher-style: both login options on the same page), unless demo mode.
func (c *Config) LocalAuthEnabled() bool {
	return !c.DemoMode && c.Bootstrap.LocalAdminEmail != "" && c.Bootstrap.LocalAdminPassword != ""
}

type AIConfig struct {
	ServiceURL   string
	ServiceToken string // shared token the platform presents to the ai-service internal API
	// RunGrantKey is the base64 Ed25519 private key (seed) that signs agent run grants.
	RunGrantKey string
	RunGrantTTL time.Duration
}

// Load reads the configuration from the environment and validates it.
func Load() (*Config, error) {
	r := reader{}
	cfg := &Config{
		Env:             r.str("WSN_ENV", "development"),
		LogLevel:        r.str("LOG_LEVEL", "INFO"),
		DemoMode:        r.boolean("WSN_DEMO_MODE", false),
		HTTPAddr:        r.str("WSN_HTTP_ADDR", ":8080"),
		InternalAddr:    r.str("WSN_INTERNAL_ADDR", ":8081"),
		ShutdownTimeout: r.duration("WSN_SHUTDOWN_TIMEOUT", 30*time.Second),
		CORSOrigins:     r.list("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3100"}),
		Database: DatabaseConfig{
			URL:          r.str("DATABASE_URL", "postgres://workspacenow:workspacenow@localhost:5432/workspacenow?sslmode=disable"),
			MaxOpenConns: r.integer("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns: r.integer("DB_MAX_IDLE_CONNS", 5),
		},
		Redis: RedisConfig{URL: r.str("REDIS_URL", "redis://localhost:6379/0")},
		NATS:  NATSConfig{URL: r.str("NATS_URL", "nats://localhost:4222"), Stream: r.str("NATS_STREAM", "WSN_EVENTS")},
		Temporal: TemporalConfig{
			HostPort:  r.str("TEMPORAL_HOSTPORT", "localhost:7233"),
			Namespace: r.str("TEMPORAL_NAMESPACE", "default"),
			TaskQueue: r.str("TEMPORAL_TASK_QUEUE", "workspacenow-workflows"),
		},
		S3: S3Config{
			Endpoint:  r.str("S3_ENDPOINT", "localhost:9000"),
			Region:    r.str("S3_REGION", "us-east-1"),
			Bucket:    r.str("S3_BUCKET", "workspacenow"),
			AccessKey: r.str("S3_ACCESS_KEY", ""),
			SecretKey: r.str("S3_SECRET_KEY", ""),
			UseSSL:    r.boolean("S3_USE_SSL", false),
		},
		OpenBao: OpenBaoConfig{
			Addr:  r.str("OPENBAO_ADDR", "http://localhost:8200"),
			Mount: r.str("OPENBAO_MOUNT", "secret"),
			Role:  r.str("OPENBAO_ROLE", ""),
			Token: r.str("OPENBAO_TOKEN", ""),
		},
		OIDC: OIDCConfig{
			Issuer:      r.str("OIDC_ISSUER", ""),
			Audience:    r.str("OIDC_AUDIENCE", ""),
			JWKSURL:     r.str("OIDC_JWKS_URL", ""),
			GroupsClaim: r.str("OIDC_GROUPS_CLAIM", "groups"),
		},
		Bootstrap: BootstrapConfig{
			AdminEmails:        r.list("WSN_BOOTSTRAP_ADMIN_EMAILS", nil),
			AdminRole:          r.str("WSN_BOOTSTRAP_ADMIN_ROLE", "workspacenow-admin"),
			LocalAdminEmail:    r.str("WSN_LOCAL_ADMIN_EMAIL", ""),
			LocalAdminPassword: r.str("WSN_LOCAL_ADMIN_PASSWORD", ""),
		},
		AI: AIConfig{
			ServiceURL:   r.str("AI_SERVICE_URL", "http://localhost:8090"),
			ServiceToken: r.str("AI_SERVICE_TOKEN", ""),
			RunGrantKey:  r.str("RUN_GRANT_KEY", ""),
			RunGrantTTL:  r.duration("RUN_GRANT_TTL", 5*time.Minute),
		},
		Observer: ObserverConfig{
			URL:           r.str("WSN_OBSERVER_URL", ""),
			Token:         r.str("WSN_OBSERVER_TOKEN", ""),
			ServiceName:   r.str("WSN_OBSERVER_SERVICE_NAME", "wsn-service"),
			FlushInterval: r.duration("WSN_OBSERVER_FLUSH_INTERVAL", 2*time.Second),
		},
	}
	if len(r.errs) > 0 {
		return nil, errors.Join(r.errs...)
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	var errs []error
	if c.Env != "development" && c.Env != "production" {
		errs = append(errs, fmt.Errorf("WSN_ENV must be development or production, got %q", c.Env))
	}
	if c.Env == "production" && c.DemoMode {
		errs = append(errs, errors.New("WSN_DEMO_MODE cannot be enabled when WSN_ENV=production"))
	}
	if !c.DemoMode && c.OIDC.JWKSURL == "" && (c.Bootstrap.LocalAdminEmail == "" || c.Bootstrap.LocalAdminPassword == "") {
		errs = append(errs, errors.New("OIDC_JWKS_URL is required unless WSN_DEMO_MODE is enabled or WSN_LOCAL_ADMIN_EMAIL + WSN_LOCAL_ADMIN_PASSWORD provide the system login"))
	}
	if c.Database.URL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	return errors.Join(errs...)
}

// IsProduction reports whether the platform runs with production safeguards.
func (c *Config) IsProduction() bool { return c.Env == "production" }

type reader struct{ errs []error }

func (r *reader) str(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return fallback
}

func (r *reader) list(key string, fallback []string) []string {
	v := r.str(key, "")
	if v == "" {
		return fallback
	}
	var out []string
	for part := range strings.SplitSeq(v, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (r *reader) boolean(key string, fallback bool) bool {
	v := r.str(key, "")
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
	}
	return b
}

func (r *reader) integer(key string, fallback int) int {
	v := r.str(key, "")
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
	}
	return n
}

func (r *reader) duration(key string, fallback time.Duration) time.Duration {
	v := r.str(key, "")
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
	}
	return d
}
