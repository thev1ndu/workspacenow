# Deploy WorkspaceNow to the dev cluster (kgateway + Flux, in-cluster image builds)

Cluster: the one in `kube.conf` (single node `2take1`, containerd, metallb, cert-manager with
`letsencrypt-dns` DNS-01 ClusterIssuer, Flux). **Everything is managed by Flux from this repo —
no manual kubectl steps.** The OpenChoreo planes were removed; kgateway is installed by Flux
itself (`infrastructure/controllers/kgateway*.yaml`, namespace `kgateway-system`).

Everything lands in namespace `workspacenow` (plus `temporal`, `openbao`, `external-secrets`,
`cnpg-system`, `kgateway-system`).

| Service | Hostname | Backend |
|---|---|---|
| Console | `workspace.twotakeone.com` | console:8080 |
| Platform API | `api.workspace.twotakeone.com` | wsn-service:8080 |
| AI service / MCP | `ai.workspace.twotakeone.com` | wsn-ai-service:8090 |
| Observer | `obs.workspace.twotakeone.com` | wsn-observer:9098 |
| OCI registry | `registry.workspace.twotakeone.com` | registry:5000 (TLS via kgateway) |

Gateway external IP: **169.58.222.25** (metallb pool `workspacenow-pool`, Flux-managed).

## 0. DNS

In Cloudflare (twotakeone.com), one DNS-only (gray cloud) wildcard record is enough:
`*.workspace.twotakeone.com` A → **169.58.222.25**. (This also covers `workspace.twotakeone.com`.)
TLS certs are issued automatically by the `letsencrypt-dns` ClusterIssuer once DNS resolves.

## 1. Bootstrap (one time only)

```sh
export KUBECONFIG=kube.conf
flux install
flux bootstrap github --owner=thev1ndu --repository=workspacenow --branch=main \
  --path=deploy/flux/clusters/dev --personal --token-auth <<< "$GITHUB_TOKEN"
```

`clusters/dev` reconciles the layers in order (5m intervals, `wait: true`):
`infra-controllers` (namespaces, metallb pool, helm repos, cnpg + external-secrets + openbao +
nats + valkey operators, kgateway CRDs/controller/GatewayClass) → `infra-configs` (wsn-db
CloudNativePG cluster, OpenBao ClusterSecretStore + ExternalSecrets, RustFS, openbao-config job)
→ `infra-temporal` (Temporal on wsn-db) → `platform` (kgateway Gateway + TLS certs, in-cluster
registry, kaniko build Jobs, node /etc/hosts DaemonSet) → `workspacenow` (the apps).

## 2. Images are built in the cluster (GitHub Actions not needed)

`deploy/flux/platform/builds.yaml` runs one kaniko Job per component, building each component's
`Dockerfile` from the public repo and pushing to `registry.workspace.twotakeone.com/<component>:dev`.
Build pods pin the registry hostname to 169.58.222.25 via `hostAliases`; the `registry-host-alias`
DaemonSet writes the same pin into the node's `/etc/hosts` so kubelet pulls work.
App containers use `imagePullPolicy: Always`, so after a rebuild Flux's rollout picks up the new
`:dev` tag automatically.

```sh
kubectl -n workspacenow get jobs | grep build                 # watch
kubectl -n workspacenow logs -l job-name=build-wsn-service -f
# rebuild one: kubectl -n workspacenow delete job build-wsn-service   (flux re-creates it)
```

Buildpacks alternative: install kpack and create a `Build` per component
(`spec.source.git.url=https://github.com/thev1ndu/workspacenow`, `subPath` = component dir,
image `registry.workspace.twotakeone.com/<component>:dev`); paketo `full-cnb` covers Go/Python,
use the console Dockerfile via kaniko.

## 3. Put the values in (OpenBao → Kubernetes Secrets)

Secrets never live in git. They are synced by external-secrets from OpenBao KV v2 at `secret/`
(`ClusterSecretStore openbao` + `ExternalSecret`s in `infrastructure/configs`; the `openbao-config`
job enables Kubernetes auth and creates the `external-secrets` and `wsn-service` roles). Seed them:

