package obs

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/ai"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/flow"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
)

// collection helpers bound to the service's db in NewService.
func (s *service) countCollection(ctx context.Context, name string) int64 {
	c := docstore.NewCollection[map[string]any](s.db, name, func(m *map[string]any) string { return fmt.Sprint((*m)["id"]) })
	n, err := c.Count(ctx, "1=1")
	if err != nil {
		return 0
	}
	return n
}

// Overview counts the platform's resources and today's audit activity.
func (s *service) Overview(ctx context.Context) (*oapi.OverviewStats, error) {
	entities, err := s.runtime.Entities(ctx)
	if err != nil {
		return nil, err
	}
	apis, err := s.connect.APIs(ctx)
	if err != nil {
		return nil, err
	}
	tools, err := s.connect.Tools(ctx)
	if err != nil {
		return nil, err
	}
	var records int64
	if err := s.db.WithContext(ctx).Model(&models.Record{}).Count(&records).Error; err != nil {
		return nil, err
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	var auditToday, deniedToday int64
	if err := s.db.WithContext(ctx).Model(&models.AuditRecord{}).Where("time >= ?", today).Count(&auditToday).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Model(&models.AuditRecord{}).Where("time >= ? AND outcome = ?", today, string(kernel.OutcomeDenied)).Count(&deniedToday).Error; err != nil {
		return nil, err
	}
	approvals := docstore.NewCollection(s.db, "approvals", func(a *flow.Approval) string { return a.ID })
	pending, err := approvals.Count(ctx, "doc->>'status' = 'pending'")
	if err != nil {
		return nil, err
	}
	return &oapi.OverviewStats{
		Applications:     int(s.countCollection(ctx, "applications")),
		Entities:         len(entities),
		Records:          int(records),
		Apis:             len(apis),
		McpTools:         len(tools),
		Agents:           int(s.countCollection(ctx, "agents")),
		Workflows:        int(s.countCollection(ctx, "workflows")),
		PendingApprovals: int(pending),
		AuditToday:       int(auditToday),
		DeniedToday:      int(deniedToday),
	}, nil
}

// Resources lists every governed resource across workspaces.
func (s *service) Resources(ctx context.Context) ([]oapi.ResourceSummary, error) {
	depts, err := s.identity.Departments(ctx)
	if err != nil {
		return nil, err
	}
	deptName := func(id string) string {
		for _, d := range depts {
			if string(d.Id) == id || d.Name == id {
				return d.Name
			}
		}
		return id
	}
	apps := docstore.NewCollection(s.db, "applications", func(a *struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}) string {
		return a.ID
	})
	appDocs, err := apps.List(ctx)
	if err != nil {
		return nil, err
	}
	appName := func(id string) string {
		for _, a := range appDocs {
			if a.ID == id {
				return a.Name
			}
		}
		return "Organization"
	}

	var out []oapi.ResourceSummary
	add := func(id, typ, name, workspace, owner, lifecycle string, updatedAt time.Time) {
		out = append(out, oapi.ResourceSummary{
			Id: id, Type: oapi.ResourceType(typ), Name: name, Workspace: oapi.WorkspaceKey(workspace),
			Owner: owner, Lifecycle: lifecycle, UpdatedAt: updatedAt.UTC().Format(time.RFC3339),
		})
	}

	appFull := docstore.NewCollection(s.db, "applications", func(a *struct {
		ID                string    `json:"id"`
		Name              string    `json:"name"`
		OwnerDepartmentID string    `json:"ownerDepartmentId"`
		Lifecycle         string    `json:"lifecycle"`
		UpdatedAt         time.Time `json:"updatedAt"`
	}) string {
		return a.ID
	})
	for _, a := range mustList(ctx, appFull) {
		add(a.ID, "application", a.Name, "studio", deptName(a.OwnerDepartmentID), a.Lifecycle, a.UpdatedAt)
	}
	entities, err := s.runtime.Entities(ctx)
	if err != nil {
		return nil, err
	}
	for _, e := range entities {
		add(e.Name, "entity", e.Label, "data", appName(e.OwnerApplicationID), e.Lifecycle, e.UpdatedAt)
	}
	apis, err := s.connect.APIs(ctx)
	if err != nil {
		return nil, err
	}
	for _, a := range apis {
		add(a.ID, "api", a.Name, "connect", appName(a.ApplicationID), a.Lifecycle, time.Time{})
	}
	servers, err := s.connect.Servers(ctx)
	if err != nil {
		return nil, err
	}
	for _, m := range servers {
		owner := "External"
		if m.Kind == "managed" {
			owner = "Platform"
		}
		add(m.ID, "mcp-server", m.Name, "connect", owner, m.Status, m.RegisteredAt)
	}
	integrations, err := s.connect.Integrations(ctx)
	if err != nil {
		return nil, err
	}
	for _, i := range integrations {
		var at time.Time
		if i.LastTestedAt != nil {
			at = *i.LastTestedAt
		}
		add(i.ID, "integration", i.Name, "connect", "Platform Engineering", i.Status, at)
	}
	agents := docstore.NewCollection(s.db, "agents", func(a *ai.AgentDoc) string { return a.ID })
	for _, a := range mustList(ctx, agents) {
		add(a.ID, "agent", a.Name, "ai", deptName(a.OwnerDepartmentID), a.Status, time.Time{})
	}
	workflows := docstore.NewCollection(s.db, "workflows", func(w *flow.Workflow) string { return w.ID })
	for _, w := range mustList(ctx, workflows) {
		add(w.ID, "workflow", w.Name, "flow", appName(w.ApplicationID), w.Status, time.Time{})
	}
	return out, nil
}

