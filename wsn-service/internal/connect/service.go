package connect

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/secrets"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Discoverer lists the tools an external MCP server offers; wsn-ai-service implements it.
type Discoverer interface {
	Discover(ctx context.Context, serverURL, auth string) ([]ServerTool, error)
}

// Service manages Connect resources and runs API operations as the api entry point.
type Service interface {
	APIs(ctx context.Context) ([]API, error)
	API(ctx context.Context, id string) (*API, error)
	Operations(ctx context.Context, apiID string) ([]Operation, error)
	UpdateExposure(ctx context.Context, ec kernel.ExecutionContext, operationID string, enabled bool, toolName, description string) (*Operation, error)
	InvokeOperation(ctx context.Context, ec kernel.ExecutionContext, operationID string, input map[string]any) (any, error)
	Tools(ctx context.Context) ([]Tool, error)
	// ApplicationTools returns the MCP tool names an application's APIs expose.
	ApplicationTools(ctx context.Context, applicationID string) ([]string, error)
	Servers(ctx context.Context) ([]MCPServer, error)
	RegisterServer(ctx context.Context, ec kernel.ExecutionContext, name, serverURL, auth string) (*MCPServer, error)
	Integrations(ctx context.Context) ([]Integration, error)
	CreateIntegration(ctx context.Context, ec kernel.ExecutionContext, in Integration) (*Integration, error)
	UpdateIntegration(ctx context.Context, ec kernel.ExecutionContext, id string, in Integration) (*Integration, error)
	TestIntegration(ctx context.Context, ec kernel.ExecutionContext, id string) (*Integration, error)
	// Secrets: OpenBao references only, values are read on demand and never stored or logged.
	ListSecrets(ctx context.Context, ec kernel.ExecutionContext, prefix string) ([]string, error)
	ReadSecret(ctx context.Context, ec kernel.ExecutionContext, path string) (map[string]string, error)
	// InvokeOperation runs an API operation with version lifecycle + request/response transforms.
	// version is the caller-requested API version ("" = the API's default).
	InvokeOperationVersion(ctx context.Context, ec kernel.ExecutionContext, operationID, version string, input map[string]any) (any, http.Header, error)
	// Webhooks: outbound subscriptions with signed delivery, retries and replay.
	Webhooks(ctx context.Context) ([]Webhook, error)
	CreateWebhook(ctx context.Context, ec kernel.ExecutionContext, w Webhook) (*Webhook, error)
	UpdateWebhook(ctx context.Context, ec kernel.ExecutionContext, id string, w Webhook) (*Webhook, error)
	DeleteWebhook(ctx context.Context, ec kernel.ExecutionContext, id string) error
	Deliveries(ctx context.Context, ec kernel.ExecutionContext, webhookID string) ([]Delivery, error)
	ReplayDelivery(ctx context.Context, ec kernel.ExecutionContext, webhookID, deliveryID string) (*Delivery, error)
	TestWebhook(ctx context.Context, ec kernel.ExecutionContext, id string) (*Delivery, error)
	// API versions and the developer portal catalog.
	Versions(ctx context.Context, apiID string) ([]APIVersion, error)
	CreateVersion(ctx context.Context, ec kernel.ExecutionContext, apiID string, v APIVersion) (*APIVersion, error)
	UpdateVersion(ctx context.Context, ec kernel.ExecutionContext, apiID, versionID string, v APIVersion) (*APIVersion, error)
	Portal(ctx context.Context) ([]map[string]any, error)
	// API keys (developer portal credentials with per-key hourly quotas).
	Keys(ctx context.Context) ([]APIKey, error)
	CreateKey(ctx context.Context, ec kernel.ExecutionContext, name string, permissions []string, quotaPerHour int) (*CreatedKey, error)
	RevokeKey(ctx context.Context, ec kernel.ExecutionContext, id string) error
	// GraphQL executes a minimal query document against entity records.
	GraphQL(ctx context.Context, ec kernel.ExecutionContext, query string) (map[string]any, []map[string]string, error)
	// RunWebhookDispatcher polls the event log and delivers webhooks until ctx ends.
	RunWebhookDispatcher(ctx context.Context) error
}

