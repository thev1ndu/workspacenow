# COVERAGE.md — feature and test coverage per service

Status as of 2026-11-07. "Coverage" means unit-test line/statement coverage unless noted; "verified"
means run against real infrastructure, which nothing beyond unit tests has yet. Reproduce the numbers
with the commands in each section. `T0D0.md` tracks the same work as a task list with test steps.

| Service | Language | Unit tests | Coverage | CI gate | Verified against real infra |
|---|---|---|---|---|---|
| `wsn-observer` | Go | pass (`-race`) | 38.5–100% per package (below) | `go test -race ./...` in `ci.yaml` | no |
| `wsn-service` | Go | **all pass** (`-race` clean; the old `TestGrantExpired` bug is fixed) | 0–88.4% per package (below) | `go build/vet/test` in `ci.yaml` | no |
| `wsn-ai-service` | Python | 60 passed, 1 skipped (live smoke) | **100% of `src`** (491 statements) | `--cov-fail-under=100`, ruff, mypy strict | unit tests only; live smoke opt-in via `MISTRAL_API_KEY` |
| `console` | TypeScript | mock-server: 34 passed | not instrumented (no coverage provider installed) | typecheck + eslint + mock-server tests | demo platform in browser; real backend never connected |
| deploy / CI / Flux | YAML | — | — | render-only checks | never run on GitHub / never applied to a cluster |

`agent-manager/` is a reference checkout of WSO2 Agent Manager (gitignored); it is not part of this repo.

---

## wsn-observer — central telemetry service (Go, zero third-party deps)

Reproduce: `cd wsn-observer && go test -cover ./...`

| Package | Coverage | Notes |
|---|---|---|
| `config` | 100.0% | env loading + validation (empty `WSN_OBSERVER_DATA_DIR` rejected) |
| `telemetry` | 100.0% | OTLP/HTTP JSON parsing for traces, logs, metrics |
| `server` | 93.1% | ingest + GET/POST query API, auth, ErrorBody, storage-failure 500s |
| `walstore` | 83.4% | segment append/roll/reopen/prune, reverse tail-capped scans |
| `main` | 38.5% | signal handling + graceful shutdown |

### Features in place now
- OTLP/HTTP JSON ingest for **all three signals**: `POST /v1/traces`, `/v1/logs`, `/v1/metrics` (202 `{"accepted": n}`), optional shared bearer token (`WSN_OBSERVER_TOKEN`), 8 MiB body cap
- Query API, both styles: GET (`/api/v1/traces`, `/trace`, `/logs`, `/metrics`, `/overview`) and agent-manager-style POST (`/api/v1/traces/query`, `/traces/{id}/spans/query`, `/traces/{id}/spans/{spanId}`, `/logs/query`, `/metrics/query`) with filters, sort, pagination
- **Storage: WAL segment files** (`walstore`), no database, no in-memory payload: `<DATA_DIR>/{traces,logs,metrics}/<seq>.seg` JSONL; one sequential write per batch; rotation at `WSN_OBSERVER_SEGMENT_BYTES` (32 MiB); byte retention (`WSN_OBSERVER_RETENTION_BYTES`, 256 MiB/signal) pruned at startup + hourly, active segment never deleted; reopen recovers counts/services; queries scan newest-first up to `WSN_OBSERVER_SCAN_LIMIT` (100k) records
- `GET /healthz`, graceful shutdown; Dockerfile (distroless non-root), CI job, Flux base + overlays + NetworkPolicy + `/observer/` HTTPRoute + 2Gi PVC at `/data`
- Emitters wired: wsn-service (Go exporter) and wsn-ai-service (Python exporter) both ship OTLP to it

### TODO / what's happening
- [ ] Query totals are over the newest `SCAN_LIMIT` records (documented trade-off); a real index would give exact totals
- [ ] Optional: a real observability plane (OpenSearch / OpenChoreo observer) behind the same API
- [ ] Integration tests against the running service; CI job and Flux manifests written but never run/applied

---

## wsn-service — the platform API (Go)

Reproduce: `cd wsn-service && go test -race -cover ./...`

| Package | Coverage | Package | Coverage |
|---|---|---|---|
| `internal/observer` (OTLP exporter + query client) | 88.4% | `internal/ai` (grants, client, service, internal API) | 68.9% |
| `internal/obs` (events/audit/traces/health/overview/search/analytics) | 33.8% | `internal/flow` (workflow defs + worker) | 18.5% |
| `internal/studio` (plans) | 18.4% | `internal/data` (validation) | 14.2% |
| `middleware` | 14.9% | `internal/kernel` | 10.0% |
| everything else (`api`, `app`, `bizops`, `connect`, `identity`, `infra/*`, `seed`, `stream`, `db/*`, `config`, root) | 0.0% — no unit tests yet | | |

