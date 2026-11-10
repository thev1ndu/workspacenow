# WorkspaceNow: issues, features and version cuts

This is the single list of everything that stands between WorkspaceNow and a production-grade internal operations platform that beats Retool. It was built from a code audit of every component (`wsn-service`, `wsn-ai-service`, `wsn-observer`, `console`, `deploy/`, CI) on 2026-11-10, plus primary-source research on Rancher, Dex, zero-trust practice and the competing platforms (section 9).

**How to read it**

- Every item has an ID (`BE-` backend, `AI-` agent service, `OB-` observer, `DP-` deploy/CI/ops, `UI-` console, `FT-` new feature, `ZT-` zero-trust design), a priority, a location and a fix.
- Priority is severity, not order of work: **P0** exploitable or data-losing today, **P1** broken or unsafe in normal use, **P2** correctness, scale or hardening gap, **P3** polish.
- Section 1 lists what this change already fixed. Section 10 cuts every item into versions (v1.2, v1.3, v1.4, v1.5, v2.0); every open ID appears in exactly one version (the six items already fixed are listed in section 1 instead).
- Paths are relative to the component directory named in the section heading. Line numbers are from the audit and drift as code changes; search by the symbol if a line moved.

**Totals:** 137 backend, 64 agent service, 56 observer, 111 deploy/CI/ops, 141 console, 75 features, 18 zero-trust design items: **602 items**.

**Where it stands.** The domain model, governed operations, run grants, Temporal workflows and the telemetry pipeline are a strong base. What keeps it from real-world use is mostly trust: authorization is missing on many read routes, several SSRF and data-exfiltration paths exist, secrets run in a dev-mode vault, nothing is backed up off the cluster, and the editor is a schema form rather than a builder. v1.2 closes the trust gaps, v1.3 makes identity and the platform production-grade, v1.4 delivers the best-grade editor, v1.5 makes agents the differentiator, v2.0 broadens the platform.

## 1. Fixed in this change

- **DONE-1** · System user variables renamed from `WSN_LOCAL_ADMIN_EMAIL`/`WSN_LOCAL_ADMIN_PASSWORD` to `WSN_DEFAULT_ADMIN_EMAIL`/`WSN_DEFAULT_ADMIN_PASSWORD` (config, identity service, Flux manifests, ExternalSecret keys, seed script, docs). The OpenBao path is now `secret/workspacenow/default-admin`. The user id prefix `local:` is unchanged so existing audit and records still match.
- **DONE-2** · The default admin could not use the AI service: the built-in Sidekick record created by older releases kept empty permissions forever because `EnsureBuiltins` only created missing agents. It now reconciles the platform-owned fields (`kind`, `actsAsCaller`) and fills empty permissions on start, keeping admin edits (`wsn-service/internal/ai/builtins.go`, tests in `builtins_test.go`).
- **DONE-3** · App-scoped Sidekick runs got zero tools because they intersected Sidekick's empty tool list with the app's tools; they now scope the full catalogue (`internal/ai/service.go`).
- **DONE-4** · Permission intersection ignored a wildcard on the agent side, so for every non-admin user the `*` Sidekick ended up with no permissions at all; a wildcard on either side now yields the other side (`internal/kernel/context.go`, `TestIntersectWildcard`).
- **DONE-5** · The nightly backup never ran: the CronJob passes `-backup` but `main.go` never registered that flag (exit 2), and the backup pod had no object-storage credentials. Both fixed (`wsn-service/main.go`, `deploy/flux/layers/04-apps/backup-cronjob.yaml`).
- **DONE-6** · Blank areas when entities are missing: UI-001, UI-002, UI-003, UI-005, UI-006, UI-007 (marked ✅ in section 6).

## 2. wsn-service (Go platform API)

### 2.1 Authorization gaps
- **BE-001** P0 · `internal/connect/graphql.go:170` · `POST /graphql` lists any entity through `rt.RecordsAs` without checking `ReadPermission`; any user or API key reads every entity, unaudited. **Fix:** `kernel.RequirePermission` per resolved entity, audit the query.
- **BE-002** P0 · `internal/ai/handler.go:85` · `POST /agents/{id}/runs` has no permission check; a non acts-as-caller agent runs with its own permissions for any signed-in user. **Fix:** require `ai.run` (or per-agent permission) and intersect with the caller for every agent.
- **BE-003** P1 · `internal/connect/service.go:818` · `CreateKey` stores any permissions (including `*`); a `connect.manage` holder mints a full-admin key; keys have no owner or expiry. **Fix:** refuse permissions the creator lacks, add `ownerId`, `expiresAt`.
- **BE-004** P1 · `internal/connect/handler.go:22,188` · `GET /integrations` returns OAuth tokens and `GET /webhooks` returns HMAC secrets in plaintext, unguarded. **Fix:** store refs only (OpenBao), `json:"-"` on API shapes, require `connect.manage`.
- **BE-005** P1 · `internal/obs/handler.go:25`, `internal/stream/stream.go:152` · `/events` and SSE filter only entity events; AgentRun prompts/answers, approvals and notifications reach every user. **Fix:** `audit.read` on `/events`, visibility rule per event type.
- **BE-006** P1 · `internal/ai/handler.go:53,76` · `GET /agent-runs[/{id}]` returns every user's prompts, answers and tool steps. **Fix:** own runs only unless `ai.manage`/`audit.read`.
- **BE-007** P2 · `internal/ai/handler.go:21-29` · providers and agents (instructions, permissions, cost) list without permission. **Fix:** require `ai.read`.
- **BE-008** P2 · `internal/identity/handler.go:89-120` · users, roles, groups, group mappings readable by anyone signed in. **Fix:** `control.read` or a redacted directory view.
- **BE-009** P2 · `internal/flow/handler.go:16,67,80,84` · workflows, executions (full context) and approvals have no read permission. **Fix:** `flow.read`; filter approvals to decidable/requested.
- **BE-010** P2 · `internal/obs/handler.go:138-253` · overview, resources, search, analytics, alert rules (webhook URLs), SLOs unguarded. **Fix:** `audit.read`/`control.read`.
- **BE-011** P2 · `internal/obs/overview.go:219` · global search returns entities/records the caller cannot read. **Fix:** filter by `ReadPermission` and row filters.
- **BE-012** P2 · `internal/bizops/handler.go:35` · caller picks `entryPoint` (agent/workflow/mcp), forging audit; handler ignores the request trace. **Fix:** allow `studio`/`api` only; use `ContextFrom`.
- **BE-013** P2 · `internal/flow/service.go:146` · saving a workflow keeps permissions the editor does not hold (permission laundering). **Fix:** check every needed permission on each save.
- **BE-014** P2 · `internal/flow/service.go:224` · `Start` needs only `flow.manage`, then runs with the workflow's stored permissions. **Fix:** starter must hold them, or per-workflow run permission.
- **BE-015** P2 · `internal/flow/service.go:351` · no separation of duties: requesters approve their own requests. **Fix:** reject decisions by the requester/trigger actor.
- **BE-016** P2 · `internal/ai/service.go:356` · Sidekick app scope checks existence, not the caller's access to the app. **Fix:** check app access first.
- **BE-017** P2 · `internal/connect/service.go:462` · `control.manage` reads any OpenBao path (DB creds, `RUN_GRANT_KEY`). **Fix:** path allowlist (`integrations/`) or system-user only.
- **BE-018** P2 · `internal/ai/service.go:168` · `UpdateAgent` accepts any permission (including `*`). **Fix:** refuse permissions the editor lacks.
- **BE-019** P2 · `internal/identity/service.go:333` · `control.manage` assigns any role including `*` to anyone, and can remove the last admin. **Fix:** granter must hold the role's permissions; block removing the last `*` holder.
- **BE-020** P3 · `internal/connect/service.go:816` · `GET /api-keys` unguarded. **Fix:** `connect.manage`.
- **BE-021** P3 · `internal/data/service.go:343,373` · views editable by any `data.manage` holder, not by their owner. **Fix:** owner edits own; `data.manage` for shared views.
- **BE-022** P2 · `internal/ai/api.go:37` · `/internal/v1/mcp/invoke` accepts any forwarded user token without the service token. **Fix:** require both.

### 2.2 Authentication and sessions
- **BE-023** P1 · `internal/identity/service.go:187-212`, `app/app.go:278` · `POST /auth/login` has no rate limit, lockout or audit; sessions stored raw as `wsn:session:<token>`, fixed 24h, no logout or revoke. **Fix:** per-IP/email limiter, audit success and failure, key by `sha256(token)`, `POST /auth/logout`, session version, sliding TTL.
- **BE-024** P1 · `config/config.go:185` · production does not require `OIDC_AUDIENCE`/`OIDC_ISSUER`, `AI_SERVICE_TOKEN`, `RUN_GRANT_KEY`, or a non-`*` CORS list; without audience any client of the IdP is accepted. **Fix:** mandatory when `IsProduction()`.
- **BE-025** P1 · `app/app.go:157` · an invalid `RUN_GRANT_KEY` falls back to an ephemeral key per process; worker-signed grants fail on the server. **Fix:** fail startup.
- **BE-026** P1 · `internal/identity/service.go:178` · bootstrap admin granted from `email` without `email_verified`; `AdminEmails` not lowercased. **Fix:** require verified email, normalize config.
- **BE-027** P2 · `internal/identity/service.go:161` · bootstrap admin role re-added on every login; it can never be revoked. **Fix:** grant once, audit removal.
- **BE-028** P2 · `middleware/auth.go:72`, `app/app.go:282` · demo tokens impersonate anyone and `/demo/reset` (wipes the DB) is public outside `WSN_ENV=production`. **Fix:** require `WSN_ENV=development` plus an explicit flag; protect reset.
- **BE-029** P2 · `internal/identity/service.go:134` · no disabled/offboarded user state. **Fix:** `status` on User, reject disabled in `resolve`, admin disable endpoint.
- **BE-030** P2 · `middleware/auth.go:165` · JWKS fetch runs under the mutex with the request ctx; a slow IdP serializes all requests. **Fix:** singleflight refresh on a background ctx, serve stale keys.
- **BE-031** P2 · `middleware/auth.go:225` · no minimum RSA size; `alg` not matched to the JWK. **Fix:** reject < 2048-bit keys and mismatched `alg`.
- **BE-032** P2 · `middleware/telemetry.go:20` · client `X-Trace-Id` trusted; callers attach rows to other traces. **Fix:** accept W3C `traceparent` from internal callers only.
- **BE-033** P3 · `internal/connect/keys.go:80` · API key quota fails open on Valkey errors. **Fix:** fail closed.
- **BE-034** P2 · `app/app.go` · the default admin password is compared from plaintext env and is never rotated or forced to change. **Fix:** store a bcrypt hash, force rotation on first login (Rancher `bootstrapPassword` model), or move it into Dex (ZT-004).

### 2.3 SSRF, secrets and input handling
- **BE-035** P0 · `internal/data/validate.go:74`, `internal/data/files.go:97` · a file field accepts any `{"key":...}`; a writer points it at `backups/<ts>.dump` and downloads the database. **Fix:** only `UploadFile` sets file values; download requires the `uploads/<entity>/<id>/<field>/` prefix.
- **BE-036** P0 · `internal/connect/service.go:395,498`, `oauth2.go:53` · integration `secretRef` is any OpenBao path and `tokenUrl` is not SSRF-checked; `TestIntegration` POSTs the secret to it. **Fix:** `integrations/` prefix, `AssertPublicHTTPURL` on TokenURL.
- **BE-037** P0 · `internal/connect/service.go:661` · `UpdateWebhook` skips the URL check `CreateWebhook` does; events go to `169.254.169.254` or internal hosts. **Fix:** same validation on update plus dial-time guard.
- **BE-038** P1 · `internal/connect/service.go:355` · MCP `RegisterServer` checks only the scheme; ai-service fetches internal URLs. **Fix:** `AssertPublicHTTPURL` here and in ai-service (AI-001).
- **BE-039** P1 · `internal/infra/netutil/netutil.go:33` · URL validation resolves DNS once at save time (rebinding passes); delivery client has no dial-time check; 100.64/10 and IPv6 site-local not blocked. **Fix:** `DialContext` control that rejects internal IPs on every connection.
- **BE-040** P2 · `internal/obs/ops.go:172` · alert webhooks follow redirects to internal hosts. **Fix:** no redirects plus the dial guard.
- **BE-041** P1 · `internal/httpx/httpx.go:84` · `Decode` reads unbounded bodies (import, plans, graphql, login, internal API). **Fix:** `http.MaxBytesReader` (1 MiB default, larger for import).
- **BE-042** P2 · `internal/identity/theme.go:48` · `logoUrl` unvalidated (`javascript:`, `data:`). **Fix:** https or uploaded-asset keys only.
- **BE-043** P3 · `internal/data/handler.go:265` · downloads lack `nosniff`; filename uses Go `%q`. **Fix:** nosniff header, RFC 6266 `filename*`.
- **BE-044** P3 · `internal/data/depth.go:127` · `contains` does not escape `%`/`_`; numeric casts 500 on non-numeric values. **Fix:** escape LIKE, guard the cast.
- **BE-045** P3 · `internal/connect/service.go:363,397`, `internal/ai/service.go:321` · raw upstream/OpenBao errors returned to clients. **Fix:** log detail, return generic text.
- **BE-046** P3 · `app/app.go:526,541` · `pg_dump` gets `DATABASE_URL` on argv (visible in `ps`); dumps unencrypted. **Fix:** PG env/PGPASSFILE, encrypt before upload.

### 2.4 Data isolation and row-level security
- **BE-047** P1 · `internal/data/runtime.go:215-311` · Update/Delete skip the row filter; users change records they cannot see. **Fix:** apply `rowFilterCond` on writes.
- **BE-048** P1 · `internal/data/depth.go:75` · an unknown row-filter `op` returns "" and turns RLS off. **Fix:** `1 = 0` for unknown ops; validate on save.
- **BE-049** P1 · `internal/data/files.go:38,88` · file upload/download use `Record` (no RLS). **Fix:** `RecordAs`.
- **BE-050** P2 · `internal/data/service.go:410-434` · History and Restore check entity permission only. **Fix:** `RecordAs` first.
- **BE-051** P2 · `internal/data/depth.go:51` · for agent runs `$actor.id` is the agent, not `OnBehalfOf`; Sidekick sees a different row set from its user. **Fix:** resolve against the on-behalf-of user.
- **BE-052** P2 · `internal/data/runtime.go:187` · writers can set the RLS owner field to anyone. **Fix:** force/validate it to `$actor`.
- **BE-053** P3 · `internal/data/service.go:34` · `rowFilter` not editable through the API. **Fix:** add with validation and audit.

