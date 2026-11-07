# WorkspaceNow

A self-hosted, entity-driven platform on which one organization builds, connects and runs its own business applications, APIs, agents and workflows. One installation serves one organization, and every action, whether a person clicks it, an API calls it, an agent proposes it or a workflow runs it, goes through the same governed business operation, so authorization, validation and audit never diverge.

Terms (Organization, Entity, Business Operation, Entry Point, Service Identity, Trace and so on) are defined in [CONTEXT.md](CONTEXT.md).

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

## Architecture

The console calls wsn-service over `/api/v1` (REST plus server-sent events); MCP clients call wsn-ai-service at `/mcp`; the two services call each other on internal ports. wsn-service uses Postgres, Valkey, NATS, Temporal, object storage and OpenBao.

- **wsn-service** owns every rule. Each business operation runs authorization, the handler, the audit record and its events in one Postgres transaction; events leave through an outbox to NATS JetStream, which drives workflows and the console's live updates.
- **wsn-ai-service** never decides what an agent may do. For each run, wsn-service signs a short-lived grant naming the permissions and tools allowed; every tool call goes back to wsn-service with that grant to be checked, run and audited. Run steps stream back to wsn-service as they happen, which republishes them as `AgentRun.Step` events on the console's live stream.
- **Workflows** run on Temporal, so executions survive restarts and can wait days for an approval.
- **wsn-observer** collects the services' telemetry (OTLP traces, logs, metrics) into bounded memory and answers the observability queries; a NetworkPolicy lets only the platform pods and the gateway reach it.

| Concern | Tool |
|---|---|
| Entity persistence, platform metadata | PostgreSQL (CloudNativePG in Kubernetes) |
| Sessions, caching, rate limits | Valkey (Redis protocol) |
| Events | NATS JetStream |
| Durable workflows | Temporal |
| Documents, release artifacts | S3-compatible object storage (MinIO) |
| Integration credentials | OpenBao, synced into Kubernetes by External Secrets |
| Models | Mistral (La Plateforme) |

## Repository layout

