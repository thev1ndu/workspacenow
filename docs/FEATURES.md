# FEATURES.md — WorkspaceNow feature inventory (use cases and sub-features)

Status as of 2026-11-07. Legend: ✅ implemented + unit tested · 🟡 partial · ⬜ not started.
**Nothing has been verified against live infrastructure yet** — all ✅ means unit-tested code; the
compose stack (`make setup && make up`) is the first live run. `TODO.md` is the task list with test
steps; `COVERAGE.md` has per-package test coverage numbers.

Scope: 95 paths / 121 operations in `openapi.yaml`, all served by real handlers in wsn-service
(the generated 501 fallback has 0 stubs). Console: 7 workspaces, ~35 pages.

---

## 1. Identity & access management
- ✅ Session (`GET /session`) with caller profile + effective permissions
- ✅ Demo mode: persona tokens (`demo.u-*`), `POST /demo/reset` reseeds the demo org
- ✅ Real OIDC: JWKS validation in wsn-service; console login with Authorization Code + PKCE (`/login/callback`, `authMode: "oidc"` in `config.js`)
- ✅ Organization model: users sync from the IdP on login; **first admin via `WSN_BOOTSTRAP_ADMIN_EMAILS`** (no IdP group setup); WorkspaceNow-native **groups CRUD** (`/groups`) managed on the Identity and access page; group→role mappings (GET/PUT) match native group names and IdP claims alike; roles assignable directly per user (`PUT /users/{id}/roles`); resolution unions all three; the Organization page shows installation + IdP
- ✅ Per-endpoint permission guards (`kernel.RequirePermission`), 403s audited as denials with trace id
- ✅ Environments (Development / Staging / Production)
- ⬜ SCIM / user provisioning against a real IdP

## 2. Data platform (entities & records)
- ✅ Entity registry: list/get/create/update with schema validation (`/entities`), incl. `rowFilter` row-level security (`$actor.*` values)
- ✅ Records CRUD per entity with server-side `q`/`view`/`includeDeleted`/`limit`/`offset`
- ✅ **File fields (`type: file`)**: records store only a `FileRef` (key/name/size/contentType); upload via `POST .../records/{id}/files/{field}` (≤50 MiB) into object storage (RustFS/S3), download via GET; permission-checked, audited; the AI Architect and the manual plan editor both offer the file field type, and record forms get an upload/download input
- ✅ Rule enforcement: required fields (422), uniqueness (409), referential checks, read-only entities
- ✅ **Soft deletes** (`deleted_at`/`deleted_by`) + `POST .../restore`; lists hide deleted unless `includeDeleted=true`
- ✅ **Record history**: every create/update/delete/restore writes a `record_history` row (actor, field-level diff, snapshot); `GET .../records/{id}/history`
- ✅ **Schema migrations with backfill**: `POST /entities/{name}/migrate` (`add` always, `drop`/`retype` refused while records exist), backfills rows, snapshots into `entity_versions`, bumps `version`, audited
- ✅ **Import/export**: `GET .../records/export?format=json|csv`, `POST .../records/import` (JSON/CSV)
- ✅ **Saved views**: CRUD `/entities/{name}/views`, `POST .../run`, `?view=` on list; console picker in the records page
- ✅ Connections catalog (databases, caches, warehouses) — `/connections`
- ✅ Console: data workspace (model/ERD view, entities, records with search+pager+views+export+deleted toggle, connections pages)
- ✅ **Visual query-builder UI for saved views**: records page "Views" dialog — filter rows (field/op/value), sort, limit, shared; runs via the existing views API
- ✅ **Record purge job**: `POST /entities/{name}/records/purge?olderThanDays=30` hard-deletes soft-deleted rows (audited); a nightly job in the server role purges every non-external entity
- ✅ **Entity diff/history UI**: `GET /entities/{name}/versions` + `GET .../versions/diff?from=&to=` (field-level added/removed/changed); the entity detail page has a Schema history card with a version table and diff chips
- ✅ **CSV/JSON import UI**: records page "Import" dialog (paste or load a file, JSON or CSV) on top of the existing import API

## 3. Business operations
- ✅ Operation catalog (`/business-operations`) and invocation (`/business-operations/invoke`)
- ✅ All-or-nothing transactions; domain errors as 409 with no partial writes
- ✅ Receipts/ids returned (e.g. checkout → `KDY-T0001`)
- ✅ Seeded ops: product/stock/low-stock queries, sale recording, POS checkout, supplier CRUD, purchase request list/create/approve, purchase order create/list
- ⬜ Scheduled/async operations; operation versioning

