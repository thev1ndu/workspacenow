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
	TestIntegration(ctx context.Context, ec kernel.ExecutionContext, id string) (*Integration, error)
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
	operations   *docstore.Collection[Operation]
	servers      *docstore.Collection[MCPServer]
	integrations *docstore.Collection[Integration]
	http         *http.Client
}

func NewService(db *gorm.DB, engine kernel.Engine, auditor kernel.Auditor, c cache.Cache, rt data.Runtime, sec secrets.Reader, d Discoverer) Service {
	return &service{
		db: db, engine: engine, auditor: auditor, cache: c, rt: rt, secrets: sec, discoverer: d,
		apis:         docstore.NewCollection(db, "apis", func(a *API) string { return a.ID }),
		operations:   docstore.NewCollection(db, "api_operations", func(o *Operation) string { return o.ID }),
		servers:      docstore.NewCollection(db, "mcp_servers", func(s *MCPServer) string { return s.ID }),
		integrations: docstore.NewCollection(db, "integrations", func(i *Integration) string { return i.ID }),
		http:         &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
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
	op, err := s.operation(ctx, operationID)
	if err != nil {
		return nil, err
	}
	if op.RateLimitPerMinute > 0 {
		key := fmt.Sprintf("wsn:rl:%s:%s:%d", op.ID, ec.Actor.ID, time.Now().Unix()/60)
		n, err := s.cache.IncrWindow(ctx, key, time.Minute)
		if err == nil && n > int64(op.RateLimitPerMinute) {
			return nil, &kernel.Error{Status: http.StatusTooManyRequests, Code: kernel.CodeInvalidState, Message: fmt.Sprintf("Rate limit of %d calls a minute reached; try again shortly", op.RateLimitPerMinute)}
		}
	}
	return s.engine.Invoke(ctx, ec, op.BusinessOperation, input)
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
		problem = s.probe(ctx, in)
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