func mustList[T any](ctx context.Context, c *docstore.Collection[T]) []T {
	items, err := c.List(ctx)
	if err != nil {
		return nil
	}
	return items
}

// nameFields are the record value keys that make a good search title, best first.
var nameFields = []string{"name", "orderNumber", "sku", "receipt", "fullName", "title", "subject", "tag"}

// SearchHitType weights break ties between equally good matches.
var typeWeight = map[oapi.SearchHitType]int{
	"application": 3, "record": 2, "user": 2, "entity": 1,
}

// score rates how well every query term matches: exact, prefix, word start, substring in title, then anywhere.
func score(terms []string, title, rest string) int {
	t := strings.ToLower(title)
	all := t + " " + strings.ToLower(rest)
	total := 0
	for _, term := range terms {
		switch {
		case t == term:
			total += 100
		case strings.HasPrefix(t, term):
			total += 60
		case regexp.MustCompile(`\b` + regexp.QuoteMeta(term)).MatchString(t):
			total += 40
		case strings.Contains(t, term):
			total += 25
		case strings.Contains(all, term):
			total += 10
		default:
			return 0
		}
	}
	return total
}

// Search is the global search over what the caller may read; records need their entity's read permission.
func (s *service) Search(ctx context.Context, ec kernel.ExecutionContext, q string, limit int) ([]oapi.SearchHit, error) {
	terms := strings.Fields(strings.ToLower(q))
	if len(terms) == 0 {
		return []oapi.SearchHit{}, nil
	}
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	type ranked struct {
		hit   oapi.SearchHit
		score int
	}
	var hits []ranked
	add := func(hit oapi.SearchHit, rest string) {
		if v := score(terms, hit.Title, hit.Subtitle+" "+hit.Id+" "+rest); v > 0 {
			hits = append(hits, ranked{hit, v + typeWeight[hit.Type]})
		}
	}

	depts, _ := s.identity.Departments(ctx)
	deptName := func(id string) string {
		for _, d := range depts {
			if string(d.Id) == id {
				return d.Name
			}
		}
		return id
	}
	apps := docstore.NewCollection(s.db, "applications", func(a *struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}) string {
		return a.ID
	})
	appDocs, _ := apps.List(ctx)
	appName := func(id string) string {
		for _, a := range appDocs {
			if a.ID == id {
				return a.Name
			}
		}
		return "Organization"
	}

	appFull := docstore.NewCollection(s.db, "applications", func(a *struct {
		ID                string `json:"id"`
		Name              string `json:"name"`
		Description       string `json:"description"`
		OwnerDepartmentID string `json:"ownerDepartmentId"`
	}) string {
		return a.ID
	})
	for _, a := range mustList(ctx, appFull) {
		add(oapi.SearchHit{Type: "application", Id: a.ID, Title: a.Name, Subtitle: "Application · " + deptName(a.OwnerDepartmentID)}, a.Description)
	}
	entities, err := s.runtime.Entities(ctx)
	if err != nil {
		return nil, err
	}
	for _, e := range entities {
		add(oapi.SearchHit{Type: "entity", Id: e.Name, Title: e.Label, Subtitle: "Entity · " + appName(e.OwnerApplicationID)}, e.Name+" "+e.Description)
	}
	apis, err := s.connect.APIs(ctx)
	if err != nil {
		return nil, err
	}
	for _, a := range apis {
		add(oapi.SearchHit{Type: "api", Id: a.ID, Title: a.Name, Subtitle: "API · " + appName(a.ApplicationID)}, a.Description)
	}
	servers, err := s.connect.Servers(ctx)
	if err != nil {
		return nil, err
	}
	for _, m := range servers {
		names := make([]string, 0, len(m.Tools))
		for _, t := range m.Tools {
			names = append(names, t.Name)
		}
		add(oapi.SearchHit{Type: "mcp-server", Id: m.ID, Title: m.Name, Subtitle: "MCP server"}, strings.Join(names, " "))
	}
	integrations, err := s.connect.Integrations(ctx)
	if err != nil {
		return nil, err
	}
	for _, i := range integrations {
		add(oapi.SearchHit{Type: "integration", Id: i.ID, Title: i.Name, Subtitle: "Integration · " + i.Kind}, i.Target)
	}
	agents := docstore.NewCollection(s.db, "agents", func(a *ai.AgentDoc) string { return a.ID })
	for _, a := range mustList(ctx, agents) {
		add(oapi.SearchHit{Type: "agent", Id: a.ID, Title: a.Name, Subtitle: "Agent · " + deptName(a.OwnerDepartmentID)}, a.Description)
	}
	workflows := docstore.NewCollection(s.db, "workflows", func(w *flow.Workflow) string { return w.ID })
	for _, w := range mustList(ctx, workflows) {
		add(oapi.SearchHit{Type: "workflow", Id: w.ID, Title: w.Name, Subtitle: "Workflow · " + appName(w.ApplicationID)}, "")
	}
	users, err := s.identity.Users(ctx)
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		add(oapi.SearchHit{Type: "user", Id: u.Id, Title: u.Name, Subtitle: deptName(u.DepartmentId)}, string(u.Email))
	}
	// Records only for entities the caller may read.
	for _, e := range entities {
		if !ec.Permissions.Has(e.ReadPermission) {
			continue
		}
		records, err := s.runtime.Records(ctx, e.Name)
		if err != nil {
			return nil, err
		}
		for _, r := range records {
			values := r.Values
			title := r.ID
			for _, f := range nameFields {
				if v, ok := values[f]; ok && v != nil {
					title = fmt.Sprint(v)
					break
				}
			}
			rest, _ := json.Marshal(values)
			appID := e.OwnerApplicationID
			hit := oapi.SearchHit{
				Type: "record", Id: r.ID, Title: title,
				Subtitle: "Record · " + e.Label, Entity: &e.Name,
			}
			if appID != "" {
				hit.AppId = &appID
			}
			add(hit, string(rest))
		}
	}
	sort.SliceStable(hits, func(i, j int) bool { return hits[i].score > hits[j].score })
	if len(hits) > limit {
		hits = hits[:limit]
	}
	out := make([]oapi.SearchHit, 0, len(hits))
	for _, h := range hits {
		out = append(out, h.hit)
	}
	return out, nil
}

