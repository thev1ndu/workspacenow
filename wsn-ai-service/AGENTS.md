# wsn-ai-service — agent guide

Python 3.12+ FastAPI service: governed agent runs on Mistral, the Application Architect planner, external MCP
tool discovery, and the managed MCP server. wsn-service calls it on `/v1/*` with a shared service token and
streams run steps back to wsn-service's internal API.

## File map

| Need | Location |
|---|---|
| App factory, routes, middleware, 501 catch-all | `src/wsn_ai_service/app.py` |
| Wire models (camelCase via `Wire` alias generator) | `src/wsn_ai_service/models.py` |
| Agent turn loop (tools, call limit, token accounting) | `src/wsn_ai_service/runtime.py` |
| Mistral client | `src/wsn_ai_service/llm.py` |
| Application Architect planner | `src/wsn_ai_service/planner.py` |
| External MCP discovery (FastMCP client) | `src/wsn_ai_service/discovery.py` |
| Managed MCP server + tool sync | `src/wsn_ai_service/mcp_server.py` |
| wsn-service client (tool invoke, step streaming) | `src/wsn_ai_service/platform.py` |
| OTLP telemetry to wsn-observer (spans/logs/metrics) | `src/wsn_ai_service/telemetry.py` |
| Settings (env + `.env`) | `src/wsn_ai_service/config.py` |
| Tests | `tests/` |

## Rules

- **Wire contract is camelCase**: extend `models.Wire` subclasses; never hand-write alias fields. Match wsn-service's `internal/oapi` types exactly.
- **The platform authorizes, never this service**: tool calls go through `PlatformClient` (grant or forwarded user token) and wsn-service decides. A denied call is a normal result, not an exception.
- **The service token guards `/v1/*`**; anything else under `/v1` answers 501 in the platform's ErrorBody shape (same pattern as wsn-service's `unimplemented_gen.go`).
- **Streaming failures never fail a run**: step streaming to `/internal/v1/runs/{id}/steps` logs and continues.
- **Telemetry never raises**: `OtlpExporter` posts to `WSN_OBSERVER_URL` when set and returns `False` on any failure; disabled when the URL is empty. Every request gets a span + request metrics; every agent run is one span with model/tokens/steps attributes.
- **Config validated at import via pydantic-settings**; add `validation_alias` + `populate_by_name` for env names that differ from field names.
- Error responses use the platform's `{"status","code","message"}` shape; `ERROR_CODES` in `app.py` maps HTTP statuses to codes.

## Testing (CI gates all three)

```sh
.venv/bin/pytest --cov=src --cov-fail-under=100   # 100% line coverage is REQUIRED
.venv/bin/ruff check . && .venv/bin/ruff format --check .
.venv/bin/mypy src                                # strict
```

- New code must keep 100% line coverage — write the test in the same change. Use `respx` to mock wsn-observer and wsn-service.
- `tests/test_live_smoke.py` is opt-in: skips without `MISTRAL_API_KEY`, runs in CI only with the secret.
- Run one: `.venv/bin/pytest tests/test_x.py -q`.

## Done checklist

- [ ] The three commands above pass; coverage still 100%.
- [ ] Wire models still match `wsn-service/internal/oapi/gen.go` (run `make -C ../wsn-service generate` if the contract changed).
- [ ] `../docs/TODO.md` / `../docs/COVERAGE.md` updated if behavior moved.