### 2.5 Correctness bugs
- **BE-054** P1 · `internal/connect/keys.go:26,52,76` · `KeyHash` is `json:"-"` and docstore persists JSON, so no API key can ever authenticate. **Fix:** storage struct with `keyHash`, redacted API view, issue-then-verify test.
- **BE-055** P1 · `internal/connect/oauth2.go:50,89` · token cached with `SetJSON`, read with `Get`; bearer becomes `"\"tok\""`. **Fix:** `GetJSON`; include scopes in the cache key.
- **BE-056** P1 · `internal/data/depth.go:140` · `in` filter prepends its field to all args; placeholders misorder when it is not first. **Fix:** append in order.
- **BE-057** P1 · `internal/data/service.go:230-271` · `Migrate` uses `s.db` inside `InTx`; backfill runs outside the transaction. **Fix:** `postgres.DB(ctx, s.db)` throughout.
- **BE-058** P1 · `internal/obs/ops.go:252` · SLO status overwrites `total`/`errs` per minute instead of summing. **Fix:** scan into temporaries and add.
- **BE-059** P1 · `internal/ai/service.go:324,503` · the run doc is written after the run, so streamed steps 404 and live progress is lost. **Fix:** insert a `running` RunDoc first, merge at completion.
- **BE-060** P1 · `internal/ai/client.go:152` · `RunForWorkflow` sends no tools, ignores status, writes no run/audit/cost, never fills `Created`; the flagship approval never approves. **Fix:** share `service.run`; return created records.
- **BE-061** P1 · `internal/connect/webhooks.go:194,258` · replay sets `NextRetryAt=nil` but retry skips nil; replays never send. **Fix:** set `now`.
- **BE-062** P1 · `internal/flow/service.go:268` · execution stored before `ExecuteWorkflow`; a failed start is never retried. **Fix:** mark `failed-to-start` or start first.
- **BE-063** P1 · `internal/flow/service.go:206,371` · `syncSchedule` and `Decide` call a nil Temporal client on servers without Temporal (panic). **Fix:** nil guard like `Start`.
- **BE-064** P2 · `internal/flow/service.go:210` · scheduled runs have no execution/trace id and a fixed workflow id. **Fix:** mint ids in `Begin`; test scheduled runs appear.
- **BE-065** P2 · `internal/flow/temporal.go:66` · looping graphs silently end "completed" at the step guard. **Fix:** fail "step limit exceeded" or reject cycles.
- **BE-066** P2 · `internal/connect/webhooks.go:144` · dispatcher reads `seq > lastSeq`; late-committing lower seqs are skipped forever. **Fix:** drive from the NATS consumer or per-row delivered state.
- **BE-067** P2 · `internal/data/service.go:155` · `UpdateEntity` replaces fields wholesale, bypassing migration guards and versioning. **Fix:** route through `Migrate`.
- **BE-068** P2 · `internal/identity/service.go:496` · department id from slug upserts over existing; non-ASCII names collapse to `dep-`. **Fix:** conflict check, `NewID` fallback.
- **BE-069** P2 · `internal/data/service.go:464` · import is not transactional, skips the external-entity check and the engine. **Fix:** `InTx`, scope check, row cap.
- **BE-070** P3 · `internal/data/service.go:404` · `RunView` reports total after truncating. **Fix:** count first.
- **BE-071** P3 · `internal/data/validate.go:100` · `Inf` and booleans pass as numbers; `Inf` then 500s on marshal. **Fix:** reject.
- **BE-072** P3 · `internal/data/files.go:45` · every upload stored as `application/octet-stream`. **Fix:** use request Content-Type or sniff.
- **BE-073** P3 · `internal/connect/service.go:587` · TCP probe for database/broker integrations is dead code. **Fix:** allow those schemes with SSRF checks.
- **BE-074** P3 · `internal/ai/service.go:327` · `StartedAt` set after the run finishes. **Fix:** capture before.
- **BE-075** P3 · `internal/seed/seed.go:79` · demo reset leaves history/versions and deletes builtin agents until restart. **Fix:** clear tables, call `EnsureBuiltins`.
- **BE-076** P1 · `internal/studio/service.go:403,418` · generated apps require `data.manage` for every operation, so ordinary staff cannot use apps Studio builds; no delete operation. **Fix:** generate `<app>.read`/`<app>.write` and delete.

### 2.6 Concurrency and races
- **BE-077** P1 · `internal/domain/operations.go:99` · `recordSale` reads stock unlocked; concurrent sales oversell and double/miss low-stock events. **Fix:** lock in the transaction or atomic decrement with check.
- **BE-078** P1 · `internal/flow/service.go:336`, `internal/domain/operations.go:322` · approvals decided without `FOR UPDATE`; two approvers both act. **Fix:** `GetForUpdate`, re-check status.
- **BE-079** P1 · `app/app.go:204,223,243` · webhook dispatcher, purge and alert evaluator run in every replica; duplicates. **Fix:** Postgres advisory-lock leader election or worker role.
- **BE-080** P2 · `internal/ai/service.go:380` · `addCost` read-modify-write loses counts; monthly totals never reset. **Fix:** atomic jsonb increment keyed by month.
- **BE-081** P2 · `internal/data/service.go:118`, `internal/studio/service.go:255,568` · count-then-put creates overwrite on races. **Fix:** insert-only with unique constraint.
- **BE-082** P2 · `internal/connect/keys.go:87` · every key use rewrites the doc (`lastUsedAt`), racing revoke and possibly un-revoking. **Fix:** column-level update, throttled.
- **BE-083** P3 · `internal/infra/events/relay.go:72` · multiple relays publish out of order. **Fix:** single-relay lease or document per-subject ordering.

### 2.7 Error handling
- **BE-084** P1 · `internal/ai/service.go:445` · per-run call budget fails open on Valkey errors. **Fix:** deny.
- **BE-085** P2 · `internal/connect/service.go:206` · operation rate limits fail open. **Fix:** fail closed or local bucket.
- **BE-086** P2 · `app/app.go:233,247` · purge and alert errors discarded. **Fix:** log and meter.
- **BE-087** P2 · `internal/obs/ops.go:161` · alert webhook delivery result ignored, no retry. **Fix:** route through the dispatcher.
- **BE-088** P2 · `internal/flow/service.go:371` · if signalling fails after the decision commits, the workflow waits forever. **Fix:** outbox signal plus reconciliation.
- **BE-089** P3 · `internal/ai/service.go:323,339`, `internal/data/runtime.go:350` · ignored marshal/decode errors. **Fix:** propagate.
- **BE-090** P3 · `middleware/middleware.go:87` · `Recover` writes a body after headers/SSE were sent. **Fix:** track writes, abort the connection.

### 2.8 Data integrity and migrations
- **BE-091** P2 · `db/migrations/migrations.go:105` · `001_initial_schema` derives tables from current code, so a shipped migration changes over time. **Fix:** freeze explicit DDL; new migrations for new collections.
- **BE-092** P2 · `db/models/models.go:40,50` · GIN `jsonb_ops` indexes only serve `@>`; all queries use `->>` and seq-scan. **Fix:** expression indexes on hot keys or rewrite to `@>`.
- **BE-093** P2 · `db/models/models.go:83-104` · no indexes for alert evaluation or event app filters. **Fix:** add in a new migration.
- **BE-094** P2 · `db/models/models.go:83-112` · audit is mutable with no hash chain; events and outbox grow forever; seed deletes audit. **Fix:** append-only grants, hash chain, retention/partitioning jobs.
- **BE-095** P2 · `internal/studio/service.go:490` · blueprint written to S3 inside the DB transaction; rollback orphans it and retries overwrite "immutable" keys. **Fix:** write after commit, put-if-absent.
- **BE-096** P3 · `internal/data/files.go:60` · uploads before record update; replaced files never deleted. **Fix:** delete on failure, GC superseded keys.

### 2.9 Performance
- **BE-097** P1 · `internal/data/service.go:496` · `ListRecords` loads the whole entity into memory, searches and pages in Go (also export and GraphQL). **Fix:** push `q`/limit/offset into SQL (ILIKE or tsvector), stream exports.
- **BE-098** P1 · `internal/connect/webhooks.go:186` · every 2 s lists the entire deliveries table. **Fix:** indexed `status<>'delivered' AND nextRetryAt<=now LIMIT n`.
- **BE-099** P1 · `internal/connect/service.go:99`, `webhooks.go:229` · delivery client has no timeout and retries forever. **Fix:** 10 s timeout, max attempts, dead-letter.
- **BE-100** P2 · `internal/connect/keys.go:70` · every API-key request lists all keys. **Fix:** indexed hash lookup.
- **BE-101** P2 · `internal/connect/service.go:272,325` · tool catalogue rebuilt 2-3 times per tool call; `ApplicationTools` is N+1. **Fix:** cache with invalidation.
- **BE-102** P2 · `internal/identity/service.go:244` · every request lists all groups before the cache check; JWT path writes the user. **Fix:** versioned cache, skip unchanged writes.
- **BE-103** P2 · `internal/identity/service.go:529` · `Users()` does two full-table lists per user. **Fix:** load once.
- **BE-104** P2 · `internal/obs/ops.go:229,243` · SLO status makes 660 Valkey round trips per hour window; recording is 3 synchronous calls per invoke. **Fix:** MGET/pipelines, async increments.
- **BE-105** P2 · `internal/data/runtime.go:264` · delete scans every referencing entity. **Fix:** reference indexes or table.
- **BE-106** P2 · `internal/flow/service.go:289`, `internal/studio/service.go:442,530` · executions, releases, deployments unbounded and sorted in memory. **Fix:** SQL order + pagination.
- **BE-107** P2 · `internal/obs/service.go:148` · audit has no pagination/time range; `actor::text ILIKE` full scan. **Fix:** limit/offset/from/to, actor index.
- **BE-108** P2 · `internal/observer/exporter.go:254` · span/log/metric buffers unbounded. **Fix:** cap and count drops.
- **BE-109** P2 · `app/app.go:509-546` · backup and restore hold the dump in memory. **Fix:** stream multipart.
- **BE-110** P2 · `internal/stream/stream.go:94` · no SSE connection limits; shutdown waits on open streams. **Fix:** per-caller cap, close on shutdown.
- **BE-111** P3 · `internal/kernel/engine.go:152` · reads open write transactions and audit every list (Sidekick floods audit). **Fix:** no tx for reads, sampled read audit.
- **BE-112** P3 · `internal/ai/client.go:81`, `internal/connect/oauth2.go:79` · upstream bodies unbounded. **Fix:** `io.LimitReader`.
- **BE-113** P3 · general · no global or per-user API rate limiting, including LLM-cost routes (`/applications/plan`, `/sidekick/runs`, `/agents/{id}/runs`). **Fix:** Valkey token bucket per caller, stricter AI tier.

### 2.10 API contract drift
- **BE-114** P2 · `app/app.go:278` · `/auth/login` hand-mounted, not in `openapi.yaml`; no logout/refresh. **Fix:** add to the contract and generate.
- **BE-115** P3 · `docs/TODO.md:9,61` · says 73 endpoints (openapi has 145 operations) and `q` on `/events` that does not exist. **Fix:** update docs or add `q`.
- **BE-116** P3 · `internal/connect/service.go:316` · external MCP tools advertise `{query:string}` instead of the discovered schema. **Fix:** keep `inputSchema` (pairs with AI-004).
- **BE-117** P3 · `internal/ai/service.go:180` · agent `status` not validated against the enum. **Fix:** validate.
- **BE-118** P3 · `middleware/middleware.go:107` · CORS omits `X-API-Key`, `X-API-Version`, `X-Trace-Id` and does not expose `X-Trace-Id`. **Fix:** add.

### 2.11 Observability
- **BE-119** P2 · `internal/ai/api.go:24`, `app/app.go:309` · internal `:8081` mux has no recover, telemetry, logging, trace propagation or ReadTimeout. **Fix:** same middleware chain minus auth.
- **BE-120** P2 · `app/app.go:384`, `internal/obs/ops.go:290` · public `/healthz` and `/status` leak dependency errors, hosts, versions. **Fix:** up/down publicly, detail behind auth.
- **BE-121** P3 · `middleware/telemetry.go:49` · span names use raw paths (cardinality); no `traceparent`. **Fix:** `r.Pattern`, W3C propagation.
- **BE-122** P3 · `internal/observer/exporter.go:396` · log handler ignores level. **Fix:** honor `LOG_LEVEL`.
- **BE-123** P3 · `internal/ai/service.go:287` · full prompt stored in audit detail (PII). **Fix:** hash or preview.
- **BE-124** P3 · `internal/flow/triggers.go:26` · triggers past `MaxDeliver` dropped silently. **Fix:** advisory handler and DLQ.

### 2.12 Tests
- **BE-125** P2 · `internal/connect` · no tests for keys, webhook SSRF, replay, retry, oauth caching, TestIntegration (would have caught BE-054/055/061). **Fix:** table tests with fakes.
- **BE-126** P2 · `internal/identity/service_test.go` · no tests for LocalLogin, SessionUser, bootstrap, role updates, resolve caching. **Fix:** service tests with cache mocks.
- **BE-127** P2 · `middleware` · JWT verification (expiry, audience, unknown kid, refresh) and auth dispatch untested. **Fix:** httptest JWKS.
- **BE-128** P2 · `internal/data/depth_test.go` · no multi-filter `in`, unknown-op RLS, RLS-on-write tests. **Fix:** add.
- **BE-129** P2 · `internal/stream`, `internal/infra/*`, `internal/domain`, `internal/httpx`, `internal/bizops`, `config`, `api` · no tests at all. **Fix:** unit tests (config validate, public routes, decode limits, relay batch).
- **BE-130** P2 · `internal/flow`, `internal/studio` · no service tests for Decide races, nil Temporal, launch recovery, Save laundering, Apply/Release/Deploy. **Fix:** add.
- **BE-131** P3 · `internal/obs/ops_test.go:63` · migration test lives in `obs`; no migrate-from-empty integration test. **Fix:** move; `//go:build integration` test.

### 2.13 Half-built capabilities
- **BE-132** P2 · `internal/ai/service.go:486` · external MCP tool calls return "not wired yet"; servers have no refresh, health or delete (health hard-coded). **Fix:** proxy `tools/call` via ai-service, server lifecycle endpoints.
- **BE-133** P2 · `internal/flow/temporal.go:397` · `notify` step only emits an event; no email, Slack, Teams or webhook channel. **Fix:** channel adapters by `step.Channel`.
- **BE-134** P2 · `internal/flow/service.go:355`, `temporal.go:98` · approvals act only on `PurchaseRequest`; no timeout, escalation or reassignment. **Fix:** generic `onApprove`/`onReject` operations, timers.
- **BE-135** P2 · `internal/studio/service.go:542` · Deploy only writes a record; nothing switches; no rollback; approval-required envs need only a permission. **Fix:** environment runtime switch, rollback, approval workflow.
- **BE-136** P3 · `internal/obs/ops.go:428` · SLOs cannot be updated/deleted; `targetSuccess>1` accepted; no backups API. **Fix:** CRUD, validation, `GET /backups`.
- **BE-137** P3 · `internal/domain/operations.go:31`, `internal/flow/temporal.go:385` · demo business logic (Stock, PurchaseRequest) compiled into the core. **Fix:** move to a template/plugin package.

## 3. wsn-ai-service (agent runtime, planner, MCP)

