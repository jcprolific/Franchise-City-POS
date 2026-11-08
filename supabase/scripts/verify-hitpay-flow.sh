#!/usr/bin/env bash
# Smoke-test HitPay edge functions (no live payment). Optional: full webhook test if
# supabase/.env.hitpay.local has HITPAY_SALT.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEBHOOK_URL="https://wuthacuizslfsadkwmad.supabase.co/functions/v1/hitpay-webhook"
CREATE_URL="https://wuthacuizslfsadkwmad.supabase.co/functions/v1/create-hitpay-payment"
ENV_FILE="${ROOT}/supabase/.env.hitpay.local"

echo "== create-hitpay-payment (expect 401 without JWT) =="
code=$(curl -s -o /tmp/hitpay-create.json -w "%{http_code}" -X POST "${CREATE_URL}" \
  -H "Content-Type: application/json" -d '{}')
echo "HTTP ${code}"; cat /tmp/hitpay-create.json; echo

echo "== hitpay-webhook (expect 500 until HITPAY_SALT secret is set) =="
code=$(curl -s -o /tmp/hitpay-wh.json -w "%{http_code}" -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","reference_number":"SO-VERIFY-1"}')
echo "HTTP ${code}"; cat /tmp/hitpay-wh.json; echo

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Skip signed webhook test (no ${ENV_FILE})."
  exit 0
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"
if [[ -z "${HITPAY_SALT:-}" ]]; then
  echo "Skip signed webhook test (HITPAY_SALT empty)."
  exit 0
fi

REF="SO-VERIFY-$(date +%s)"
BODY=$(printf '{"status":"completed","reference_number":"%s","id":"test-req-id"}' "${REF}")

SIG=$(printf '%s' "${BODY}" | openssl dgst -sha256 -hmac "${HITPAY_SALT}" | awk '{print $2}')

echo "== signed webhook test for ${REF} =="
code=$(curl -s -o /tmp/hitpay-wh2.json -w "%{http_code}" -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "Hitpay-Signature: ${SIG}" \
  -H "Hitpay-Event-Type: completed" \
  -d "${BODY}")
echo "HTTP ${code}"; cat /tmp/hitpay-wh2.json; echo
