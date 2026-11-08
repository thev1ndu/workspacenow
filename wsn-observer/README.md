# wsn-observer

![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go) ![ci](https://github.com/thev1ndu/workspacenow/actions/workflows/ci.yaml/badge.svg)

----

The telemetry observer for WorkspaceNow: a lightweight Go backend (modeled on WSO2 Agent Manager's
`agent-manager-observer`) that ingests OTLP telemetry — traces, logs and metrics — from the
platform's services and serves the query API the console's observability views call.

**Storage is a write-ahead-log store, not a database and not memory** (`walstore`): every signal
(traces, logs, metrics) is appended as JSONL segment files under `WSN_OBSERVER_DATA_DIR`
(one subdirectory per signal, `<seq>.seg`, rolled at `WSN_OBSERVER_SEGMENT_BYTES`). Ingestion is
one sequential `write` per OTLP batch — the right shape for high-volume telemetry. Retention is
by bytes (`WSN_OBSERVER_RETENTION_BYTES` per signal): a janitor prunes the oldest segments at
startup and hourly, never deleting the active segment. Queries scan segment files newest-first,
at most `WSN_OBSERVER_SCAN_LIMIT` records per signal, so counts and pages are over that window.
In Kubernetes the data dir is a PVC (`/data`); the pod still runs with a read-only root filesystem.


## Quick start

```sh
make -C wsn-observer test   # unit tests with -race
make -C wsn-observer run    # serve on :9098 (WSN_OBSERVER_DATA_DIR=/tmp/wsn-observer)
```

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
| `GET /api/v1/errors?serviceName=&q=&startTime=&endTime=&limit=&offset=&sortOrder=` | console (proxied by wsn-service) | Error span groups (OTLP status 2), fingerprint = service+span+message: count, first/last seen, newest trace-id samples (max 5) |
| `POST /api/v1/errors/query` | services (agent-manager-style client) | Same filters in a JSON body; `q` matches message or span name case-insensitively |
| `GET /api/v1/services` | console (proxied by wsn-service) | Per-service spans, errors, logs, error rate and last seen within the scan window |
| `POST /api/v1/traces/query` | services (agent-manager-style client) | Same filters as the GET, in a JSON body `{serviceName, startTime, endTime, limit, offset, sortOrder}` |
| `POST /api/v1/traces/{traceId}/spans/query` | services | One trace's spans from a JSON body |
| `GET /api/v1/traces/{traceId}/spans/{spanId}` | services | One span's full details, attributes included |
| `POST /api/v1/logs/query` | services | JSON body adds `level`, `q`, `traceId` |
| `POST /api/v1/metrics/query` | services | JSON body adds `name` |
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
| `WSN_OBSERVER_TOKEN` | empty | Optional shared bearer token |
| `WSN_OBSERVER_LOG_LEVEL` | `INFO` | Log level |
| `WSN_OBSERVER_DATA_DIR` | `./data` | Segment root (one subdir per signal); empty is rejected — no database, no memory fallback |
| `WSN_OBSERVER_RETENTION_BYTES` | `268435456` (256 MiB) | Max bytes kept per signal; oldest segments pruned past it |
| `WSN_OBSERVER_SEGMENT_BYTES` | `33554432` (32 MiB) | Roll the active segment past this size |
| `WSN_OBSERVER_SCAN_LIMIT` | `100000` | Max records a query scans per signal, newest first |

## Develop

```sh
cp .env.example .env
make run        # serves on :9098, writes segments under ./data
make test       # go test -race ./...
make check && make vet
```

Send telemetry with any OTLP/HTTP client, e.g.:

```sh
curl -X POST localhost:9098/v1/traces -H 'Content-Type: application/json' -d @traces.json
curl -X POST localhost:9098/v1/logs -H 'Content-Type: application/json' -d @logs.json
curl 'localhost:9098/api/v1/traces?serviceName=wsn-service&limit=10'
curl 'localhost:9098/api/v1/logs?q=error'
ls data/traces data/logs   # the segment files the queries read back
```

## Build

Multi-stage `Dockerfile` (static Go binary on distroless, non-root uid 65532, read-only-rootfs
compatible):

```sh
docker build -t wsn-observer --build-arg VERSION=dev wsn-observer
```

CI builds it with docker buildx (linux/amd64 + arm64) and pushes to
`ghcr.io/thev1ndu/wsn-observer`; see `../.github/workflows/images.yaml`.