type service struct {
	db           *gorm.DB
	engine       kernel.Engine
	auditor      kernel.Auditor
	cache        cache.Cache
	rt           data.Runtime
	secrets      secrets.Reader
	discoverer   Discoverer
	apis         *docstore.Collection[API]
	versions     *docstore.Collection[APIVersion]
	operations   *docstore.Collection[Operation]
	servers      *docstore.Collection[MCPServer]
	integrations *docstore.Collection[Integration]
	keys         *docstore.Collection[APIKey]
	dispatcher   *Dispatcher
	tokens       *tokenSource
	http         *http.Client
}

func NewService(db *gorm.DB, engine kernel.Engine, auditor kernel.Auditor, c cache.Cache, rt data.Runtime, sec secrets.Reader, d Discoverer) Service {
	hc := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return &service{
		db: db, engine: engine, auditor: auditor, cache: c, rt: rt, secrets: sec, discoverer: d,
		apis:         docstore.NewCollection(db, "apis", func(a *API) string { return a.ID }),
		versions:     docstore.NewCollection(db, "api_versions", func(v *APIVersion) string { return v.ID }),
		operations:   docstore.NewCollection(db, "api_operations", func(o *Operation) string { return o.ID }),
		servers:      docstore.NewCollection(db, "mcp_servers", func(s *MCPServer) string { return s.ID }),
		integrations: docstore.NewCollection(db, "integrations", func(i *Integration) string { return i.ID }),
		keys:         docstore.NewCollection(db, "api_keys", func(k *APIKey) string { return k.ID }),
		dispatcher:   NewDispatcher(db, hc),
		tokens:       newTokenSource(c, hc),
		http:         hc,
	}
}

func (s *service) APIs(ctx context.Context) ([]API, error) { return s.apis.List(ctx) }

func (s *service) API(ctx context.Context, id string) (*API, error) {
	a, err := s.apis.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("API %s not found", id)
	}
	return a, err
}

func (s *service) Operations(ctx context.Context, apiID string) ([]Operation, error) {
	if apiID == "" {
		return s.operations.List(ctx)
	}
	return s.operations.Where(ctx, "doc->>'apiId' = ?", apiID)
}

func (s *service) operation(ctx context.Context, id string) (*Operation, error) {
	o, err := s.operations.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Operation %s not found", id)
	}
	return o, err
}

var toolNamePattern = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

// snake turns "inventory.getLowStockItems" into "inventory_get_low_stock_items".
func snake(s string) string {
	var b strings.Builder
	for i, r := range strings.ReplaceAll(s, ".", "_") {
		if unicode.IsUpper(r) {
			if i > 0 {
				b.WriteByte('_')
			}
			r = unicode.ToLower(r)
		}
		b.WriteRune(r)
	}
	return strings.ReplaceAll(b.String(), "__", "_")
}

func (s *service) UpdateExposure(ctx context.Context, ec kernel.ExecutionContext, operationID string, enabled bool, toolName, description string) (*Operation, error) {
	op, err := s.operation(ctx, operationID)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "mcp.expose", "api-operation/"+op.ID); err != nil {
		return nil, err
	}
	name := firstNonEmpty(toolName, exposureField(op, func(m *MCPExposure) string { return m.ToolName }), snake(op.BusinessOperation))
	if !toolNamePattern.MatchString(name) {
		return nil, kernel.Invalid("Tool names are snake_case")
	}
	all, err := s.operations.List(ctx)
	if err != nil {
		return nil, err
	}
	if enabled && slices.ContainsFunc(all, func(o Operation) bool {
		return o.ID != op.ID && o.MCP != nil && o.MCP.Enabled && o.MCP.ToolName == name
	}) {
		return nil, kernel.Conflict("Tool %s is already exposed", name)
	}
	op.MCP = &MCPExposure{
		ToolName:    name,
		Description: firstNonEmpty(description, exposureField(op, func(m *MCPExposure) string { return m.Description }), op.Summary),
		Enabled:     enabled,
	}
	action := "mcp.withdraw"
	if enabled {
		action = "mcp.expose"
	}
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.operations.Put(ctx, op); err != nil {
			return err
		}
		return s.auditor.Record(ctx, ec, action, "mcp-tool/"+name, kernel.OutcomeAllowed, "")
	})
	return op, err
}

