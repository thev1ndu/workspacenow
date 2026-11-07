# wsn-observer — agent guide

Central telemetry service for WorkspaceNow (modeled on agent-manager's `agent-manager-observer`, but a
consumer/producer here, not an adapter). Stdlib `net/http` only — **zero third-party dependencies**. It ingests
OTLP/HTTP JSON from wsn-service and wsn-ai-service and serves the query API the console's observability views call.

## File map

| Need | Location |
|---|---|
| OTLP/HTTP JSON parsing (traces, logs, metrics) | `telemetry/otlp.go` |
| Normalized models + `Store` interface | `telemetry/model.go` |
| WAL segment-file store (the only storage) | `walstore/walstore.go` |
| HTTP API: ingest + queries | `server/server.go` |
| Config (env, validated) | `config/config.go` |
| Entrypoint | `main.go` |
| Tests | `*_test.go` next to each package |

## Storage rules (load-bearing — do not regress)

- **No database, no in-memory payload.** All signals are append-only JSONL segment files under
  `WSN_OBSERVER_DATA_DIR`: `<dir>/{traces,logs,metrics}/<seq>.seg`, one sequential `write` per OTLP batch,
  rolled at `WSN_OBSERVER_SEGMENT_BYTES` (32 MiB). Retention is by bytes (`WSN_OBSERVER_RETENTION_BYTES`,
  256 MiB/signal): a janitor prunes the oldest segments at startup and hourly, never the active segment.
- Queries scan segment files **newest-first** (reverse line reader), at most `WSN_OBSERVER_SCAN_LIMIT` (100k)
  records per signal — totals/pages are over that window (documented). `Overview` uses in-memory counters +
  a service-name set only (metadata, not payload).
- Reopen recovers counts/services by one startup scan; appends continue in a new segment. In K8s the data dir
  is a PVC at `/data` and the pod keeps `readOnlyRootFilesystem: true`.
- An empty `WSN_OBSERVER_DATA_DIR` is rejected at startup — there is no memory/DB fallback.

## API

- Ingest: `POST /v1/traces|/v1/logs|/v1/metrics` → `202 {"accepted": n}` (8 MiB cap; store failure → 500 `STORAGE_FAILED`).
- Query: GET `/api/v1/traces|/trace|/logs|/metrics|/overview` and agent-manager-style POST
  `/api/v1/traces/query`, `/api/v1/traces/{id}/spans/query`, `/api/v1/traces/{id}/spans/{spanId}`,
  `/api/v1/logs/query`, `/api/v1/metrics/query` — JSON filter bodies, RFC3339 times, `limit` 1–1000, `sortOrder` asc/desc.
- `GET /healthz` is open. With `WSN_OBSERVER_TOKEN` set, ingest + queries need `Authorization: Bearer <token>`
  (constant-time compare); otherwise the NetworkPolicy is the only guard.
- Errors use the platform ErrorBody `{"status","code","message"}`.

## Rules

- Config from env with compose-matching defaults; validate at startup, co-dependent values together.
- All I/O takes `context.Context`; wrap errors with `%w`.
- `go.mod` must stay dependency-free — if you need a library, stop and reconsider (the WAL store exists so we don't).
- Keep the one-line comment style; generated/simple files stay terse.

## Develop / test

```sh
make test       # go test -race ./...
make check && make vet && make fmt
make run        # serves on :9098 (WSN_OBSERVER_DATA_DIR=./data locally)
```

Live smoke: POST an OTLP payload to `/v1/traces`, query `/api/v1/traces?serviceName=wsn-service`, restart the
process and query again — records must survive (they are files).

## Done checklist

- [ ] `make check && go vet ./... && go test -race ./...` green.
- [ ] Storage rules above still hold (no DB dep crept into `go.mod`).
- [ ] README + `../docs/T0D0.md` / `../docs/COVERAGE.md` updated if behavior moved.
