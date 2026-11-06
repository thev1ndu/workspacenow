# wsn-ai-service

The AI side of WorkspaceNow: it runs agents on Mistral, drafts application plans as the Application Architect, discovers the tools of external MCP servers, and serves WorkspaceNow's own operations as a managed MCP server built on FastMCP.

It never decides what an agent may do. Every tool call goes back to `wsn-service` with the run's signed grant, and `wsn-service` checks the permissions, the application scope and the call budget, runs the business operation, and writes the audit record.

## Endpoints

| Path | Caller | Purpose |
|---|---|---|
| `POST /v1/runs` | wsn-service | Run an agent turn loop for one prompt; returns the steps, answer, tokens and duration |
| `POST /v1/plans` | wsn-service | Draft an `ApplicationPlan` from a description (Mistral structured output) |
| `POST /v1/mcp/discover` | wsn-service | List the tools of an external MCP server |
| `/mcp` | MCP clients | Streamable HTTP MCP server; each call runs in wsn-service as the caller's user |
| `GET /healthz` | Kubernetes | Liveness |

The `/v1` routes require `Authorization: Bearer $AI_SERVICE_TOKEN`; only wsn-service holds that token, and a NetworkPolicy keeps everything else out.

## Develop

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env            # set MISTRAL_API_KEY and AI_SERVICE_TOKEN
python -m wsn_ai_service.app    # serves on :8090
pytest
ruff check . && ruff format --check . && mypy src
```

## Build

The image is built with Cloud Native Buildpacks (`project.toml`, Paketo Python): `pack build wsn-ai-service --builder paketobuildpacks/builder-jammy-base`.