### 3.1 Security
- **AI-001** P1 · `src/wsn_ai_service/discovery.py:11` · SSRF: the discovery URL can reach `169.254.169.254`, wsn-service `:8081`, the observer, OpenBao, Valkey. **Fix:** resolve and reject loopback/link-local/RFC1918/cluster CIDRs, pin the resolved IP.
- **AI-002** P1 · `app.py:127` · the 502 body echoes the connect error: an SSRF response oracle that also leaks URL credentials. **Fix:** generic message, log the stripped detail.
- **AI-003** P2 · `discovery.py:11` · `Client(str)` picks the transport from the string (`.py`/`.js` spawn stdio processes). **Fix:** explicit `StreamableHttpTransport`, `HttpUrl` with https.
- **AI-004** P1 · `discovery.py:13` · discovered tools drop `inputSchema`, so the model cannot pass arguments. **Fix:** carry schema and annotations end to end (pairs with BE-116).
- **AI-005** P3 · `discovery.py:10` · `auth="oauth2"` is a static bearer with no refresh. **Fix:** client-credentials/refresh flow.
- **AI-006** P1 · `runtime.py:118` · tool output (records, external MCP results) enters the model context verbatim, so stored prompt injection can steer write tools. **Fix:** fenced untrusted-data blocks, a guidance line, an injection regression test.
- **AI-007** P1 · `runtime.py:136` · tool output is never size-capped; one big list overflows the context and loses the run. **Fix:** cap with a marker, total context budget.
- **AI-008** P2 · `runtime.py:27` · workflow `context` is concatenated into the prompt unfenced. **Fix:** separate labelled data block.
- **AI-009** P2 · `mcp_server.py:20` · `tools/list` on `/mcp` serves the whole catalogue unauthenticated. **Fix:** auth middleware on the whole MCP app.
- **AI-010** P2 · `mcp_server.py:21` · forwards any Authorization header with the service token (confused deputy). **Fix:** verify `aud` and expiry locally; per-subject limits.
- **AI-011** P2 · `app.py:143` · no `Origin` validation on `/mcp` (DNS rebinding; the MCP spec requires it) and no rate limit. **Fix:** Origin allowlist, limiter.
- **AI-012** P3 · `app.py:143` · no RFC 9728 protected-resource metadata, so MCP clients cannot discover sign-in. **Fix:** serve `/.well-known/oauth-protected-resource`.
- **AI-013** P3 · `app.py:67` · `removeprefix("Bearer ")` accepts schemeless tokens; scheme is case-sensitive. **Fix:** strict parse.
- **AI-014** P2 · `config.py:14` · empty `AI_SERVICE_TOKEN`/`MISTRAL_API_KEY` boots healthy, then every call fails. **Fix:** fail fast outside dev.
- **AI-015** P3 · `platform.py:54` · `run_id` interpolated into an internal path unescaped. **Fix:** quote or validate as an id.
- **AI-016** P2 · `runtime.py:105` · no guardrails: no PII redaction before Mistral, no moderation, no approval before mutating tools. **Fix:** pre-LLM redaction hook, plan-then-execute approval for write tools.

### 3.2 Reliability and budgets
- **AI-017** P1 · `runtime.py:73` · a Mistral exception (429/5xx/timeout/overflow) escapes as a bare 500 after steps streamed; no RunResult or tokens. **Fix:** catch SDK errors, return `failed` with tokens so far.
- **AI-018** P1 · `llm.py:50` · no retry or backoff on 429/503. **Fix:** `retry_config` with jittered backoff.
- **AI-019** P2 · `config.py:22` · `default_model` is unused; no fallback for retired models. **Fix:** fall back and record it.
- **AI-020** P1 · `runtime.py:72` · no token or cost budget; `max_tokens` unset. **Fix:** `maxTokensPerRun` in the spec and grant; stop on budget.
- **AI-021** P1 · `runtime.py:58` · no wall-clock deadline; runs outlive wsn-service's 120 s client and keep calling tools. **Fix:** `asyncio.timeout`, partial failed result.
- **AI-022** P2 · `app.py:104` · runs are synchronous in one request and cannot be cancelled. **Fix:** 202 plus a task, `DELETE /v1/runs/{id}`, disconnect checks.
- **AI-023** P2 · `runtime.py:51` · only total tokens; the planner discards usage. **Fix:** prompt/completion split, `gen_ai.usage.*` metrics.
- **AI-024** P2 · `runtime.py:72` · the last round still offers tools and wastes a round. **Fix:** `tool_choice="none"` on the final round, accurate stop reason.
- **AI-025** P3 · `runtime.py:69` · tools advertised when the limit is 0. **Fix:** `tools=None`.
- **AI-026** P2 · `runtime.py:123` · a run is marked failed if any tool errored, and completed when cut off by length. **Fix:** status from final answer plus `finish_reason`.
- **AI-027** P3 · `runtime.py:96` · tool calls within a round run serially. **Fix:** gather read-only calls.
- **AI-028** P2 · `llm.py:44` · malformed tool-call JSON becomes `{}` and is executed. **Fix:** return a parse error to the model.
- **AI-029** P2 · `llm.py:77` · list content from reasoning models is dropped to "". **Fix:** join text chunks, keep thinking as steps.
- **AI-030** P2 · `llm.py:74` · `finish_reason` ignored. **Fix:** surface it; handle `length`/`error`.
- **AI-031** P3 · `llm.py:79` · fallback ids `call-{i}` collide across rounds. **Fix:** uuid ids.
- **AI-032** P2 · `llm.py:70` · `strict=True` with a PLAN_SCHEMA that is not strict-compliant. **Fix:** make the schema strict, or validate afterwards.
- **AI-033** P2 · `platform.py:47` · a non-JSON 2xx or an unknown outcome raises out of the run. **Fix:** map to `error`.
- **AI-034** P3 · `platform.py:23` · one timeout for connect and read; no retries on idempotent reads. **Fix:** split timeouts, transport retries.
- **AI-035** P3 · `runtime.py:56` · streamed steps have no sequence number. **Fix:** `seq` per step.
- **AI-036** P3 · `models.py:17` · tool-call limit, prompt length and tool count unbounded. **Fix:** `Field` bounds.
- **AI-037** P3 · `app.py:56` · lifespan cleanup not in `try/finally`; the sync task is never awaited. **Fix:** finally plus awaited cancel.

### 3.3 Planner
- **AI-038** P1 · `planner.py:126` · `edit()` overwrites operations, workflows and permissions with `[]`. **Fix:** carry current values through; merge only the returned parts.
- **AI-039** P2 · `planner.py:103` · plan shape not validated; wrong shapes 500; foreign department ids pass. **Fix:** pydantic `ApplicationPlan`, map failures to 502.
- **AI-040** P3 · `planner.py:90` · duplicated post-processing; edit replaces the original prompt. **Fix:** `_finish()`, keep an edit history.
- **AI-041** P3 · `planner.py:98` · no span or metric for planner calls. **Fix:** `Span("planner.plan")`.

### 3.4 MCP server
- **AI-042** P2 · `mcp_server.py:54` · changed descriptions or schemas never refresh until restart. **Fix:** compare a spec hash and re-add.
- **AI-043** P3 · `mcp_server.py:59` · fixed-sleep sync loop; no tools for 60 s if wsn-service is down at boot. **Fix:** backoff; readiness after the first sync.
- **AI-044** P3 · `mcp_server.py:26` · denied and error outcomes look identical to clients. **Fix:** structured outcome.

### 3.5 Errors and telemetry
- **AI-045** P2 · `app.py:129` · validation errors and Starlette 404/405 bypass the ErrorBody shape; 502 maps to `INVALID_STATE`. **Fix:** handlers for all; add 500/502/503 codes.
- **AI-046** P3 · `app.py:73` · liveness only. **Fix:** `/readyz` (first sync done, key present, wsn-service reachable).
- **AI-047** P1 · `app.py:84` · no `traceparent` extraction or propagation; every request starts a new trace. **Fix:** W3C propagation both ways.
- **AI-048** P1 · `telemetry.py:169` · spans never set `parent_span_id`. **Fix:** inherit from the current span.
- **AI-049** P1 · `app.py:91` · three serial observer POSTs on the response path per request. **Fix:** bounded queue plus background batch exporter.
- **AI-050** P2 · `telemetry.py:196` · unreferenced, unbounded `create_task` per log record; export-failure logs loop. **Fix:** single drain task; skip the telemetry logger.
- **AI-051** P3 · `telemetry.py:199` · tracebacks dropped; only one logger shipped. **Fix:** `exception.stacktrace`, root handler with a filter.
- **AI-052** P2 · `runtime.py:73` · no LLM or tool child spans, no gen_ai attributes. **Fix:** `chat <model>` and `tool <name>` spans.
- **AI-053** P2 · `telemetry.py:165` · error spans lack exception attributes; failed runs export as OK. **Fix:** record them and set the status.
- **AI-054** P2 · `telemetry.py:125` · histograms exported as plain data points (invalid OTLP); sums lack temporality. **Fix:** proper histogram points.
- **AI-055** P3 · `telemetry.py:28` · attributes stringified; wrong span kind; raw-path span names. **Fix:** typed values, INTERNAL kind, route templates.
- **AI-056** P3 · `telemetry.py:32` · the resource has only `service.name`. **Fix:** version, environment, instance id.

### 3.6 Tests and capabilities
- **AI-057** P2 · `tests/test_discovery.py:32` · no SSRF negative tests. **Fix:** parametrized private, metadata and scheme cases.
- **AI-058** P2 · `tests/test_runtime.py:54` · no tests for LLM errors, retry, deadline, oversized output, malformed args or injection. **Fix:** fake ChatModel cases.
- **AI-059** P2 · `tests/test_runtime.py:171` · no test that a planner edit preserves fields. **Fix:** regression test.
- **AI-060** P2 · `tests/test_live_smoke.py:1` · no eval harness (golden prompts, tool-choice accuracy, plan pass rate). **Fix:** `tests/evals/` with recorded fixtures and a nightly scored run.
- **AI-061** P2 · `llm.py:27` · Mistral-only `ChatModel`. **Fix:** provider-neutral types; OpenAI, Anthropic and Ollama adapters chosen per model.
- **AI-062** P3 · `models.py:26` · runs are single-shot, with no history or memory. **Fix:** permission-scoped history and a memory store.
- **AI-063** P3 · `runtime.py:73` · no retrieval over business data. **Fix:** permission-scoped search/RAG tool (pgvector in wsn-service).
- **AI-064** P3 · `app.py:104` · no token streaming. **Fix:** stream deltas as steps.

## 4. wsn-observer (telemetry)

### 4.1 Security
- **OB-001** P0 · `server/server.go:99` · with `WSN_OBSERVER_TOKEN` empty every endpoint is open, including `POST /v1/segments`, and it is publicly routed at `obs.${domain}`. **Fix:** require a token unless `WSN_OBSERVER_INSECURE=true`; always for segments.
- **OB-002** P2 · `server/server.go:42` · one token for ingest, query and replication. **Fix:** separate scopes.
- **OB-003** P3 · `server/server.go:165` · storage errors (file paths) returned to clients. **Fix:** generic message.

### 4.2 OTLP compliance
- **OB-004** P1 · `telemetry/otlp.go:15` · int64 `intValue` is a JSON string per the spec; decoding into `*int64` rejects whole batches from real SDKs. **Fix:** a flexible number type.
- **OB-005** P1 · `telemetry/otlp.go:207` · the same for `asInt` and `count`. **Fix:** the same type.
- **OB-006** P1 · `server/server.go:153` · JSON only; no protobuf (the SDK default) or gzip; Content-Type unchecked. **Fix:** gzip; 415 or a minimal protobuf decoder.
- **OB-007** P2 · `telemetry/otlp.go:13` · array, kvlist and bytes values become "". **Fix:** decode them.
- **OB-008** P2 · `telemetry/otlp.go:82` · status message, events (exceptions), links, scope and resource attributes dropped. **Fix:** keep them.
- **OB-009** P2 · `telemetry/otlp.go:219` · histograms keep only the count; exponential and summary metrics yield nothing. **Fix:** store sum, count and buckets.
- **OB-010** P3 · `telemetry/otlp.go:185` · severity text ignores the number; observed time unused. **Fix:** derive and fall back.
- **OB-011** P3 · `telemetry/otlp.go:118` · ids and times not validated (negative durations). **Fix:** validate.
- **OB-012** P3 · `server/server.go:168` · response is not `Export*ServiceResponse`; storage failure is 500 instead of a retryable 503. **Fix:** spec body, 503/429.

### 4.3 WAL storage durability
- **OB-013** P1 · `walstore/walstore.go:148` · a recovered segment's `path` is never set, so it is never replicated. **Fix:** set the path; log failures.
- **OB-014** P1 · `walstore/walstore.go:139` · a torn last line is not cut off after a crash; the next record merges into it. **Fix:** trim to the last newline or start a new segment.
- **OB-015** P1 · `walstore/walstore.go:327` · no fsync anywhere; acknowledged batches vanish on a crash. **Fix:** fsync on roll and periodically.
- **OB-016** P2 · `walstore/walstore.go:328` · short writes leave partial records. **Fix:** trim or roll.
- **OB-017** P2 · `walstore/walstore.go:196` · corrupt lines are skipped silently. **Fix:** count, expose, log once.
- **OB-018** P3 · `walstore/walstore.go:36` · `maxLineBytes` declared but never enforced. **Fix:** enforce at marshal and scan.
- **OB-019** P1 · `walstore/walstore.go:1101` · retention runs only hourly; bursts fill the PVC. **Fix:** check after each roll, free-disk high-water mark.
- **OB-020** P2 · `walstore/walstore.go:1088` · pruning never decrements counts or services. **Fix:** subtract on removal.
- **OB-021** P2 · `walstore/walstore.go:1044` · bytes-only retention, no age TTL; prune errors swallowed. **Fix:** `WSN_OBSERVER_RETENTION_AGE`, log errors.
- **OB-022** P2 · `walstore/walstore.go:1085` · the active segment is excluded from retention, and config does not require segment < retention. **Fix:** validate.

### 4.4 Replication
- **OB-023** P1 · `walstore/walstore.go:408` · imported segments collide with the standby's own sequence numbers; data is lost. **Fix:** namespace by source, or forbid local ingest on a standby.
- **OB-024** P2 · `walstore/walstore.go:411` · import leaks the old active fd; failed indexing silently stops counting. **Fix:** close and seal; fail the import.
- **OB-025** P2 · `walstore/walstore.go:399` · non-atomic import with no checksum. **Fix:** temp file, fsync, rename, sha256.
- **OB-026** P2 · `walstore/walstore.go:380` · fire-and-forget replication: no status check, retry or logging. **Fix:** persisted cursor, retry with backoff.
- **OB-027** P2 · `walstore/walstore.go:365` · `wg.Add` races `Close`'s `Wait`. **Fix:** mark closed under the lock before waiting.
- **OB-028** P3 · `walstore/walstore.go:368`, `server/server.go:140` · whole segments buffered in memory (up to 512 MiB). **Fix:** stream.

### 4.5 Query performance and correctness
- **OB-029** P1 · `walstore/walstore.go:692` · each query decodes up to 100k records into memory with no concurrency limit or deadline. **Fix:** ctx checks inside the scan, a semaphore, a top-K heap.
- **OB-030** P2 · `server/server.go:48` · no per-request timeout or rate limit. **Fix:** `http.TimeoutHandler`.
- **OB-031** P2 · `walstore/walstore.go:750` · trace lookup scans the newest 100k spans, so older traces are "not found". **Fix:** per-segment trace-id bloom filter.
- **OB-032** P2 · `walstore/walstore.go:786` · `GetSpan` keeps scanning after a hit. **Fix:** stoppable visit callback.
- **OB-033** P2 · `walstore/walstore.go:716` · traces grouped by service plus traceID, so cross-service traces split in two. **Fix:** group by traceID.
- **OB-034** P2 · `walstore/walstore.go:700` · the window filter cuts traces that straddle it. **Fix:** filter after grouping.
- **OB-035** P2 · `walstore/walstore.go:845` · exact totals with a capped page; deep offsets return empty pages marked exact. **Fix:** approximate flag or cursor paging.
- **OB-036** P3 · `walstore/walstore.go:263` · empty segments make totals inexact. **Fix:** skip `Count==0`.
- **OB-037** P3 · `walstore/walstore.go:462` · live index uses span End, recovery uses Start. **Fix:** one field.
- **OB-038** P2 · `walstore/walstore.go:969` · `Services()` scans 200k records per call. **Fix:** answer from the index.
- **OB-039** P3 · `walstore/walstore.go:637` · the reverse reader allocates per chunk. **Fix:** reuse buffers.
- **OB-040** P3 · `walstore/walstore.go:818` · the query is lowercased per line. **Fix:** precompute.
- **OB-041** P3 · `walstore/walstore.go:584` · every query lists the directory under the global mutex. **Fix:** in-memory sequence list, RWMutex.
- **OB-042** P2 · `walstore/walstore.go:63` · one global mutex for all signals. **Fix:** per-signal locks.
- **OB-043** P3 · `server/server.go:418` · trace spans ignore offset and time range. **Fix:** support offset.
- **OB-044** P3 · `server/server.go:333` · `start > end` and unbounded ranges accepted. **Fix:** validate and cap.

