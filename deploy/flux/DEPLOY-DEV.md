# Deploy WorkspaceNow to the dev cluster (kgateway + Flux, in-cluster image builds)

Target: the dev cluster in `kube.conf` (single node, containerd, metallb, cert-manager
with a ready `letsencrypt-dns` ClusterIssuer, kgateway controller + `kgateway` GatewayClass,
external-secrets, OpenBao). Namespace: `workspacenow`. Domains:

| Service | Hostname |
|---|---|
| Console | `workspace.twotakeone.com` |
| Platform API | `api.workspace.twotakeone.com` |
| AI service / MCP | `ai.workspace.twotakeone.com` |
| Observer | `obs.workspace.twotakeone.com` |
| In-cluster registry | `registry.workspace.twotakeone.com` |

## 0. DNS (do this first)

Point A records for all five hostnames above at the gateway's external address. After the
Gateway is created: `kubectl -n workspacenow get gateway workspacenow` → `ADDRESS` column
(metallb). With DNS-01 (letsencrypt-dns) the certificates are issued automatically once DNS
resolves.

## 1. Install Flux and bootstrap

```sh
export KUBECONFIG=kube.conf
flux install --namespace flux-system          # flux CLI v2.10+
flux bootstrap github \
  --owner=thev1ndu --repository=workspacenow --branch=main \
  --path=deploy/flux/clusters/dev --personal --token-auth <<< "$GITHUB_TOKEN"
flux get kustomizations -n flux-system         # infra-controllers, infra-configs, platform, workspacenow
```

`clusters/dev` reconciles four layers in order: `infrastructure/controllers` (operators:
CloudNativePG, external-secrets, OpenBao, NATS, Valkey, Temporal), `infrastructure/configs`
(the `wsn-db` Postgres cluster, OpenBao `ClusterSecretStore`, `ExternalSecret`s, RustFS),
`platform` (namespace, kgateway Gateway + TLS certificates, in-cluster registry, image-build
Jobs), then `apps/dev` (the four apps in namespace `workspacenow`).

## 2. Buildpacks (kpack) in the cluster

```sh
kubectl apply -f https://github.com/paketo-buildpacks/kpack/releases/download/v0.16.0/release.yaml
# wait for kpack controller
kubectl -n kpack wait --for=condition=available deploy/kpack-controller --timeout=300s
```

The default path for the deployed images is kaniko Jobs (`deploy/flux/platform/builds.yaml`)
using each component's existing `Dockerfile`, pushing to `registry.workspace.twotakeone.com/<component>:dev`.
With kpack instead, create a ClusterStore/ClusterStack/ClusterBuilder (paketo full-cnb) and a
`Build` per component with `spec.source.git.url = https://github.com/thev1ndu/workspacenow`,
`subPath` = component dir, image `registry.workspace.twotakeone.com/<component>:dev`.

Rebuild any image: delete its Job (`kubectl -n workspacenow delete job build-wsn-service`) —
Flux re-creates it and kaniko rebuilds and re-pushes the `dev` tag; then restart the app
Deployment to pull the new image.

## 3. Put the values in (the Secret)

Apps read secrets through ExternalSecrets synced from OpenBao (`ClusterSecretStore openbao`,
KV v2 at `secret/`). Seed them once OpenBao is up (infra-configs):

```sh
./deploy/flux/platform/openbao-seed.sh   # writes the paths below with values from env vars
```

| OpenBao path (KV v2 `secret/`) | Keys | Where used |
|---|---|---|
| `workspacenow/mistral` | `apiKey` | wsn-ai-service LLM calls (empty = demo mode still boots) |
| `workspacenow/ai-service` | `token` | shared bearer wsn-service ↔ ai-service |
| `workspacenow/observer` | `token` | optional observer bearer |
| `workspacenow/run-grant` | `privateKey` | base64 Ed25519 seed for agent run grants |
| `workspacenow/object-storage` | `accessKey`, `secretKey` | RustFS/S3 credentials |
| `workspacenow/temporal-db` | `password` | Temporal Postgres password |

The resulting Kubernetes Secret is `wsn-secrets` (plus `wsn-db-app`) in namespace
`workspacenow`, created by the `ExternalSecret`s in `infrastructure/configs/configs.yaml`.
Quick dev alternative: `kubectl -n workspacenow create secret generic wsn-secrets --from-literal=AI_SERVICE_TOKEN=... ...`
(and delete the ExternalSecret if you manage it by hand). Non-secret settings live in the
ConfigMaps `wsn-service`, `wsn-ai-service`, `wsn-observer`, `console` (patched per environment
in `apps/<env>/kustomization.yaml`).

OpenBao Kubernetes auth roles `external-secrets` and `wsn-service` are created by
`infrastructure/configs` — see `deploy/flux/README.md` for the role policies.

## 4. Verify

```sh
flux get kustomizations -n flux-system --watch
kubectl -n workspacenow get pods,svc,gateway,httproute,certificate
kubectl -n workspacenow get gateway workspacenow   # ADDRESS -> DNS A records
# smoke:
curl -s https://api.workspace.twotakeone.com/api/v1/session | head -c 200
curl -s https://obs.workspace.twotakeone.com/healthz
curl -sI https://workspace.twotakeone.com | head -3
```

Demo mode is on (`WSN_DEMO_MODE=true` in dev): the console signs in with the Northwind Retail
personas, no IdP needed. For real OIDC set `OIDC_ISSUER`/`OIDC_AUDIENCE`/`OIDC_JWKS_URL` in the
`wsn-service` ConfigMap, `authMode: "oidc"` in the console ConfigMap, `WSN_DEMO_MODE=false`,
and `WSN_BOOTSTRAP_ADMIN_EMAILS` for the first admin.