// Activity is the daily series of API calls, agent tool calls, workflow steps and denials from audit rows.
func (s *service) Activity(ctx context.Context, days int) ([]oapi.ActivityPoint, error) {
	if days <= 0 || days > 90 {
		days = 14
	}
	series := lastDays(days)
	out := make([]oapi.ActivityPoint, 0, days)
	for _, d := range series {
		var rows []models.AuditRecord
		if err := s.db.WithContext(ctx).Where("time >= ? AND time < ?", d, d.Add(24*time.Hour)).Find(&rows).Error; err != nil {
			return nil, err
		}
		p := oapi.ActivityPoint{Date: openapi_types.Date{Time: d}}
		for _, r := range rows {
			switch r.EntryPoint {
			case "api", "studio":
				p.ApiCalls++
			case "mcp":
				p.AgentToolCalls++
			case "workflow":
				p.WorkflowSteps++
			}
			if r.Outcome == string(kernel.OutcomeDenied) {
				p.Denied++
			}
		}
		out = append(out, p)
	}
	return out, nil
}

// TokenUsage is daily token usage keyed by sanitized model name, from recorded agent runs.
func (s *service) TokenUsage(ctx context.Context, days int) ([]oapi.TokenUsagePoint, error) {
	if days <= 0 || days > 90 {
		days = 14
	}
	agents := docstore.NewCollection(s.db, "agents", func(a *ai.AgentDoc) string { return a.ID })
	agentDocs, err := agents.List(ctx)
	if err != nil {
		return nil, err
	}
	modelOf := map[string]string{}
	for _, a := range agentDocs {
		modelOf[a.ID] = a.Model
	}
	runs := docstore.NewCollection(s.db, "agent_runs", func(r *ai.RunDoc) string { return r.ID })
	runDocs, err := runs.List(ctx)
	if err != nil {
		return nil, err
	}
	series := lastDays(days)
	out := make([]oapi.TokenUsagePoint, 0, days)
	for _, d := range series {
		point := oapi.TokenUsagePoint{Date: openapi_types.Date{Time: d}, AdditionalProperties: map[string]float32{}}
		for _, r := range runDocs {
			if r.StartedAt.UTC().Truncate(24*time.Hour).Equal(d) && r.Tokens > 0 {
				key := sanitizeModel(modelOf[r.AgentID])
				point.AdditionalProperties[key] += float32(r.Tokens)
			}
		}
		out = append(out, point)
	}
	return out, nil
}

