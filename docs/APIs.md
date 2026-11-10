# WorkspaceNow Platform API

Every endpoint the WorkspaceNow console calls, in one place. This is the contract a backend must serve for the console to work unchanged.

- **Machine-readable spec:** [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0.3, 73 endpoints, every request and response schema). Load it into Swagger UI, Redocly or a code generator.
- **Where the contract comes from:** the console's API client (`console/workspaces/libs/api-client/src/apis`), the shared types (`console/workspaces/libs/types/src`) and the in-browser reference implementation (`console/workspaces/libs/mock-server/src`). When this document and that code disagree, the code is right; update this file.
- **Terms** (Business Operation, Entry Point, Service Identity, Trace and so on) are defined in [`CONTEXT.md`](CONTEXT.md).

## Conventions

| | |
|---|---|
| Base path | `/api/v1` |
| Format | JSON request and response bodies; ISO 8601 timestamps (`2026-11-06T09:30:00Z`) |
| Collections | `{ "items": [...], "total": <number> }`. No pagination today; `total` equals `items.length`. |
| Success codes | `201` for every `POST` (including actions such as invoke, test and decide), `200` for everything else |
| Identifiers | Opaque strings (`app-inventory`, `wf-replenish`). Entities are addressed by their PascalCase **name** (`PurchaseRequest`), not their id. |
| Trailing slashes | Ignored |

### Live updates (server-sent events)

The console keeps one `GET /events/stream` connection open and refreshes the data on screen whenever the platform publishes an event, so every page stays live without polling. It reads the stream with `fetch` because `EventSource` cannot send an `Authorization` header, and tokens never go in URLs. Each message is one `PlatformEvent` with the event id as the SSE id; a heartbeat comment arrives every 20 seconds.

### Switching the console to a real backend

The console talks to the API through one function: `request()` in `console/workspaces/libs/api-client/src/utils/http.ts`. It currently calls the in-browser mock. Replace its body with `fetch(SERVICE_BASE + path, …)`, send the token as `Authorization: Bearer <token>`, and throw `ApiError` on any status of 400 or above. Nothing above that function changes.

## Authentication

- Every endpoint needs `Authorization: Bearer <access token>` except `GET /personas` (demo only) and `POST /auth/login`.
- In production the token is an OIDC access token from the organization's identity provider (`GET /organization` → `identityProvider`: issuer, client id, scopes and the `groupsClaim` that carries the user's groups). `WSN_ENV=production` requires `OIDC_ISSUER` and `OIDC_AUDIENCE` when OIDC is configured, plus `AI_SERVICE_TOKEN`, `RUN_GRANT_KEY` and a non-`*` `CORS_ALLOWED_ORIGINS`; startup fails otherwise. Bootstrap admin emails from IdP logins must have a verified `email_verified` claim, and the role is granted once (removing it sticks).
- When no OIDC is configured, the local system user signs in with `POST /auth/login` (`WSN_DEFAULT_ADMIN_EMAIL`/`WSN_DEFAULT_ADMIN_PASSWORD`). Logins are rate-limited (10 per 15 min per email and per IP, failing closed) and audited both ways; sessions key on `sha256(token)` with a per-user version, slide their 24h TTL on use, and `POST /auth/logout` revokes them. The default password must be rotated (`mustChangePassword` in the login response blocks everything but `POST /auth/password`, `POST /auth/logout` and `GET /session` until done); the rotated password is stored as a bcrypt hash.
- The demo uses the token `demo.<userId>`; demo mode requires `WSN_ENV=development` + `WSN_DEMO_MODE`, and `POST /demo/reset` additionally requires a signed-in `control.manage`.
- A missing or unknown token returns `401 UNAUTHENTICATED`. Trace ids are minted per request; only internal (loopback) callers may attach a W3C `traceparent`.

## Authorization model

The backend must enforce all of this. The console hides what a user cannot do, but that is a convenience, not the control.