func (s *service) InvokeOperation(ctx context.Context, ec kernel.ExecutionContext, operationID string, input map[string]any) (any, error) {
	out, _, err := s.InvokeOperationVersion(ctx, ec, operationID, "", input)
	return out, err
}

// InvokeOperationVersion runs an operation with version lifecycle checks and transforms.
func (s *service) InvokeOperationVersion(ctx context.Context, ec kernel.ExecutionContext, operationID, version string, input map[string]any) (any, http.Header, error) {
	op, err := s.operation(ctx, operationID)
	if err != nil {
		return nil, nil, err
	}
	if op.RateLimitPerMinute > 0 {
		key := fmt.Sprintf("wsn:rl:%s:%s:%d", op.ID, ec.Actor.ID, time.Now().Unix()/60)
		n, err := s.cache.IncrWindow(ctx, key, time.Minute)
		if err == nil && n > int64(op.RateLimitPerMinute) {
			return nil, nil, &kernel.Error{Status: http.StatusTooManyRequests, Code: kernel.CodeInvalidState, Message: fmt.Sprintf("Rate limit of %d calls a minute reached; try again shortly", op.RateLimitPerMinute)}
		}
	}
	// version lifecycle: the operation's version, else the API default
	api, err := s.apis.Get(ctx, op.APIID)
	if err == nil {
		want := op.Version
		if want == "" {
			want = api.DefaultVersion
		}
		if want == "" {
			want = api.Version
		}
		if version == "" {
			version = want
		}
		if version != want {
			return nil, nil, kernel.NotFound("Operation %s is not in API version %s", op.ID, version)
		}
		vs, err := s.versions.Where(ctx, "doc->>'apiId' = ? AND doc->>'version' = ?", op.APIID, version)
		if err != nil {
			return nil, nil, err
		}
		if len(vs) > 0 {
			hdrs, verr := checkVersion(&vs[0], version)
			if verr != nil {
				return nil, nil, verr
			}
			headers := http.Header{}
			for k, v := range hdrs {
				headers.Set(k, v)
			}
			mapped, terr := transformRequest(input, op.Transform)
			if terr != nil {
				return nil, nil, terr
			}
			out, ierr := s.engine.Invoke(ctx, ec, op.BusinessOperation, mapped)
			if ierr != nil {
				return nil, nil, ierr
			}
			out, terr = transformResponse(out, op.Transform)
			if terr != nil {
				return nil, nil, terr
			}
			return out, headers, nil
		}
	}
	mapped, err := transformRequest(input, op.Transform)
	if err != nil {
		return nil, nil, err
	}
	out, err := s.engine.Invoke(ctx, ec, op.BusinessOperation, mapped)
	if err != nil {
		return nil, nil, err
	}
	out, err = transformResponse(out, op.Transform)
	if err != nil {
		return nil, nil, err
	}
	return out, nil, nil
}