```sh
OPENBAO_ROOT_TOKEN=root MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... OBSERVER_TOKEN=... \
  RUN_GRANT_PRIVATE_KEY=... OBJECT_STORAGE_ACCESS_KEY=... OBJECT_STORAGE_SECRET_KEY=... \
  TEMPORAL_DB_PASSWORD=... WSN_LOCAL_ADMIN_EMAIL=... WSN_LOCAL_ADMIN_PASSWORD=... \
  ./deploy/flux/platform/openbao-seed.sh
```

| OpenBao path `secret/workspacenow/...` | Keys | Lands in |
|---|---|---|
| `mistral` | `apiKey` | Secret `wsn-secrets` → `MISTRAL_API_KEY` |
| `ai-service` | `token` | `wsn-secrets` → `AI_SERVICE_TOKEN` |
| `observer` | `token` | `wsn-secrets` → `OBSERVER_TOKEN` |
| `run-grant` | `privateKey` (base64 Ed25519 seed) | `wsn-secrets` → `RUN_GRANT_KEY` |
| `object-storage` | `accessKey`, `secretKey` | `wsn-secrets` (S3_*) + `wsn-rustfs-env` (RustFS) |
| `temporal-db` | `password` | `temporal-db` / `temporal-db-login` |
| `local-admin` | `email`, `password` | `wsn-secrets` → `WSN_LOCAL_ADMIN_EMAIL` / `WSN_LOCAL_ADMIN_PASSWORD` |

Non-secret settings are the ConfigMaps `wsn-service`, `wsn-ai-service`, `wsn-observer`, `console`
(patched per environment in `apps/dev/kustomization.yaml`): hostnames, CORS, `WSN_DEMO_MODE=false`,
console branding (`WorkspaceNow North`).

## 4. Sign in

https://workspace.twotakeone.com/login offers **system-user sign-in (username + password)**
(`authMode: "local"` in `public/config.js`) or **OIDC** once configured (`authMode: "oidc"` +
`oidc` block in `public/config.js`, plus `OIDC_ISSUER` / `OIDC_AUDIENCE` / `OIDC_JWKS_URL` in
ConfigMap `wsn-service` and `WSN_BOOTSTRAP_ADMIN_EMAILS` for IdP-based admins) — like Rancher,
both on the same page. With `WSN_DEMO_MODE=false` and no OIDC, the local system user from
`wsn-secrets` signs in via `POST /api/v1/auth/login`:

```sh
PW=$(kubectl -n openbao exec statefulset/openbao -- sh -c \
  'bao login root >/dev/null && bao kv get -field=password -mount=secret workspacenow/local-admin')
TOKEN=$(curl -s -X POST https://api.workspace.twotakeone.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{"email":"admin@workspacenow.local","password":"$PW"}" | jq -r .token)
curl -s https://api.workspace.twotakeone.com/api/v1/session -H "Authorization: Bearer $TOKEN"
```

First login provisions the user with the **`workspacenow-admin`** role (all permissions, `*`).
The system user stays available when OIDC is configured too (both options on `/login`). To connect
OIDC later, set `OIDC_ISSUER` / `OIDC_AUDIENCE` / `OIDC_JWKS_URL` in ConfigMap `wsn-service`,
`WSN_BOOTSTRAP_ADMIN_EMAILS` for IdP-based admins, and `authMode: "oidc"` in `public/config.js`.
Open `https://workspace.twotakeone.com` in the browser and use the same credentials.

## 5. Health

`GET https://api.workspace.twotakeone.com/healthz` reports every dependency:
postgres, valkey, nats, temporal, object-storage (RustFS), openbao, ai-service, observer.
`GET /readyz` (used by the readiness probe) checks postgres + valkey only.
Each service also exposes its own `/healthz` (`obs.../healthz`, `ai.../healthz`).

## 6. Verify

```sh
flux get kustomizations -n flux-system                     # all Ready at the same revision
kubectl -n workspacenow get pods,svc,gateway,httproute,certificate
curl -s https://api.workspace.twotakeone.com/healthz | jq
curl -sI https://workspace.twotakeone.com | head -3
```