1. **Roles come from groups.** A user's groups (from the token) are matched against the Group Mappings (`GET /group-mappings`). Each matching mapping grants a Role, and the user's permissions are the union of those Roles' permissions. `GET /session` returns the result.
2. **Every Business Operation names one permission.** Every entry point checks it the same way before the operation runs: the console, API Operations, MCP tools, agents and workflows.
3. **Service Identities.** Agents and Workflows act with their own `permissions`, never the caller's.
4. **Acts-as-caller agents.** An agent with `actsAsCaller: true` (Sidekick) runs on behalf of the signed-in user and holds only the permissions **both** the agent and the user hold.
5. **App-scoped Sidekick.** `POST /sidekick/runs` with `applicationId` confines Sidekick to the MCP tools exposed by that application's APIs. Any other tool call is denied with the reason `"<tool> is outside <app name>"`.
6. **No escalation.** Nobody can hand out access they do not hold (`403`): not to a Workflow, an Agent, an API key, or a person (roles, group mappings and group members are checked against the granter). The last administrator holding `*` cannot be removed (`409`).
7. **Separation of duties.** Whoever started a run cannot decide its approvals (`403`).
8. **Everything is audited.** Every attempt, whether allowed, denied or failed, writes an Audit Record with the Actor, Entry Point, action, resource and outcome. Records from one origin share a `traceId`, and `GET /traces/{id}` shows them together.

### Permissions

| Permission | Grants |
|---|---|
| `studio.manage` | Plan, create, edit and release applications; deploy to environments that need no approval |
| `deployment.promote` | Deploy to environments with `requiresApproval` (production) |
| `data.manage` | Create and change entities; read and write records of entities that use it |
| `connect.manage` | Expose MCP tools, register MCP servers, test integrations |
| `ai.manage` | Change agents |
| `flow.manage` | Create, change, pause and start workflows |
| `control.manage` | Change group mappings |
| `audit.read` | Read audit records and traces |
| `inventory.read` / `inventory.write` | Inventory entities and operations |
| `supplier.read` / `supplier.write` | Supplier entities and operations |
| `procurement.read` / `.request` / `.approve` / `.order` | Procurement entities, requests, approvals and orders |

## Errors

Every error returns this body, with the HTTP status repeated:

```json
{ "status": 403, "code": "FORBIDDEN", "message": "Nimal Silva lacks permission procurement.read for PurchaseRequest.list", "traceId": "tr-…" }
```

| Status | `code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No token, or the token is invalid |
| 403 | `FORBIDDEN` | The actor lacks the permission. Audited as `denied`. |
| 404 | `NOT_FOUND` | Unknown resource, or no route matches |
| 405 | `NOT_FOUND` | The path exists but not with this method |
| 409 | `CONFLICT` | Duplicate name, or the resource is still in use (a record that others reference, or that has a pending approval) |
| 409 | `INVALID_STATE` | Wrong state: external entities are read-only, the approval is already decided, the workflow is paused, or the release is not yet in the previous environment |
| 422 | `VALIDATION_FAILED` | The body breaks a rule; `message` lists up to three problems, joined by `; ` |
| 500 | `INVALID_STATE` | Unexpected failure |

`traceId` is present when the failure was audited. The console shows `message` to users as written, so it must be plain language.

## Endpoints

Permission shows what the backend checks; "signed in" means any valid token. "Record perm" means the entity's own `readPermission` or `writePermission`.

### Session

| Method | Path | Purpose | Permission |
|---|---|---|---|
| POST | `/auth/login` | Local system-user login; returns `{ token, mustChangePassword }`. Rate-limited and audited | public (local auth only) |
| POST | `/auth/logout` | Revoke the bearer session token and the user's other sessions | signed in |
| POST | `/auth/password` | Rotate the local system user's password (`{ oldPassword, newPassword }`, min 12 chars) | signed in |
| GET | `/session` | Signed-in actor, role names, effective permissions | signed in |
| GET | `/personas` | Users for the demo sign-in screen | public, demo only |

### Overview, search and analytics

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/overview` | Counts for the home dashboard | signed in |
| GET | `/resources` | Every governed resource across workspaces | `control.manage` or `audit.read` |
| GET | `/search?q=&limit=30` | Global search, best first. Each kind of hit follows its list endpoint's rule (integrations and MCP servers need `connect.manage`, users need `control.manage` or `audit.read`, and so on); records honor the entity read permission and row filters. | signed in |
| GET | `/analytics/activity?days=14` | Daily API calls, agent tool calls, workflow steps, denials | signed in |
| GET | `/analytics/tokens?days=14` | Daily tokens per model (one key per model name) | signed in |
| GET | `/analytics/entry-points` | Allowed, denied and failed counts per entry point | signed in |
| GET | `/analytics/log-metrics?days=14` | Log volume per severity (debug/info/warn/error) per day, from wsn-observer's OTLP log store | signed in |