func (s *service) Tools(ctx context.Context) ([]Tool, error) {
	ops, err := s.operations.List(ctx)
	if err != nil {
		return nil, err
	}
	apis, err := s.apis.List(ctx)
	if err != nil {
		return nil, err
	}
	entityList, err := s.rt.Entities(ctx)
	if err != nil {
		return nil, err
	}
	entities := map[string]data.Entity{}
	for _, e := range entityList {
		entities[e.Name] = e
	}
	tools := []Tool{}
	for _, op := range ops {
		if op.MCP == nil || !op.MCP.Enabled {
			continue
		}
		version := "1.0.0"
		if i := slices.IndexFunc(apis, func(a API) bool { return a.ID == op.APIID }); i >= 0 {
			version = apis[i].Version
		}
		output := Schema{"type": "object"}
		if bo, err := s.engine.Lookup(ctx, op.BusinessOperation); err == nil && bo != nil && bo.Kind == kernel.KindRead && !strings.HasSuffix(bo.Name, ".get") {
			output = Schema{"type": "array", "items": Schema{"type": "object"}}
		}
		tools = append(tools, Tool{
			Name: op.MCP.ToolName, Description: op.MCP.Description, Source: "workspacenow", ServerID: ManagedServerID, OperationID: op.ID,
			BusinessOperation: op.BusinessOperation, Permission: op.Permission, InputSchema: inputSchema(op.BusinessOperation, entities), OutputSchema: output, Version: version,
		})
	}
	servers, err := s.servers.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, srv := range servers {
		if srv.Kind != "external" {
			continue
		}
		for _, t := range srv.Tools {
			tools = append(tools, Tool{
				Name: t.Name, Description: t.Description, Source: "external", ServerID: srv.ID,
				InputSchema: obj(map[string]any{"query": prop("string", "")}), OutputSchema: Schema{"type": "object"}, Version: "external",
			})
		}
	}
	return tools, nil
}

func (s *service) ApplicationTools(ctx context.Context, applicationID string) ([]string, error) {
	apis, err := s.apis.Where(ctx, "doc->>'applicationId' = ?", applicationID)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, a := range apis {
		ops, err := s.operations.Where(ctx, "doc->>'apiId' = ?", a.ID)
		if err != nil {
			return nil, err
		}
		for _, op := range ops {
			if op.MCP != nil && op.MCP.Enabled {
				names = append(names, op.MCP.ToolName)
			}
		}
	}
	return names, nil
}

func (s *service) Servers(ctx context.Context) ([]MCPServer, error) { return s.servers.List(ctx) }

func (s *service) RegisterServer(ctx context.Context, ec kernel.ExecutionContext, name, serverURL, auth string) (*MCPServer, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "mcp.register", "mcp-server"); err != nil {
		return nil, err
	}
	name, serverURL = strings.TrimSpace(name), strings.TrimSpace(serverURL)
	if name == "" {
		return nil, kernel.Invalid("Name is required")
	}
	if !strings.HasPrefix(serverURL, "http://") && !strings.HasPrefix(serverURL, "https://") {
		return nil, kernel.Invalid("URL must start with http:// or https://")
	}
	if auth == "" {
		auth = "oauth2"
	}
	tools, err := s.discoverer.Discover(ctx, serverURL, auth)
	if err != nil {
		return nil, kernel.InvalidState("Could not list the tools of %s: %s", serverURL, err.Error())
	}
	srv := &MCPServer{ID: kernel.NewID("mcp"), Name: name, URL: serverURL, Kind: "external", Auth: auth, Status: "healthy", Tools: tools, RegisteredAt: time.Now().UTC()}
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.servers.Put(ctx, srv); err != nil {
			return err
		}
		return s.auditor.Record(ctx, ec, "mcp.register", "mcp-server/"+srv.ID, kernel.OutcomeAllowed, fmt.Sprintf("Discovered %d tools", len(tools)))
	})
	return srv, err
}

func (s *service) Integrations(ctx context.Context) ([]Integration, error) {
	return s.integrations.List(ctx)
}

// validateIntegration checks an integration draft; the credential reference must be readable.
func (s *service) validateIntegration(ctx context.Context, in *Integration) error {
	if strings.TrimSpace(in.Name) == "" || strings.TrimSpace(in.Target) == "" || in.TimeoutMs <= 0 {
		return kernel.Invalid("An integration needs a name, a target and a positive timeout (ms)")
	}
	switch in.Kind {
	case "rest", "soap", "webhook", "database", "message-broker", "saas":
	default:
		return kernel.Invalid("kind must be rest, soap, webhook, database, message-broker or saas")
	}
	if in.SecretRef != "" {
		if _, err := s.secrets.Read(ctx, in.SecretRef); err != nil {
			return kernel.Invalid("Credential %s is not readable: %v", in.SecretRef, err)
		}
	}
	return nil
}

