# Deploy WorkspaceNow to the dev cluster (kgateway + Flux, in-cluster image builds)

Cluster: the one in `kube.conf` (single node `2take1`, containerd, metallb, cert-manager with
`letsencrypt-dns` DNS-01 ClusterIssuer, kgateway controller + `kgateway` GatewayClass,
external-secrets, OpenBao). Everything lands in namespace `workspacenow`.

| Service | Hostname | Backend |
|---|---|---|
| Console | `workspace.twotakeone.com` | console:8080 |
| Platform API | `api.workspace.twotakeone.com` | wsn-service:8080 |
| AI service / MCP | `ai.workspace.twotakeone.com` | wsn-ai-service:8090 |
| Observer | `obs.workspace.twotakeone.com` | wsn-observer:9098 |
| OCI registry | `registry.workspace.twotakeone.com` | registry:5000 (TLS via kgateway) |

Gateway external IP: **169.58.222.25** (metallb pool `workspacenow-pool`).

## 0. DNS

In Cloudflare (twotakeone.com), set the five records above to **DNS-only (gray cloud)** A records
pointing at `169.58.222.25`. (Orange-cloud proxying also works if the origin is set to
169.58.222.25, but gray-cloud is simpler.) The TLS certs are issued by `letsencrypt-dns`
automatically once DNS resolves.

## 1. One-time cluster prep (already done on this cluster)

```sh
export KUBECONFIG=kube.conf
# metallb pool for our gateway (the openchoreo pool owns the node IP)
kubectl -n metallb-system apply -f - <<'EOF'
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata: { name: workspacenow-pool, namespace: metallb-system }
spec: { addresses: ["169.58.222.25/32"] }
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata: { name: workspacenow-l2, namespace: metallb-system }
spec: { ipAddressPools: ["workspacenow-pool"] }
EOF
kubectl -n workspacenow annotate svc workspacenow metallb.universe.tf/address-pool=workspacenow-pool
# flux
flux install
flux bootstrap github --owner=thev1ndu --repository=workspacenow --branch=main \
  --path=deploy/flux/clusters/dev --personal --token-auth <<< "$GITHUB_TOKEN"
```

`clusters/dev` reconciles: `infra-controllers` (cnpg, external-secrets, openbao, nats, valkey
operators) → `infra-configs` (wsn-db Postgres cluster, OpenBao ClusterSecretStore + ExternalSecrets,
RustFS, openbao-config job) → `infra-temporal` (Temporal on wsn-db) → `platform` (namespace,
kgateway Gateway + TLS certs, in-cluster registry, kaniko build Jobs) → `workspacenow` (the apps).
Intervals are 5m on dev for fast feedback. If a layer ever wedges on a stale revision:
`flux suspend kustomization flux-system -n flux-system`, delete the stuck child Kustomization,
`kubectl -n flux-system rollout restart deploy kustomize-controller`, resume the parent.

## 2. Build all images in the cluster (no GitHub Actions needed)

`deploy/flux/platform/builds.yaml` runs one kaniko Job per component, compiling each
component's existing `Dockerfile` from the public repo and pushing to
`registry.workspace.twotakeone.com/<component>:dev`. The build pods pin the registry hostname to
the gateway IP via `hostAliases`, so pushes do not depend on public DNS.

```sh
kubectl -n workspacenow get jobs | grep build          # watch
kubectl -n workspacenow logs -l job-name=build-wsn-service -f
# rebuild one: kubectl -n workspacenow delete job build-wsn-service && kubectl apply -k deploy/flux/platform
```

Buildpacks alternative: install kpack and create a `Build` per component
(`spec.source.git.url=https://github.com/thev1ndu/workspacenow`, `subPath` = component dir,
image `registry.workspace.twotakeone.com/<component>:dev`); paketo `full-cnb` covers Go/Python,
use the console Dockerfile via kaniko.

## 3. Put the values in (the Secret)

Apps read secrets via ExternalSecrets synced from OpenBao KV v2 at `secret/` (the
`ClusterSecretStore openbao` + `ExternalSecret`s in `infrastructure/configs`). The
`openbao-config` job enables Kubernetes auth and creates the roles `external-secrets` and
`wsn-service` and seeds the paths. Fill real values:

```sh
OPENBAO_ROOT_TOKEN=root ./deploy/flux/platform/openbao-seed.sh   # with MISTRAL_API_KEY etc. set
```

| OpenBao path | Keys |
|---|---|
| `workspacenow/mistral` | `apiKey` |
| `workspacenow/ai-service` | `token` |
| `workspacenow/observer` | `token` |
| `workspacenow/run-grant` | `privateKey` (base64 Ed25519 seed) |
| `workspacenow/object-storage` | `accessKey`, `secretKey` |
| `workspacenow/temporal-db` | `password` |

They land in Kubernetes Secrets `wsn-secrets`, `wsn-rustfs-env`, `temporal-db(-login)` in
`workspacenow`/`temporal`. Non-secret settings are ConfigMaps `wsn-service`, `wsn-ai-service`,
`wsn-observer`, `console` (patched per environment in `apps/<env>/kustomization.yaml`).
Demo mode is on in dev (`WSN_DEMO_MODE=true`): Northwind Retail personas, no IdP needed.

## 4. Verify

```sh
flux get kustomizations -n flux-system
kubectl -n workspacenow get pods,svc,gateway,httproute,certificate
kubectl -n workspacenow get gateway workspacenow        # ADDRESS 169.58.222.25
curl -s https://api.workspace.twotakeone.com/api/v1/session | head -c 200
curl -s https://obs.workspace.twotakeone.com/healthz
curl -sI https://workspace.twotakeone.com | head -3
```

Rebuild + roll: delete a build Job (flux re-creates it), then
`kubectl -n workspacenow rollout restart deploy wsn-service wsn-service-worker wsn-ai-service wsn-observer console`.
