# BAO.md — Managing WorkspaceNow deployment secrets in OpenBao

All deployment secrets live in **OpenBao** (Vault-compatible, KV v2 at mount `secret/`), never in
git. On the dev cluster OpenBao runs standalone in namespace `openbao` with dev root token `root`
(installed by Flux: `deploy/flux/infrastructure/controllers/controllers.yaml`).

Kubernetes never stores the values directly: external-secrets reads them through the
`ClusterSecretStore openbao` (Kubernetes auth role `external-secrets`) and syncs them into plain
Secrets that the pods mount (`deploy/flux/infrastructure/configs/configs.yaml`):

```
OpenBao secret/workspacenow/<path>  --ExternalSecret-->  Secret in namespace workspacenow/temporal
```

## Secret map

| OpenBao path (`secret/` mount) | Keys | Synced into | Used by |
|---|---|---|---|
| `workspacenow/mistral` | `apiKey` | Secret `wsn-secrets` → `MISTRAL_API_KEY` | wsn-service (LLM calls), wsn-ai-service |
| `workspacenow/ai-service` | `token` | `wsn-secrets` → `AI_SERVICE_TOKEN` | wsn-service → ai-service internal API |
| `workspacenow/observer` | `token` | `wsn-secrets` → `OBSERVER_TOKEN` | wsn-observer ingest + wsn-service exporter |
| `workspacenow/run-grant` | `privateKey` (base64 Ed25519 seed) | `wsn-secrets` → `RUN_GRANT_KEY` | wsn-service signs agent run grants |
| `workspacenow/object-storage` | `accessKey`, `secretKey` | `wsn-secrets` (`S3_*`) and `wsn-rustfs-env` | RustFS (S3) + wsn-service object store |
| `workspacenow/temporal-db` | `password` | `temporal-db`, `temporal-db-login` | Temporal SQL persistence on wsn-db |
| `workspacenow/local-admin` | `email`, `password` | `wsn-secrets` → `WSN_LOCAL_ADMIN_EMAIL` / `WSN_LOCAL_ADMIN_PASSWORD` | System login at `/login` (works with or without OIDC; first login gets role `workspacenow-admin`) |

### System user (local admin)

The system user is always **`admin@workspacenow.local`**. Its password is **generated randomly**
on first install (and by `openbao-seed.sh` when `WSN_LOCAL_ADMIN_PASSWORD` is unset) — view it with:

```sh
kubectl -n openbao exec statefulset/openbao -- sh -c \
  'bao login root >/dev/null && bao kv get -mount=secret workspacenow/local-admin'
# or just the password:
kubectl -n openbao exec statefulset/openbao -- sh -c \
  'bao login root >/dev/null && bao kv get -field=password -mount=secret workspacenow/local-admin'
```

Set a known password instead: `WSN_LOCAL_ADMIN_PASSWORD='...' ./deploy/flux/platform/openbao-seed.sh`,
then `kubectl -n workspacenow delete secret wsn-secrets` to force a re-sync.

Non-secret settings (hostnames, CORS, `WSN_DEMO_MODE`, branding, log level) are **ConfigMaps**
(`wsn-service`, `wsn-ai-service`, `wsn-observer`, `console`) — edit them in
`deploy/flux/apps/dev/kustomization.yaml`, commit, push; Flux applies them.

## Seed / update all values (dev)

```sh
export KUBECONFIG=kube.conf
OPENBAO_ROOT_TOKEN=root \
  MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... OBSERVER_TOKEN=... RUN_GRANT_PRIVATE_KEY=... \
  OBJECT_STORAGE_ACCESS_KEY=... OBJECT_STORAGE_SECRET_KEY=... TEMPORAL_DB_PASSWORD=... \
  WSN_LOCAL_ADMIN_EMAIL=... WSN_LOCAL_ADMIN_PASSWORD=... \
  ./deploy/flux/platform/openbao-seed.sh
```

ExternalSecrets refresh every hour (`refreshInterval: 1h`); to force an immediate sync restart
the ESO controller or delete the target Secret:

```sh
kubectl -n external-secrets rollout restart deploy external-secrets
# or force one secret: kubectl -n workspacenow delete secret wsn-secrets
```

## Day-2 operations with the bao CLI

```sh
# shell into the OpenBao pod (StatefulSet "openbao", namespace openbao)
BAO="kubectl -n openbao exec statefulset/openbao -- bao"

$BAO login -no-color root                 # dev root token
$BAO kv list -mount=secret workspacenow/  # list paths
$BAO kv get -mount=secret workspacenow/mistral
$BAO kv put -mount=secret workspacenow/mistral apiKey=NEW_VALUE   # rotate one value
$BAO kv delete -mount=secret workspacenow/observer               # remove
$BAO kv metadata get -mount=secret workspacenow/run-grant        # versions/history
$BAO kv rollback -mount=secret workspacenow/run-grant version=3  # rollback
```

KV v2 keeps every write as a new version, so rotations are non-destructive; `kv rollback` undoes
them. After changing anything under `workspacenow/*`, the next ExternalSecret refresh (≤1h, or
forced as above) updates the Kubernetes Secrets and the apps pick them up on their next restart
(or immediately for values read per-request, e.g. connect-integration credentials read via the
`wsn-service` Kubernetes auth role).

## Kubernetes auth roles (created by the openbao-config Job)

| Role | Bound service account | Policy | Purpose |
|---|---|---|---|
| `external-secrets` | `external-secrets/external-secrets` | `workspacenow-read` (read/list `secret/data/workspacenow/*`) | ESO syncs Secrets |
| `wsn-service` | `workspacenow/wsn-service` | `workspacenow-read` | wsn-service reads integration credentials at runtime |

## Production notes

- Do not use `devRootToken: root` outside dev; run OpenBao HA (raft) and unseal properly.
- Create a dedicated policy per consumer instead of sharing `workspacenow-read`.
- Rotate `run-grant.privateKey` by writing a new version and restarting `wsn-service` (in-flight
  grants keep verifying until their TTL).
- Never commit real values: the repo only contains `change-me` placeholders seeded by the
  `openbao-config` Job (`deploy/flux/infrastructure/configs/configs.yaml`).