func (s *service) CreateIntegration(ctx context.Context, ec kernel.ExecutionContext, in Integration) (*Integration, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "integration.create", "integration"); err != nil {
		return nil, err
	}
	if err := s.validateIntegration(ctx, &in); err != nil {
		return nil, err
	}
	in.ID, in.Status = kernel.NewID("int"), "untested"
	if err := s.integrations.Put(ctx, &in); err != nil {
		return nil, err
	}
	return &in, s.auditor.Record(ctx, ec, "integration.create", "integration/"+in.ID, kernel.OutcomeAllowed, in.Name)
}

func (s *service) UpdateIntegration(ctx context.Context, ec kernel.ExecutionContext, id string, in Integration) (*Integration, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "integration.update", "integration/"+id); err != nil {
		return nil, err
	}
	cur, err := s.integrations.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Integration %s not found", id)
	}
	if err != nil {
		return nil, err
	}
	if err := s.validateIntegration(ctx, &in); err != nil {
		return nil, err
	}
	cur.Name, cur.Kind, cur.Target, cur.RetryPolicy, cur.TimeoutMs, cur.SecretRef, cur.Auth = in.Name, in.Kind, in.Target, in.RetryPolicy, in.TimeoutMs, in.SecretRef, in.Auth
	if err := s.integrations.Put(ctx, cur); err != nil {
		return nil, err
	}
	return cur, s.auditor.Record(ctx, ec, "integration.update", "integration/"+id, kernel.OutcomeAllowed, cur.Name)
}

// ListSecrets returns OpenBao secret references (never values) under prefix.
func (s *service) ListSecrets(ctx context.Context, ec kernel.ExecutionContext, prefix string) ([]string, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "secret.list", "secrets"); err != nil {
		return nil, err
	}
	return s.secrets.List(ctx, prefix)
}

// ReadSecret returns one secret's values to the caller; audited, never logged or stored.
func (s *service) ReadSecret(ctx context.Context, ec kernel.ExecutionContext, path string) (map[string]string, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "secret.read", "secret/"+path); err != nil {
		return nil, err
	}
	values, err := s.secrets.Read(ctx, path)
	if errors.Is(err, secrets.ErrNotFound) {
		return nil, kernel.NotFound("No secret at %s", path)
	}
	if err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "secret.read", "secret/"+path, kernel.OutcomeAllowed, "read "+path); err != nil {
		return nil, err
	}
	return values, nil
}

// TestIntegration confirms the credential exists in the secrets manager and the target answers.
func (s *service) TestIntegration(ctx context.Context, ec kernel.ExecutionContext, id string) (*Integration, error) {
	in, err := s.integrations.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Integration %s not found", id)
	}
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "integration.test", "integration/"+in.ID); err != nil {
		return nil, err
	}
	problem := ""
	if in.SecretRef != "" {
		if _, err := s.secrets.Read(ctx, in.SecretRef); err != nil {
			problem = "Credential " + in.SecretRef + " is not readable: " + err.Error()
		}
	}
	if problem == "" {
		if in.Auth != nil && in.Auth.Type == "oauth2" && in.Auth.TokenURL != "" {
			secret := ""
			if in.SecretRef != "" {
				if sv, err := s.secrets.Read(ctx, in.SecretRef); err == nil {
					secret = sv["secret"] // OpenBao KV v2: the client secret lives under "secret"
				}
			}
			tok, err := s.tokens.token(ctx, in.Auth, secret)
			if err != nil {
				problem = "OAuth2 token: " + err.Error()
			} else {
				problem = s.probeWithAuth(ctx, in, "Bearer "+tok)
			}
		} else {
			problem = s.probe(ctx, in)
		}
	}
	now := time.Now().UTC()
	in.LastTestedAt = &now
	outcome, detail := kernel.OutcomeAllowed, "Connection succeeded"
	in.Status = "connected"
	if problem != "" {
		in.Status, outcome, detail = "failing", kernel.OutcomeFailed, problem
	}
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.integrations.Put(ctx, in); err != nil {
			return err
		}
		return s.auditor.Record(ctx, ec, "integration.test", "integration/"+in.ID, outcome, detail)
	})
	return in, err
}