### 4.6 Server hygiene
- **OB-045** P2 · `server/server.go:51` · no ReadTimeout or WriteTimeout (slowloris on 512 MiB uploads). **Fix:** set both.
- **OB-046** P2 · `server/server.go:140` · the segments endpoint buffers 512 MiB, uses the wrong error content type and does not log failures. **Fix:** stream, `writeError`, log.
- **OB-047** P3 · `server/server.go:116` · request log lacks status and duration; no panic recovery; log level unused. **Fix:** slog with level, recover.
- **OB-048** P2 · `server/server.go:41` · no self-metrics (ingest rate, rejects, disk, replication lag). **Fix:** `/metrics` or self-ingest.
- **OB-049** P3 · `server/server.go:120` · `/healthz` always ok. **Fix:** `/readyz` checking the store and disk.
- **OB-050** P3 · `config/config.go:37` · replication config unvalidated; timeout hard-coded. **Fix:** validate, make configurable.
- **OB-051** P3 · `main.go:58` · the 5 s shutdown does not drain replication; Close errors discarded. **Fix:** configurable timeout, log errors.

### 4.7 Tests and capabilities
- **OB-052** P2 · `walstore/walstore_test.go:252` · no tests for torn lines, recovered-segment replication, standby collisions, replica failure, Close during roll. **Fix:** add them.
- **OB-053** P2 · `telemetry/otlp_test.go:17` · no spec-conformant fixtures (string int64, gzip, protobuf, arrays, exponential histograms). **Fix:** opentelemetry-proto examples.
- **OB-054** P3 · `server/server_test.go:1` · no tests for the empty-token posture, cancellation or concurrent heavy queries. **Fix:** add them.
- **OB-055** P3 · `server/server.go:46` · no trace-tree or logs-by-trace endpoint for a waterfall UI. **Fix:** `GET /api/v1/traces/{id}/tree`.
- **OB-056** P3 · `server/server.go:57` · no attribute filters (`run.id`, `agent.id`). **Fix:** key=value filters.

## 5. Deployment, CI and operations (`deploy/`, `.github/`, Dockerfiles)

### 5.1 Broken today
- **DP-001** P1 · `deploy/flux/layers/02-services/rustfs.yaml:1` · nothing in Flux creates the `workspacenow` bucket (compose has `rustfs-init`); documents, artifacts and backups fail on a fresh cluster. **Fix:** bucket-init Job in layer 02, or ensure-bucket at startup.
- **DP-002** P1 · `deploy/compose/docker-compose.ha.yml:15,33` · the healthcheck mixes shell and SQL (`pg_is_in_recovery() = false`), so Postgres never turns healthy in the HA overlay. **Fix:** `psql -tAc "select not pg_is_in_recovery()" | grep -q t`.
- **DP-003** P2 · `deploy/compose/docker-compose.ha.yml:2` · `name: workspacenow` overrides the base project `wsn`, orphaning its volumes. **Fix:** drop `name` from the overlay.

### 5.2 Secrets and OpenBao
- **DP-004** P0 · `deploy/flux/layers/00-foundation/operators.yaml:53` · OpenBao runs `dev.enabled: true`, root token `root`: in-memory storage, no audit; a restart wipes every secret including integration credentials. **Fix:** Raft storage, real init with auto-unseal, revoke root, audit device.
- **DP-005** P0 · `operators.yaml:56` · `dataStorage: 5Gi` is ignored in dev mode (false sense of persistence). **Fix:** `server.ha.raft`, Raft snapshot backups.
- **DP-006** P0 · `layers/01-secrets-data/secret-store.yaml:42` · the setup Job logs in with the literal root token from git. **Fix:** short-lived scoped bootstrap token, or the OpenBao Terraform provider.
- **DP-007** P0 · `secret-store.yaml:28` · the Job reruns every reconcile; after an OpenBao restart it reseeds `change-me` placeholders that ESO pushes into `wsn-secrets`. **Fix:** run once; never seed placeholders for real credentials; apps refuse placeholders.
- **DP-008** P0 · `secret-store.yaml:61-67` · seeds working weak defaults (`change-me`, `workspacenow-secret`, `temporal-dev`). **Fix:** random values or nothing.
- **DP-009** P0 · `deploy/flux/scripts/openbao-seed.sh:20` · unset vars fall back to known values; empty `OBSERVER_TOKEN` opens the public observer (OB-001). **Fix:** `${VAR:?}` for every secret.
- **DP-010** P1 · `openbao-seed.sh:15` · secrets passed as `kubectl exec` argv (process list, audit logs, history). **Fix:** JSON on stdin.
- **DP-011** P1 · `openbao-seed.sh:9`, `deploy/flux/README.md:131` · seeding and the sign-in guide require the root token. **Fix:** `secret-admin` policy and token, or OIDC auth to OpenBao.
- **DP-012** P1 · `secret-store.yaml:46,51` · one `workspacenow-read` policy with `update` bound to both ESO and wsn-service; the app can overwrite the Mistral key and run-grant key. **Fix:** read-only ESO policy; wsn-service limited to `integrations/*`.
- **DP-013** P1 · `secret-store.yaml:52` · the `wsn-service` OpenBao role binds the SA shared by relay, worker, migrate and backup. **Fix:** one SA per role; OpenBao role for the API only.
- **DP-014** P1 · `secret-store.yaml:9`, `layers/04-apps/wsn-service.yaml:15` · ESO and the app reach OpenBao over plain `http://`. **Fix:** listener TLS from cert-manager, `caProvider`.
- **DP-015** P2 · `external-secrets.yaml:8` · rotated secrets never roll Deployments. **Fix:** Reloader annotations or hash rollout.
- **DP-016** P2 · `external-secrets.yaml:15` · `AI_SERVICE_TOKEN`, `OBSERVER_TOKEN`, `RUN_GRANT_KEY` are static shared secrets with no rotation or dual-key overlap. **Fix:** current/next keys plus a rotation runbook (or SPIFFE, ZT-010).
- **DP-017** P2 · `secret-store.yaml:34` · Job image `openbao:2.1.0` vs compose `2.2.0` vs chart `0.x`. **Fix:** pin one version.

### 5.3 Zero-trust networking
- **DP-018** P0 · `layers/03-platform/registry.yaml:36-47` · the in-cluster registry is public at `registry.${domain}` with no auth and delete enabled; anyone can push `wsn-service:dev`, which apps pull with `Always` (remote code execution). **Fix:** remove the public route or add auth; pull by digest.
- **DP-019** P0 · `layers/04-apps/network.yaml:44-56` · `obs.${domain}` exposes ingest and query publicly with an optional token. **Fix:** required token, drop or restrict the route.
- **DP-020** P1 · `network.yaml:30-42` · `ai.${domain}` routes `/` to the whole ai-service, not just `/mcp`. **Fix:** match `/mcp` only; gateway auth policy.
- **DP-021** P1 · `network.yaml:58` · no default-deny NetworkPolicy in any namespace. **Fix:** default-deny ingress and egress per namespace, explicit allows including DNS.
- **DP-022** P1 · `network.yaml:71,90,104,121` · `namespaceSelector: workspacenow` in the same `from` list admits every pod in the namespace (builds, registry, hostNetwork DaemonSet). **Fix:** gateway proxy labels plus named clients only.
- **DP-023** P1 · `network.yaml:64` · ingress-only policies; compromised pods reach OpenBao, the API server, the DB superuser and the internet. **Fix:** egress allow-lists; LLM egress through an egress gateway.
- **DP-024** P1 · `layers/02-services/valkey.yaml:14` · no policies for Valkey, NATS, RustFS, wsn-db, registry, OpenBao, Temporal. **Fix:** per-service ingress policies.
- **DP-025** P1 · `wsn-service.yaml:9-10` · Valkey and NATS without auth or TLS. **Fix:** Valkey ACL+TLS, NATS accounts/nkeys+TLS via ESO.
- **DP-026** P1 · `wsn-service.yaml:13,17-18` · S3, AI and observer calls are plaintext; nothing is mTLS. **Fix:** mesh with STRICT mTLS (Istio ambient, Linkerd or Cilium) or SPIFFE-issued certs.
- **DP-027** P1 · `layers/02-services/temporal.yaml:22-45` · Temporal frontend has no TLS or authorizer; any pod can start or kill workflows. **Fix:** Temporal mTLS, claim mapper/authorizer, DB TLS.
- **DP-028** P1 · `wsn-service.yaml:58` · DATABASE_URL without `sslmode=verify-full`. **Fix:** CNPG CA secret, verify-full or client certs.
- **DP-029** P2 · `layers/03-platform/gateway.yaml:10` · HTTP listener has no redirect; no HSTS. **Fix:** RequestRedirect route, HSTS header policy.
- **DP-030** P2 · `gateway.yaml:9` · no rate limiting, body limits, WAF or auth at the gateway. **Fix:** kgateway TrafficPolicy, extAuth for obs/registry.
- **DP-031** P2 · `rustfs.yaml:27,46` · RustFS admin console port exposed on the Service. **Fix:** drop or restrict.
- **DP-032** P3 · `console/nginx.conf:1` · no CSP, frame, referrer or nosniff headers; `server_tokens` on. **Fix:** add headers.

### 5.4 Pod security
- **DP-033** P0 · `layers/03-platform/host-aliases.yaml:14-25` · privileged hostNetwork DaemonSet writes node `/etc/hosts`: root on every node for anyone who can change this path or the busybox image. **Fix:** remove; containerd `hosts.toml` mirrors or real DNS, or pull from ghcr.
- **DP-034** P1 · `layers/00-foundation/namespaces.yaml:1` · no Pod Security Admission labels. **Fix:** `enforce: restricted` on workspacenow (after DP-033/DP-036), `baseline` elsewhere.
- **DP-035** P1 · `rustfs.yaml:15` · `runAsNonRoot: false`, no container securityContext. **Fix:** numeric uid/gid, drop ALL, read-only root.
- **DP-036** P1 · `layers/03-platform/builds.yaml:15` · kaniko runs as root in the app namespace beside production Secrets. **Fix:** dedicated `builds` namespace, SA, policy, quota; or build in CI.
- **DP-037** P2 · `registry.yaml:15` · registry runs root, writable rootfs, no memory limit. **Fix:** restricted securityContext and limits.
- **DP-038** P2 · `secret-store.yaml:31` · setup Job has no securityContext or resources. **Fix:** restricted context, small limits.
- **DP-039** P2 · `layers/00-foundation/kgateway.yaml:331` · controller has no securityContext and `resources: {}` while GOMEMLIMIT reads limits. **Fix:** limits via chart values.
- **DP-040** P2 · `wsn-service.yaml:73` · SA token automounted into every role. **Fix:** `automountServiceAccountToken: false` except the API, audience-scoped projected token.
- **DP-041** P3 · `namespaces.yaml:1` · no ResourceQuota or LimitRange. **Fix:** add.

### 5.5 Images and supply chain
- **DP-042** P0 · `builds.yaml:20` · kaniko builds `main` HEAD straight into production, untested by CI, rebuilt whenever the Job is recreated. **Fix:** deploy CI-built images from ghcr by digest; or pin `#<sha>` via automated PR.
- **DP-043** P0 · `layers/04-apps/kustomization.yaml:16` · every app runs the mutable `dev` tag with `Always`; no reproducibility or rollback. **Fix:** immutable tags plus digests (Flux ImagePolicy).
- **DP-044** P1 · `builds.yaml:16` · `gcr.io/kaniko-project/executor` is archived upstream, tag-pinned. **Fix:** buildx in CI or rootless BuildKit, digest-pinned.
- **DP-045** P1 · `.github/workflows/images.yaml:6` · `workflow_run` checks out default-branch HEAD, not the tested `head_sha`. **Fix:** `ref: workflow_run.head_sha`, branch filter.
- **DP-046** P1 · `images.yaml:47` · `GITHUB_REF` is always the default branch under `workflow_run`; release tags never publish versioned images. **Fix:** use the event's branch/tag or a tag-triggered workflow.
- **DP-047** P1 · `images.yaml:61` · no SBOM, signing, provenance or vulnerability scan. **Fix:** `sbom: true`, `provenance: mode=max`, cosign keyless, Trivy gate, Kyverno verifyImages.
- **DP-048** P1 · `.github/workflows/ci.yaml:27` · actions pinned by mutable tags. **Fix:** full commit SHAs with Dependabot.
- **DP-049** P1 · `wsn-ai-service/Dockerfile:10` · `pip install .` without a lockfile or hashes. **Fix:** `uv.lock` or hashed requirements.
- **DP-050** P2 · all Dockerfiles · base images tag-pinned only. **Fix:** `@sha256` digests.
- **DP-051** P2 · `console/Dockerfile:3` · `node:25-alpine` (non-LTS) while CI tests Node 22. **Fix:** `node:22-alpine@sha256`.
- **DP-052** P2 · `console/Dockerfile:7` · pnpm fetched from npm at build time. **Fix:** corepack `packageManager` hash.
- **DP-053** P2 · `registry.yaml:17` · `registry:2` floating on Docker Hub. **Fix:** pinned digest or managed registry.
- **DP-054** P2 · `host-aliases.yaml:18` · `busybox:1.36` tag-only. **Fix:** digest (moot after DP-033).
- **DP-055** P2 · `.github/dependabot.yml:28` · Flux charts and images are not tracked. **Fix:** Renovate flux manager.
- **DP-056** P2 · `ci.yaml:98,103,122` · codegen and lint tools fetched without go.sum verification. **Fix:** `tool` directives in go.mod.
- **DP-057** P3 · `images.yaml:51` · comment refers to a Flux ImagePolicy that does not exist. **Fix:** add image automation or fix the comment.

### 5.6 GitOps hygiene
- **DP-058** P1 · `operators.yaml:12` and every HelmRelease · chart versions `0.x`/`1.x`; breaking CRD changes roll out unattended. **Fix:** exact versions, upgrade by PR.
- **DP-059** P1 · `operators.yaml:2` · HelmReleases have no remediation, rollback or drift detection. **Fix:** `upgrade.remediation.retries`, `strategy: rollback`, `driftDetection`.
- **DP-060** P1 · `cluster/flux-system/gotk-sync.yaml:10` · Flux tracks `main` with no commit verification; anyone who can push controls the cluster within a minute. **Fix:** branch protection, signed commits, `spec.verify`.
- **DP-061** P1 · `deploy/flux/README.md:65` · bootstrap stores a personal access token in the cluster. **Fix:** read-only deploy key or GitHub App.
- **DP-062** P2 · `cluster/00-foundation.yaml:1` · no Flux notification Provider/Alert; failures are silent. **Fix:** alerts to Slack/webhook.
- **DP-063** P2 · `README.md:37` · cert-manager, its issuer and metallb live outside git. **Fix:** manage them in layer 00.
- **DP-064** P2 · `kgateway.yaml:1` · kgateway vendored as 26k lines of rendered YAML. **Fix:** HelmRelease from the OCI chart pinned to v2.4.7.
- **DP-065** P2 · `temporal.yaml:22` · `numHistoryShards` not pinned (immutable after install). **Fix:** set it.
- **DP-066** P3 · `operators.yaml:33` · ESO CRDs owned twice. **Fix:** one mechanism.