### Control: organization and access

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/organization` | Organization and identity provider settings | signed in |
| GET | `/departments` | Departments | signed in |
| GET | `/teams` | Teams | signed in |
| GET | `/users` | Users with their role names | `control.manage` or `audit.read` |
| GET | `/roles` | Roles and permissions | `control.manage`, `audit.read`, `flow.manage` or `ai.manage` |
| GET | `/group-mappings` | Group to role mappings | `control.manage` or `audit.read` |
| PUT | `/group-mappings` | Replace all mappings: `{ mappings: [{ group, roleId }] }`. Every `roleId` must exist, and each newly mapped role may only include permissions the caller holds (`403`). | `control.manage` |
| PUT | `/users/{userId}/status` | Enable/disable an account: `{ status: active|disabled }`. A disabled user cannot sign in and their sessions stop resolving; the last administrator cannot be disabled (`409`). | `control.manage` |
| GET | `/environments` | Development, Staging, Production, with approval flag and limits | signed in |

### Studio: applications, releases, deployments

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/applications` | Applications | signed in |
| GET | `/applications/{appId}` | One application, with its pages | signed in |
| POST | `/applications/plan` | Draft an `ApplicationPlan` from `{ prompt }` (at least 8 characters). The Application Architect agent does this; nothing is created. | `studio.manage` |
| POST | `/applications/{appId}/plan` | Revise an existing app's plan with AI: sends the current blueprint + `{ prompt }` to the Application Architect and returns the full updated plan for review; nothing is applied until `PUT /applications/{appId}`. Existing entities/fields keep name and type (records depend on them). | `studio.manage` |
| POST | `/applications` | Create an application from `{ plan }`: its entities, CRUD operations, API and pages | `studio.manage` |
| PUT | `/applications/{appId}` | Apply an edited `{ plan }` to an existing application | `studio.manage` |
| GET | `/applications/{appId}/releases` | Releases, newest first | signed in |
| POST | `/applications/{appId}/releases` | Cut a release of the current version: `{ notes }` | `studio.manage` |
| GET | `/deployments?applicationId=` | Deployments, newest first | signed in |
| POST | `/deployments` | Deploy `{ applicationId, environment, version }` | `studio.manage`; `deployment.promote` where the environment requires approval |
| GET | `/me/pinned-applications` | The caller's pinned application ids, in pin order | signed in |
| PUT | `/me/pinned-applications/{appId}` | Pin (idempotent). Returns the pins afterwards. | signed in |
| DELETE | `/me/pinned-applications/{appId}` | Unpin (idempotent). Returns the pins afterwards. | signed in |

**Plan rules** (`POST /applications`, `PUT /applications/{id}`). The same checks run in the editor, in `validatePlan` (`libs/types/src/plan.ts`):

