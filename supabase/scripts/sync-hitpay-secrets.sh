#!/usr/bin/env bash
# Push HitPay credentials to Supabase Edge Function secrets (never commit .env.hitpay.local).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/supabase/.env.hitpay.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy supabase/.env.hitpay.example → supabase/.env.hitpay.local and fill HITPAY_API_KEY + HITPAY_SALT."
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

if [[ -z "${HITPAY_API_KEY:-}" || -z "${HITPAY_SALT:-}" ]]; then
  echo "HITPAY_API_KEY and HITPAY_SALT must be set in ${ENV_FILE}"
  exit 1
fi

cd "${ROOT}"
supabase secrets set \
  "HITPAY_API_KEY=${HITPAY_API_KEY}" \
  "HITPAY_SALT=${HITPAY_SALT}" \
  "HITPAY_BASE_URL=${HITPAY_BASE_URL:-https://api.hit-pay.com/v1}" \
  "HITPAY_REDIRECT_URL=${HITPAY_REDIRECT_URL:-https://pos.franchisecity.ph/portal/orders/payment-success}"

echo "HitPay secrets updated on project $(cat supabase/.temp/project-ref 2>/dev/null || echo 'linked')."
echo ""
echo "HitPay webhook (register manually if not done yet):"
echo "  URL:   https://wuthacuizslfsadkwmad.supabase.co/functions/v1/hitpay-webhook"
echo "  Event: payment_request.completed"
echo "  Leave IP whitelisting empty."
