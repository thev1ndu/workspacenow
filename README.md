# WorkspaceNow

A self-hosted, entity-driven platform where one organization builds, connects and runs its own business applications, APIs, agents and workflows. Terms are defined in [CONTEXT.md](CONTEXT.md).

## Layout

| Path | What it is |
|---|---|
| [`console/`](console) | The web console (React, Vite, HeroUI). Runs on an in-browser demo platform until `apiBaseUrl` points at `wsn-service`. |
| [`wsn-service/`](wsn-service) | The platform service in Go: API, business operations, entity runtime, Temporal workflows, event relay. |
| [`wsn-ai-service/`](wsn-ai-service) | The AI service in Python: agent runs on Mistral, the Application Architect, the managed FastMCP server. |
| [`deploy/`](deploy) | Local infrastructure (`compose/`) and, later, the Helm chart and Flux configuration. |
| [`APIs.md`](APIs.md), [`openapi.yaml`](openapi.yaml) | The API contract between the console and `wsn-service`. |

## Run locally

```sh
make -C wsn-service deps          # postgres, valkey, nats, temporal, minio, openbao
cp wsn-service/.env.example wsn-service/.env
make -C wsn-service run           # API on :8080, demo data loaded

cd console && pnpm install && pnpm dev   # console on :3100
```

Set `apiBaseUrl: "http://localhost:8080"` in `console/apps/web-ui/public/config.js` to use the real backend; leave it empty for the in-browser demo.