- The plan needs a name, an owning department and at least one entity. The name must be unique across applications (`409`).
- Entity names are PascalCase, unique within the plan and not already in use. Each entity needs a label and at least one field.
- Field names are camelCase and unique within the entity. `enum` fields need options. `reference` fields must point to an entity in the plan or one that already exists.
- Pages need a title and one of the plan's entities. `scan` pages need a `matchField` on that entity, and their `onScan` value must be one of the entity's enum choices.

**Plan change rules** (`PUT` only, `validatePlanChanges`). Records already depend on the saved shape, so changes must be additive:

- Entities and fields cannot be removed or renamed.
- A field's type, its reference target, and its existing enum choices cannot change.
- An existing field cannot become required or unique, and a new field on an existing entity must be optional.
- Pages keep their `id` so links to them still work.

**Deployment rules.** A release must be active in the previous environment first (development, then staging, then production), otherwise `409 INVALID_STATE`. The environment's previous active deployment becomes `superseded`.

### Data: entities and records

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/entities` | Entities | signed in |
| GET | `/entities/{name}` | One entity | signed in |
| POST | `/entities` | Create: `{ name, label?, description?, scope?, ownerApplicationId?, fields }`. Starts as `draft` v1 with `<Name>.Created` and `<Name>.Updated` events. | `data.manage` |
| PATCH | `/entities/{name}` | Change `fields`, `description`, `readPermission`, `writePermission`. Bumps `version`. External entities return `409`. | `data.manage` |
| GET | `/entities/{name}/records` | List records with `q`, `view` (saved view id), `includeDeleted`, `limit`, `offset`; row-level security (`entity.rowFilter`) applies on top | record perm (read) |
| POST | `/entities/{name}/records/{id}/files/{field}?name=` | Upload a file (raw bytes, max 50 MiB) into object storage; the record's file field becomes a `FileRef` | entity write permission |
| GET | `/entities/{name}/records/{id}/files/{field}` | Download the file the field references (streamed with its content type) | entity read permission |
| POST | `/entities/{name}/records` | Create: `{ values }` (runs `<Name>.create`) | record perm (write) |
| PATCH | `/entities/{name}/records/{id}` | Update: `{ values }` (runs `<Name>.update`) | record perm (write) |
| DELETE | `/entities/{name}/records/{id}` | Soft delete (row stays for history); `409` while referenced or under a pending approval. Returns `{ id, deleted: true }`. | record perm (write) |
| POST | `/entities/{name}/records/{id}/restore` | Restore a soft-deleted record | record perm (write) |
| GET | `/entities/{name}/records/{id}/history` | Change log newest first: actor, action, field-level diff, snapshot | record perm (read) |
| GET | `/entities/{name}/records/export?format=json\|csv&view=` | Download records as JSON or CSV | record perm (read) |
| POST | `/entities/{name}/records/import` | Import `{ format, data }` (JSON array or CSV text); each row validated like a create | record perm (write) |
| POST | `/entities/{name}/records/purge?olderThanDays=30` | Hard-delete soft-deleted records past the threshold (nightly job too) | `data.manage` |
| GET | `/entities/{name}/versions`, GET `.../versions/diff?from=&to=` | Schema snapshots per migration + field-level diff | signed in |
| POST | `/entities/{name}/migrate` | Schema migration `{ add, drop, retype, backfill, note }`: add always safe; drop/retype refused (422) while records exist; backfill sets values on existing rows; snapshots the entity version and bumps `version` | `data.manage` |
| GET/POST | `/entities/{name}/views` | Saved views (own + shared): `{ name, filters: [{field, op, value}], sortField, sortDesc, limit, shared }` | read perm / `data.manage` for writes |
| PUT/DELETE | `/entities/{name}/views/{viewId}` | Replace / delete a view. The owner may always change their own view; a shared view also by `data.manage`; someone else's private view is `404`. | owner, or `data.manage` for shared views |
| POST | `/entities/{name}/views/{viewId}/run?includeDeleted=` | Run the view now; RLS still applies | record perm (read) |
| GET | `/connections` | Database connections | signed in |

Record writes are validated against the entity's fields: required fields, `unique`, enum choices, number and integer types, and references that must exist (`422`). External entities are read-only (`409`).

### Business Operations

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/business-operations` | Every operation: `{ name, summary, permission, kind, entity? }` | signed in |
| POST | `/business-operations/invoke` | Run `{ operation, input, entryPoint }`; `entryPoint` may only be `studio` (default) or `api`. Returns `{ traceId, output }`. | the operation's permission |