### 5.7 Availability and scaling
- **DP-067** P1 · `wsn-service.yaml:66` and all app Deployments · every service is one replica. **Fix:** 2+ replicas, topology spread.
- **DP-068** P1 · `wsn-service.yaml:179` · PDB `minAvailable: 1` on single replicas blocks every node drain. **Fix:** more replicas or `maxUnavailable: 1`.
- **DP-069** P1 · `wsn-ai-service.yaml:1` · no HPA for the API or ai-service. **Fix:** HPAs, `minReplicas: 2`.
- **DP-070** P1 · `registry.yaml:8` · every pod start depends on a single-replica registry via a hairpin through the public IP. **Fix:** ghcr with `IfNotPresent` and digests.
- **DP-071** P1 · `rustfs.yaml:8` · object storage is one replica on one RWO PVC. **Fix:** distributed mode or external S3 with versioning.
- **DP-072** P2 · `rustfs.yaml:17` · no resources or liveness probe. **Fix:** add.
- **DP-073** P2 · `builds.yaml:24` · kaniko without limits can starve production pods. **Fix:** limits, dedicated nodes, or CI builds.
- **DP-074** P2 · `layers/01-secrets-data/postgres.yaml:9` · wsn-db has no resources, storage class, pinned image, anti-affinity or update strategy. **Fix:** set them; pin `imageName` by digest.
- **DP-075** P2 · `postgres.yaml:1` · Temporal and the platform share one Postgres cluster. **Fix:** separate CNPG cluster or pooler limits.
- **DP-076** P2 · `valkey.yaml:14` · single Valkey, no replica, resources or auth; sessions lost on restart. **Fix:** replica plus sentinel.
- **DP-077** P2 · `kgateway.yaml:314` · one controller, no PDB, proxy replicas unset: ingress is a single point of failure. **Fix:** 2+ replicas via GatewayParameters, PDBs.
- **DP-078** P2 · `layers/00-foundation/metallb.yaml:8` · one `/32` in L2 mode: single announcing node. **Fix:** BGP or provider LB; document failover time.
- **DP-079** P3 · `console.yaml:53` · console has no liveness probe or PDB. **Fix:** add with 2 replicas.
- **DP-080** P3 · `wsn-service.yaml:96` · no startupProbe; liveness checks dependencies, so a blip restarts the API. **Fix:** process-only liveness, dependency readiness, startupProbe.

### 5.8 Runtime config
- **DP-081** P1 · `wsn-service.yaml:6-8` · the public cluster runs `WSN_ENV: development` and `LOG_LEVEL: DEBUG`; production safeguards off and debug logs may carry PII. **Fix:** `production`/`INFO`.
- **DP-082** P1 · `wsn-service.yaml:31-37` · the migrate Job is not ordered before the rollout and reruns only when its TTL expires, against whatever image the registry holds. **Fix:** separate Kustomization the apps depend on, keyed to the image digest; expand/contract migrations.
- **DP-083** P2 · `wsn-service.yaml:1-24` · ConfigMap changes do not roll pods. **Fix:** `configMapGenerator` hash or Reloader.
- **DP-084** P2 · `wsn-service.yaml:88-95` · keys duplicated between `env` and `envFrom: wsn-secrets`; relay and worker get the Mistral key and admin password. **Fix:** inject only the keys each role needs.
- **DP-085** P3 · `console.yaml:14` · `authMode: "local"` (one shared admin) on a public deployment. **Fix:** OIDC via Dex (ZT-001).

### 5.9 Backups and disaster recovery
- **DP-086** P0 · `postgres.yaml:9-26` · CNPG has no backup, WAL archiving or ScheduledBackup: no point-in-time recovery. **Fix:** barman-cloud to off-cluster S3, daily ScheduledBackup, retention policy.
- **DP-087** P0 · `backup-cronjob.yaml:1` · dumps go to the same single-replica in-cluster RustFS. **Fix:** off-site bucket with object lock, versioning, encryption.
- **DP-088** P1 · `rustfs.yaml:48` · `rustfs-data` (documents, release artifacts) is never backed up. **Fix:** bucket replication or Velero/CSI snapshots.
- **DP-089** P1 · `deploy/compose/docker-compose.yml:139` · the restore drill exists only in compose. **Fix:** monthly in-cluster restore into a scratch CNPG cluster with alerting.
- **DP-090** P1 · `README.md:118` · no DR plan (RTO/RPO), no Velero; images and secrets live only in the cluster. **Fix:** DR runbook, Velero, external registry and secrets backend, rebuild-from-git procedure.
- **DP-091** P2 · `nats.yaml:19` · JetStream store not backed up or mirrored. **Fix:** stream backup or mirror; document outbox replay.
- **DP-092** P2 · `temporal.yaml:22` · Temporal archival disabled. **Fix:** history archival to S3.
- **DP-093** P3 · `wsn-observer.yaml:10` · 256 MiB retention on one PVC, no standby in Flux. **Fix:** size to an SLO; add the standby.

### 5.10 Monitoring and alerting
- **DP-094** P1 · `temporal.yaml:20` · no metrics stack, ServiceMonitors, Alertmanager or alert rules anywhere. **Fix:** kube-prometheus-stack with CNPG/NATS/Valkey/kgateway/Temporal alerts (replication lag, backup age, disk, cert expiry, Job failures).
- **DP-095** P2 · `wsn-observer.yaml:19` · the only telemetry sink is inside the cluster it watches. **Fix:** external uptime probes and alerting.
- **DP-096** P2 · `gateway.yaml:42` · no certificate expiry or issuance alerts. **Fix:** cert-manager metrics alerts or one wildcard cert.
- **DP-097** P3 · `backup-cronjob.yaml:7` · no alert on failed or missed backups (the broken `-backup` flag went unnoticed). **Fix:** Job failure alert, "last good backup age" metric.

### 5.11 CI, testing, environments
- **DP-098** P1 · `AGENTS.md:17` · CI has never run, so none of its gates are proven. **Fix:** run it, fix failures, required checks with branch protection.
- **DP-099** P1 · `ci.yaml:179` · deploy job only renders kustomize; no kubeconform, `flux build`, policy check or kind apply. **Fix:** kubeconform with CRD schemas, flux-local, ephemeral kind run plus smoke.
- **DP-100** P1 · `cluster/cluster-vars.yaml:1` · one environment, no staging, preview or promotion path. **Fix:** see FT-090 (environments as a product feature) and keep a second cluster-vars for a staging cluster when needed.
- **DP-101** P1 · `e2e/smoke.sh:6` · smoke uses demo tokens only; the production auth path is never tested. **Fix:** add a default-admin login case; run against the Flux stack.
- **DP-102** P2 · `e2e/smoke.sh:31` · `sleep 3` for async delivery (flaky). **Fix:** poll with timeout.
- **DP-103** P2 · `e2e/smoke.sh` · no backup/restore, ai-service, observer or Temporal coverage. **Fix:** add those steps.
- **DP-104** P2 · `ci.yaml:150` · e2e skips ai-, observer- and console-only changes. **Fix:** include all components.
- **DP-105** P2 · `README.md:93` · rollback is "delete the Job and restart". **Fix:** immutable versions; `git revert` as the documented rollback.

### 5.12 Local compose
- **DP-106** P2 · `docker-compose.yml:39-159` · Postgres, Valkey, NATS, OpenBao, RustFS and API `:8081` publish on `0.0.0.0`. **Fix:** bind `127.0.0.1`, drop `:8081`.
- **DP-107** P2 · `docker-compose.yml:34` · infra images float. **Fix:** pin.
- **DP-108** P2 · `docker-compose.yml:114` · app services have no healthchecks; `make up --wait` returns early. **Fix:** `/readyz` healthchecks.
- **DP-109** P3 · `docker-compose.ha.yml:24` · replica uses the app superuser and wipes its data dir every start. **Fix:** replication role, basebackup only when empty.
- **DP-110** P3 · `.env.example:12` · shipped defaults reused by the cluster seed script. **Fix:** `make setup` generates random values.
- **DP-111** P3 · `Makefile:33` · `make clean` wipes all volumes without confirmation. **Fix:** `CONFIRM=1`.

## 6. Console (React webapp)

Paths are relative to `console/workspaces/` unless they start with `console/`.

### 6.1 Blank areas when entities or data are missing (the reported bug)
- **UI-001** ✅ fixed · P0 · `pages/data/src/RecordsPage.tsx:146-160` · a deleted, renamed or forbidden entity renders an empty bordered card and the title "undefined records"; the error is never shown. **Fix:** `QueryState` around the card, "Entity X no longer exists" with a link back.
- **UI-002** ✅ fixed · P0 · `libs/views/src/component/QueryState.tsx:46` · a disabled query (missing id param) returns `null`, leaving a blank panel. **Fix:** render an empty state when idle with no data.
- **UI-003** ✅ fixed · P0 · `pages/flow/src/WorkflowEditorPage.tsx:263,271` · if any of agents/operations/roles/entities errors (e.g. 403 on roles), the skeleton shows forever. **Fix:** loading from `isPending`; on error fall back to empty options with an alert naming the list.
- **UI-004** P0 · `libs/mock-server/src/index.ts:15`, `state.ts:111` · each tab keeps its own demo platform and overwrites localStorage; entities created in one tab vanish when another tab writes. **Fix:** `storage`/BroadcastChannel sync or revision check before write.
- **UI-005** ✅ fixed · P1 · `pages/data/src/DataOverviewPage.tsx:70-101` · zero entities renders a header over an empty table. **Fix:** "No entities yet" with a New entity action.
- **UI-006** ✅ fixed · P1 · `DataOverviewPage.tsx:104-110` · empty "Entities by scope" donut leaves a blank 14rem box. **Fix:** empty state.
- **UI-007** ✅ fixed · P1 · `pages/data/src/DataModelPage.tsx:240-269` · zero entities draws an empty graph and empty right column. **Fix:** early empty state, one column.
- **UI-008** P1 · `pages/studio/src/subComponents/PlanEditor.tsx:480-489` · the two-column grid reserves a blank right column when a plan has no workflows. **Fix:** two columns only when workflows exist.
- **UI-009** P1 · `pages/studio/src/subComponents/BuilderTools.tsx:30-49` · "Sandbox preview" card has an empty body until a preview runs. **Fix:** "No preview deployed yet".
- **UI-010** P1 · `pages/studio/src/subComponents/ApplicationTabs.tsx:26-35` · "Entities" is an empty div when none; chips for deleted entities link to 404. **Fix:** dash when empty; warning chip without link for missing ones.
- **UI-011** P1 · `ApplicationTabs.tsx:41-66` · empty Pages table; pages bound to deleted entities show no warning. **Fix:** empty state; flag missing entities.
- **UI-012** P1 · `ApplicationTabs.tsx:77-78` · deleted entities are silently dropped, so it claims "uses no entities". **Fix:** list them as Missing.
- **UI-013** P1 · `ApplicationTabs.tsx:156-183` · operations table empty while loading or on error. **Fix:** `QueryState`, empty state.
- **UI-014** P1 · `pages/studio/src/StudioOverviewPage.tsx:56-78` · "Recently updated" is an empty list with no apps. **Fix:** empty state with New application.
- **UI-015** P1 · `PlanEditor.tsx:319-325`, `libs/types/src/plan.ts:84,105` · a page bound to a shared or deleted entity renders a blank Select and blocks saving. **Fix:** include existing entities; explicit "(missing)" option.
- **UI-016** P1 · `libs/views/src/component/FormElements.tsx:76`, `PlanEditor.tsx:96` · a value not among the options (deleted agent, operation, department, record) renders blank with no error. **Fix:** append "value (missing)" and mark invalid.
- **UI-017** P1 · `pages/data/src/subComponents/RecordForm.tsx:35-45` · a reference to a deleted record or entity shows an empty select. **Fix:** "(missing)" option, inline 404 error.
- **UI-018** P1 · `pages/studio/src/subComponents/PreviewPageRenderer.tsx:31,67`, `TillPage.tsx:86` · POS waits on an entity it never uses and hard-codes Product/Stock. **Fix:** render POS first; entity names from page config.
- **UI-019** P1 · `pages/studio/src/apps/ApplicationView.tsx:29-38,78` · tab order captured once; pages added later lose their tabs. **Fix:** derive order from saved order plus new pages each render.
- **UI-020** P1 · `pages/connect/src/ConnectOverview.tsx:55-118` · empty APIs and Integrations tables. **Fix:** `renderEmptyState`.
- **UI-021** P1 · `pages/control/src/ControlOverview.tsx:89-121` · empty Health signals table. **Fix:** `renderEmptyState`.
- **UI-022** P1 · `pages/ai/src/AiOverview.tsx:69-94` · empty Model usage table. **Fix:** empty state with link to models.
- **UI-023** P1 · `pages/flow/src/WorkflowDetailPage.tsx:95-103` · empty "Service identity" card. **Fix:** "No permissions; writing steps will be denied".
- **UI-024** P1 · `pages/ai/src/subComponents/AgentAccess.tsx:51-67` · empty MCP catalogue shows an empty card; tools of removed servers are invisible but saved. **Fix:** empty state, "missing" rows.
- **UI-025** P2 · `pages/control/src/subComponents/HealthChart.tsx:18`, `pages/overview/src/subComponents/ActivityChart.tsx:19`, `LogMetricsChart.tsx:19`, `EntryPointOutcomesChart.tsx:17`, `pages/connect/src/subComponents/ActivityChart.tsx:18` · empty series render blank 14-16rem charts. **Fix:** empty state, as `TokenUsageChart.tsx:17` does.
- **UI-026** P2 · `core-ui/src/Layout/Sidekick.tsx:86,133-144` · app-scoped suggestions blank while tools load and always for non-inventory apps. **Fix:** skeleton, generic prompts.
- **UI-027** P2 · `pages/data/src/subComponents/RecordsTable.tsx:44`, `RecordsPage.tsx:23,27` · zero search hits says "No records yet"; page not clamped after deletes. **Fix:** search-aware message, clamp page.
- **UI-028** P2 · `core-ui/src/Layout/CommandPalette.tsx:59-61` · a record hit without entity routes to `/data/records/` (404). **Fix:** skip or route to the list.
- **UI-029** P2 · `pages/overview/src/subComponents/NeedsAttentionCard.tsx:58,70` · query errors read as "All clear". **Fix:** "Some sources could not be loaded".

