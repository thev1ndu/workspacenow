#!/usr/bin/env bash
# Full e2e smoke against the compose stack: boot, auth, data CRUD, the flagship sale -> low-stock
# event, observability surface. Run after `docker compose --profile app up -d`.
# Fails fast with a clear message; the CI job dumps compose logs on failure.
set -euo pipefail

API="${API:-http://localhost:8080/api/v1}"
TOK="Bearer demo.u-amaya"
fail() { echo "E2E FAIL: $*" >&2; exit 1; }
get() { curl -sf -H "Authorization: $TOK" "$API$1"; }
post() { curl -sf -X POST -H "Authorization: $TOK" -H "Content-Type: application/json" -d "$2" "$API$1"; }

echo "== waiting for wsn-service =="
for i in $(seq 1 60); do
  curl -sf http://localhost:8080/healthz >/dev/null 2>&1 && curl -sf http://localhost:8080/readyz >/dev/null 2>&1 && break
  sleep 5
done
curl -sf http://localhost:8080/readyz >/dev/null || fail "wsn-service never became ready"

echo "== session =="
get /session | jq -e '.actor.id == "u-amaya"' >/dev/null || fail "session actor"

echo "== entities =="
get /entities | jq -e '.items | map(.name) | index("Product")' >/dev/null || fail "Product entity missing"

echo "== record create (validation + audit path) =="
post /entities/Product/records '{"values":{"sku":"E2E-1","name":"E2E widget","unitPrice":9.5,"stock":3,"category":"Grocery","active":true,"supplier":"sup-1"}}' \
  | jq -e '.values.sku == "E2E-1"' >/dev/null || fail "record create"

echo "== flagship: sale crosses reorder level -> Stock.LowStockReached =="
post /business-operations/invoke '{"operation":"inventory.checkout","input":{"store":"Kandy","lines":[{"productId":"prod-oil","quantity":6}],"paymentMethod":"card"}}' \
  | jq -e '.output.sale.values.receipt | startswith("KDY-")' >/dev/null || fail "checkout receipt"
sleep 3 # let the outbox -> NATS -> hub path deliver
get "/events?limit=50" | jq -e '[.items[].type] | index("Stock.LowStockReached")' >/dev/null || fail "low-stock event not published"

echo "== approvals, slos, alerts, analytics =="
get /approvals | jq -e 'has("items")' >/dev/null || fail "approvals list"
post /slos '{"operation":"inventory.checkout","targetSuccess":0.99,"targetP95Ms":500,"windowMinutes":60}' | jq -e '.id' >/dev/null || fail "create SLO"
get /slos | jq -e '.items | length > 0' >/dev/null || fail "list SLOs"
get /alerts | jq -e 'has("items")' >/dev/null || fail "alerts list"
get "/analytics/log-metrics?days=1" | jq -e '.items | length == 1' >/dev/null || fail "log metrics"

echo "== public status page: JSON and HTML skin =="
curl -sf http://localhost:8080/status | jq -e '.status' >/dev/null || fail "status JSON"
curl -sf -H "Accept: text/html" http://localhost:8080/status | grep -qi "<html" || fail "status HTML skin"

echo "== SSE stream delivers =="
curl -sf -N -m 3 -H "Authorization: $TOK" "$API/events/stream" | head -c 200 | grep -q "data:" || fail "SSE stream empty"

echo "E2E OK"