Operations are registered two ways:

- **Generated per entity:** `<Entity>.list`, `.get`, `.create`, `.update` and `.delete`, guarded by the entity's read or write permission.
- **Hand-written domain operations:** `inventory.checkout`, `inventory.recordSale`, `inventory.getLowStockItems`, `procurement.createPurchaseRequest`, `procurement.approvePurchaseRequest`, `procurement.rejectPurchaseRequest`, `procurement.createPurchaseOrder`, `procurement.listPurchaseRequests` and `supplier.listSuppliers`. Their logic is in `libs/mock-server/src` (`platform.ts`, `seed.ts`).

### Connect: APIs, MCP, integrations

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/apis` | Published APIs, each owned by an application | signed in |
| GET | `/apis/{apiId}` | One API | signed in |
| GET | `/api-operations?apiId=` | API Operations: method, path, business operation, permission, rate limit, MCP exposure | signed in |
| PATCH | `/api-operations/{id}/mcp` | Expose or withdraw as an MCP tool: `{ enabled, toolName?, description? }`. Tool names are snake_case and unique among enabled tools (`409`). | `connect.manage` |
| POST | `/api-operations/{id}/invoke` | Try the operation with `{ input }` (entry point `api`). Returns `{ traceId, output }`. | the operation's permission |
| GET | `/mcp/tools` | All MCP tools: from WorkspaceNow API Operations (with input and output JSON Schema) and from external servers | signed in |
| GET | `/mcp/servers` | Managed and external MCP servers | signed in |
| POST | `/mcp/servers` | Register an external server `{ name, url, auth }` and discover its tools | `connect.manage` |
| GET | `/integrations` | Outbound integrations; `secretRef` points to a secret and never holds the secret; stored bearer and refresh tokens come back as `********` | `connect.manage` |
| POST | `/integrations`, PUT `/integrations/{id}` | Register / change an integration; `secretRef` must be a readable OpenBao path | `connect.manage` |
| GET | `/secrets?prefix=` | Secret paths in the OpenBao KV mount (never values) | `connect.manage` |
| GET | `/secrets/read?path=` | Read one secret's values (sensitive; audited as `secret.read`, never stored/logged). Only `integrations/` paths, except for the system user. | `control.manage` |
| POST | `/integrations/{id}/test` | Test the connection. Updates `status` and `lastTestedAt`; a failed test still returns `201` with `status: failing`. | `connect.manage` |

| GET/POST | `/webhooks`, PUT/DELETE `/webhooks/{id}` | Outbound subscriptions; deliveries POSTed signed (`X-WSN-Signature`), retried with backoff. The signing secret is shown only on create; lists return `********`. | `connect.manage` |
| GET | `/webhooks/{id}/deliveries`, POST `.../replay`, POST `.../test` | Delivery log, replay, synthetic test | `connect.manage` |
| GET/POST | `/apis/{id}/versions`, PUT `/apis/{id}/versions/{versionId}` | API versions (active/deprecated/retired, sunset, changelog); invoke takes `?version=` | `connect.manage` |
| GET | `/portal/apis` | Developer portal catalog (APIs + versions + operations, no secrets) | signed in |
| GET/POST | `/api-keys`, DELETE `/api-keys/{id}` | Issue/revoke `wsn_` keys (raw once, SHA-256 stored); `X-API-Key` auth + per-key hourly quota. A key may only carry permissions its creator holds, records `ownerId`, and stops working at its optional `expiresAt`. | `connect.manage` |
| POST | `/graphql` | Minimal GraphQL gateway over entity records (`query { Entity(where, first) { fields } }`); each field checks its entity's read permission and the query is audited as `graphql.query` | entity read perm |

### AI: models, agents, Sidekick

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/model-providers` | Model gateway providers, models, tokens and cost this month | `ai.manage` or `audit.read` |
| GET | `/agents` | Agents | `ai.manage`, `flow.manage` or `audit.read` |
| GET | `/agents/{id}` | One agent | `ai.manage`, `flow.manage` or `audit.read` |
| PATCH | `/agents/{id}` | Change `tools` (each must be a known MCP tool), `permissions` (only ones the caller holds), `instructions`, `model`, `status` (`active` or `disabled`). Bumps `version`. | `ai.manage` |
| POST | `/agents/{id}/runs` | Run with `{ prompt }`. Returns the finished `AgentRun`. An agent with its own identity needs `ai.manage` or every permission it holds, so running it never escalates. | signed in; tools run under the agent's identity |
| GET | `/agent-runs?agentId=` | Agent runs, newest first; only your own runs unless you hold `ai.manage` or `audit.read` | signed in |
| GET | `/agent-runs/{id}` | One run with its steps; someone else's run is `404` without `ai.manage` or `audit.read` | signed in |
| POST | `/sidekick/runs` | Ask Sidekick `{ prompt, applicationId? }`, as the caller. Scoping to an application needs the permission of at least one of its tools. | the caller must hold at least one role (`403` otherwise) |

