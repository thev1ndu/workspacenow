# wsn-service — agent guide

Go platform API (stdlib `net/http` + oapi-codegen, gorm/Postgres, NATS, Valkey, Temporal, RustFS (S3), OpenBao). One binary, roles picked by flags: `-migrate`, `-server` (default), `-relay`, `-worker`.

## File map

| Need | Location |
|---|---|
| API contract (source of truth) | `../openapi.yaml`, `../docs/APIs.md` |
| oapi-codegen config | `api/oapi-codegen.yaml` |
| Generated server interface/types | `internal/oapi/gen.go` — never hand-edit |
| Route mounting, 501 fallback | `api/server.go` (`Modules`, embedded handlers + generated `api/unimplemented_gen.go`) |
| Component wiring, roles | `app/app.go`, `main.go` |
| HTTP middleware (auth, telemetry, CORS) | `middleware/` |
| Config (env, validated at startup) | `config/config.go` |
| Shared kernel (actor, permissions, trace, audit, events, engine) | `internal/kernel/` |
| Modules | `internal/identity`, `internal/data`, `internal/bizops`, `internal/connect`, `internal/studio`, `internal/flow`, `internal/ai`, `internal/obs`, `internal/stream`, `internal/seed` |
| Infra adapters | `internal/infra/{postgres,cache,events,objectstore,secrets,docstore}` |
| OTLP exporter + observer query client | `internal/observer/` |
| DB models + migrations | `db/models`, `db/migrations` (append-only gormigrate) |
| Demo seed | `internal/seed/seed.json` |
| Codegen scripts | `scripts/gen-unimplemented.sh` |

## Golden path: add or change an endpoint

1. Edit `../openapi.yaml`.
2. `make generate` — regenerates `internal/oapi/gen.go`, the 501 fallback, and moq mocks (`moq@latest` is installed by the target; v0.5.3 is broken on Go 1.27).
3. Implement `func (h *Handler) Op(w http.ResponseWriter, r *http.Request, ...)` in the right `internal/<area>` module; register it: add to `api.Modules`, embed the alias in `api.Server`, construct in `app/app.go`.
4. Run `sh scripts/gen-unimplemented.sh` again — the fallback now omits your operation (build fails if a handler is missing, so this is a safety net, not a formality).
5. Permission-guard mutating endpoints with `kernel.RequirePermission(ctx, auditor, ec, "perm", "action", "resource/"+id)` — denials are audited detached and return 403 with the trace id.
6. Test the module. `go test -race ./...` must stay green.

## Layering and rules

- Module shape: `handler.go` (HTTP: decode via `httpx.Decode`, respond via `httpx.OK/List/Error`, caller via `httpx.Caller(r)`) → `service.go` (logic, takes interfaces) → storage via `docstore.Collection[T]` (document tables) or `db` (records/audit/events). Never put SQL in a handler.
- Execution context: `httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")` — the middleware-injected trace id (`X-Trace-Id` or minted) is reused so audit rows, events and observer spans share one trace.
- Errors: `kernel.NotFound/Invalid/Forbidden/InvalidState(...)` produce the contract's ErrorBody via `httpx.Error`; wrap unexpected errors with `%w`; compare with `errors.As`.
- Every I/O path takes `context.Context` first and propagates it.
- Generated files (`internal/oapi/gen.go`, `api/unimplemented_gen.go`, `*mocks/`) are checked in and never hand-edited.
- Config: env vars with compose-matching defaults in `config.Load()`, validated together in `validate()`.
- Telemetry is automatic: per-request span + request metrics + all slog logs go to wsn-observer when `WSN_OBSERVER_URL` is set (`middleware.Telemetry`, `internal/observer`). Agent runs additionally go through `internal/ai`.

## Roles / running

- `make run` / `make migrate` (reads `.env`), `make deps` for infra. `-worker` needs Temporal and runs the workflow worker + NATS trigger consumer.
- Internal API for wsn-ai-service on `:8081` (`WSN_INTERNAL_ADDR`): `internal/ai/api.go` — service-token auth, run grants verified per call.

## Testing

- Unit: `go test -race ./...` (per-package coverage via `-cover`). Integration tests (`//go:build integration`) need compose: `make test-integration`.
- Fakes: hand-write func-field stubs or use the generated `kernelmocks`/`cachemocks`/`identitymocks`; an unconfigured mock method panics, which is what you want.
- Run one: `go test -run TestName ./internal/<area>/`.

## Done checklist

- [ ] `make generate` run and its output committed if the contract or interfaces changed.
- [ ] `go build ./... && go vet ./... && go test -race ./...` green.
- [ ] `gofmt -l` clean; `make lint` (golangci-lint) clean if available.
- [ ] `sh scripts/gen-unimplemented.sh` rerun; fallback shrinks as modules claim operations.
- [ ] `../docs/T0D0.md` / `../docs/COVERAGE.md` updated if behavior moved.
