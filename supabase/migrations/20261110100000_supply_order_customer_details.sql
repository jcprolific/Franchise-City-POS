-- Customer/delivery details collected before HitPay checkout.
alter table public.supply_order
  add column if not exists contact_name text,
  add column if not exists contact_mobile text,
  add column if not exists contact_email text,
  add column if not exists delivery_address text,
  add column if not exists delivery_city text,
  add column if not exists preferred_delivery_date date;

-- Payment state may only be changed by the server (service_role: edge functions).
-- Browser sessions (anon/authenticated) cannot mark an order as paid.
create or replace function public.guard_supply_order_payment()
returns trigger
language plpgsql
as $$
begin
  if auth.role() in ('anon', 'authenticated') then
    if new.payment_status is distinct from old.payment_status
       or new.paid_at is distinct from old.paid_at
       or new.payment_reference is distinct from old.payment_reference
       or new.total_amount is distinct from old.total_amount
       or (old.status = 'pending_payment' and new.status not in ('pending_payment', 'cancelled'))
    then
      raise exception 'Payment fields on supply_order can only be changed by the server.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists supply_order_payment_guard on public.supply_order;
create trigger supply_order_payment_guard
  before update on public.supply_order
  for each row execute function public.guard_supply_order_payment();

notify pgrst, 'reload schema';