An agent run returns the whole `AgentRun` when it finishes:

- `steps` alternate `thought` and `tool` entries. Each tool call carries `outcome` (`allowed`, `denied` or `error`) and a `reason` when it was refused.
- A refused tool call is a normal result, not an HTTP error.
- `answer` is the final reply, and `tokens` and `durationMs` record cost and latency.
- With `applicationId`, the run records it, and the answer explains when the request is outside that app.

### Flow: workflows, executions, approvals

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/workflows` | Workflows | `flow.manage` or `audit.read` |
| GET | `/workflows/{id}` | One workflow | `flow.manage` or `audit.read` |
| POST | `/workflows` | Create from `{ definition }` | `flow.manage` |
| PATCH | `/workflows/{id}` | Save a new `{ definition }`, or pause and resume with `{ status }`. Bumps `version`. The editor must hold every permission the steps need, including ones an earlier version had. | `flow.manage` |
| POST | `/workflows/{id}/executions` | Start by hand with `{ input }`; the workflow must be `active` (`409` otherwise) | `flow.manage` plus every permission the workflow holds |
| GET | `/executions?workflowId=` | Executions, newest first | `flow.manage` or `audit.read` |
| GET | `/executions/{id}` | One execution with its step states and context | `flow.manage` or `audit.read` |
| GET | `/approvals?status=` | Approvals, newest first; `status` is `pending`, `approved` or `rejected`. Without `flow.manage` or `audit.read` you see only approvals you may decide or that you started. | signed in |
| POST | `/approvals/{id}/decision` | `{ decision: "approved" \| "rejected", comment }`. Resumes the execution. `409` if already decided; `403` if you started the request (separation of duties). | the approval's own `permission` |

**Workflow model.** Triggers are `entity-event` (`{ event: "Stock.LowStockReached" }`), `schedule` (`{ cron }`, five fields) or `manual`. Steps:

| Kind | Fields | Behaviour |
|---|---|---|
| `agent` | `agentId`, `prompt` | Runs an agent with the workflow's context |
| `approval` | `permission`, `description`, `onReject?` | Creates an Approval and waits; a rejection ends the run unless `onReject` names a step |
| `operation` | `businessOperation` | Runs a Business Operation under the workflow's service identity |
| `notify` | `channel`, `message` | Sends a notification |
| `condition` | `field`, `operator`, `value`, `then`, `otherwise` | Branches on a dotted path into the context; numbers compare as numbers |
| `wait` | `minutes` | Pauses the run |

Every step has an `id`, a `name`, an optional `next` (omitted means the next step in the list, `null` ends the run) and an optional canvas `position`. **Definition rules** (`validateWorkflow`, `libs/types/src/workflow.ts`):

- The workflow needs a name, a valid trigger and at least one step. Step ids must be unique.
- Every link must point to an existing step.
- Each step needs its own fields.
- Every step must be reachable from the trigger, and no path may loop.

Executions are durable and must survive restarts.

### Observability and audit

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/events?limit=50` | Platform events, newest first | `audit.read` |
| GET | `/events/stream` | Live platform events as server-sent events (`text/event-stream`); resume with `Last-Event-ID`. Entity events reach only callers holding the entity's read permission; other events reach everyone without payload or actor, except auditors and whoever caused them. | signed in |
| GET | `/audit?actorKind=&outcome=&q=` | Audit records, newest first; `q` searches action, resource, actor and detail | `audit.read` |
| GET | `/traces` | Trace summaries built from audit records, newest first | `audit.read` |
| GET | `/traces/{traceId}` | One trace with its audit records and events | `audit.read` |
| GET | `/errors?q=&serviceName=&limit=&offset=` | Error groups derived from observer error spans (grouped by service+span+message), newest activity first, with trace-id samples | `audit.read` |
| GET | `/services` | Per-service telemetry health from the observer: spans, errors, error rate, logs, last seen | `audit.read` |
| GET | `/health` | Health of applications, APIs, MCP servers, integrations, databases and active workflows | signed in |