### 6.2 Studio editor (versus Retool)
- **UI-030** P1 · `PlanEditor.tsx:181` · enum "Choices" input strips typed commas; a second choice cannot be typed. **Fix:** raw local state parsed on blur, or a tag input.
- **UI-031** P1 · `PlanEditor.tsx:24-29` · page kinds lack `pos`, so editing an app with a till page shows a blank Kind. **Fix:** add it.
- **UI-032** P1 · `PlanEditor.tsx:384-491` · Studio is a schema form, not a visual builder: no canvas, drag and drop or grid layout. **Fix:** see FT-001.
- **UI-033** P1 · `PlanEditor.tsx:24-29` · four page kinds; no tables with column config, charts, detail views, kanban, buttons, containers, tabs, modals. **Fix:** see FT-002.
- **UI-034** P1 · `PreviewPageRenderer.tsx:17-136` · no data binding or query editor; one entity per page with fixed CRUD. **Fix:** see FT-003, FT-004.
- **UI-035** P1 · `pages/studio/src/EditApplicationPage.tsx:21`, `BuilderPage.tsx:27` · no undo/redo. **Fix:** history reducer, Cmd+Z.
- **UI-036** P1 · `EditApplicationPage.tsx:45`, `BuilderPage.tsx:111`, `WorkflowEditorPage.tsx:113` · leaving or discarding drops unsaved work without confirmation. **Fix:** `useBlocker` + beforeunload.
- **UI-037** P1 · `EditApplicationPage.tsx:12-112` · no live preview while editing. **Fix:** split pane rendering the draft.
- **UI-038** P1 · `PlanEditor.tsx:246,429,469` · rows keyed by index; deleting a row hands its state to the neighbour. **Fix:** stable row ids.
- **UI-039** P2 · `PlanEditor.tsx:244-264,467-476` · no reorder, duplicate, multi-select or bulk edit. **Fix:** sortable rows, selection model.
- **UI-040** P2 · `BuilderPage.tsx:27` · drafts lost on refresh. **Fix:** autosave draft.
- **UI-041** P2 · `EditApplicationPage.tsx:20-25` · concurrent edits overwritten (no version precondition). **Fix:** `expectedVersion`, conflict banner.
- **UI-042** P2 · `EditApplicationPage.tsx:83-86` · AI "Revise plan" replaces the plan without a diff. **Fix:** diff with per-change accept.
- **UI-043** P2 · `PreviewPageRenderer.tsx:71-77` · dashboards are one record-count metric. **Fix:** widgets over saved views.
- **UI-044** P2 · `RecordsTable.tsx:45` · list pages show the first 7 non-text fields; no column config. **Fix:** `page.columns` in the blueprint.
- **UI-045** P2 · `PlanEditor.tsx:350` · no keyboard shortcuts. **Fix:** Cmd+S, add, remove.
- **UI-046** P2 · `BuilderTools.tsx:51-107` · versions are diff-only; no restore. **Fix:** "Restore this version", diff against unsaved plan.
- **UI-047** P2 · `BuilderTools.tsx:109-127`, `core-ui/src/Layout/AppShell.tsx:17` · app theme saved but never applied. **Fix:** CSS variables and logo in AppShell; color picker.
- **UI-048** P2 · `BuilderTools.tsx:53,62` · release diff selects unlabeled, no defaults. **Fix:** labels, latest vs current defaults.
- **UI-049** P2 · `PlanEditor.tsx:259` · new field names collide after deletions. **Fix:** unique name generator.
- **UI-050** P2 · `ApplicationView.tsx:46-64` · tab drag listeners never removed, capture "anon" storage key, mouse-only. **Fix:** react-aria drag/drop or Move menu.
- **UI-051** P3 · `BuilderTools.tsx:46,48,124,125` · Alerts use `color=` instead of `status=`; raw `<a>` reloads the page. **Fix:** `status=`, LinkButton.

### 6.3 Workflow editor
- **UI-052** P2 · `WorkflowEditorPage.tsx:38,179` · no undo; Backspace removes steps irreversibly. **Fix:** history stack.
- **UI-053** P2 · `WorkflowEditorPage.tsx:64` · connecting steps is drag-only. **Fix:** "Next step" selects in the inspector.
- **UI-054** P2 · `WorkflowDetailPage.tsx:54-69` · Simulate and Pause shown without `flow.manage`. **Fix:** gate behind `canDesign`.
- **UI-055** P2 · `WorkflowDetailPage.tsx:57` · Simulate always sends `{}`. **Fix:** JSON input prefilled from the trigger entity.
- **UI-056** P3 · `WorkflowEditorPage.tsx:97` · dropped step kind unchecked. **Fix:** validate against STEP_KINDS.

### 6.4 UX, loading and error states
- **UI-057** P1 · `core-ui/src/Route/RootRouter.tsx:14-43` · no `errorElement`; any render throw shows react-router's default screen. **Fix:** friendly error boundaries with retry.
- **UI-058** P1 · `pages/control/src/SettingsPage.tsx:25,30` · Mistral key must start with `mstrl-`/`sk-`, which real keys need not. **Fix:** only trim and require non-empty, no whitespace.
- **UI-059** P2 · `libs/types/src/routes.ts:65-72` · `buildPath` throws during render on a missing param. **Fix:** guard callers or safe fallback.
- **UI-060** P2 · `pages/ai/src/AgentDetailPage.tsx:27`, `pages/studio/src/ApplicationDetailPage.tsx:46` · selected tab not in the URL. **Fix:** search params.
- **UI-061** P2 · `AgentDetailPage.tsx:53,56` · forms keyed by version lose edits on any live refetch. **Fix:** key by id; "changed elsewhere" banner.
- **UI-062** P2 · `RecordsPage.tsx:30-39`, `RecordForm.tsx:89-98` · export and download errors unhandled; object URL revoked immediately. **Fix:** try/catch with snackbar; delayed revoke.
- **UI-063** P2 · `RecordsPage.tsx:55-131` · eight header actions wrap badly on phones; "Show deleted" has no pressed state. **Fix:** More menu, ToggleButton.
- **UI-064** P2 · `pages/data/src/subComponents/ImportDialog.tsx:44-52` · import has no preview, column mapping or dry run. **Fix:** preview, mapping, validation.
- **UI-065** P2 · `BuilderPage.tsx:41`, `EditApplicationPage.tsx:30`, `WorkflowEditorPage.tsx:107` · permission notices name demo personas. **Fix:** generic "ask an administrator" with a link.
- **UI-066** P2 · `AgentAccess.tsx:7-24,76` · hard-coded inventory/procurement permission list; `*` and custom entity permissions invisible. **Fix:** derive from roles and entities; show unknown grants.
- **UI-067** P2 · `Sidekick.tsx:12-18`, `pages/ai/src/subComponents/AgentPlayground.tsx:9-15` · suggestions hard-coded to the retail demo. **Fix:** derive from tool descriptions.
- **UI-068** P2 · `Sidekick.tsx:92-103` · no stop, no streaming, conversation lost on reload. **Fix:** abortable request, streaming, session persistence.
- **UI-069** P2 · `TillPage.tsx:10` · stores hard-coded. **Fix:** derive from the Stock.store enum.
- **UI-070** P3 · `TillPage.tsx:159` · "No products match." with an empty catalogue. **Fix:** distinguish.
- **UI-071** P3 · `NeedsAttentionCard.tsx:51` · health items link to the Control root. **Fix:** link to the resource.
- **UI-072** P3 · `libs/views/src/component/TablePager.tsx:13` · no page size or page jump. **Fix:** add.
- **UI-073** P3 · `libs/views/src/utils/format.ts:23`, `RecordsTable.tsx:17` · currency hard-coded to LKR by field-name regex. **Fix:** org setting or field metadata.
- **UI-074** P3 · `core-ui/src/Layout/Topbar.tsx:36` · breadcrumbs stop at the workspace. **Fix:** route `handle.crumb`.

### 6.5 Accessibility
- **UI-075** P2 · `core-ui/src/Layout/Layout.tsx:177` · no skip link. **Fix:** first-focus link to `#main`.
- **UI-076** P2 · `NeedsAttentionCard.tsx:76`, `StudioOverviewPage.tsx:59` · `<Separator/>` directly inside `<ul>`. **Fix:** borders on `li + li`.
- **UI-077** P2 · `RecordForm.tsx:101-117` · label not associated; raw file input and button. **Fix:** HeroUI Label, FileTrigger.
- **UI-078** P2 · `DataModelPage.tsx:129-173` · connector handles mouse-only; nodes ignore Space. **Fix:** focusable handles, Space as Enter.
- **UI-079** P2 · all charts · no text alternative. **Fix:** aria summary plus hidden data table.
- **UI-080** P2 · `Sidekick.tsx:123,155` · `aria-live` announces everything; spinner unlabeled. **Fix:** live region for replies only, labeled spinner.
- **UI-081** P2 · `PlanEditor.tsx:164,236` · headers are spans; every row shares the same aria-label. **Fix:** row-specific labels or a real grid.
- **UI-082** P3 · `core-ui/src/Layout/PreferencesDialog.tsx:37,54,73` · raw radio inputs. **Fix:** HeroUI RadioGroup.
- **UI-083** P3 · `TablePager.tsx:23,30` · aria-label overrides visible text (label-in-name). **Fix:** visible "Previous page" or no aria-label.

### 6.6 Performance
- **UI-084** P1 · `core-ui/src/Route/RootRouter.tsx:2-12`, `console/apps/web-ui/vite.config.ts:47` · no route-level code splitting; ReactFlow, recharts, qrcode load up front; warning limits hide it. **Fix:** lazy routes, vendor chunks.
- **UI-085** P1 · `libs/api-client/src/utils/http.ts:1,20` · the whole mock-server ships in production bundles. **Fix:** dynamic import only when `apiBaseUrl` is empty.
- **UI-086** P1 · `libs/api-client/src/hooks/react-query-notifications.ts:104`, `hooks/stream.ts:37` · every mutation and SSE event invalidates all queries. **Fix:** invalidate by key prefix per event type.
- **UI-087** P1 · `RecordForm.tsx:20-45` · reference labels and selects fetch the whole target entity. **Fix:** server-side search ComboBox, by-ids lookup.
- **UI-088** P2 · `ApplicationView.tsx:11` · tab counts fetch full lists. **Fix:** `limit: 1` or a count endpoint.
- **UI-089** P2 · `TillPage.tsx:86-99` · all products and stock unpaginated; linear lookup per product. **Fix:** memoized Map, paged search.
- **UI-090** P2 · `DataModelPage.tsx:54-90` · every pointer move rebuilds the SVG; keyboard moves write localStorage per key. **Fix:** rAF throttle, debounce.
- **UI-091** P2 · `pages/data/src/subComponents/RecordsManager.tsx:124` · search stringifies every record per render. **Fix:** memoized index.
- **UI-092** P2 · `EditApplicationPage.tsx:24`, `WorkflowEditorPage.tsx:45` · validation and deep stringify on every keystroke. **Fix:** `useMemo`.
- **UI-093** P2 · `http.ts:27,30` · demo mode double JSON clone plus 120 ms latency. **Fix:** `structuredClone`, lower latency.
- **UI-094** P3 · `pages/data/src/EntitiesPage.tsx:17`, `DataOverviewPage.tsx:21` · O(n·m) app lookups. **Fix:** Map.
- **UI-095** P3 · `console/apps/web-ui/index.html:10` · Google Fonts from a third party for one wordmark. **Fix:** self-host via @fontsource.

### 6.7 console/AGENTS.md rule violations
- **UI-096** P1 · `libs/auth/src/AuthProvider.tsx:158,173` · raw `fetch` to login and session bypasses api-client. **Fix:** move into `apis/platform.ts`.
- **UI-097** P2 · `RecordsPage.tsx:29`, `RecordForm.tsx:18,81,91` · components call transport functions directly. **Fix:** hooks for export, reference labels, upload, download.
- **UI-098** P2 · `WorkflowEditorPage.tsx:133`, `TillPage.tsx:167`, `ImportDialog.tsx:44`, `RecordForm.tsx:103,115`, `BuilderTools.tsx:46`, `QrCodeDialog.tsx:41` · raw `<button>/<input>/<a>`. **Fix:** HeroUI equivalents.
- **UI-099** P3 · `core-ui/src/Layout/Sidebar.tsx:121`, `Topbar.tsx:36`, `Providers/Protected.tsx:7`, `OidcCallbackPage.tsx:21`, `CommandPalette.tsx:60` · hand-written paths. **Fix:** `routes.login`, `routes.loginCallback`, helpers.
- **UI-100** P3 · `libs/views/src/component/Metric.tsx:42` · raw `<a>` and router Link. **Fix:** HeroUI Link.

### 6.8 Mock-server drift versus openapi.yaml
- **UI-101** P1 · `libs/mock-server/src/router.ts:254` · `POST /departments` missing; "New department" 404s in demo. **Fix:** add route and test.
- **UI-102** P1 · `router.ts:826-840` · `PUT /secrets/write` missing; Settings "Save API key" fails in demo. **Fix:** add with `connect.manage` check.
- **UI-103** P1 · `libs/api-client/src/apis/data.ts:188`, `router.ts:697` · run-view calls `/views/{id}/run`, but the spec path is `/views/{id}`; fails against wsn-service. **Fix:** align client and mock to the spec.
- **UI-104** P2 · `router.ts:1277` · every POST returns 201; the spec says 200 for actions. **Fix:** declared status per route.
- **UI-105** P2 · `router.ts:1264` · 405 returned with `NOT_FOUND`. **Fix:** METHOD_NOT_ALLOWED.
- **UI-106** P2 · `router.ts:1273` · `decodeURIComponent` throws on bad `%`. **Fix:** inside try, return 400.
- **UI-107** P2 · `libs/api-client/src/apis/stream.ts:18` · no demo event stream, so live updates never happen in demo. **Fix:** in-page emitter.
- **UI-108** P2 · `router.ts` (46 casts) · request bodies cast, never validated. **Fix:** schemas generated from openapi.yaml.
- **UI-109** P2 · `libs/mock-server/src/platform.test.ts` · no test that every spec operation has a mock route. **Fix:** coverage test from openapi paths.

### 6.9 Type safety
- **UI-110** P1 · `http.ts:52` · `JSON.parse` on HTML error bodies shows "Unexpected token <". **Fix:** try/catch, status-based error.
- **UI-111** P1 · `http.ts:76-94` · `requestRaw` never throws on errors; error JSON saved as the file. **Fix:** throw on >= 400.
- **UI-112** P1 · `http.ts:100` · `btoa(String.fromCharCode(...bytes))` throws for files over ~100 KB in demo. **Fix:** chunked base64.
- **UI-113** P2 · `http.ts:32,60` · no runtime validation; Go nil slices crash `.items.map`. **Fix:** decoders, at least `items ?? []`.
- **UI-114** P2 · `libs/api-client/src/hooks/data.ts:191`, `TillPage.tsx:141` · untyped operation results cast by callers. **Fix:** generic hook.
- **UI-115** P3 · `BuilderTools.tsx:19,21` · `as Error` ignores ApiError status. **Fix:** `errorMessage(error)`.
- **UI-116** P3 · `AgentAccess.tsx:32,103` · string state cast to Permission[]. **Fix:** type the state.
- **UI-117** P3 · `AuthProvider.tsx:91,128`, `ApplicationView.tsx:31`, `RecordForm.tsx:67` · unchecked `JSON.parse as X`. **Fix:** type guards.

### 6.10 Security and session
- **UI-118** P0 · `console/apps/web-ui/vite.config.ts:31-35` · the PWA caches every authenticated `/api/` GET without varying by user; the next user on a device sees the previous user's data. **Fix:** no API runtime caching, or per-token cache cleared on logout.
- **UI-119** P1 · `AuthProvider.tsx:146-195` · the query cache survives logout and persona switches. **Fix:** `queryClient.clear()` on sign-in and logout.
- **UI-120** P1 · `vite.config.ts:13` · `config.js` precached, so runtime config changes are ignored. **Fix:** exclude from precache; no-cache in nginx.
- **UI-121** P1 · `http.ts:53-58` · 401 not handled globally. **Fix:** clear session, redirect to login with `from`.
- **UI-122** P2 · `AuthProvider.tsx:172,198` · bearer token in localStorage (XSS-readable). **Fix:** BFF cookie session (ZT-003).
- **UI-123** P2 · `AuthProvider.tsx:186-190` · OIDC logout omits `id_token_hint` and `post_logout_redirect_uri`. **Fix:** pass both.
- **UI-124** P2 · `AuthProvider.tsx:73,148` · discovery fetch failures unhandled. **Fix:** surface on the login page.
- **UI-125** P2 · `console/nginx.conf:1` · no CSP or cache rules. **Fix:** headers; no-cache index/config, immutable assets.
- **UI-126** P3 · `apis/stream.ts:38-44` · SSE parser ignores CRLF; one bad frame drops the connection. **Fix:** normalize, per-frame try/catch.