// ListErrorGroups proxies wsn-observer's error-span groups (status ERROR, grouped by
// service+span+message), newest activity first. With no observer configured it answers empty.
func (s *service) ListErrorGroups(ctx context.Context, q ErrorGroupQuery) ([]oapi.ErrorGroup, int, error) {
	limit, offset := q.Limit, q.Offset
	if limit < 1 || limit > errorGroupsMax {
		limit = errorGroupsDefault
	}
	if offset < 0 {
		offset = 0
	}
	if s.obs == nil {
		return []oapi.ErrorGroup{}, 0, nil
	}
	res, err := s.obs.ListErrors(ctx, observer.ErrorQuery{
		ServiceName: q.Service, Q: q.Q, Limit: limit, Offset: offset, SortOrder: "desc",
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]oapi.ErrorGroup, 0, len(res.Errors))
	for _, e := range res.Errors {
		traceIDs := e.TraceIDs
		if traceIDs == nil {
			traceIDs = []string{}
		}
		out = append(out, oapi.ErrorGroup{
			Fingerprint: e.Fingerprint, Service: e.Service, SpanName: e.SpanName, Message: e.Message,
			Count: e.Count, FirstSeen: e.FirstSeen, LastSeen: e.LastSeen, TraceIds: traceIDs,
		})
	}
	return out, res.TotalCount, nil
}

