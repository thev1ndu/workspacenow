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
- **wsn-ai-service** never decides what an agent may do. For each run, wsn-service signs a short-lived grant naming the permissions and tools allowed; every tool call goes back to wsn-service with that grant to be checked, run and audited.
- **Workflows** run on Temporal, so executions survive restarts and can wait days for an approval.

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
| [`wsn-ai-service/`](wsn-ai-service) | The AI service in Python with FastMCP and the Mistral SDK. See its [README](wsn-ai-service/README.md). |
| [`deploy/compose/`](deploy/compose) | Local infrastructure for development. |
| [`deploy/flux/`](deploy/flux) | GitOps deployment with Flux: infrastructure operators, then the apps, per environment. See its [README](deploy/flux/README.md). |
| [`.github/workflows/`](.github/workflows) | CI for all three components, and image builds with Cloud Native Buildpacks. |
| [`APIs.md`](APIs.md), [`openapi.yaml`](openapi.yaml) | The API contract between the console and wsn-service (73 endpoints). |
| [`CONTEXT.md`](CONTEXT.md) | The domain glossary. |

## Run locally

Prerequisites: Docker, Go 1.26, Python 3.12, Node 22 with pnpm.

```sh
# 1. Infrastructure: postgres, valkey, nats, temporal, minio, openbao
make -C wsn-service deps

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

To point the console at the backend, set `apiBaseUrl: "http://localhost:8080"` in `console/apps/web-ui/public/config.js`. With it empty, the console runs entirely in the browser on the demo platform, which needs nothing else.

Demo mode signs you in as one of the Northwind Retail personas (store manager, procurement officer, procurement manager, auditor, developer, administrator), each with different permissions.

## Build and deploy

- **Images:** `.github/workflows/images.yaml` builds `wsn-service`, `wsn-ai-service` and `wsn-console` with Paketo buildpacks (`project.toml` in each component) and pushes them to `ghcr.io/thev1ndu`. Builds from `main` are tagged `main-<sha>-<run>`; `v*` tags publish the version.
- **Deployment:** Flux applies `deploy/flux/clusters/<env>`: infrastructure controllers, then their instances, then the apps. Dev follows `main` through image automation; staging and production pin release tags.

## Status

| Part | State |
|---|---|
| API contract and console | Complete; the console can switch between the demo platform and the real backend, with live updates over SSE. |
| wsn-service: identity, data, business operations, connect, studio, event stream | Written, compiles, unit tested; not yet run against real infrastructure. |
| wsn-service: workflows on Temporal | Written; compiles once `go mod tidy` fetches the Temporal dependencies; `-worker` mode still to wire. |
| wsn-service: AI endpoints, observability endpoints | Not started; these routes answer 501. |
| wsn-ai-service | Complete and tested in isolation; waits on wsn-service's internal tool endpoint and run grants. |
| CI, buildpacks, Flux | Written; manifests render with kustomize; not yet run on GitHub or a cluster. |
| Integration and end-to-end tests | Not started. |