### 6.11 Tests
- **UI-127** P1 · console · no component tests at all. **Fix:** vitest + testing-library, starting with QueryState, RecordsPage, PlanEditor, WorkflowEditor.
- **UI-128** P1 · `libs/types/src/plan.ts:56-146` · plan validation untested. **Fix:** table-driven tests.
- **UI-129** P2 · `pages/flow/src/subComponents/graphModel.ts` · graph operations untested. **Fix:** branch and cycle tests.
- **UI-130** P2 · `http.ts`, `apis/stream.ts` · transport error mapping and SSE parsing untested. **Fix:** mocked-fetch tests.
- **UI-131** P2 · `libs/views/src/utils/usePagedSearch.ts` · untested. **Fix:** renderHook tests.
- **UI-132** P2 · console · no end-to-end tests of golden flows. **Fix:** Playwright against the demo mock.
- **UI-133** P3 · console · no coverage provider. **Fix:** `@vitest/coverage-v8`, report into `docs/COVERAGE.md`.

### 6.12 i18n, responsive, theming
- **UI-134** P2 · `libs/i18n/src/index.tsx` · only shell strings are translated. **Fix:** `t()` across pages; ICU library.
- **UI-135** P2 · `libs/views/src/utils/format.ts:3-43` and four duplicated `dayLabel` helpers · formatting ignores the chosen locale. **Fix:** shared locale-aware formatter hook.
- **UI-136** P3 · `format.ts:6-17` · relative time English-only, never updates. **Fix:** `Intl.RelativeTimeFormat`, minute tick.
- **UI-137** P3 · `NeedsAttentionCard.tsx:63` · hand-made plurals. **Fix:** `Intl.PluralRules`.
- **UI-138** P2 · `Layout.tsx:162,169` · Sidekick panel covers content between 1024 and 1279 px. **Fix:** `lg:pr-[340px]` or drawer.
- **UI-139** P2 · `WorkflowEditorPage.tsx:129-160`, `ApplicationView.tsx:46` · HTML5 drag and drop fails on touch. **Fix:** pointer-based dnd or tap-to-add.
- **UI-140** P3 · `Sidekick.tsx:41`, `console/apps/web-ui/src/index.css:1` · `prose` without the typography plugin; `dark:` follows the OS, not the app toggle. **Fix:** `@plugin "@tailwindcss/typography"`, class-based dark variant.
- **UI-141** P3 · `DataModelPage.tsx:106` · graph labels shrink unreadably with many entities. **Fix:** pan/zoom viewport with minimum scale.

## 7. New features to lead the category (beat Retool on flexibility and retention)

The bar, from the competitor research in section 9: prompt-to-app plus a real visual editor, durable workflows, first-class agents with evals, object-level permissions, audit, Git source control, environments, self-host parity, enterprise identity and an open core [R1-R7, A1, T1, B1-B3, S1-S3]. WorkspaceNow already has a governed data layer, Temporal workflows, an MCP-native agent runtime with signed run grants and its own telemetry service, so the plan below builds on those instead of copying a widget builder.

### 7.1 App builder and editor
- **FT-001** · Visual page canvas: drag and drop components on a responsive grid, layout stored per component in the blueprint (dnd-kit). Replaces the schema-only PlanEditor (UI-032).
- **FT-002** · Component library: table (columns, formats, inline edit, bulk actions), detail, form, chart, metric, kanban, calendar, timeline, map, file viewer, tabs, container, modal, drawer, stepper, text/markdown, button, button group, filter bar, JSON viewer, iframe/embed.
- **FT-003** · Data binding: `{{ }}` expressions over queries, component state, URL params, current user; dependency graph with live evaluation and errors inline.
- **FT-004** · Query editor: saved views, business operations, entity queries, REST/GraphQL integrations and SQL (read-only, permission-scoped) as named queries with transformers, caching and run triggers.
- **FT-005** · Event handlers: on click, on change, on submit run query, run operation, start workflow, open modal, navigate, notify, set state; chained with conditions.
- **FT-006** · Code escape hatch: sandboxed JS transformers and custom components (iframe sandbox, typed props), with a component SDK.
- **FT-007** · Undo/redo, multi-select, copy/paste across pages, align and distribute, keyboard shortcuts, command palette inside the editor.
- **FT-008** · Live preview beside the editor with persona switch ("view as role X") to check permissions before release.
- **FT-009** · Real-time multiplayer editing with presence and soft locks per component (CRDT, e.g. Yjs over the existing SSE/NATS path).
- **FT-010** · Comments and review threads on components, pages and workflow steps; resolve on release.
- **FT-011** · AI in the editor: "add a filter by status", "make this a kanban", explain a binding, fix a broken query, generate test data; always as a reviewable diff (UI-042).
- **FT-012** · App templates and a template gallery (inventory, procurement, CRM, helpdesk, HR onboarding, asset tracking, approvals inbox), importable with sample data.
- **FT-013** · Theming per app: colors, logo, density, typography tokens, dark mode; app themes actually applied (UI-047).
- **FT-014** · Responsive and mobile layouts per page, plus an installable mobile shell with offline drafts and barcode/QR scan (the scan page kind exists).
- **FT-015** · Embeddable apps and components (signed embed tokens, row-scoped) for portals and other internal tools.
- **FT-016** · Accessibility checker in the editor (contrast, labels, focus order) before publishing.

### 7.2 Data platform
- **FT-017** · Server-side search, filter, sort and pagination with indexes (BE-097), full-text search per entity.
- **FT-018** · Computed and rollup fields, formulas, field-level validation rules and defaults.
- **FT-019** · Field-level permissions and masking (PII), per role.
- **FT-020** · Relationship UX: related lists on detail pages, inline create of related records, cascade rules.
- **FT-021** · Bulk edit, bulk import with column mapping and dry run (UI-064), scheduled exports.
- **FT-022** · Record history diff view, restore field-by-field, record-level comments and attachments.
- **FT-023** · External data sources as first-class entities: Postgres, MySQL, MSSQL, Snowflake, BigQuery, REST, GraphQL, Google Sheets, Salesforce, HubSpot, with schema introspection and write-back where allowed.
- **FT-024** · Change data capture from external databases into events, so workflows trigger on outside changes.
- **FT-025** · Data quality rules and a "needs attention" queue (duplicates, missing required, stale records).
- **FT-026** · Semantic layer: named metrics and dimensions reused by dashboards, agents and APIs.

### 7.3 Workflows and automation
- **FT-027** · Triggers: schedule, record event, webhook, form submit, email inbound, approval decided, agent finished, external CDC.
- **FT-028** · Steps: branch, loop over list, parallel, wait for event or time, call API, run SQL, run operation, run agent, human task, sub-workflow, code step.
- **FT-029** · Generic approvals: any entity, multi-level, quorum, delegation, out-of-office, SLA timers, escalation and reassignment (BE-134).
- **FT-030** · Notification channels: email, Slack, Teams, SMS, in-app, webhook, with templates (BE-133).
- **FT-031** · Run history with step inputs/outputs, replay from a step, compare runs, and alert on failure.
- **FT-032** · Workflow versioning with safe migration of in-flight runs (Temporal versioning) and test mode with mocked steps.
- **FT-033** · Human task inbox: unified "my work" across approvals, assigned records and agent hand-offs.

### 7.4 AI and agents
- **FT-034** · Agent builder: instructions, tools (operations, workflows, other agents, external MCP), knowledge sources, guardrails, budgets.
- **FT-035** · Evals: golden datasets, tool-choice accuracy, answer grading, regression gates before an agent version is promoted (AI-060).
- **FT-036** · Plan-then-execute with human approval for any write tool; show the plan as a diff of records it will change.
- **FT-037** · Retrieval over business data and documents, permission-scoped per caller (AI-063).
- **FT-038** · Multi-provider models (Mistral, OpenAI, Anthropic, Azure OpenAI, Bedrock, Ollama) with per-agent routing, fallback and cost caps (AI-061).
- **FT-039** · Conversation memory and threads for Sidekick, with per-user retention controls (AI-062).
- **FT-040** · Streaming answers and live step timeline in the console (AI-064, UI-068).
- **FT-041** · Agent-to-agent delegation and A2A protocol support.
- **FT-042** · AI cost and usage dashboard per agent, app, department and user, with budgets and alerts.
- **FT-043** · Scheduled agents ("every morning, summarise low stock and draft purchase requests").
- **FT-044** · Natural-language analytics ("ask your data") producing saved views and charts, not free-form SQL.
- **FT-045** · Outbound MCP: every published app and operation available as MCP tools for external assistants, with OAuth protected-resource metadata (AI-012).

### 7.5 Lifecycle, governance and retention
- **FT-046** · Git source control: apps, workflows, agents, entities and themes serialized to files; branches, pull requests, review, merge to promote (GitHub, GitLab, Bitbucket, Azure Repos) [R6].
- **FT-047** · Environments inside one installation: draft, test, production per app with per-environment integration credentials and promotion (FT-046 or one-click) [R5, T1].
- **FT-048** · Releases with rollback, release notes, scheduled releases and approval gates (BE-135).
- **FT-049** · Audit explorer: who did what, through which entry point, on behalf of whom; export and streaming to a SIEM; tamper-evident chain (BE-094).
- **FT-050** · Usage analytics per app and page (active users, time to complete tasks, error rates) to show adoption and find dead apps.
- **FT-051** · Admin console: users, groups, roles, sessions, API keys, SCIM status, IdP connectors, license and quotas.
- **FT-052** · Department workspaces and delegated administration (department admins manage their own apps and roles).
- **FT-053** · Data retention and legal hold policies per entity; GDPR export and erase per person.
- **FT-054** · Feature flags per app and environment.
- **FT-055** · Public status page and per-app SLOs (exists in part; finish CRUD, BE-136).

### 7.6 Day-to-day operations features (retention drivers)
- **FT-056** · Personal home: pinned apps, my tasks, recent records, saved views, notifications digest.
- **FT-057** · Notifications center with per-user preferences and daily/weekly digests.
- **FT-058** · Saved views shared to teams, subscriptions ("email me this view every Monday").
- **FT-059** · Global search across apps, records, workflows, agents and docs, permission-filtered (BE-011).
- **FT-060** · Keyboard-first operation: command palette actions, record quick-create, shortcuts everywhere.
- **FT-061** · Forms for people outside the org (signed links, rate-limited, captcha-free via signed tokens), feeding workflows.
- **FT-062** · Documents and PDF generation from templates (quotes, purchase orders, receipts) with e-signature hooks.
- **FT-063** · Calendar and scheduling views over date fields (shifts, bookings, maintenance).
- **FT-064** · Kanban and pipeline boards over enum fields with WIP limits.
- **FT-065** · Offline-tolerant mobile tasks (stock counts, inspections) with conflict resolution.
- **FT-066** · Onboarding tours and in-product help per app, written by builders.

### 7.7 Platform and extensibility
- **FT-067** · Plugin system: custom components, connectors, step types and tools packaged and versioned, with a signed registry.
- **FT-068** · Public REST and GraphQL with generated SDKs (TypeScript, Python, Go) and webhooks with replay (BE-061).
- **FT-069** · CLI (`wsn`) for login, export/import, deploy, run workflows and agents from CI.
- **FT-070** · Terraform provider for entities, roles, apps and integrations as code.
- **FT-071** · Multi-tenant mode (organizations, isolated data, per-tenant keys) for hosting several companies.
- **FT-072** · Air-gapped install bundle and a hybrid data plane (control plane separate from the customer data plane) [S1].
- **FT-073** · Bring-your-own object storage, database and KMS per tenant.
- **FT-074** · Localization of built apps (builder-managed translations), RTL layouts.
- **FT-075** · Open-source core with an enterprise edition, the clear differentiator versus Retool's closed model [B2, T1, A1].

## 8. Zero-trust identity and OIDC design (Dex, following the Rancher model)

### 8.1 What Rancher does, and where Dex fits
- Rancher Manager does **not** use Dex. Its auth providers are in-tree (`local`, `activedirectory`, `ldap`, `azure`, `github`, `githubapp`, `googleoauth`, `genericoidc`, `keycloakoidc`, `oidc`, `cognito`, `saml`, `scim`), and `go.mod` has no Dex dependency [Rancher-providers, Rancher-gomod]. Rancher only mirrors the Dex image [Rancher-dex-mirror].
- The Rancher-ecosystem product that embeds Dex is **Epinio**: its Helm chart has a `dex` subchart, users come from Dex's local connector by default, and a `rolesMapping` maps `connectorId` + group to Epinio roles (union of matches, default role otherwise), with users created on first login [Epinio-chart, Epinio-oidc]. Epinio can also use Rancher as an upstream OIDC provider [Epinio-rancher].
- Rancher's model worth copying: a **local break-glass admin** kept even after SSO is on ("emergency backup"), the external principal linked to the local admin that enabled SSO, group-to-role bindings re-evaluated at login, a default role for new users, and SCIM for de-provisioning [Rancher-authn, Rancher-local, Rancher-global, Rancher-scim]. First admin password comes from `bootstrapPassword` or is generated, and must be changed [Rancher-helm]. Rancher removed "restricted admin" in v2.11 in favor of composable roles [Rancher-2.11].
- Rancher's generic OIDC uses `sub` as the immutable principal id and reads groups from a `groups` claim [Rancher-generic-oidc]. Since v2.12 Rancher can itself act as an OIDC provider with PKCE [Rancher-oidc-provider].

