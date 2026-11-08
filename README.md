# WorkspaceNow

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/thev1ndu/workspacenow?sort=semver) ![ci](https://github.com/thev1ndu/workspacenow/actions/workflows/ci.yaml/badge.svg) ![images](https://github.com/thev1ndu/workspacenow/actions/workflows/images.yaml/badge.svg)

---

WorkspaceNow is a self-hosted, entity-driven platform on which one organization builds, connects and runs its own business applications, APIs, agents and workflows. One installation serves one organization, and every action — whether a person clicks it, an API calls it, an agent proposes it or a workflow runs it — goes through the same governed business operation, so authorization, validation and audit never diverge.

It builds on a decade of ideas from the open-source cloud-native ecosystem — PostgreSQL, NATS JetStream, Temporal, Valkey, OpenBao, Kubernetes and Flux — combined into one governed platform with a console, a REST API, an MCP server and an AI layer.

**WorkspaceNow provides:**

- a **data platform** where business concepts are declared as entities and every record is validated, authorized, versioned and audited,
- **business operations** as the single governed unit of logic behind every interface,
- **Studio** to describe an application in natural language and release it through environments,
- **Connect** to publish versioned APIs, MCP tools, signed webhooks and tested integrations,
- **AI agents** that propose actions the platform itself decides on, under short-lived signed grants,
- **durable workflows** with human approvals, driven by events,
- **observability**: audit trail, end-to-end traces, alerts, SLOs and a status page,
- a **console** that also runs fully in the browser as a demo, with no backend at all.

## Concepts

The product speaks a fixed vocabulary. The short version:

| Term | Meaning |
|---|---|
| Installation | One deployed copy of WorkspaceNow on the customer's infrastructure; serves exactly one Organization. |
| Organization | The single top-level administrative boundary; owns every resource. |
| Department / Team | Internal boundaries of the Organization used for ownership and authorization. Not tenants. |
| Workspace | One of exactly six fixed product areas — Studio, Connect, Data, AI, Flow, Control. Users cannot create Workspaces. |
| Shell | The console frame hosting the six Workspaces: navigation, signed-in user, Workspace switcher. |
| Identity Provider (IdP) | The customer's OIDC provider; establishes who a user is and asserts group claims. |
| Role | A named set of Permissions defined in WorkspaceNow. |
| Group Mapping | The rule granting a Role to every user carrying a given IdP group claim. |
| Permission | The right to perform one kind of Business Operation or administrative action. |
| Service Identity | The identity under which an Agent or Workflow acts; never inherits the caller's Permissions. |
| Actor | Whoever performed an action: a user, an Agent, a Workflow or the system. |
| Application | A business application built in Studio, owned by a Department. |
| Application Blueprint | The versioned, declarative definition of an Application — entities, pages, operations, workflows, permissions; its source of truth. |
| Release | An immutable, numbered version of an Application Blueprint. |
| Environment | A deployment stage — Development, Staging or Production. Not a tenant. |
| Deployment | A Release running in an Environment; promotion follows Development → Staging → Production. |
| Entity | A business-level contract for a concept (fields, relationships, rules, ownership, events). Not a database table. |
| Entity Scope | Who owns an Entity's authoritative writes: one Application, the Organization (shared), or an external system (read-only). |
| Record | One instance of an Entity. Not a row. |
| Entity Runtime | The shared component that validates, persists, authorizes and publishes events for Records. |
| Business Operation | One governed unit of business logic. Every Entry Point invokes the same operation, so authorization and validation never diverge. |
| Entry Point | The interface through which a Business Operation was invoked: a Studio application, an API, an MCP tool, an Agent or a Workflow. |
| API Operation | An HTTP method and path in Connect that invokes one Business Operation. |
| MCP Tool | An API Operation exposed to MCP clients, or a tool discovered on a registered external MCP server. |
| Agent | An AI worker with instructions, a model, assigned MCP Tools and a Service Identity. It proposes; the platform decides. |
| Platform Agent | A built-in Agent that builds WorkspaceNow resources, such as the Application Architect. |
| Business Agent | An Agent the organization builds for its business, such as the Procurement Assistant. |
| Agent Run | One invocation of an Agent, with its reasoning steps and tool calls. |
| Workflow | A durable, deterministic process started by an Event, a schedule or a person. |
| Execution | One run of a Workflow; survives restarts and can wait on people. |
| Approval | A Workflow step waiting for a person holding a specific Permission. |
| Event | A fact published after a Business Operation commits, e.g. `Stock.LowStockReached`. |
| Audit Record | The record of one attempted action: Actor, Entry Point, action, resource, allowed/denied/failed. |
| Trace | All Audit Records and Events sharing one origin, e.g. a sale through to the purchase order it caused. |

## What it does

| Workspace | What people do there |
|---|---|
| **Studio** | Describe an application and get a plan from the Application Architect agent, edit it in a visual editor, release it, and promote it from development to staging to production. |
| **Data** | Define entities (fields, references, rules), browse and edit records, see database connections. |
| **Connect** | Publish each application's API, expose API operations as MCP tools, register external MCP servers, test integrations whose credentials live in a secrets manager. |
| **AI** | Configure agents (model, instructions, tools, permissions), run them, and ask Sidekick, the console assistant, which acts as you and can be confined to one application. |
| **Flow** | Build workflows that react to events, run on schedules or start by hand, and wait for human approvals. |
| **Control** | Organization, group to role mappings, environments, the audit trail and end-to-end traces. |

Applications built in Studio open full screen from the catalogue, outside the console, with their own app-scoped Sidekick.

## Setup

Everything below is driven by **Makefiles** — the root `Makefile` for the whole local stack, one `Makefile` per component for development.

### Prerequisites

- Docker with the compose plugin (for the local stack),
- for development: Go 1.26, Python 3.12, Node 22 with pnpm.

### Quick start with Docker (local stack)

```sh
git clone https://github.com/thev1ndu/workspacenow
cd workspacenow
make setup    # creates .env from .env.example — set MISTRAL_API_KEY in it for real agent runs
make up       # full stack, waits for readiness
```

After `make up`:

| Service | URL |
|---|---|
| Console | http://localhost:8088 |
| Platform API (`/api/v1`) | http://localhost:8080 |
| Temporal UI | http://localhost:8233 |
| wsn-observer | http://localhost:9098 |
| wsn-ai-service | http://localhost:8090 |
| PostgreSQL / Valkey / NATS / RustFS / OpenBao | localhost:5432 / 6379 / 4222 / 9000 / 8200 |

The demo organization "Northwind Retail" seeds on first boot. In demo mode the console signs you in as one of six personas — store manager, procurement officer, procurement manager, auditor, developer, administrator — each with different permissions. The flagship flow to try: a sale lowers stock, an event fires, a workflow waits for a manager's approval, and a purchase order is created — all under one trace.

### Root Makefile targets

`make help` prints this list; the root `Makefile` passes `.env` to compose via `--env-file`.

| Command | What it does |
|---|---|
| `make setup` | Create `.env` from `.env.example` (first run only; edit it afterwards) |
| `make up` | Start infra + all four apps (`--profile app`) and wait for readiness |
| `make deps` | Start only the infrastructure (postgres, valkey, nats, temporal, rustfs, openbao) |
| `make build` | Build the four app images locally instead of pulling from GHCR |
| `make ps` / `make logs` | Container status / follow all app logs |
| `make down` | Stop the stack (named volumes are kept) |
| `make clean` | Stop the stack and delete its volumes (postgres data, rustfs, nats, temporal, observer) |

CI runs the same stack plus a smoke suite on every commit — `make up`'s compose profile `app`, then the smoke script in `deploy/e2e/` — so `make up` is exactly what CI verifies.

### Configuration (`.env`)

`make setup` copies `.env.example` to `.env`. The variables that matter:

| Variable | Purpose |
|---|---|
| `IMAGE_TAG` | Tag of the four app images on GHCR (`main-<sha>-<run>` on every main push; `v*` tags for releases) |
| `MISTRAL_API_KEY` | Mistral key for agent runs and planning; without it the stack still boots but agent runs fail at the LLM call |
| `AI_SERVICE_TOKEN` | Shared bearer between wsn-service and wsn-ai-service's `/v1/*` routes |
| `OBSERVER_TOKEN` | Bearer for wsn-observer ingest/query; empty = no auth (local only) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials (defaults match compose) |
| `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | Object-storage credentials |
| `OPENBAO_ROOT_TOKEN` | OpenBao dev-mode root token |
| `OIDC_ISSUER` / `OIDC_AUDIENCE` / `OIDC_JWKS_URL` | Switch from demo personas to real OIDC (also set `authMode: "oidc"` in the console's runtime `config.js`, and `WSN_DEMO_MODE=false` on wsn-service) |
| `WSN_BOOTSTRAP_ADMIN_EMAILS` / `WSN_BOOTSTRAP_ADMIN_ROLE` | Comma-separated IdP emails that receive the admin role (default `role-admin`) on first login, audited as `bootstrap.admin`; ignored in demo mode |

The compose stack mounts a ready-made console runtime config (`deploy/compose/console-config.js`) pointing `apiBaseUrl` at `http://localhost:8080` with demo auth. To run the console by hand against the backend, set `apiBaseUrl` in `console/apps/web-ui/public/config.js`; with it empty, the console runs entirely in the browser on the demo platform and needs nothing else.

### Deploy on Kubernetes (Flux GitOps)

The `deploy/flux/` tree applies three layers in order, each waiting for the previous to be ready:

| Layer | Path | Contents |
|---|---|---|
| `infra-controllers` | `deploy/flux/infrastructure/controllers` | CloudNativePG, External Secrets, OpenBao, NATS (JetStream), Valkey, Temporal |
| `infra-configs` | `deploy/flux/infrastructure/configs` | The `wsn-db` Postgres cluster, the OpenBao `ClusterSecretStore`, `ExternalSecret`s, the RustFS object-storage deployment |
| `workspacenow` | `deploy/flux/apps/<env>` | wsn-service (API, relay, worker, migration job), wsn-ai-service, the console, `HTTPRoute`s and NetworkPolicies |

`deploy/flux/apps/base` holds the manifests; `apps/dev`, `apps/staging` and `apps/prod` patch replicas, image tags, hostnames and runtime config. Dev follows `main` through Flux image automation; staging and production pin release tags.

Bootstrap a cluster:

```sh
flux bootstrap github --owner=thev1ndu --repository=workspacenow --branch=main --path=deploy/flux/clusters/dev
```

Before the apps can start, put these secrets in OpenBao (KV v2 at `secret/`), synced into Kubernetes by External Secrets:

| Path | Keys |
|---|---|
| `workspacenow/mistral` | `apiKey` |
| `workspacenow/ai-service` | `token` |
| `workspacenow/observer` | `token` (optional shared bearer for the observer APIs) |
| `workspacenow/run-grant` | `privateKey` (base64 Ed25519 seed for agent run grants) |
| `workspacenow/object-storage` | `accessKey`, `secretKey` |
| `workspacenow/temporal-db` | `password` |

OpenBao needs Kubernetes auth roles named `external-secrets` (read `secret/data/workspacenow/*`) and `wsn-service` (read the paths integrations reference). Overlay hostnames (`workspacenow.example.com`) and the Gateway name (`gateway-system/gateway`) are placeholders — replace them per environment.

Check the manifests render locally:

```sh
for d in infrastructure/controllers infrastructure/configs apps/dev apps/staging apps/prod; do kubectl kustomize deploy/flux/$d > /dev/null && echo "ok $d"; done
```

## Architecture

The console calls wsn-service over `/api/v1` (REST plus server-sent events); MCP clients call wsn-ai-service at `/mcp`; the two services call each other on internal ports. wsn-service uses Postgres, Valkey, NATS, Temporal, object storage and OpenBao.

- **wsn-service** owns every rule. Each business operation runs authorization, the handler, the audit record and its events in one Postgres transaction; events leave through an outbox to NATS JetStream, which drives workflows and the console's live updates.
- **wsn-ai-service** never decides what an agent may do. For each run, wsn-service signs a short-lived grant naming the permissions and tools allowed; every tool call goes back to wsn-service with that grant to be checked, run and audited. Run steps stream back to wsn-service as they happen, which republishes them as `AgentRun.Step` events on the console's live stream.
- **Workflows** run on Temporal, so executions survive restarts and can wait days for an approval.
- **wsn-observer** collects the services' telemetry (OTLP traces, logs, metrics) into WAL segment files — no database — and answers the observability queries; a NetworkPolicy lets only the platform pods and the gateway reach it.

| Concern | Tool |
|---|---|
| Entity persistence, platform metadata | PostgreSQL (CloudNativePG in Kubernetes) |
| Sessions, caching, rate limits | Valkey (Redis protocol) |
| Events | NATS JetStream |
| Durable workflows | Temporal |
| Documents, release artifacts | S3-compatible object storage (RustFS) |
| Integration credentials | OpenBao, synced into Kubernetes by External Secrets |
| Models | Mistral (La Plateforme) |

## Components

| Path | What it is |
|---|---|
| `console/` | The web console (React, Vite, HeroUI, TanStack Query) plus the in-browser demo platform (mock server). Runs standalone until `apiBaseUrl` points at wsn-service. |
| `wsn-service/` | The platform service in Go: identity, data, business operations, Connect, Studio, Flow, AI grants, observability. |
| `wsn-ai-service/` | The AI service in Python (FastAPI, FastMCP, the Mistral SDK): agent runtime, planner, MCP discovery, managed MCP server. |
| `wsn-observer/` | The telemetry observer in Go: ingests OTLP traces, logs and metrics from the services and serves the query API behind `/observer/`. |
| `agent-manager/` | Read-only reference checkout; not part of the build, never edited. |

### wsn-ai-service endpoints

wsn-ai-service serves on :8090. It runs agents on Mistral with tool calling and a local call limit, drafts application plans as the Application Architect, discovers the tools of external MCP servers, and serves WorkspaceNow's own business operations as a managed MCP server. It **never decides what an agent may do**: for each run, wsn-service signs a short-lived Ed25519 grant naming the permissions, tools, application scope and call budget; every tool call goes back to wsn-service with that grant to be checked, run and audited.

| Path | Caller | Purpose |
|---|---|---|
| `POST /v1/runs` | wsn-service | Run an agent turn loop for one prompt; returns the steps, answer, tokens and duration |
| `POST /v1/plans` | wsn-service | Draft an `ApplicationPlan` from a description (Mistral structured output, with retry hints when a previous draft had problems) |
| `POST /v1/mcp/discover` | wsn-service | List the tools of an external MCP server |
| `/mcp` | MCP clients | Streamable HTTP MCP server mirroring wsn-service's tool catalogue; each call runs in wsn-service as the caller's user |
| `GET /healthz` | Kubernetes | Liveness |

The `/v1` routes require `Authorization: Bearer $AI_SERVICE_TOKEN` — only wsn-service holds that token, and a NetworkPolicy keeps everything else out. Unknown `/v1` routes answer 501, and errors use the platform's `ErrorBody` shape so wsn-service reports them like its own.

Calls it makes to wsn-service's internal API:

| Call | When |
|---|---|
| `POST /internal/v1/tools/invoke` (with the run's grant) | Each tool call the model proposes |
| `POST /internal/v1/runs/{runId}/steps` (with the service token) | Each run step **as it happens** — one camelCase `AgentRunStep` in the body; wsn-service republishes it as an `AgentRun.Step` event. Step streaming never fails a run; the final `RunResult` still travels in the `POST /v1/runs` response, from which wsn-service emits `AgentRun.Completed` |
| `POST /internal/v1/mcp/invoke` (service token + `X-Forwarded-Authorization`) | Each MCP tool call, as the MCP client's user |
| `GET /internal/v1/mcp/tools` | Periodically, to keep `/mcp` in sync with wsn-service's catalogue |

## API contract

The contract between the console and wsn-service is `openapi.yaml` at the repo root: 105 paths / 132 operations, all served by real handlers (the generated 501 fallback is empty). Never hand-edit generated code — `wsn-service/internal/oapi/gen.go` is regenerated with `make -C wsn-service generate`, which also regenerates the fallback and the mocks. The narrative API guide lives in `docs/APIs.md`.

## Identity and access model

- **Users provision through the IdP.** In OIDC mode every login upserts the user from the token claims (subject, name, email, group claims) — no manual user creation.
- **The first administrator needs no IdP group.** Set `WSN_BOOTSTRAP_ADMIN_EMAILS=admin@example.com` (comma-separated) on wsn-service; any user whose IdP email matches gets the admin role (`WSN_BOOTSTRAP_ADMIN_ROLE`, default `role-admin`) on first login, audited as `bootstrap.admin`. In demo mode this is ignored.
- **Groups and roles are managed in WorkspaceNow** (console → Control → Identity and access): create WorkspaceNow-native groups and assign members there, map group names (native or IdP claims) to roles, and assign roles directly per user (`PUT /users/{id}/roles`). Resolution is the union of all three sources.

## Development

Run everything against the local infra with `make deps` at the repo root, then the per-component commands below. Each component has its own `Makefile` — run `make -C <dir> help` to list its targets.

### Go — wsn-service (platform API)

```sh
make -C wsn-service generate          # regenerate oapi-codegen code from ../openapi.yaml, the 501 fallback and mocks
make -C wsn-service test              # unit tests with -race
make -C wsn-service test-integration  # integration tests against the compose database (make deps first)
make -C wsn-service lint              # golangci-lint
make -C wsn-service run               # run wsn-service on :8080 (demo organization seeded on first start)
```

Other targets: `build`, `fmt`, `migrate`, `deps` / `deps-down`, `up` / `up-down`, `seed-export`.

### Go — wsn-observer (telemetry)

A second Go module with the same style of targets: `make -C wsn-observer test` (with `-race`), plus `vet`, `fmt`, `check` (gofmt gate), `build`, `run`.

### Python — wsn-ai-service (agent runtime)

```sh
cd wsn-ai-service && python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]" && cp .env.example .env    # set MISTRAL_API_KEY
ruff check . && ruff format --check . && mypy src
pytest --cov=src --cov-fail-under=100            # 100% line coverage, gated in CI
python -m wsn_ai_service.app                      # serve on :8090
```

### Node — console

```sh
cd console
pnpm install
pnpm dev          # console on :3100 (in-browser demo platform until apiBaseUrl is set)
pnpm test         # workspace tests (mock-server contract tests, layout tests, …)
pnpm typecheck && pnpm lint && pnpm build
```

### Golden path: add or change an API endpoint

1. Edit `openapi.yaml` (and the narrative guide `docs/APIs.md` if semantics change).
2. `make -C wsn-service generate` — regenerates `internal/oapi/gen.go`, the 501 fallback (emits only operations no module serves) and moq mocks.
3. Implement the handler in the right module under `wsn-service/internal/<area>/`, register it in `api/server.go` (`Modules`) and wire dependencies in `app/app.go`.
4. Regenerate the fallback again if needed; the build fails loudly if a handler is missing.
5. Unit-test the module; `go test -race ./...` in wsn-service must stay green.
6. Mirror the behavior in the console mock server (`console/workspaces/libs/mock-server`) and its tests, and add or adjust the console page.

### Golden path: console change

Transport only via the `libs/api-client` apis+hooks, routes via `routes`/`buildPath`, UI only from `@heroui/react`. Verify with `pnpm typecheck && pnpm lint && pnpm test` in `console/`.

## CI, images and delivery

- `ci.yaml` (in `.github/workflows/`) runs on every PR/push/tag: Go tests + lint for both Go modules, the AI service's ruff/mypy/100%-coverage gate, console typecheck/lint/tests, Flux manifest rendering, and the compose e2e smoke suite against the live stack.
- `images.yaml` builds `wsn-service`, `wsn-ai-service`, `wsn-observer` and `console` from each component's multi-stage `Dockerfile` (linux/amd64 + arm64, non-root distroless/unprivileged runtime) with docker buildx and pushes them to `ghcr.io/thev1ndu` — only after `ci.yaml` succeeded for that commit, so a failed commit never ships an image. Builds from `main` are tagged `main-<sha>-<run>`; `v*` tags publish the release.
- `dependabot.yml` keeps actions, Docker base images, Go, npm and pip dependencies current.
- Each component builds standalone: `docker build -t wsn-service --build-arg VERSION=dev wsn-service` (same for the others).

## Documentation map

The `docs/` directory holds the living documentation: `CONTEXT.md` (the full domain glossary, summarized in Concepts above), `APIs.md` (narrative API guide), `FEATURES.md` (feature inventory with per-item status), `ROADMAP.md` (current state and what's next), `TODO.md` (task list with manual test steps), `COVERAGE.md` (per-package test coverage numbers). The deployment guides live in `deploy/`: `deploy/compose/` (local stack, HA overlay, console runtime config), `deploy/flux/` (GitOps per environment), `deploy/e2e/` (the smoke suite CI runs). Each component directory has its own `AGENTS.md` with the component-specific rules and checklists.

## Status and roadmap

| Part | State |
|---|---|
| API contract + console | Complete; the console switches between the demo platform and the real backend, with live updates over SSE; 105 paths / 132 operations all served by real handlers. |
| wsn-service | Unit tested, lint clean; the full compose stack boots in CI and the e2e smoke passes against the live API (session, entities, records, flagship low-stock flow, SLOs/alerts/analytics, status page, SSE). |
| wsn-ai-service | Complete: agent runtime, planner, discovery, managed MCP server, per-step streaming; 100% line coverage gated in CI; live-verified against real Mistral once a `MISTRAL_API_KEY` is set. |
| wsn-observer | OTLP ingest + query API in Go, WAL-segment store, unit tested with `-race`; own image and Flux manifests (non-root distroless, NetworkPolicy-limited). |
| CI, images, Flux | `ci.yaml` runs on every PR/push/tag including the compose e2e; images publish to GHCR only on green CI; Flux manifests render with kustomize but were not yet applied to a real cluster. |
| Integration / e2e | The compose e2e smoke runs in CI on every commit; browser-level e2e and a kind-cluster Flux apply are still open. |

Roadmap, ordered by value per effort: **P0 — prove it live** (run the compose stack and smoke suite on real Docker, publish GHCR packages, apply Flux to a kind/k3d cluster, port the mock's scenarios to integration tests against compose Postgres); **P1 — product depth** (multi-tenancy into a sellable SaaS, multi-model AI with eval suites, full GraphQL federation and OAuth2 browser flow, developer-portal docs, workflow versioning with saga compensation, alert channels beyond webhooks); **P2 — scale and ecosystem** (HA hardening with read replicas and Valkey Sentinel, app marketplace and white-label theming, plugin API for custom pages and operations, metering/billing per department, more locales and a WCAG 2.2 AA audit).

Deliberate non-goals: no database inside wsn-observer, ever; no ungoverned agent actions — every tool call goes back through wsn-service with a grant; `agent-manager/` stays a read-only reference checkout.

## Community and support

Questions, ideas and bug reports: https://github.com/thev1ndu/workspacenow/issues
