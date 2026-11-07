# WorkspaceNow — agent guide

One platform, four components. `agent-manager/` is a read-only reference checkout (gitignored) — never edit it.

| Component | What it is | Guide |
|---|---|---|
| `wsn-service/` | Go platform API: identity, data, business operations, connect, studio, flow, AI, observability | `wsn-service/AGENTS.md` |
| `wsn-ai-service/` | Python/FastAPI agent runtime on Mistral, planner, MCP discovery + managed MCP server | `wsn-ai-service/AGENTS.md` |
| `wsn-observer/` | Go central telemetry service: OTLP ingest + query API, WAL segment-file store (no DB, no in-memory payload) | `wsn-observer/AGENTS.md` |
| `console/` | React webapp (pnpm workspaces, HeroUI v3, Tailwind v4) + the demo mock-server | `console/AGENTS.md` |

Shared sources of truth and plumbing:

- **API contract**: `openapi.yaml` + `APIs.md` at the root. Never hand-edit generated code — `wsn-service/internal/oapi/gen.go` comes from `make -C wsn-service generate`.
- **Status/task list**: `T0D0.md` (what's done, blockers, how to test). **Feature/coverage inventory**: `COVERAGE.md`. Update both when you change behavior.
- **Local stack** (from the repo root): `make setup` then `make up` / `make down` — compose in `deploy/compose/docker-compose.yml` (Postgres, Valkey, NATS, Temporal, MinIO, OpenBao + the four apps behind the `app` profile); variables come from the root `.env` (see `.env.example`).
- **Deploy**: `deploy/compose` (local), `deploy/flux` (K8s, renders only), `.github/workflows` (CI, never run yet). Images build per-component with docker buildx to `ghcr.io/thev1ndu`.
- **Telemetry**: wsn-service and wsn-ai-service export OTLP (spans/logs/metrics) to wsn-observer (`WSN_OBSERVER_URL`); the observer stores segment files under `WSN_OBSERVER_DATA_DIR` (PVC in K8s).

## Golden path: add or change an API endpoint

1. Edit `openapi.yaml` (+ `APIs.md` if semantics change).
2. `make -C wsn-service generate` — regenerates `internal/oapi/gen.go`, the 501 fallback `api/unimplemented_gen.go` (emits only operations no module serves), and moq mocks.
3. Implement the handler in the right module under `wsn-service/internal/<area>/`, register it in `api/server.go` (`Modules`) and wire deps in `app/app.go`.
4. Regenerate the fallback again if needed; build fails loudly if a handler is missing.
5. Unit-test the module; `go test -race ./...` in wsn-service must stay green.
6. Mirror the behavior in the console mock-server (`console/workspaces/libs/mock-server`) and its tests, and add/adjust the console page.

## Golden path: console change

Follow `console/AGENTS.md`: transport only via `libs/api-client` apis+hooks, routes via `routes`/`buildPath`, UI only from `@heroui/react`. Verify with `pnpm typecheck && pnpm lint && pnpm test` in `console/`.

## Done checklist (any change)

- [ ] The owning component's AGENTS.md checklist passes.
- [ ] `T0D0.md` / `COVERAGE.md` updated if behavior or coverage moved.
- [ ] Generated files regenerated and committed, never hand-edited.
- [ ] Nothing under `agent-manager/` touched.
