# wsn-observer

The telemetry observer for WorkspaceNow: a lightweight Go backend (modeled on WSO2 Agent Manager's
`agent-manager-observer`) that ingests OTLP telemetry — traces, logs and metrics — from the
platform's services and serves the query API the console's observability views call.

It stores the most recent entries per signal in bounded memory (`WSN_OBSERVER_RETENTION`), so it is
a live view, not an archive: the durable audit trail stays in wsn-service, and this can later move
to a real observability plane (OpenSearch or the OpenChoreo observer) behind the same API.

## Endpoints

| Path | Caller | Purpose |
|---|---|---|
| `POST /v1/traces` | services, OTLP/HTTP JSON | Ingest spans; answers `202 {"accepted": n}` |
| `POST /v1/logs` | services, OTLP/HTTP JSON | Ingest log records |
| `POST /v1/metrics` | services, OTLP/HTTP JSON | Ingest metric data points (gauge, sum, histogram count) |
| `GET /api/v1/traces?serviceName=&startTime=&endTime=&limit=&offset=&sortOrder=` | console (via the gateway, `/observer/...`) | Trace overviews: `traceId`, root span, service, start/end, `spanCount`, plus `totalCount` |
| `GET /api/v1/trace?traceId=&serviceName=&sortOrder=&limit=` | console | One trace's spans (asc by default), with kind, status, duration and attributes |
| `GET /api/v1/logs?serviceName=&level=&q=&startTime=&endTime=&limit=&offset=&sortOrder=` | console | Log records; `q` matches the body case-insensitively |
| `GET /api/v1/metrics?serviceName=&name=&startTime=&endTime=&limit=&offset=&sortOrder=` | console | Metric points |
| `GET /api/v1/overview` | console | Distinct service names and stored counts per signal |
| `GET /healthz` | Kubernetes | Liveness/readiness |

`startTime`/`endTime` are RFC3339; `limit` is 1–1000 (default 50); `sortOrder` is `asc`/`desc`.
Errors use the platform's `ErrorBody` shape (`{"status", "code", "message"}`).

When `WSN_OBSERVER_TOKEN` is set, the ingest and query APIs require
`Authorization: Bearer $WSN_OBSERVER_TOKEN`; otherwise the Kubernetes NetworkPolicy is the only
guard (ingress to :9098 comes only from the wsn-service and wsn-ai-service pods and the gateway).

## Configuration (environment)

| Variable | Default | Purpose |
|---|---|---|
| `WSN_OBSERVER_PORT` | `9098` | HTTP port |
| `WSN_OBSERVER_RETENTION` | `10000` | Max entries kept per signal |
| `WSN_OBSERVER_TOKEN` | empty | Optional shared bearer token |
| `WSN_OBSERVER_LOG_LEVEL` | `INFO` | Log level |

## Develop

```sh
cp .env.example .env
make run        # serves on :9098
make test       # go test -race ./...
make check && make vet
```

Send telemetry with any OTLP/HTTP client, e.g.:

```sh
curl -X POST localhost:9098/v1/traces -H 'Content-Type: application/json' -d @traces.json
curl 'localhost:9098/api/v1/traces?serviceName=wsn-service&limit=10'
```

## Build

Multi-stage `Dockerfile` (static Go binary on distroless, non-root uid 65532, read-only-rootfs
compatible):

```sh
docker build -t wsn-observer --build-arg VERSION=dev wsn-observer
```

CI builds it with docker buildx (linux/amd64 + arm64) and pushes to
`ghcr.io/thev1ndu/wsn-observer`; see `../.github/workflows/images.yaml`.