### 8.2 Target design for WorkspaceNow
- **ZT-001** · **Dex as the single OIDC issuer.** wsn-service validates only Dex tokens (`OIDC_ISSUER`=Dex, `OIDC_JWKS_URL`=Dex `/keys`, `OIDC_AUDIENCE`=`wsn-console`). Corporate IdPs (Entra ID, Okta, Google, LDAP/AD, SAML, GitHub, GitLab) become Dex connectors [Dex-docs, Dex-connectors]. Note SAML connectors do not support refresh tokens [Dex-connectors].
- **ZT-002** · **The default admin becomes a Dex static password**, bcrypt hash from OpenBao, with `groups: [wsn:platform-admins]` (Dex v2.45+) [Dex-local, Dex-pr4456]. This removes the in-app password check and Valkey session path (BE-023, BE-034) and gives one authentication path. Keep it as break-glass, MFA-protected (ZT-008). Recovery when Dex is down: rotate the static hash in OpenBao and restart Dex (documented runbook); run Dex with 2+ replicas on CNPG Postgres.
- **ZT-003** · **Console sign-in through a backend-for-frontend.** `wsn-console` is a confidential Dex client; wsn-service runs the authorization code flow with S256 PKCE (`oauth2.pkce.enforce: true`, Dex v2.46) and keeps tokens server-side in Valkey; the browser holds only an `HttpOnly; Secure; SameSite=Lax` cookie with CSRF protection [Dex-pr4638, RFC-browser-apps]. Fixes UI-122 and lets the console stop handling tokens.
- **ZT-004** · **Identity to wsn-ai-service.** wsn-service mints short-lived, audience-scoped internal tokens (it already signs run grants) carrying `sub`, groups, run id and permissions; never forward the user's Dex refresh token. Dex alternative: `audience:server:client_id:wsn-ai` with `trustedPeers` [Dex-clients]. Dex token exchange only federates upstream tokens; do not use it for downscoping [Dex-token-exchange]. Fixes AI-010, BE-022.
- **ZT-005** · **Groups to roles.** Request the `groups` scope; keep `(connector_id, group) -> roles[]` in wsn-service (Epinio semantics: union plus default role) and re-evaluate on every login and refresh like Rancher. Key users on `sub` + `connector_id`, never email (fixes BE-026). Upstream OIDC groups need `insecureEnableGroups` and refresh only with the ID token [Dex-oidc].
- **ZT-006** · **Provisioning.** JIT user on first login with a default role; SCIM 2.0 server in wsn-service (`/scim/v2/Users`, `/Groups`, RFC 7644) because Dex has no SCIM; on deactivate call Dex `TerminateSessionsByUser` + `RevokeRefresh` and drop Valkey sessions [Dex-api, RFC-7644]. Adds the disabled state (BE-029).
- **ZT-007** · **Session revocation.** `DEX_SESSIONS_ENABLED=true`, back-channel logout to wsn-service by `sid`, RP-initiated logout for users, admin kill via gRPC; 10-minute ID tokens, refresh `absoluteLifetime`, user status re-checked on refresh [Dex-2.46, Dex-pr4945, OIDC-backchannel, Dex-tokens].
- **ZT-008** · **MFA.** Delegate to the upstream IdP (`acrValues`), and for local or LDAP connectors use Dex TOTP/WebAuthn scoped by connector type so SSO users are not prompted twice [Dex-pr3712]. Verify `acr`/`amr` pass-through in tests before relying on them.
- **ZT-009** · **Admin bootstrap.** Rancher-style: bootstrap password from OpenBao, forced rotation on first login, no special restricted-admin role [Rancher-helm, Rancher-2.11].
- **ZT-010** · **Workload identity.** Replace shared bearers (`AI_SERVICE_TOKEN`, `OBSERVER_TOKEN`) with SPIFFE identities (SPIRE) or mesh mTLS identities; authorize service calls by SPIFFE ID [SPIFFE]. Fixes DP-016, DP-026.
- **ZT-011** · **mTLS everywhere.** East-west STRICT mTLS through Istio ambient or Linkerd; Gateway API `BackendTLSPolicy` for gateway-to-backend TLS (GA since Gateway API v1.4; kgateway still marks it experimental) [Gateway-BTLS, K8s-GW-1.4, kgateway-btls, Istio-security].
- **ZT-012** · **Fine-grained authorization.** Keep coarse roles from Dex groups; add relationship-based sharing (OpenFGA, Zanzibar model) for "user X can edit app Y in department Z", and optional Cedar or OPA for conditions (environment, time, data classification) [OpenFGA, Cedar, OPA].
- **ZT-013** · **Policy enforcement points.** kgateway (extAuth, rate limits) and the API middleware are PEPs; the decision logic in wsn-service is the PE/PA; wsn-observer is the telemetry loop (NIST SP 800-207 tenets: per-session access, dynamic policy, continuous monitoring) [NIST-207, BeyondCorp].
- **ZT-014** · **Default deny on the network** (DP-021..DP-024), no public routes for internal services (DP-018..DP-020), Pod Security `restricted` (DP-034).
- **ZT-015** · **Session controls per OWASP ASVS 5.0** V7 (timeouts, termination on logout and de-provisioning, re-auth for sensitive actions such as changing secrets or roles), V9/V10 (token audience, PKCE, refresh rotation) [ASVS-5].
- **ZT-016** · **Secrets.** OpenBao in Raft HA with auto-unseal and audit (DP-004..DP-014); OIDC auth into OpenBao for humans, Kubernetes auth with one role per workload.
- **ZT-017** · **Step-up for privileged actions**: secret writes, role changes, API key creation and agent permission edits require recent authentication (`auth_time`) or MFA.
- **ZT-018** · **Signed and verified supply chain** (DP-042..DP-048): only signed images by digest run in the cluster (Kyverno verifyImages).

### 8.3 Minimal Dex values (from the documented fields)
```yaml
replicaCount: 2
envVars:
  - { name: DEX_SESSIONS_ENABLED, value: "true" }
  - name: DEX_PG_PASSWORD
    valueFrom: { secretKeyRef: { name: dex-pg-app, key: password } }
config:
  issuer: https://auth.${domain}
  storage:
    type: postgres
    config: { host: dex-pg-rw, port: 5432, database: dex, user: dex, password: $DEX_PG_PASSWORD, ssl: { mode: verify-full, caFile: /etc/pg-ca/ca.crt } }
  web: { http: 0.0.0.0:5556 }
  oauth2:
    skipApprovalScreen: true
    pkce: { enforce: true, codeChallengeMethodsSupported: ["S256"] }
  expiry: { idTokens: 10m, refreshTokens: { validIfNotUsedFor: 24h, absoluteLifetime: 720h } }
  enablePasswordDB: true
  staticPasswords:
    - { email: admin@workspacenow.local, hash: "<bcrypt from OpenBao>", username: admin, userID: system-admin, groups: [wsn:platform-admins] }
  connectors:
    - type: oidc
      id: corp
      name: Company SSO
      config: { issuer: https://login.example.com, clientID: $CORP_CLIENT_ID, clientSecret: $CORP_CLIENT_SECRET, redirectURI: https://auth.${domain}/callback, insecureEnableGroups: true, getUserInfo: true }
  staticClients:
    - { id: wsn-console, name: WorkspaceNow Console, secretEnv: WSN_CONSOLE_SECRET, redirectURIs: ["https://api.${domain}/api/v1/auth/callback"] }
    - { id: wsn-ai, name: WorkspaceNow AI, secretEnv: WSN_AI_SECRET, trustedPeers: [wsn-console] }
```
Deploy it as a new layer item in `deploy/flux/layers/02-services` (HelmRelease from `https://charts.dexidp.io`, CNPG database in layer 01, HTTPRoute `auth.${domain}` in layer 03) [Dex-helm, Dex-storage].

## 9. References

Claims in section 8 come from these primary sources. Items marked [nf] were not re-fetched during this audit and should be read before acting on them.

**Rancher and Epinio**
- [Rancher-providers] https://github.com/rancher/rancher/tree/main/pkg/auth/providers
- [Rancher-scim] https://github.com/rancher/rancher/tree/main/pkg/auth/providers/scim
- [Rancher-gomod] https://github.com/rancher/rancher/blob/main/go.mod
- [Rancher-2.11] https://github.com/rancher/rancher/releases/tag/v2.11.0
- [Rancher-dex-mirror] https://hub.docker.com/r/rancher/mirrored-dexidp-dex
- [Rancher-authn] https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- [Rancher-local] https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/create-local-users
- [Rancher-global] https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- [Rancher-helm] https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- [Rancher-oidc-provider] https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/configure-oidc-provider
- [Rancher-generic-oidc] https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/configure-generic-oidc.html
- [Rancher-custom-role] https://suse.com/c/rancher_blog/building-a-custom-read-only-global-role-with-the-rancher-kubernetes-api
- [Epinio-oidc] https://docs.epinio.io/1.13.9/references/authentication_oidc
- [Epinio-rancher] https://docs.epinio.io/howtos/operations/configuring_rancher_sso
- [Epinio-chart] https://github.com/epinio/helm-charts/blob/main/chart/epinio/Chart.yaml

**Dex**
- [Dex-docs] https://dexidp.io/docs/
- [Dex-connectors] https://dexidp.io/docs/connectors/
- [Dex-oidc] https://dexidp.io/docs/connectors/oidc/
- [Dex-local] https://dexidp.io/docs/connectors/local/
- [Dex-storage] https://dexidp.io/docs/configuration/storage/
- [Dex-tokens] https://dexidp.io/docs/configuration/tokens/
- [Dex-oauth2] https://dexidp.io/docs/configuration/oauth2/
- [Dex-clients] https://dexidp.io/docs/configuration/custom-scopes-claims-clients/
- [Dex-token-exchange] https://dexidp.io/docs/guides/token-exchange/
- [Dex-k8s] https://dexidp.io/docs/guides/kubernetes/
- [Dex-releases] https://github.com/dexidp/dex/releases
- [Dex-2.46] https://github.com/dexidp/dex/releases/tag/v2.46.0
- [Dex-pr4638] https://github.com/dexidp/dex/pull/4638 (PKCE enforcement)
- [Dex-pr3712] https://github.com/dexidp/dex/pull/3712 (TOTP MFA)
- [Dex-pr4945] https://github.com/dexidp/dex/pull/4945 (back-channel logout, refresh revocation)
- [Dex-pr4456] https://github.com/dexidp/dex/pull/4456 (static password groups)
- [Dex-api] https://github.com/dexidp/dex/blob/master/api/v2/api.proto
- [Dex-helm] https://github.com/dexidp/helm-charts/blob/master/charts/dex/values.yaml

**Standards and zero-trust**
- [RFC-browser-apps] OAuth 2.0 for Browser-Based Applications (BFF pattern), https://www.rfc-editor.org/info/rfc10017
- [RFC-9700] OAuth 2.0 Security Best Current Practice, https://www.rfc-editor.org/rfc/rfc9700 [nf]
- [RFC-8693] Token Exchange, https://www.rfc-editor.org/rfc/rfc8693 [nf]
- [RFC-7636] PKCE, https://www.rfc-editor.org/rfc/rfc7636 [nf]
- [RFC-7644] SCIM 2.0 protocol, https://www.rfc-editor.org/rfc/rfc7644 [nf]
- [RFC-9728] OAuth 2.0 Protected Resource Metadata, https://www.rfc-editor.org/rfc/rfc9728 [nf]
- [OIDC-backchannel] https://openid.net/specs/openid-connect-backchannel-1_0.html [nf]
- [NIST-207] NIST SP 800-207 Zero Trust Architecture, https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf [nf]
- [BeyondCorp] https://research.google/pubs/beyondcorp-a-new-approach-to-enterprise-security/ [nf]
- [SPIFFE] https://spiffe.io/docs/latest/spiffe-about/overview/ and https://spiffe.io/docs/latest/spire-about/spire-concepts/
- [Gateway-BTLS] https://gateway-api.sigs.k8s.io/api-types/backendtlspolicy
- [K8s-GW-1.4] https://www.kubernetes.io/blog/2025/11/06/gateway-api-v1-4/
- [kgateway-btls] https://kgateway.dev/docs/main/security/backend-tls
- [Istio-security] https://istio.io/latest/docs/concepts/security/ [nf]
- [OPA] https://www.openpolicyagent.org/docs [nf]
- [Cedar] https://docs.cedarpolicy.com/ [nf]
- [OpenFGA] https://openfga.dev/docs/fga [nf]
- [ASVS-5] OWASP ASVS 5.0, https://github.com/OWASP/ASVS/tree/master/5.0/en

**Competing platforms** (verify plan gating on vendor pricing pages before quoting)
- [R1] https://docs.retool.com/ · [R2] https://docs.retool.com/workflows · [R3] https://docs.retool.com/agents/concepts · [R4] https://docs.retool.com/permissions/quickstart · [R5] https://docs.retool.com/org-users/concepts/governance · [R6] https://docs.retool.com/source-control · [R7] https://docs.retool.com/self-hosted
- [A1] https://docs.appsmith.com/
- [T1] https://docs.tooljet.com/docs/getting-started/platform-overview/
- [B1] https://docs.budibase.com/docs/what-is-budibase · [B2] https://budibase.com/security/ · [B3] https://budibase.com/product/enterprise/
- [S1] https://docs.superblocks.com/enterprise/deployment-overview · [S2] https://docs-legacy.superblocks.com/development-lifecycle/source-control/overview · [S3] https://docs.superblocks.com/admin/audit-logs
- Airplane.dev shut down on 2024-03-01 after the team joined Airtable: https://www.airtable.com/newsroom/company/airplane-balsa-join-airtable

| | Retool | Appsmith | ToolJet | Budibase | Superblocks |
|---|---|---|---|---|---|
| App builder | AI apps from a prompt plus drag-and-drop IDE, mobile [R1] | Widgets, JS objects, queries [A1] | 82+ components, JS/Python, AI generation [T1] | Apps, forms, approvals [B1] | Hybrid builder [S1] |
| Workflows | Query-block chains, schedule and webhook triggers [R2] | Workflows [A1] | Visual workflows, branches, loops [T1] | Automations, AI workflows [B1][B2] | Workflows, scheduled jobs [S2] |
| Agents | Tools, workflows, other agents, A2A, evals [R3] | Separate agents product | Agent builder node [T1] | Agents with apps and automations [B2] | Clark AI [S1] |
| Permissions | Admin RBAC plus permission groups on apps, resources, workflows, agents [R4][R5] | Granular access, SCIM [A1] | Roles plus custom groups [T1] | SSO, tiered RBAC [B3] | Control-plane RBAC [S1] |
| Source control | GitHub, GitLab, CodeCommit, Bitbucket, Azure Repos [R6] | Git branches [A1] | GitSync plus CI/CD [T1] | n/a | GitHub, GitLab, CLI [S2] |
| Environments | Per-environment credentials [R5] | n/a | Dev, staging, prod [T1] | n/a | Data-plane tags [S1] |
| Self-host | Helm or Docker [R7] | Docker/Kubernetes [A1] | Self-host tiers [T1] | Open source [B2] | Customer-VPC data plane [S1] |

## 10. Version cuts

Each version is a shippable cut. Order inside a version does not matter. An item listed by range includes every ID in that range.

### v1.2: Trust the core (security holes, broken paths, blank screens)
Goal: nothing exploitable, nothing silently broken, no empty screens.
- Backend: BE-001..BE-006, BE-023..BE-026, BE-035..BE-039, BE-041, BE-047..BE-049, BE-054..BE-063, BE-076..BE-079, BE-084, BE-097..BE-099.
- Agent service: AI-001, AI-002, AI-004, AI-006, AI-007, AI-017, AI-018, AI-020, AI-021, AI-038.
- Observer: OB-001, OB-004..OB-006, OB-013..OB-015.
- Deploy: DP-001..DP-009, DP-012..DP-014, DP-018..DP-023, DP-033, DP-042, DP-043, DP-081, DP-082, DP-086, DP-087, DP-097..DP-099, DP-101.
- Console: UI-004, UI-008..UI-024, UI-030, UI-031, UI-057, UI-058, UI-101..UI-103, UI-110..UI-112, UI-118..UI-121, UI-127, UI-128.

### v1.3: Zero-trust identity and a production platform
Goal: Dex-backed OIDC with the default admin as break-glass, least privilege everywhere, HA, backups, observability, signed supply chain.
- Zero-trust: ZT-001..ZT-018.
- Backend: BE-007..BE-022, BE-027..BE-034, BE-040, BE-042..BE-046, BE-050..BE-053, BE-064..BE-075, BE-080..BE-083, BE-085..BE-096, BE-100..BE-131.
- Agent service: AI-003, AI-005, AI-008..AI-015, AI-019, AI-022..AI-037, AI-039..AI-059.
- Observer: OB-002, OB-003, OB-007..OB-012, OB-016..OB-056.
- Deploy: DP-010, DP-011, DP-015..DP-017, DP-024..DP-032, DP-034..DP-041, DP-044..DP-080, DP-083..DP-085, DP-088..DP-096, DP-100, DP-102..DP-111.
- Features: FT-017, FT-019, FT-049, FT-051.

### v1.4: Best-grade editor and daily operations
Goal: a visual builder that is faster and more flexible than Retool, and the everyday surfaces that keep people coming back.
- Features: FT-001..FT-016, FT-020..FT-022, FT-029..FT-033, FT-046..FT-048, FT-056..FT-066.
- Console: UI-025..UI-029, UI-032..UI-056, UI-059..UI-100, UI-104..UI-109, UI-113..UI-117, UI-122..UI-126, UI-129..UI-141.

### v1.5: Agents as the differentiator
Goal: governed, evaluated, multi-model agents across apps, workflows and MCP.
- Features: FT-034..FT-045.
- Agent service: AI-016, AI-060..AI-064.
- Backend: BE-132..BE-137.

### v2.0: Platform breadth
Goal: external data, extensibility, multi-tenancy and enterprise hosting.
- Features: FT-018, FT-023..FT-028, FT-050, FT-052..FT-055, FT-067..FT-075.