## 4. Connect — APIs, MCP & integrations
- ✅ API registry + operations (`/apis`, `/api-operations`) with invoke
- ✅ MCP exposure per operation (`PUT /api-operations/{id}/mcp`) with duplicate-tool-name 409
- ✅ Rate limiting per operation (429)
- ✅ MCP servers registry + tool catalogue (`/mcp/servers`, `/mcp/tools`); register external MCP servers
- ✅ Managed MCP server on wsn-ai-service (`/mcp`) mirroring the platform tool catalogue
- ✅ Integrations registry: CRUD (`/integrations`) + connectivity test (`/integrations/{id}/test`) with failure reasons audited; credentials are OpenBao `secretRef`s only — the platform never stores secrets
- ✅ **OpenBao secrets access**: `GET /secrets?prefix=` lists references (`connect.manage`); `GET /secrets/read?path=` returns values to `control.manage` only, audited as `secret.read`, never logged/stored; console Integrations page has a create/edit dialog with a secret picker and a values viewer
- ✅ AI-side external MCP discovery (`/v1/mcp/discover`)
- ✅ **Outbound webhooks with signing + replay**: `/webhooks` CRUD, deliveries log, `X-WSN-Signature: t=...,v1=<hmac-sha256>`, backoff retries, `POST .../deliveries/{id}/replay`, `POST .../test`; dispatcher runs in the server role
- ✅ **OAuth2 client flows**: `integration.auth` (client credentials / refresh_token), token fetched and cached in Valkey, used by integration tests
- ✅ **API versioning + deprecation**: `/apis/{id}/versions` CRUD; invoke takes `?version=`/`X-API-Version`; deprecated → Deprecation/Sunset headers, retired → 410
- ✅ **Request/response transformation**: `operation.transform` field mapping (dotted paths) around the business operation
- ✅ **GraphQL gateway**: `POST /graphql` minimal `query { Entity(where:..., first: N) { fields } }` over records, read-permission enforced
- ✅ **Developer portal**: `GET /portal/apis` catalog (no secrets) + `/api-keys` CRUD; `X-API-Key` auth in middleware, SHA-256-hashed storage, per-key hourly quota in Valkey, revocation
- ⬜ Full GraphQL schema/federation; OAuth2 authorization-code flow with browser redirect; webhook signature verification helper lib for receivers

## 5. Studio — application lifecycle (plan → build → release → deploy)
- ✅ Applications list/detail/update, pins (`/me/pinned-applications`)
- ✅ **Plan with AI**: `POST /applications/plan` via the Application Architect agent (entities, pages, operations, workflows, permissions from a prompt), `POST /applications/apply` to materialize
- ✅ **Edit with AI**: `POST /applications/{appId}/plan` sends the current blueprint + change prompt to the Architect and returns the revised plan; validated with the same additive change rules, applied via `PUT /applications/{appId}`; "Ask the Architect" panel in the console's edit page
- ✅ Blueprint editor + workflow editor in the console (studio workspace: applications, builder, edit, detail)
- ✅ Releases: immutable blueprint artifacts in object storage (`releases/{app}/{version}/blueprint.json`), create/list
- ✅ Deployments per environment with role gates (`/deployments`) — e.g. production requires Release Manager
- ⬜ Blue/green + rollback; environment promotion policies as code

## 6. AI agents (governed)
- ✅ Model providers (`/model-providers`) with token/cost accounting
- ✅ Agents CRUD (`/agents` list/get/PATCH with `ai.manage`, tool validation, version bump); 11 seeded agents (Sidekick, Procurement Assistant, Architect, Data/UI/API/Workflow/Integration/Security/Testing agents)
- ✅ Agent runs: `POST /agents/{id}/runs`, `POST /sidekick/runs` (role check, `applicationId` app-scope, permission intersection for acts-as-caller), list/get runs with server paging
- ✅ Run grants: Ed25519-signed, tool allow-list, app scope, Valkey call budget; internal API on `:8081` (`/internal/v1/tools/invoke`, `/mcp/tools`, `/mcp/invoke`, `/runs/{id}/steps`)
- ✅ Runs persisted, `agent.run` audited, `AgentRun.Step`/`Completed` events, steps streamed live from wsn-ai-service
- ✅ wsn-ai-service (Python/FastAPI): Mistral tool-calling runtime with call limit + token accounting, planner with JSON-schema output, FastMCP server, 100% line coverage gated in CI
- ✅ Console AI workspace: overview KPIs, agents, runs (live steps), models, run detail
- ⬜ Live-verified against real Mistral (needs `MISTRAL_API_KEY`); multi-model routing

## 7. Flow — workflow automation on Temporal
- ✅ Workflow definitions: CRUD + validation of the step graph (`/workflows`)
- ✅ Step kinds: operation, agent, notify, condition, wait, approval (with `OnReject` branch)
- ✅ Executions: start/list/get; approvals: list + decision signal (`/approvals/{id}/decision`)
- ✅ `-worker` role: Temporal worker (`flow.RunWorker`) + NATS event-trigger consumer; SDK `testsuite` tests (happy path, approve, reject, condition)
- ✅ Console flow workspace: workflows, editor, executions, execution detail, approvals
- ✅ 4 seeded workflows incl. the flagship low-stock → approval → purchase order → supplier notify
- ⬜ Schedules UI; retry policies; workflow versioning with running-instance migration

