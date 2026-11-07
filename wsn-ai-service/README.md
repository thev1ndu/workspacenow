# wsn-ai-service

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python) ![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen) ![ci](https://github.com/thev1ndu/workspacenow/actions/workflows/ci.yaml/badge.svg)

----

The AI side of WorkspaceNow: it runs agents on Mistral, drafts application plans as the Application Architect, discovers the tools of external MCP servers, and serves WorkspaceNow's own operations as a managed MCP server built on FastMCP.

It never decides what an agent may do. Every tool call goes back to `wsn-service` with the run's signed grant, and `wsn-service` checks the permissions, the application scope and the call budget, runs the business operation, and writes the audit record.


## Quick start

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]" && cp .env.example .env   # set MISTRAL_API_KEY
pytest --cov=src --cov-fail-under=100              # 100% line coverage, gated in CI
python -m wsn_ai_service.app                       # serve on :8090
```

## Endpoints

| Path | Caller | Purpose |
|---|---|---|
| `POST /v1/runs` | wsn-service | Run an agent turn loop for one prompt; returns the steps, answer, tokens and duration |
| `POST /v1/plans` | wsn-service | Draft an `ApplicationPlan` from a description (Mistral structured output) |
| `POST /v1/mcp/discover` | wsn-service | List the tools of an external MCP server |
| `/mcp` | MCP clients | Streamable HTTP MCP server; each call runs in wsn-service as the caller's user |
| `GET /healthz` | Kubernetes | Liveness |

The `/v1` routes require `Authorization: Bearer $AI_SERVICE_TOKEN`; only wsn-service holds that token, and a NetworkPolicy keeps everything else out.

## Calls to wsn-service

| Call | When |
|---|---|
| `POST /internal/v1/tools/invoke` (with the run's grant) | Each tool call the model proposes |
| `POST /internal/v1/runs/{runId}/steps` (with the service token) | Each run step **as it happens** — one camelCase `AgentRunStep` in the body; wsn-service republishes it as an `AgentRun.Step` event. Step streaming never fails a run: if wsn-service is unreachable or refuses the step, the run continues and the final `RunResult` still travels in the `POST /v1/runs` response (wsn-service emits `AgentRun.Completed` from it) |
| `POST /internal/v1/mcp/invoke` (service token + `X-Forwarded-Authorization`) | Each MCP tool call, as the MCP client's user |
| `GET /internal/v1/mcp/tools` | Periodically, to mirror wsn-service's tool catalogue on `/mcp` |

## Develop

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env            # set MISTRAL_API_KEY and AI_SERVICE_TOKEN
python -m wsn_ai_service.app    # serves on :8090
pytest                          # unit tests; 100% line coverage of src is gated in CI
ruff check . && ruff format --check . && mypy src
```

Live smoke test against the real Mistral API (opt in; skipped without the key, and run in CI only when the `MISTRAL_API_KEY` secret is set — see `.github/workflows/wsn-ai-service.yaml`):

```sh
MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... pytest tests/test_live_smoke.py -v
# or against a running service:
curl -H "Authorization: Bearer $AI_SERVICE_TOKEN" -d @run.json localhost:8090/v1/runs
```

## Build

The image is built from the multi-stage `Dockerfile` (venv on `python:3.12-slim`, running as the non-root `ai` user):

```sh
docker build -t wsn-ai-service --build-arg VERSION=0.1.0 wsn-ai-service
```
