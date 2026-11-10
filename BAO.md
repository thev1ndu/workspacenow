# BAO.md — OpenBao secrets for the WorkspaceNow deployment

All deployment secrets live in OpenBao (KV v2, mount `secret/`), never in git. external-secrets
syncs them into Kubernetes Secrets via the `ClusterSecretStore openbao`
(`deploy/flux/layers/01-secrets-data/`).

## Secret map

| Path (under mount `secret/`) | Keys | Synced into |
|---|---|---|
| `workspacenow/mistral` | `apiKey` | Secret `wsn-secrets` → `MISTRAL_API_KEY` (also settable from the console: Settings → Mistral API key, system user only) |
| `workspacenow/ai-service` | `token` | `wsn-secrets` → `AI_SERVICE_TOKEN` |
| `workspacenow/observer` | `token` | `wsn-secrets` → `OBSERVER_TOKEN` |
| `workspacenow/run-grant` | `privateKey` (base64 Ed25519 seed) | `wsn-secrets` → `RUN_GRANT_KEY` |
| `workspacenow/object-storage` | `accessKey`, `secretKey` | `wsn-secrets` (`S3_*`) + `wsn-rustfs-env` (RustFS) |
| `workspacenow/temporal-db` | `password` | `temporal-db`, `temporal-db-login` |
| `workspacenow/local-admin` | `email`, `password` | `wsn-secrets` → `WSN_LOCAL_ADMIN_EMAIL` / `WSN_LOCAL_ADMIN_PASSWORD` |

System user: always `admin@workspacenow.local`; the password is generated randomly on first install
(view command below).

## Get a shell in OpenBao (do this first)

```sh
kubectl -n openbao exec -it statefulset/openbao -- sh
```

All commands below run inside that shell (dev root token: `root`).

## Commands

```sh
# log in
bao login root

# list secret paths
bao kv list -mount=secret workspacenow/

# read a secret (all keys)
bao kv get -mount=secret workspacenow/mistral

# view the system user's password
bao kv get -field=password -mount=secret workspacenow/local-admin

# set / rotate one secret
bao kv put -mount=secret workspacenow/mistral apiKey=sk-...
bao kv put -mount=secret workspacenow/local-admin email=admin@workspacenow.local password='...'
bao kv put -mount=secret workspacenow/ai-service token=...
bao kv put -mount=secret workspacenow/observer token=...
bao kv put -mount=secret workspacenow/run-grant privateKey=...
bao kv put -mount=secret workspacenow/object-storage accessKey=... secretKey=...
bao kv put -mount=secret workspacenow/temporal-db password=...

# version history / rollback (KV v2 keeps every write)
bao kv metadata get -mount=secret workspacenow/mistral
bao kv rollback -mount=secret workspacenow/mistral version=2

# delete
bao kv delete -mount=secret workspacenow/observer
```

## Make Kubernetes pick up changes now

ExternalSecrets refresh hourly; force a re-sync from outside the shell:

```sh
# force ESO to re-sync right now (refreshInterval is 1h otherwise)
kubectl -n workspacenow annotate es wsn-secrets force-sync="$(date +%s)" --overwrite
# pods read env-from-secret only at start, so roll the readers:
kubectl -n workspacenow delete pod -l app.kubernetes.io/name=wsn-service
kubectl -n workspacenow delete pod -l app.kubernetes.io/name=wsn-ai-service

# verify Bao and the Kubernetes secret agree:
kubectl -n openbao exec statefulset/openbao -- sh -c 'bao login root >/dev/null && bao kv get -field=password -mount=secret workspacenow/local-admin'
kubectl -n workspacenow get secret wsn-secrets -o jsonpath='{.data.WSN_LOCAL_ADMIN_PASSWORD}' | base64 -d; echo
```

## Seed everything from your workstation (alternative to the shell)

```sh
OPENBAO_ROOT_TOKEN=root MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... OBSERVER_TOKEN=... \
  RUN_GRANT_PRIVATE_KEY=... OBJECT_STORAGE_ACCESS_KEY=... OBJECT_STORAGE_SECRET_KEY=... \
  TEMPORAL_DB_PASSWORD=... ./deploy/flux/scripts/openbao-seed.sh
```

## Roles (Kubernetes auth, created by the openbao-config Job)

- `external-secrets` — bound to SA `external-secrets/external-secrets`, syncs Secrets.
- `wsn-service` — bound to SA `workspacenow/wsn-service`, reads/lists `secret/data` +
  `secret/metadata` under `workspacenow/*` at runtime.

Policy `workspacenow-read`:

```sh
bao policy read workspacenow-read
```