// ListObservedServices proxies wsn-observer's per-service telemetry stats. With no observer
// configured it answers empty.
func (s *service) ListObservedServices(ctx context.Context) ([]oapi.ServiceStat, error) {
	if s.obs == nil {
		return []oapi.ServiceStat{}, nil
	}
	res, err := s.obs.Services(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]oapi.ServiceStat, 0, len(res.Services))
	for _, sv := range res.Services {
		out = append(out, oapi.ServiceStat{
			Service: sv.Service, Spans: sv.Spans, Errors: sv.Errors, Logs: sv.Logs,
			ErrorRate: sv.ErrorRate, LastSeen: sv.LastSeen,
		})
	}
	return out, nil
}

// EntryPoints aggregates audit outcomes per entry point.
// logLevels are the OTLP severities counted per day; the observer matches them case-insensitively.
var logLevels = []string{"debug", "info", "warn", "error"}

// LogMetrics aggregates log volume per severity per day from wsn-observer's OTLP log store. When the
// observer is unreachable the day's counts stay zero, so the dashboard still renders.
func (s *service) LogMetrics(ctx context.Context, days int) ([]oapi.LogMetricPoint, error) {
	if days <= 0 || days > 90 {
		days = 14
	}
	out := make([]oapi.LogMetricPoint, 0, days)
	for _, d := range lastDays(days) {
		p := oapi.LogMetricPoint{Date: openapi_types.Date{Time: d}, Levels: map[string]int{}}
		for _, lv := range logLevels {
			p.Levels[lv] = 0
			if s.obs == nil {
				continue
			}
			res, err := s.obs.ListLogs(ctx, observer.LogQuery{Level: lv, StartTime: d, EndTime: d.Add(24 * time.Hour), Limit: 1})
			if err != nil {
				continue // observer down: leave the zero
			}
			p.Levels[lv] = res.TotalCount
		}
		out = append(out, p)
	}
	return out, nil
}

func (s *service) EntryPoints(ctx context.Context) ([]oapi.EntryPointBreakdown, error) {
	var rows []struct {
		EntryPoint string
		Outcome    string
		N          int64
	}
	if err := s.db.WithContext(ctx).Model(&models.AuditRecord{}).
		Select("entry_point, outcome, count(*) as n").Group("entry_point, outcome").Scan(&rows).Error; err != nil {
		return nil, err
	}
	byPoint := map[string]*oapi.EntryPointBreakdown{}
	var order []string
	for _, r := range rows {
		b, ok := byPoint[r.EntryPoint]
		if !ok {
			b = &oapi.EntryPointBreakdown{EntryPoint: r.EntryPoint}
			byPoint[r.EntryPoint] = b
			order = append(order, r.EntryPoint)
		}
		switch r.Outcome {
		case string(kernel.OutcomeAllowed):
			b.Allowed += int(r.N)
		case string(kernel.OutcomeDenied):
			b.Denied += int(r.N)
		default:
			b.Failed += int(r.N)
		}
	}
	sort.Strings(order)
	out := make([]oapi.EntryPointBreakdown, 0, len(order))
	for _, k := range order {
		out = append(out, *byPoint[k])
	}
	return out, nil
}

// lastDays returns the UTC day starts for the last n days, oldest first.
func lastDays(n int) []time.Time {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	out := make([]time.Time, 0, n)
	for i := n - 1; i >= 0; i-- {
		out = append(out, today.AddDate(0, 0, -i))
	}
	return out
}

func sanitizeModel(model string) string {
	if model == "" {
		return "unknown"
	}
	return regexp.MustCompile(`[^a-zA-Z0-9]+`).ReplaceAllString(model, "_")
}