### Features in place now — all 73 contract endpoints have real handlers (the generated `api/unimplemented_gen.go` 501 fallback remains as a safety net and regenerates unchanged)
- **Identity & session**: `/session`, `/personas`, `/organization`, `/departments`, `/teams`, `/users`, `/roles`, `/group-mappings` GET+PUT, `/environments`; demo tokens in demo mode, OIDC/JWKS otherwise
- **Demo**: `POST /demo/reset`
- **Entity runtime**: `/entities` list/get/create/update, `/entities/{name}/records` list/create/update/delete, `/connections` — with validation (422), uniqueness (409), referential checks, read-only entities
- **Business operations**: `/business-operations`, `/business-operations/invoke` — all-or-nothing transactions
- **Connect**: `/apis`, `/api-operations` (list/invoke/MCP exposure), `/mcp/servers`, `/mcp/tools`, `/integrations` + test — rate limits (429), conflict on duplicate tool names (409)
- **Studio**: applications (list/plan/apply/update), releases, deployments, pins — plan currently needs the AI service
- **Live updates**: `GET /events/stream` (SSE) + NATS relay role (`-relay`) with outbox
- **AI (new, wired to wsn-ai-service)**: `GET /model-providers`, `/agents` list/get/PATCH (`ai.manage`, tool validation, version bump), `/agent-runs` list/get, `POST /agents/{id}/runs`, `POST /sidekick/runs` (role check, `applicationId` app-scope, permission intersection for acts-as-caller); Ed25519 run grants with tool list + Valkey call budget; internal API on `:8081` (`/internal/v1/tools/invoke`, `/mcp/tools`, `/mcp/invoke`, `/runs/{id}/steps`); runs persisted, `agent.run` audited, tokens+cost added to the provider, `AgentRun.Step`/`Completed` events; `studio.Planner`/`connect.Discoverer`/`flow.AgentRunner` now call wsn-ai-service
- **Flow (new)**: `Flow` module serves workflows/executions/approvals; `-worker` flag runs the Temporal worker (`flow.RunWorker`) + NATS trigger consumer (`flow.ConsumeTriggers`)
- **Observability**: `GET /events`, `GET /audit` (actorKind/outcome/q filters, `audit.read` guarded with denied-audit on 403), `GET /traces`, `GET /traces/{traceId}` (audit + events + span counts from wsn-observer), `GET /health` (Postgres, Valkey, NATS, wsn-observer, wsn-ai-service), `GET /overview`, `GET /resources`, `GET /search?q=&limit=` (mock scoring ported, records filtered by entity read permission), `GET /analytics/activity|tokens|entry-points` from real audit rows and runs
- **Telemetry export (new)**: every HTTP request exports one SERVER span + `http.server.requests`/`http.server.duration_ms` metrics to wsn-observer; all slog logs ship as OTLP log records; the request trace id (`X-Trace-Id` or minted) is shared with audit records so `GET /traces/{id}` and the observer's spans line up
- The generated `api/unimplemented_gen.go` 501 fallback stays as a safety net — regenerate with `sh scripts/gen-unimplemented.sh` after changing `internal/oapi`

### TODO / what's happening
- [ ] Run end to end against live infra: compose + wsn-ai-service with `MISTRAL_API_KEY` — Sidekick "Which items are low on stock?", permission denial as Nimal, app-scope denial, "Plan with AI", and the flagship sale → `Stock.LowStockReached` → `wf-low-stock` → approval → purchase order under one trace (`-worker` role)
- [x] Temporal workflow tests with the Go SDK `testsuite` (`internal/flow/temporal_test.go`: happy path, approval approved/rejected, condition branch)
- [ ] Hardening: integration tests (`//go:build integration`) porting the mock's 34 scenarios, response validation against `openapi.yaml`, moq mocks, OpenBao against compose, idempotent event-triggered starts
- [x] golangci-lint: `.golangci.yaml` in wsn-service, `golangci-lint v2.14.0 run ./...` = 0 issues

---

## wsn-ai-service — governed agent runtime (Python/FastAPI)

Reproduce: `cd wsn-ai-service && .venv/bin/pytest --cov=src --cov-report=term -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy src`

Coverage: **100% of `src`** (491 statements, every file), 60 tests passed + 1 skipped (live smoke), gated in CI with `--cov-fail-under=100`, plus ruff and strict mypy.