## 8. Observability, audit & realtime
- ✅ Realtime: single SSE endpoint `GET /events/stream` (outbox → NATS → hub) with reconnect + `Last-Event-ID`; console holds one connection and invalidates all queries on any event — every mounted view updates live; `GET /events` paged history
- ✅ Audit log (`/audit` with actor/outcome/q filters, server paging, `audit.read` guard + denied-audit), traces (`/traces`, `/traces/{id}` joining audit + events + observer spans)
- ✅ Overview/resources/search/analytics (`/overview`, `/resources`, `/search?q=`, `/analytics/activity|tokens|entry-points`) — search respects entity read permissions
- ✅ Health (`/health` checks Postgres, Valkey, NATS, observer, ai-service)
- ✅ OTLP export from wsn-service and wsn-ai-service to **wsn-observer**: per-request spans, request metrics, all logs; shared `X-Trace-Id`
- ✅ wsn-observer: OTLP ingest (traces/logs/metrics) + GET and POST query APIs, stored as append-only JSONL WAL segment files (no DB, no in-memory payload) with byte retention; Dockerfile, CI, Flux + PVC
- ✅ **Error inbox & service health**: wsn-observer derives error groups from error spans (OTLP status 2; fingerprint = service+span+message; count, first/last seen, newest trace-id samples) via `GET /api/v1/errors` + `POST /api/v1/errors/query`, and per-service stats (spans, errors, logs, error rate, last seen) via `GET /api/v1/services`; wsn-service proxies both as `GET /errors` and `GET /services` under `audit.read`; console Control → **Health & errors** page (services table + searchable error groups linking into traces)
- ✅ Console control workspace: overview, organization, access (roles/mappings), audit, traces + trace detail, environments, settings, **alerts** (rules CRUD incl. SLO burn-rate source, fires + ack, SLO table)
- ✅ **Alerting on audit/event patterns and SLO burn rates**: `/alerts` CRUD (source audit|event|slo, action, outcome, threshold, window, webhook), fires + ack, evaluator in the server role fires once per window crossing, calls the webhook (signed) and emits `Alert.Fired`; console control workspace has an Alerts and SLOs page (rules incl. custom webhookUrl, fires, SLOs)
- ✅ **SLOs per business operation**: `/slos` CRUD + `/slos/{id}/status` — per-minute Valkey counters recorded by an engine OnInvoke hook; success rate + histogram p95 vs targets, `breached` flag
- ✅ **Status page**: public `GET /status` (no auth) — healthy/degraded/down rollup, version, uptime, components
- ✅ **Backup/DR**: `-backup` role pg_dumps to S3 (`backups/`) and records each run in the `backups` table (read it straight from the DB — no API); `-restore` role drills a restore; Flux `backup-cronjob.yaml` nightly; PITR via CloudNativePG WAL archiving (infrastructure layer); observer **WAL segment replication** to a standby (`WSN_OBSERVER_REPLICA_URL` + `POST /v1/segments` ingest, idempotent import)
- ✅ **HA**: `deploy/compose/docker-compose.ha.yml` overlay (postgres primary+streaming replica, valkey+replica, 2nd wsn-service, observer standby); Flux base already runs 2 replicas
- ✅ **Upgrade gate**: server/worker roles refuse to start with pending migrations (`-migrate` first); compose runs the migrate job before them
- ✅ **SLO burn-rate alerts**: alert rules with `source: "slo"` + `sloId` (or operation in `action`); the evaluator measures the SLO's counters and fires when the burn rate ×100 crosses the threshold (600 = 6× the error budget), webhook + `Alert.Fired` like any rule
- ✅ **Log-based metric dashboards**: `GET /analytics/log-metrics?days=` aggregates OTLP logs from wsn-observer per severity per day; console overview has a stacked "Log volume" chart
- ✅ **Backup restore drill**: `-restore` role (`-backup-id` to pick a record, newest done by default) downloads the dump from S3 and `pg_restore --clean --if-exists`; compose service `wsn-service-restore` under the `restore` profile
- ✅ **Status page HTML skin**: `GET /status` returns the HTML page when the client sends `Accept: text/html`, JSON otherwise
- ⬜ Alerting channels beyond webhooks (email/SMS/PagerDuty — webhook is the only channel for now); observer totals are exact from the per-segment index except text-filtered or mid-segment time-bounded queries, which report `"approximate": true`