// probe reaches the target: an HTTP request for URLs, a TCP connection for anything with a host and port.
// probeWithAuth runs the connectivity probe with an Authorization header (OAuth2 bearer).
func (s *service) probeWithAuth(ctx context.Context, in *Integration, authHeader string) string {
	u, err := url.Parse(in.Target)
	if err != nil {
		return "Bad target URL: " + err.Error()
	}
	timeout := time.Duration(in.TimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return err.Error()
	}
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	client := &http.Client{Timeout: timeout, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	resp, err := client.Do(req)
	if err != nil {
		return "No answer: " + err.Error()
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 500 {
		return fmt.Sprintf("%s answered %d", u.Host, resp.StatusCode)
	}
	return ""
}

func (s *service) probe(ctx context.Context, in *Integration) string {
	timeout := time.Duration(in.TimeoutMs) * time.Millisecond
	if timeout <= 0 || timeout > 30*time.Second {
		timeout = 10 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	u, err := url.Parse(in.Target)
	if err != nil || u.Host == "" {
		return "Target " + in.Target + " is not a URL"
	}
	if u.Scheme == "http" || u.Scheme == "https" {
		req, err := http.NewRequestWithContext(ctx, http.MethodHead, in.Target, nil)
		if err != nil {
			return err.Error()
		}
		resp, err := s.http.Do(req)
		if err != nil {
			return "No answer from " + u.Host + ": " + err.Error()
		}
		_ = resp.Body.Close()
		if resp.StatusCode >= 500 {
			return fmt.Sprintf("%s answered %d", u.Host, resp.StatusCode)
		}
		return ""
	}
	host := u.Host
	if u.Port() == "" {
		host = net.JoinHostPort(u.Hostname(), defaultPort(u.Scheme))
	}
	conn, err := (&net.Dialer{}).DialContext(ctx, "tcp", host)
	if err != nil {
		return "Cannot connect to " + host + ": " + err.Error()
	}
	_ = conn.Close()
	return ""
}

func defaultPort(scheme string) string {
	ports := map[string]string{"sftp": "22", "ssh": "22", "amqp": "5672", "amqps": "5671", "postgres": "5432", "mysql": "3306", "kafka": "9092", "smtp": "587", "mqtt": "1883"}
	if p, ok := ports[scheme]; ok {
		return p
	}
	return "443"
}

func exposureField(op *Operation, get func(*MCPExposure) string) string {
	if op.MCP == nil {
		return ""
	}
	return get(op.MCP)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

/* ---- webhooks ---- */

func (s *service) Webhooks(ctx context.Context) ([]Webhook, error) {
	return s.dispatcher.hooks.List(ctx)
}

func (s *service) CreateWebhook(ctx context.Context, ec kernel.ExecutionContext, w Webhook) (*Webhook, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "webhook.create", "webhook"); err != nil {
		return nil, err
	}
	if strings.TrimSpace(w.Name) == "" || strings.TrimSpace(w.URL) == "" {
		return nil, kernel.Invalid("The webhook needs a name and a URL")
	}
	if _, err := url.ParseRequestURI(w.URL); err != nil {
		return nil, kernel.Invalid("Webhook URL is not valid: %s", err.Error())
	}
	now := time.Now().UTC()
	w.ID, w.Active, w.CreatedAt, w.UpdatedAt = kernel.NewID("wh"), true, now, now
	if err := s.dispatcher.hooks.Put(ctx, &w); err != nil {
		return nil, err
	}
	return &w, s.auditor.Record(ctx, ec, "webhook.create", "webhook/"+w.ID, kernel.OutcomeAllowed, w.Name)
}

func (s *service) UpdateWebhook(ctx context.Context, ec kernel.ExecutionContext, id string, w Webhook) (*Webhook, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "webhook.update", "webhook/"+id); err != nil {
		return nil, err
	}
	cur, err := s.dispatcher.hooks.Get(ctx, id)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return nil, kernel.NotFound("Webhook not found")
		}
		return nil, err
	}
	cur.Name, cur.URL, cur.Events, cur.Secret, cur.Active, cur.UpdatedAt = w.Name, w.URL, w.Events, w.Secret, w.Active, time.Now().UTC()
	if err := s.dispatcher.hooks.Put(ctx, cur); err != nil {
		return nil, err
	}
	return cur, s.auditor.Record(ctx, ec, "webhook.update", "webhook/"+id, kernel.OutcomeAllowed, cur.Name)
}

