# ROADMAP.md — WorkspaceNow: current state and what's next

Status as of 2026-11-07. See [FEATURES.md](FEATURES.md) for the full feature inventory with per-item
status, [TODO.md](TODO.md) for the task list with test steps, [COVERAGE.md](COVERAGE.md) for test
coverage numbers, and [APIs.md](APIs.md) / `openapi.yaml` for the 132-operation contract.

## Current state (what the platform can do today)

**≈ 95% of the designed feature set is implemented and unit-verified; ≈ 5–10% is verified against
live infrastructure** (nothing has run on real Docker/GitHub/K8s yet — the sandbox has no Docker).

| Component | State |
|---|---|
| Contract | 132 operations in `openapi.yaml`, all served by real handlers (501 fallback empty) |
| wsn-service (Go) | identity/OIDC + demo personas, RBAC, data platform (entities, records, soft deletes, history, migrations+backfill, import/export, RLS, saved views), business operations, Connect (APIs, MCP, webhooks+signed delivery, OAuth2, API versions, transforms, GraphQL, portal+API keys), Studio (AI plan + edit-with-AI, releases, deployments, pins), AI (governed agents, grants, budgets, Sidekick), Flow (Temporal workflows, approvals, triggers), observability (audit, traces, SSE realtime, alerts, SLOs, status page, backups, OTLP export). `go test -race` green, golangci-lint 0 issues |
| wsn-ai-service (Python) | Mistral agent runtime, Architect planner, MCP discovery + managed MCP server, step streaming; 100% line coverage gated in CI, ruff + mypy strict |
| wsn-observer (Go) | OTLP ingest + query API, WAL segment store (no DB), retention, WAL replication to a standby; `-race` green |
| console | 7 workspaces / ~35 pages, SSE live updates, OIDC login, command palette, notifications inbox, theming, i18n (en/de), PWA/offline; 42 mock tests + 83% coverage gate |
| Delivery | root Makefile (`make setup/up/down`), full compose stack (+ HA overlay), non-root multi-stage Dockerfiles, GHCR images workflow, CI (Go/console/observer/ai + Flux render), Flux GitOps renders, nightly backup CronJob |

**Run it:** `make setup && make up` (needs Docker + `MISTRAL_API_KEY` in `.env`) → console :8088, API :8080, Temporal UI :8233, observer :9098. Demo org "Northwind Retail" seeds on first boot; the flagship flow is sale → low stock → workflow → approval → purchase order under one trace.

**What a business can build on it today:** entity-driven CRUD apps, transactional operations, approval workflows, API/MCP exposure with versioning and keys, governed AI agents (incl. a chat app), event-driven automation, integrations with webhooks/OAuth2 — all audited, all realtime.

## Roadmap

Ordered by value per effort. P0 = do first (unblocks selling/operating the platform); P1 = next quarter; P2 = later.

### P0 — prove it live (nothing here is new code, it's verification)
1. ~~Run `make up` on a Docker host; fix what breaks at first boot~~ — automated: the `e2e` CI job boots the compose stack and runs `deploy/e2e/smoke.sh` on every commit/tag (first live run on PR #2); fix what it surfaces.
2. Run the flagship flow end to end with a real `MISTRAL_API_KEY`; run the live smoke in CI.
3. ~~`ci.yaml` + `images.yaml` run for real~~ (PR #2; images now gated on ci success via `workflow_run`); remaining: make the GHCR packages public (or authenticated) so compose/Flux can pull.
4. Apply Flux to a kind/k3d cluster; replace placeholder hostnames; verify image automation picks up `main-*` tags.
5. Integration tests (`//go:build integration`) porting the mock's 37 scenarios against compose Postgres.

### P1 — product depth
6. **Multi-tenancy**: many organizations per installation (tenant isolation review — today DB-only via the org column), per-tenant SSO config, tenant-level data residency. This is what turns an internal platform into a sellable SaaS.
7. **Multi-model AI**: OpenAI/Anthropic/ollama alongside Mistral, per-agent model choice with fallback, agent eval suites (golden prompts in CI), per-department cost rollups and budgets.
8. **Data** ✅: visual query-builder UI for saved views, record purge job (endpoint + nightly role), entity diff/history UI, CSV/JSON import UI.
9. **Connect**: full GraphQL (schema + federation), OAuth2 authorization-code flow with browser redirect, webhook signature-verification helper lib, developer portal UI (docs pages from OpenAPI).
10. **Flow**: schedule management UI, retry policies, workflow versioning with running-instance migration, compensation (saga) steps.
11. **Ops**: alert channels beyond webhooks (email/SMS/PagerDuty — still webhook-only for now); SLO burn-rate alerts ✅, log-based metric dashboards in the console ✅ (`/analytics/log-metrics` + overview chart), backup restore drill ✅ (`-restore` role + compose `restore` profile), status page HTML skin ✅ (`Accept: text/html` on `/status`).

### P2 — scale & ecosystem
12. HA hardening: read replicas for reads, Valkey Sentinel, observer active-active, chaos tests.
13. App marketplace / template gallery in Studio; white-label theming per installation.
14. Plugin/extension API for custom pages (bring-your-own React component) and custom operations.
15. Metering/billing per department/app (data exists — tokens are recorded), license management.
16. i18n: add more locales (the dictionary mechanism is in place); accessibility audit (WCAG 2.2 AA).

## v0.2.0 plan (tracking issue #11; new service in issue #12)

Theme: enterprise AI you can trust, an intelligent builder, retention features.

- **Enterprise AI**: multi-model routing with fallback + per-department budgets and alerts; agent eval suites gated in CI; instruction versioning with rollback; agent long-term memory (pgvector, permission-scoped, audited); plan-then-execute approvals; PII/output guardrails; agent-to-agent delegation under scoped grants; run replay + "explain this run"; per-agent cost/latency/quality dashboards.
- **Intelligent builder**: prompt-to-preview sandbox deploys; business-language blueprint diffs; schema inference from CSV/JSON/sample API; natural-language saved views and workflow drafts; template marketplace v1 (signed, one-click install); per-role page customization and app/installation theming; workflow simulation.
- **Retention/UX**: guided onboarding checklist (time-to-first-value < 15 min); per-user customizable dashboards; saved searches and bulk record actions; undo from record history; record comments with @mentions; notification preferences; in-app help; command-palette create actions; scheduled imports.
- **Enterprise admin/security**: SCIM; signed compliance evidence packs; RBAC policy-as-code + permission simulator; session management, idle timeout, IP allowlists; multi-tenancy isolation review (SaaS gate); PII field classification with automatic redaction in portal/MCP/exports.
- **Connect/ecosystem**: GraphQL federation; OAuth2 browser flow; webhook verification helper lib; per-API-key consumer analytics; SDK + Postman export; integration templates.
- **Flow**: schedules UI, retry policies, workflow versioning with running-instance migration, saga compensation, sub-workflows, pause/resume, replay.
- **Data**: cross-entity query builder, lineage graph, RLS "view as user" preview, data quality rules, read auditing for sensitive entities.
- **New service (issue #12)**: `wsn-notify-service` for email/SMS/PagerDuty with templates, delivery log, fallback chains and digest modes; replaces webhook-only alerting. Only new component in v0.2.0; memory and evals live in the existing services.

## Non-goals (deliberate)

- No database inside wsn-observer, ever — WAL segment files only.
- No ungoverned agent actions: every tool call goes back through wsn-service with a grant. This is the product's core promise; don't trade it for convenience.
- `agent-manager/` stays a read-only reference checkout.