## 9. Console webapp
- ✅ 7 workspaces / ~35 pages (overview, data, studio, connect, flow, control, AI) on HeroUI + Tailwind, pnpm workspaces
- ✅ Real HTTP transport behind `apiBaseUrl`; in-browser demo platform (mock-server implementing the whole contract, 42 tests, coverage gated in CI) when unset
- ✅ SSE live updates (above), server-side search + pagination on runs/traces/audit/records, KPI dashboard with deep-linked cards, charts
- ✅ OIDC login (PKCE) + demo persona picker; per-environment `config.js` mounted into the container
- ✅ **Theming beyond default**: `useAppearance` — light/dark/system mode + accent palettes, persisted, applied pre-paint; Preferences dialog
- ✅ **Keyboard-first command palette**: Cmd/Ctrl+K fuzzy palette over applications, records, people, entities, agents, workflows, APIs, MCP servers, integrations + workspace navigation
- ✅ **In-app notifications inbox**: bell with unread count since last open, live events + pending approvals from SSE, mark-all-read, deep links — **and per-app**: `?applicationId=` on `/events` + `/approvals`, a scoped bell in each full-screen app (`/apps/:appId`) with its own seen marker
- ✅ **i18n**: `@workspacenow/i18n` provider + dictionaries (en/de), locale in `config.js` or localStorage, language switcher in Preferences; shell (sidebar, topbar, breadcrumbs, login, preferences) localized
- ✅ **Offline/PWA**: vite-plugin-pwa — precached app shell, `manifest.webmanifest` (standalone), auto-updating `sw.js`, network-first API GET caching with offline fallback

## 10. Demo scenario (Northwind Retail)
- ✅ Seeded: org, 6 departments, 4 teams, 6 users, 7 roles, 3 environments, 4 apps, 9 entities, 29 records, 3 APIs, 119 operations, 3 MCP servers, 5 integrations, 1 model provider, 11 agents, 4 workflows
- ✅ Flagship flow: sale crossing reorder level → `Stock.LowStockReached` → `wf-low-stock` → procurement agent → approval → purchase order → supplier notification, one trace end to end
- ⬜ Live run of the flagship flow (needs Docker + `MISTRAL_API_KEY`)

## 11. Delivery — local, CI, cloud
- ✅ Root `Makefile`: `make setup` / `make up` / `make down` (+ `deps`, `build`, `ps`, `logs`, `clean`); full compose stack in `deploy/compose/docker-compose.yml` (infra + 4 apps behind the `app` profile, `.env` at repo root, auto-migrations via `wsn-service-migrate`, S3 bucket init, NATS stream auto-create, demo seed on first boot; object storage is RustFS (S3-compatible) everywhere — local compose and prod Flux)
- ✅ Per-component multi-stage Dockerfiles, non-root (distroless / dedicated user / unprivileged nginx); console build pinned to `$BUILDPLATFORM` (fixes the QEMU SIGILL)
- ✅ GitHub Actions: `ci.yaml` runs on every PR, main push and `v*` tag — component unit tests, console typecheck+lint+coverage, generated-code freshness, Flux render, **and a full e2e job** that boots the compose stack and runs `deploy/e2e/smoke.sh` (session, entities, record create, flagship sale → `Stock.LowStockReached`, approvals/SLOs/alerts/analytics, status page JSON+HTML, SSE) against the live API. `images.yaml` builds and pushes to GHCR **only after ci succeeded** (`workflow_run` gate), so a failed commit never ships an image
- 🟡 Flux GitOps (`deploy/flux`): controllers, configs, apps per env, image automation, NetworkPolicy, observer PVC — renders with `kubectl kustomize`, never applied; hostnames are placeholders
- 🟡 CI runs on PRs/main/tags (first live run on PR #2); images build only on green ci but were never pulled by compose/Flux yet (GHCR packages must be public or authenticated); OpenBao roles for a real cluster documented but not done; no kind/k3d run

---

## Completion summary

| Area | Written | Live-verified |
|---|---|---|
| API contract + wsn-service (121/121 endpoints, tests, lint clean) | 100% | 0% |
| wsn-ai-service (100% line coverage, CI-gated) | 100% | 0% (live smoke opt-in) |
| wsn-observer (WAL store + query API) | ~95% | 0% |
| Console (7 workspaces, SSE, OIDC, coverage gate) | ~95% | demo platform only |
| Compose local stack + Makefile + .env | 100% | 0% |
| CI workflows + Dockerfiles + GHCR push | ~90% | 0% (never run on GitHub) |
| Flux/K8s deployment | ~75% | 0% (renders only) |
| Integration/e2e tests | ~5% | 0% |

**Overall: ≈ 90% of the designed feature set is implemented and unit-verified; ≈ 5–10% is
verified against live infrastructure.** The remaining 10% is mostly delivery proof (run CI, push
and pull images, apply Flux to a cluster, run the flagship flow live with a Mistral key), not
new features.
