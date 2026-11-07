# Flux deployment

GitOps configuration for WorkspaceNow. Flux applies three layers in order, each waiting for the previous one to be ready:

| Layer | Path | Contents |
|---|---|---|
| `infra-controllers` | `infrastructure/controllers` | CloudNativePG, External Secrets, OpenBao, NATS (JetStream), Valkey, Temporal |
| `infra-configs` | `infrastructure/configs` | The `wsn-db` Postgres cluster, the OpenBao `ClusterSecretStore`, `ExternalSecret`s, the RustFS object-storage deployment |
| `workspacenow` | `apps/<env>` | `wsn-service` (API, relay, worker, migration job), `wsn-ai-service`, the console, the `HTTPRoute` and NetworkPolicies |

`apps/base` holds the manifests; `apps/dev`, `apps/staging` and `apps/prod` patch replicas, image tags, hostnames and runtime config. Dev follows `main` through Flux image automation; staging and production pin release tags.

## Bootstrap a cluster

```sh
flux bootstrap github --owner=thev1ndu --repository=workspacenow --branch=main --path=deploy/flux/clusters/dev
```

Before the apps can start, put these secrets in OpenBao (KV v2 at `secret/`):

| Path | Keys |
|---|---|
| `workspacenow/mistral` | `apiKey` |
| `workspacenow/ai-service` | `token` |
| `workspacenow/observer` | `token` (optional shared bearer for the wsn-observer APIs) |
| `workspacenow/run-grant` | `privateKey` (base64 Ed25519 seed) |
| `workspacenow/object-storage` | `accessKey`, `secretKey` |
| `workspacenow/temporal-db` | `password` |

OpenBao needs Kubernetes auth roles named `external-secrets` (read `secret/data/workspacenow/*`) and `wsn-service` (read the paths integrations reference).

## Images

`.github/workflows/images.yaml` builds `wsn-service`, `wsn-ai-service`, `wsn-observer` and `console` from each component's `Dockerfile` with docker buildx (multi-stage, non-root runtime user, read-only-rootfs compatible) and pushes them to `ghcr.io/thev1ndu`. Pushes to `main` are tagged `main-<sha>-<run>`; `v*` tags publish the release version.

## Check locally

```sh
for d in infrastructure/controllers infrastructure/configs apps/dev apps/staging apps/prod; do kubectl kustomize deploy/flux/$d > /dev/null && echo "ok $d"; done
```
