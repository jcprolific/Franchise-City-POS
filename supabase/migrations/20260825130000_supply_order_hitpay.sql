-- HitPay pay-first flow for franchisee supply orders.
-- pending_payment stays franchisee-only until webhook confirms payment.

ALTER TABLE public.supply_order DROP CONSTRAINT IF EXISTS supply_order_status_check;
ALTER TABLE public.supply_order
  ADD CONSTRAINT supply_order_status_check
  CHECK (status = ANY (ARRAY[
    'pending_payment'::text,
    'pending'::text,
    'approved'::text,
    'preparing'::text,
    'out_for_delivery'::text,
    'delivered'::text,
    'cancelled'::text
  ]));

ALTER TABLE public.supply_order DROP CONSTRAINT IF EXISTS supply_order_payment_method_check;
ALTER TABLE public.supply_order
  ADD CONSTRAINT supply_order_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method = ANY (ARRAY['gcash'::text, 'bank_transfer'::text, 'hitpay'::text])
  );

ALTER TABLE public.supply_order
  ADD COLUMN IF NOT EXISTS payment_status text;

UPDATE public.supply_order
SET payment_status = 'paid'
WHERE payment_status IS NULL
  AND status IS DISTINCT FROM 'pending_payment';

UPDATE public.supply_order
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

ALTER TABLE public.supply_order
  ALTER COLUMN payment_status SET DEFAULT 'unpaid';

ALTER TABLE public.supply_order
  ALTER COLUMN payment_status SET NOT NULL;

ALTER TABLE public.supply_order DROP CONSTRAINT IF EXISTS supply_order_payment_status_check;
ALTER TABLE public.supply_order
  ADD CONSTRAINT supply_order_payment_status_check
  CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'failed'::text, 'expired'::text]));

ALTER TABLE public.supply_order
  ADD COLUMN IF NOT EXISTS hitpay_payment_request_id text;

ALTER TABLE public.supply_order
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.supply_order
  ADD COLUMN IF NOT EXISTS payment_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS supply_order_reference_no_key
  ON public.supply_order (reference_no);

CREATE INDEX IF NOT EXISTS supply_order_hitpay_payment_request_id_idx
  ON public.supply_order (hitpay_payment_request_id)
  WHERE hitpay_payment_request_id IS NOT NULL;
