#!/bin/sh
# Seeds the OpenBao KV v2 paths the ExternalSecrets read (ClusterSecretStore "openbao").
# Set the env vars, then run with KUBECONFIG pointing at the dev cluster.
#   MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... OBSERVER_TOKEN=... RUN_GRANT_PRIVATE_KEY=... \
#   OBJECT_STORAGE_ACCESS_KEY=... OBJECT_STORAGE_SECRET_KEY=... TEMPORAL_DB_PASSWORD=... \
#   WSN_LOCAL_ADMIN_EMAIL=... WSN_LOCAL_ADMIN_PASSWORD=... ./deploy/flux/platform/openbao-seed.sh
set -eu
: "${OPENBAO_NAMESPACE:=openbao}"
: "${OPENBAO_ROOT_TOKEN:?set OPENBAO_ROOT_TOKEN (dev root token of the OpenBao instance)}"
BAO="kubectl -n $OPENBAO_NAMESPACE exec deploy/openbao -- bao"
put() { # put <path> <key=value>...
  path="$1"; shift
  args=""
  for kv in "$@"; do args="$args $kv"; done
  $BAO kv put -mount=secret "$path" $args
  echo "seeded secret/$path"
}
$BAO login -no-color "$OPENBAO_ROOT_TOKEN" >/dev/null
put workspacenow/mistral "apiKey=${MISTRAL_API_KEY:-}"
put workspacenow/ai-service "token=${AI_SERVICE_TOKEN:-dev-service-token}"
put workspacenow/observer "token=${OBSERVER_TOKEN:-}"
put workspacenow/run-grant "privateKey=${RUN_GRANT_PRIVATE_KEY:-}"
put workspacenow/object-storage "accessKey=${OBJECT_STORAGE_ACCESS_KEY:-workspacenow}" "secretKey=${OBJECT_STORAGE_SECRET_KEY:-workspacenow-secret}"
put workspacenow/temporal-db "password=${TEMPORAL_DB_PASSWORD:-temporal}"
# System login used when no OIDC is configured: POST /api/v1/auth/login with these credentials,
# first login provisions the user with the workspacenow-admin role.
put workspacenow/local-admin "email=${WSN_LOCAL_ADMIN_EMAIL:-admin@workspacenow.local}" "password=${WSN_LOCAL_ADMIN_PASSWORD:-change-me}"
echo "done — ExternalSecrets in namespace workspacenow will sync them into Secrets wsn-secrets / wsn-db-app"
