-- Enterprise: point pos_order.cashier_id at profiles (auth identity),
-- not the unused legacy pos_user table that caused barista inserts to fail.

alter table public.pos_order
  drop constraint if exists pos_order_cashier_id_fkey;

alter table public.pos_order
  add constraint pos_order_cashier_id_fkey
  foreign key (cashier_id) references public.profiles(id)
  on delete set null;