func (s *service) DeleteWebhook(ctx context.Context, ec kernel.ExecutionContext, id string) error {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "webhook.delete", "webhook/"+id); err != nil {
		return err
	}
	if _, err := s.dispatcher.hooks.Get(ctx, id); err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return kernel.NotFound("Webhook not found")
		}
		return err
	}
	if err := s.dispatcher.hooks.Delete(ctx, id); err != nil {
		return err
	}
	return s.auditor.Record(ctx, ec, "webhook.delete", "webhook/"+id, kernel.OutcomeAllowed, "")
}

func (s *service) Deliveries(ctx context.Context, ec kernel.ExecutionContext, webhookID string) ([]Delivery, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "webhook.deliveries", "webhook/"+webhookID); err != nil {
		return nil, err
	}
	return s.dispatcher.delivery.Where(ctx, "doc->>'webhookId' = ?", webhookID)
}

func (s *service) ReplayDelivery(ctx context.Context, ec kernel.ExecutionContext, webhookID, deliveryID string) (*Delivery, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "webhook.replay", "webhook/"+webhookID+"/"+deliveryID); err != nil {
		return nil, err
	}
	dl, err := s.dispatcher.Replay(ctx, webhookID, deliveryID)
	if err != nil {
		return nil, err
	}
	return dl, s.auditor.Record(ctx, ec, "webhook.replay", "webhook/"+webhookID+"/"+deliveryID, kernel.OutcomeAllowed, "")
}

func (s *service) TestWebhook(ctx context.Context, ec kernel.ExecutionContext, id string) (*Delivery, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "webhook.test", "webhook/"+id); err != nil {
		return nil, err
	}
	h, err := s.dispatcher.hooks.Get(ctx, id)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return nil, kernel.NotFound("Webhook not found")
		}
		return nil, err
	}
	dl, err := s.dispatcher.Test(ctx, h)
	if err != nil {
		return nil, err
	}
	return dl, s.auditor.Record(ctx, ec, "webhook.test", "webhook/"+id, kernel.OutcomeAllowed, h.Name)
}

/* ---- API versions + portal ---- */

func (s *service) Versions(ctx context.Context, apiID string) ([]APIVersion, error) {
	return s.versions.Where(ctx, "doc->>'apiId' = ?", apiID)
}

func (s *service) CreateVersion(ctx context.Context, ec kernel.ExecutionContext, apiID string, v APIVersion) (*APIVersion, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "api.version.create", "api/"+apiID); err != nil {
		return nil, err
	}
	if _, err := s.apis.Get(ctx, apiID); err != nil {
		return nil, err
	}
	if v.Version == "" {
		return nil, kernel.Invalid("The version needs a version string, e.g. v2")
	}
	if v.Status == "" {
		v.Status = VersionActive
	}
	if v.Status == VersionDeprecated && v.DeprecatedAt == nil {
		now := time.Now().UTC()
		v.DeprecatedAt = &now
	}
	v.ID, v.APIID, v.CreatedAt = kernel.NewID("ver"), apiID, time.Now().UTC()
	if err := s.versions.Put(ctx, &v); err != nil {
		return nil, err
	}
	return &v, s.auditor.Record(ctx, ec, "api.version.create", "api/"+apiID+"/"+v.ID, kernel.OutcomeAllowed, v.Version+" "+v.Status)
}