| GET | `/status` | Public status page (no auth): JSON rollup + components; `Accept: text/html` renders the HTML skin | public |
| GET/POST | `/alerts`, PUT/DELETE `/alerts/{id}` | Alert rules over audit/event patterns or SLO burn rate (`source: "slo"` + `sloId`, threshold = burn ×100); notify via a registered `webhookId` or a custom `webhookUrl` (unsigned) | `control.manage` |
| GET | `/alerts/{id}/fires`, POST `.../fires/{fireId}/ack` | Fires and acknowledgements | signed in / `control.manage` |
| GET/POST | `/slos`, GET `/slos/{id}/status` | SLOs per business operation; measured success rate + p95 vs targets | signed in / `control.manage` |

### Demo only

| Method | Path | Purpose | Permission |
|---|---|---|---|
| POST | `/demo/reset` | Restore the seed data. Returns `200 { reset: true }`. Demo only (`WSN_ENV=development` + `WSN_DEMO_MODE`); must not exist in production. | `control.manage` |

## Suggested service boundaries

The console sees one API, so a backend can split behind a gateway without the console noticing. The paths group naturally by owner:

| Service | Owns paths |
|---|---|
| Identity and control | `/session`, `/organization`, `/departments`, `/teams`, `/users`, `/roles`, `/group-mappings`, `/environments` |
| Studio | `/applications/**`, `/deployments`, `/me/pinned-applications/**` |
| Entity runtime and business operations | `/entities/**`, `/connections`, `/business-operations/**` |
| Connect and MCP gateway | `/apis/**`, `/api-operations/**`, `/mcp/**`, `/integrations/**` |
| AI | `/model-providers`, `/agents/**`, `/agent-runs/**`, `/sidekick/runs`, and the planning behind `/applications/plan` |
| Flow | `/workflows/**`, `/executions/**`, `/approvals/**` |
| Audit and observability | `/events`, `/audit`, `/traces/**`, `/errors`, `/services`, `/health`, `/overview`, `/resources`, `/search`, `/analytics/**` |

Whatever the split, authorization, auditing and the Business Operation check must be shared, so that every entry point (console, API, MCP, agent, workflow) is governed the same way.