| Path | What it is |
|---|---|
| [`console/`](console) | The web console (React, Vite, HeroUI, TanStack Query). Runs on an in-browser demo platform until `apiBaseUrl` points at wsn-service. |
| [`wsn-service/`](wsn-service) | The platform service in Go. See its [README](wsn-service/README.md). |
| [`wsn-ai-service/`](wsn-ai-service) | The AI service in Python (FastAPI, FastMCP, the Mistral SDK): governed agent runs, the Application Architect planner, external MCP discovery and the managed MCP server on `/mcp`. See [wsn-ai-service](#wsn-ai-service) below and its [README](wsn-ai-service/README.md). |
| [`wsn-observer/`](wsn-observer) | The telemetry observer in Go: ingests OTLP traces, logs and metrics from the services and serves the query API behind `/observer/`. See its [README](wsn-observer/README.md). |
| [`deploy/compose/`](deploy/compose) | Local infrastructure for development. |
| [`deploy/flux/`](deploy/flux) | GitOps deployment with Flux: infrastructure operators, then the apps, per environment. See its [README](deploy/flux/README.md). |
| [`.github/workflows/`](.github/workflows) | CI: `wsn-ai-service.yaml` gates the Python service at 100% line coverage (plus an opt-in live Mistral smoke test); `ci.yaml` covers Go, the console and Flux rendering; `images.yaml` builds each component's `Dockerfile` with docker buildx. |
| [`APIs.md`](APIs.md), [`openapi.yaml`](openapi.yaml) | The API contract between the console and wsn-service (73 endpoints). |
| [`CONTEXT.md`](CONTEXT.md) | The domain glossary. |

## wsn-ai-service

The AI side of WorkspaceNow, in Python (FastAPI, FastMCP, the Mistral SDK), serving on :8090. It runs agents on Mistral with tool calling and a local call limit, drafts application plans as the Application Architect, discovers the tools of external MCP servers, and serves WorkspaceNow's own business operations as a managed MCP server. It **never decides what an agent may do**: for each run, wsn-service signs a short-lived Ed25519 grant naming the permissions, tools, application scope and call budget; every tool call goes back to wsn-service with that grant to be checked, run and audited.

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

Testing: `cd wsn-ai-service && pip install -e ".[dev]" && ruff check . && ruff format --check . && mypy src && pytest --cov=src --cov-fail-under=100`. The 100% line coverage of `src` is gated in CI by the dedicated pipeline [`.github/workflows/wsn-ai-service.yaml`](.github/workflows/wsn-ai-service.yaml). A live smoke test against the real Mistral API is opt-in — `MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... pytest tests/test_live_smoke.py -v` — and CI runs it only when the `MISTRAL_API_KEY` secret is configured. Details in [wsn-ai-service/README.md](wsn-ai-service/README.md).

## Run locally

Prerequisites: Docker, Go 1.26, Python 3.12, Node 22 with pnpm.

```sh
# 1. Full local stack (infra + all four apps) from the repo root:
make setup    # creates .env from .env.example — set MISTRAL_API_KEY in it
make up       # console :8088, wsn-service :8080, temporal UI :8233, observer :9098, ai-service :8090
make down     # stop (volumes kept; `make clean` wipes them)
```

Or run the services by hand:

```sh
# 1. Infrastructure only: postgres, valkey, nats, temporal, minio, openbao
make deps

# 2. wsn-service on :8080 (demo organization loaded on first start)
cp wsn-service/.env.example wsn-service/.env
make -C wsn-service run

# 3. wsn-ai-service on :8090 (needs a Mistral API key)
cd wsn-ai-service && python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]" && cp .env.example .env    # set MISTRAL_API_KEY
python -m wsn_ai_service.app

# 4. Console on :3100
cd console && pnpm install && pnpm dev
```

To point the console at the backend when running it by hand, set `apiBaseUrl: "http://localhost:8080"` in `console/apps/web-ui/public/config.js` (the compose stack mounts the ready-made `console-config.js` from the repo root instead). With it empty, the console runs entirely in the browser on the demo platform, which needs nothing else.

Demo mode signs you in as one of the Northwind Retail personas (store manager, procurement officer, procurement manager, auditor, developer, administrator), each with different permissions.

## Build and deploy

- **Images:** `.github/workflows/images.yaml` builds `wsn-service`, `wsn-ai-service` and `console` from each component's multi-stage `Dockerfile` (linux/amd64 + arm64) and pushes them to `ghcr.io/thev1ndu`. Every image runs as a non-root user on a read-only-rootfs-compatible runtime (distroless for wsn-service, a dedicated user on python-slim for wsn-ai-service, unprivileged nginx for the console). Builds from `main` are tagged `main-<sha>-<run>`; `v*` tags publish the version.
- **Deployment:** Flux applies `deploy/flux/clusters/<env>`: infrastructure controllers, then their instances, then the apps. Dev follows `main` through image automation; staging and production pin release tags.

See [FEATURES.md](FEATURES.md) for the full use-case/feature inventory and completion summary.

## Status

| Part | State |
|---|---|
| API contract and console | Complete; the console can switch between the demo platform and the real backend, with live updates over SSE. |
| wsn-service: identity, data, business operations, connect, studio, event stream | Written, compiles, unit tested; not yet run against real infrastructure. |
| wsn-service: workflows on Temporal | Written; compiles once `go mod tidy` fetches the Temporal dependencies; `-worker` mode still to wire. |
| wsn-service: AI endpoints, observability endpoints | Not started; these routes answer 501. |
| wsn-ai-service | Complete: agent runtime, planner, discovery, managed MCP server and per-step streaming to wsn-service; 100% line coverage gated in `.github/workflows/wsn-ai-service.yaml`, live Mistral smoke test opt-in. Tested in isolation; still waits on wsn-service's internal endpoints and run grants to be called for real. |
| wsn-observer | New: OTLP ingest (`/v1/traces|/v1/logs|/v1/metrics`) and query API (`/api/v1/traces|/trace|/logs|/metrics|/overview`) in Go, unit tested with `-race`; own CI job, image and Flux manifests (non-root distroless image, NetworkPolicy-limited). Services do not emit OTLP to it yet. |
| CI, Docker images, Flux | Written; manifests render with kustomize; images build from Dockerfiles with non-root users; not yet run on GitHub or a cluster. |
| Integration and end-to-end tests | Not started. |