func (s *service) UpdateVersion(ctx context.Context, ec kernel.ExecutionContext, apiID, versionID string, v APIVersion) (*APIVersion, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "api.version.update", "api/"+apiID+"/"+versionID); err != nil {
		return nil, err
	}
	cur, err := s.versions.Get(ctx, versionID)
	if err != nil || cur.APIID != apiID {
		return nil, kernel.NotFound("Version not found")
	}
	if v.Status != "" {
		cur.Status = v.Status
	}
	if v.Status == VersionDeprecated && cur.DeprecatedAt == nil {
		now := time.Now().UTC()
		cur.DeprecatedAt = &now
	}
	if v.Sunset != nil {
		cur.Sunset = v.Sunset
	}
	if v.Changelog != "" {
		cur.Changelog = v.Changelog
	}
	if err := s.versions.Put(ctx, cur); err != nil {
		return nil, err
	}
	return cur, s.auditor.Record(ctx, ec, "api.version.update", "api/"+apiID+"/"+versionID, kernel.OutcomeAllowed, cur.Version+" -> "+cur.Status)
}

// Portal is the developer-portal catalog: active APIs with their versions and operations. No secrets.
func (s *service) Portal(ctx context.Context) ([]map[string]any, error) {
	apis, err := s.apis.List(ctx)
	if err != nil {
		return nil, err
	}
	versions, err := s.versions.List(ctx)
	if err != nil {
		return nil, err
	}
	ops, err := s.operations.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(apis))
	for _, a := range apis {
		if a.Lifecycle == "retired" {
			continue
		}
		vs := make([]map[string]any, 0)
		for _, v := range versions {
			if v.APIID == a.ID && v.Status != VersionRetired {
				vs = append(vs, map[string]any{"version": v.Version, "status": v.Status, "changelog": v.Changelog, "sunset": v.Sunset})
			}
		}
		ol := make([]map[string]any, 0)
		for _, o := range ops {
			if o.APIID != a.ID {
				continue
			}
			ol = append(ol, map[string]any{"id": o.ID, "method": o.Method, "path": o.Path, "summary": o.Summary, "version": o.Version, "permission": o.Permission, "rateLimitPerMinute": o.RateLimitPerMinute})
		}
		out = append(out, map[string]any{"id": a.ID, "name": a.Name, "basePath": a.BasePath, "description": a.Description, "defaultVersion": a.DefaultVersion, "versions": vs, "operations": ol})
	}
	return out, nil
}

/* ---- API keys ---- */

func (s *service) Keys(ctx context.Context) ([]APIKey, error) { return s.keys.List(ctx) }

func (s *service) CreateKey(ctx context.Context, ec kernel.ExecutionContext, name string, permissions []string, quotaPerHour int) (*CreatedKey, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "api-key.create", "api-key"); err != nil {
		return nil, err
	}
	if strings.TrimSpace(name) == "" {
		return nil, kernel.Invalid("The key needs a name")
	}
	created, err := issueKey(s.db, name, permissions, quotaPerHour)
	if err != nil {
		return nil, err
	}
	return created, s.auditor.Record(ctx, ec, "api-key.create", "api-key/"+created.ID, kernel.OutcomeAllowed, name)
}

func (s *service) RevokeKey(ctx context.Context, ec kernel.ExecutionContext, id string) error {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "connect.manage", "api-key.revoke", "api-key/"+id); err != nil {
		return err
	}
	k, err := s.keys.Get(ctx, id)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return kernel.NotFound("API key not found")
		}
		return err
	}
	k.Revoked = true
	if err := s.keys.Put(ctx, k); err != nil {
		return err
	}
	return s.auditor.Record(ctx, ec, "api-key.revoke", "api-key/"+id, kernel.OutcomeAllowed, k.Name)
}

/* ---- GraphQL ---- */

func (s *service) GraphQL(ctx context.Context, ec kernel.ExecutionContext, query string) (map[string]any, []map[string]string, error) {
	fields, err := parseQuery(query)
	if err != nil {
		return nil, []map[string]string{{"message": err.Error()}}, nil
	}
	data, errs := s.graphql(ctx, ec, fields)
	return data, errs, nil
}

// RunWebhookDispatcher runs the outbound webhook dispatcher until ctx is cancelled.
func (s *service) RunWebhookDispatcher(ctx context.Context) error {
	err := s.dispatcher.Run(ctx, 2*time.Second)
	if errors.Is(err, context.Canceled) {
		return nil
	}
	return err
}
