# WorkspaceNow

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/thev1ndu/workspacenow?sort=semver) ![ci](https://github.com/thev1ndu/workspacenow/actions/workflows/ci.yaml/badge.svg) ![images](https://github.com/thev1ndu/workspacenow/actions/workflows/images.yaml/badge.svg)

----

WorkspaceNow is a self-hosted, entity-driven platform on which one organization builds, connects and runs its own business applications, APIs, agents and workflows. One installation serves one organization, and every action — whether a person clicks it, an API calls it, an agent proposes it or a workflow runs it — goes through the same governed business operation, so authorization, validation and audit never diverge.

It builds on a decade of ideas from the open-source cloud-native ecosystem — PostgreSQL, NATS JetStream, Temporal, Valkey, OpenBao, Kubernetes and Flux — combined into one governed platform with a console, a REST API, an MCP server and an AI layer.

Terms (Organization, Entity, Business Operation, Entry Point, Service Identity, Trace and so on) are defined in [docs/CONTEXT.md](docs/CONTEXT.md).

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

## To start using WorkspaceNow

See the deployment guides in [deploy/](deploy): `deploy/compose/` for a local stack, `deploy/flux/` for a Kubernetes cluster.

### You have a working Docker environment

```sh
git clone https://github.com/thev1ndu/workspacenow
cd workspacenow
make setup    # creates .env from .env.example — set MISTRAL_API_KEY in it for real agent runs
make up       # full stack: console http://localhost:8088, API http://localhost:8080,
              # temporal UI :8233, observer :9098, ai-service :8090
```

`make` at the repo root drives the whole local stack:

| Command | What it does |
|---|---|
| `make setup` | Create `.env` from `.env.example` (first run only) |
| `make up` | Start infra + all four apps and wait for readiness |
| `make deps` | Start only the infrastructure (postgres, valkey, nats, temporal, rustfs, openbao) |
| `make build` | Build the four app images locally instead of pulling from GHCR |
| `make ps` / `make logs` | Container status / follow all app logs |
| `make down` / `make clean` | Stop the stack (volumes kept) / stop and delete volumes |

CI runs the same stack plus a smoke suite on every commit (`make up`'s compose profile `app`, then `deploy/e2e/smoke.sh`), so `make up` is exactly what CI verifies.

### You have a Kubernetes cluster

Flux applies `deploy/flux/`: infrastructure controllers, then their instances, then the apps per environment. Dev follows `main` through image automation; staging and production pin release tags. See [deploy/flux/README.md](deploy/flux/README.md).

## To start developing WorkspaceNow

Prerequisites: Docker, Go 1.26, Python 3.12, Node 22 with pnpm.

### You have a working Go environment

```sh
make -C wsn-service test     # unit tests (-race), plus vet/lint via make -C wsn-service lint
make -C wsn-service generate # regenerate the oapi-codegen code from ../openapi.yaml
make -C wsn-service run      # run wsn-service on :8080 (demo organization seeded on first start)
```

wsn-observer is a second Go module with the same targets (`make -C wsn-observer test`).

### You have a working Python environment

```sh
cd wsn-ai-service && python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]" && cp .env.example .env    # set MISTRAL_API_KEY
ruff check . && ruff format --check . && mypy src
pytest --cov=src --cov-fail-under=100            # 100% line coverage, gated in CI
python -m wsn_ai_service.app                      # serve on :8090
```

### You have a working Node environment

```sh
cd console
pnpm install
pnpm dev          # console on :3100 (in-browser demo platform until apiBaseUrl is set)
pnpm test         # workspace tests (mock-server contract tests, layout tests, …)
pnpm typecheck && pnpm lint && pnpm build
```

Or run everything against the local infra: `make deps` at the repo root, then the per-service commands above. To point a hand-run console at the backend, set `apiBaseUrl: "http://localhost:8080"` in `console/apps/web-ui/public/config.js` (the compose stack mounts the ready-made `deploy/compose/console-config.js` instead). With it empty, the console runs entirely in the browser on the demo platform, which needs nothing else.

Demo mode signs you in as one of the Northwind Retail personas (store manager, procurement officer, procurement manager, auditor, developer, administrator), each with different permissions.

## Architecture

The console calls wsn-service over `/api/v1` (REST plus server-sent events); MCP clients call wsn-ai-service at `/mcp`; the two services call each other on internal ports. wsn-service uses Postgres, Valkey, NATS, Temporal, object storage and OpenBao.

- **wsn-service** owns every rule. Each business operation runs authorization, the handler, the audit record and its events in one Postgres transaction; events leave through an outbox to NATS JetStream, which drives workflows and the console's live updates.
- **wsn-ai-service** never decides what an agent may do. For each run, wsn-service signs a short-lived grant naming the permissions and tools allowed; every tool call goes back to wsn-service with that grant to be checked, run and audited. Run steps stream back to wsn-service as they happen, which republishes them as `AgentRun.Step` events on the console's live stream.
- **Workflows** run on Temporal, so executions survive restarts and can wait days for an approval.
- **wsn-observer** collects the services' telemetry (OTLP traces, logs, metrics) and answers the observability queries; a NetworkPolicy lets only the platform pods and the gateway reach it.

| Concern | Tool |
|---|---|
| Entity persistence, platform metadata | PostgreSQL (CloudNativePG in Kubernetes) |
| Sessions, caching, rate limits | Valkey (Redis protocol) |
| Events | NATS JetStream |
| Durable workflows | Temporal |
| Documents, release artifacts | S3-compatible object storage (RustFS) |
| Integration credentials | OpenBao, synced into Kubernetes by External Secrets |
| Models | Mistral (La Plateforme) |

## Services

| Path | What it is |
|---|---|
| [`console/`](console) | The web console (React, Vite, HeroUI, TanStack Query). Runs on an in-browser demo platform until `apiBaseUrl` points at wsn-service. See its [README](console/README.md). |
| [`wsn-service/`](wsn-service) | The platform service in Go. See its [README](wsn-service/README.md). |
| [`wsn-ai-service/`](wsn-ai-service) | The AI service in Python (FastAPI, FastMCP, the Mistral SDK). See its [README](wsn-ai-service/README.md). |
| [`wsn-observer/`](wsn-observer) | The telemetry observer in Go: ingests OTLP traces, logs and metrics from the services and serves the query API behind `/observer/`. See its [README](wsn-observer/README.md). |

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

## Repository layout

| Path | What it is |
|---|---|
| [`openapi.yaml`](openapi.yaml) | The API contract between the console and wsn-service (93 paths / 119 operations) — the source of truth for generated code. |
| [`deploy/`](deploy) | `deploy/compose/` local development (incl. `console-config.js`, mounted into the console container), `deploy/flux/` GitOps per environment (see its [README](deploy/flux/README.md)), `deploy/e2e/` the smoke suite CI runs against the live stack. |
| [`.github/`](.github) | `workflows/`: `ci.yaml` covers Go, the console, the AI service, Flux rendering and the compose e2e; `images.yaml` builds each component's `Dockerfile` with docker buildx, only after green CI. `dependabot.yml` keeps actions, Docker base images, Go, npm and pip dependencies current. |
| [`docs/`](docs) | `CONTEXT.md` (domain glossary), `APIs.md` (narrative API guide), `FEATURES.md` (feature inventory), `ROADMAP.md`, `T0D0.md` (task list with test steps), `COVERAGE.md` (per-package test coverage). |
| `agent-manager/` | Read-only reference checkout; not part of the build. |

## Build and images

`.github/workflows/images.yaml` builds `wsn-service`, `wsn-ai-service`, `wsn-observer` and `console` from each component's multi-stage `Dockerfile` (linux/amd64 + arm64) and pushes them to `ghcr.io/thev1ndu` — only after `ci.yaml` succeeded for that commit, so a failed commit never ships an image. Every image runs as a non-root user on a distroless/unprivileged runtime. Builds from `main` are tagged `main-<sha>-<run>`; `v*` tags publish the release.

## Documentation and support

- [docs/APIs.md](docs/APIs.md) — the narrative API guide; [openapi.yaml](openapi.yaml) — the machine-readable contract.
- [docs/FEATURES.md](docs/FEATURES.md) — full feature inventory with per-area status; [docs/ROADMAP.md](docs/ROADMAP.md) — what's next; [docs/T0D0.md](docs/T0D0.md) — tasks and manual test steps; [docs/COVERAGE.md](docs/COVERAGE.md) — test coverage per package.
- Questions and issues: [github.com/thev1ndu/workspacenow/issues](https://github.com/thev1ndu/workspacenow/issues).

## Status

| Part | State |
|---|---|
| API contract + console | Complete; the console switches between the demo platform and the real backend, with live updates over SSE; 93 paths / 119 operations all served by real handlers. |
| wsn-service | Unit tested, lint clean; the full compose stack boots in CI and the e2e smoke passes against the live API (session, entities, records, flagship low-stock flow, SLOs/alerts/analytics, status page, SSE). |
| wsn-ai-service | Complete: agent runtime, planner, discovery, managed MCP server, per-step streaming; 100% line coverage gated in the `wsn-ai-service` job of `ci.yaml`; live Mistral smoke opt-in. Live-verified against real Mistral still pending a `MISTRAL_API_KEY`. |
| wsn-observer | OTLP ingest + query API in Go, WAL-segment store, unit tested with `-race`; own image and Flux manifests (non-root distroless, NetworkPolicy-limited). |
| CI, images, Flux | `ci.yaml` runs on every PR/push/tag incl. the compose e2e; images publish to GHCR only on green CI; Flux manifests render with kustomize but were never applied to a real cluster yet. |
| Integration / e2e | The compose e2e smoke runs in CI on every commit; browser-level e2e and a kind-cluster Flux apply are still open. |
