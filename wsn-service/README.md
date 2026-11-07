# wsn-service

![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go) ![ci](https://github.com/thev1ndu/workspacenow/actions/workflows/ci.yaml/badge.svg)

----

The WorkspaceNow platform service, in Go. It serves the API the console calls (`/api/v1`, defined in [`../openapi.yaml`](../openapi.yaml) and [`../docs/APIs.md`](../docs/APIs.md)), owns every business rule, and runs workflows on Temporal. One binary runs in several roles, each deployed separately.


## Quick start

```sh
make -C wsn-service test    # unit tests with -race + lint
make -C wsn-service run     # serve on :8080 (needs `make deps` at the repo root first)
```

## Roles

| Flags | Role |
|---|---|
| *(none)* | API server on `:8080` (public `/api/v1`, `/healthz`, `/readyz`) and the live event stream |
| `-migrate -server=false` | Apply database migrations and exit (Kubernetes job before each rollout) |
| `-server=false -relay` | Move committed events from the outbox to NATS JetStream |
| `-server=false -worker` | Temporal worker and event-trigger consumer *(not wired yet)* |

## How a request is handled

1. **Middleware**: panic recovery, CORS, correlation id, request log, then authentication. A bearer token is either an OIDC access token checked against the identity provider's JWKS or, in demo mode only, `demo.<userId>`. The caller's roles come from their group claims through the group mappings, cached in Valkey.
2. **Routing**: routes are generated from `openapi.yaml` by oapi-codegen, so every endpoint in the contract is served; a module that does not implement one yet falls back to a 501 in the contract's error shape.
3. **Module handler**: decodes the body and builds the execution context: actor, permissions, entry point and trace id.
4. **Kernel**: `kernel.Engine.Invoke` looks up the business operation, checks its permission, runs it, writes the audit record and publishes its events, all in one Postgres transaction. A denial or failure is audited outside the transaction so the record survives the rollback.
5. **Events**: published events are written to the `outbox` table in the same transaction; the relay sends them to NATS, where workflows and the SSE stream pick them up.

Errors use the contract's `ErrorBody` (`{status, code, message, traceId}`), with messages written for the people who read them in the console.

## Layout

| Path | What it holds |
|---|---|
| `main.go` | Flags, then `app.Run` |
| `app/` | Wiring and lifecycle of every component |
| `api/` | Route composition; `unimplemented_gen.go` is the 501 fallback |
| `config/` | Settings from the environment |
| `middleware/` | Recover, CORS, correlation id, logging, authentication (JWKS) |
| `db/models/` | Every table as a gorm model |
| `db/migrations/` | gormigrate migrations, built from the models |
| `internal/kernel/` | Execution context, permissions, operation engine, audit, events |
| `internal/oapi/` | Generated from `../openapi.yaml` (do not edit) |
| `internal/httpx/` | JSON responses, list envelope, error mapping |
| `internal/identity/` | Session, users, roles, group mappings, departments, teams, environments |
| `internal/data/` | Entity runtime: entities, records, validation, generated CRUD operations |
| `internal/domain/` | Hand-written operations (inventory, procurement, supplier) |
| `internal/bizops/` | Business operation catalogue and generic invoke |
| `internal/connect/` | APIs, API operations, MCP exposure and catalogue, MCP servers, integrations |
| `internal/studio/` | Application plans, apply and edit, releases, deployments, pins |
| `internal/flow/` | Workflows on Temporal: interpreter, activities, triggers, approvals |
| `internal/stream/` | Server-sent events for the console's live updates |
| `internal/seed/` | The demo organization (Northwind Retail), exported from the console mock |
| `internal/infra/postgres/` | Connection, and transactions carried in the context |
| `internal/infra/docstore/` | Platform metadata as JSONB documents, one table per collection |
| `internal/infra/cache/` | Valkey (Redis protocol) |
| `internal/infra/events/` | NATS connection, stream setup, outbox relay |
| `internal/infra/objectstore/` | S3 client (Signature V4) for release blueprints |
| `internal/infra/secrets/` | OpenBao KV reader for integration credentials |
| `scripts/` | Code generation and seed export |

## Data

PostgreSQL holds everything, through gorm models in `db/models`:

| Table | Holds |
|---|---|
| one per collection (`applications`, `entities`, `agents`, `workflows`, ...) | Platform metadata as JSONB documents in the shape the API serves, listed in insertion order |
| `records` | Every entity's records, validated against the entity's fields before writing |
| `audit_records` | One row per attempted action: actor, entry point, action, resource, outcome |
| `events` | Facts published after operations commit; traces join these with audit records |
| `outbox` | Events waiting for the relay to publish them to NATS |

Release blueprints are stored in object storage at `releases/<appId>/<version>/blueprint.json`. Integration credentials stay in OpenBao; the platform stores only their paths.

## Develop

Prerequisites: Go 1.26, Docker. Node is needed only to re-export the demo seed.

```sh
make deps            # postgres, valkey, nats, temporal, rustfs, openbao (../deploy/compose)
cp .env.example .env
make run             # migrate, then serve on :8080 with the demo organization
make test            # unit tests
make lint            # golangci-lint
make generate        # regenerate internal/oapi and the 501 fallback after editing ../openapi.yaml
make seed-export     # re-export internal/seed/seed.json from the console mock
make build           # bin/wsn-service
```

Sign in from the console as a demo persona, or call the API directly:

```sh
curl -H "Authorization: Bearer demo.u-amaya" localhost:8080/api/v1/session
```

## Configuration

Every setting is an environment variable; `.env.example` lists them with local defaults. The important ones:

| Variable | Purpose |
|---|---|
| `WSN_ENV` | `development` or `production`; production refuses demo mode |
| `WSN_DEMO_MODE` | Demo tokens, `GET /personas` and `POST /demo/reset` |
| `DATABASE_URL`, `REDIS_URL`, `NATS_URL`, `TEMPORAL_HOSTPORT` | Infrastructure |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Object storage |
| `OPENBAO_ADDR`, `OPENBAO_ROLE` (or `OPENBAO_TOKEN` locally) | Secrets manager |
| `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `OIDC_GROUPS_CLAIM` | Identity provider; required outside demo mode |
| `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`, `RUN_GRANT_KEY` | wsn-ai-service and the key that signs agent run grants |
| `WSN_OBSERVER_URL`, `WSN_OBSERVER_TOKEN`, `WSN_OBSERVER_SERVICE_NAME` | wsn-observer; empty URL disables OTLP export of spans, logs and metrics |

## Build

The image is built from the multi-stage `Dockerfile` (static Go binary on distroless, running as the non-root distroless user):

```sh
docker build -t wsn-service --build-arg VERSION=dev wsn-service
```

CI does the same with docker buildx (linux/amd64 + arm64) and pushes to `ghcr.io/thev1ndu/wsn-service`; see `../.github/workflows/images.yaml`.

## Status

| Area | State |
|---|---|
| Identity, data, business operations, connect, studio, event stream | Written, compiles, unit tested |
| Workflows (`internal/flow`) | Written; needs `go mod tidy` to fetch Temporal's dependencies, then the `-worker` role |
| AI endpoints (agents, runs, Sidekick, model providers), internal tool endpoint, run grants | Not started; answer 501 |
| Observability endpoints: events, audit, traces, health | Written, unit tested; traces enrich with span counts from wsn-observer |
| Search, analytics, overview, resources | Not started; answer 501 |
| OTLP export of spans, logs and metrics to wsn-observer | Wired (`WSN_OBSERVER_URL`); one span + request metrics per HTTP request, all logs as OTLP records |
| Integration tests against real infrastructure | Not started |