### Features in place now
- Agent runtime on Mistral with tool calling, local call limit, token accounting (`runtime.py`)
- Application Architect planner with JSON-schema output + retry hints (`planner.py`)
- External MCP tool discovery (FastMCP client, `discovery.py`)
- Managed MCP server (FastMCP) mirroring wsn-service's tool catalogue (`mcp_server.py`), mounted at `/mcp`
- Service token on `/v1/*`, platform ErrorBody shape, 501 catch-all for unimplemented `/v1` routes (same pattern as wsn-service's `unimplemented_gen.go`)
- Streaming run steps to wsn-service as they happen: `POST /internal/v1/runs/{runId}/steps`; failures never fail the run
- **OTLP telemetry (new)**: per-request span + request metrics middleware, all `wsn_ai_service` logs shipped as OTLP records, each agent run is one span with model/tokens/steps + an `agent.run.tokens` metric, all posted to wsn-observer (`WSN_OBSERVER_URL`, disabled when empty, never raises)
- Live smoke test against real Mistral, opt-in (`tests/test_live_smoke.py`, skips without `MISTRAL_API_KEY`; CI job `live-smoke` runs it only with the secret)

### TODO / what's happening
- [x] Called by wsn-service now (planner/discoverer/runs/steps) — needs a live `MISTRAL_API_KEY` for real model answers
- [ ] Run the live smoke in CI once `MISTRAL_API_KEY` is a repo secret

---

## console — the webapp (TypeScript/React, heroui, pnpm workspaces)

Reproduce: `cd console && pnpm typecheck && pnpm lint && pnpm --filter @workspacenow/mock-server test:coverage` (34 tests pass, 83.02% lines against an 80% gate).

### Features in place now
- Real HTTP transport behind `apiBaseUrl`, live updates over SSE (`/events/stream`), demo data from the mock-server (Mistral-only personas)
- Workspace pages: overview, data, studio, connect, flow, control, AI
- Environment resource limits removed (type, mock seed, Environments page)
- Run-id no longer wraps in the runs table
- **Search + pagination**: contract now takes `q`/`limit`/`offset` on `/agent-runs`, `/traces`, `/entities/{name}/records`, `/approvals`, `/events` (server-side via `docstore.Page`, total count in the response); console runs/traces/audit/records pages page against the server; audit keeps server-side actor/outcome/q + pager; agents tables use shared `usePagedSearch`/`usePagination` hooks + `TablePager` in `@workspacenow/views`
- **Dashboard**: `MetricGrid`/`Metric` render a responsive grid of individual KPI cards (icon, value, hint, whole-card links); AI overview has 6 deep-linked KPIs + recent runs + token chart/model usage rail
- Mock server implements the whole contract and is test-covered (34 tests)

### TODO / what's happening
- [x] Real OIDC login: Authorization Code + PKCE in `AuthProvider`, `/login/callback` route, `authMode: "oidc"` + `oidc{issuer,clientId,redirectUri}` in `apps/web-ui/public/config.js` (persona picker remains for demo mode)
- [x] Coverage instrumentation: `@vitest/coverage-v8`, 80% line threshold (currently 83.02%), `test:coverage` gated in CI
- [ ] Never run against the real wsn-service backend
- [x] Server-side pagination/search: `q`/`limit`/`offset` added to `/agent-runs`, `/traces`, `/entities/{name}/records`, `/approvals`, `/events` in the contract, wsn-service, mock-server, and the console pages

---

## deploy / CI / Flux — delivery

- Per-component multi-stage Dockerfiles (non-root): `wsn-service`, `wsn-ai-service`, `wsn-observer` (distroless), `console` (nginx uid 101); CI builds with docker buildx to `ghcr.io/thev1ndu`
- GitHub workflows (Go, Python, console, Flux render, path-filtered): **written, never run**
- Flux: controllers, configs, apps per environment, image automation for dev, NetworkPolicy for the observer, PVC for its data — `kubectl kustomize` renders, never applied; hostnames/Gateway names are placeholders (`workspacenow.example.com`)
- OpenBao roles/secrets for a real cluster documented in `deploy/flux/README.md`, not done

### Blockers (from T0D0.md)
1. `cd wsn-service && go mod tidy` — done (go.mod/go.sum committed; build/vet/test pass)
2. Start Docker (Rancher Desktop) — `docker info` succeeds
3. `make -C wsn-service deps` — compose healthy (watch the `temporalio/temporal` image tag)
4. `MISTRAL_API_KEY` into `wsn-ai-service/.env`

### Suggested order
1. Blockers 2–4. 2. Run wsn-service against compose; fix what breaks. 3. Wire workflows (`-worker`) and run the sale→purchase-order scenario. 4. AI integration end to end (Sidekick, planner). 5. Remaining observability endpoints. 6. Integration tests from the mock's 34 scenarios. 7. CI green, images published, Flux on a test cluster.
