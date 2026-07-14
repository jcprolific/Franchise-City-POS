-- Franchisee Dashboard + Orders listen for postgres_changes on pos_order.
-- Without this, successful barista punches never refresh open franchisee screens.
alter publication supabase_realtime add table public.pos_order;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pos_order_item'
  ) then
    execute 'alter publication supabase_realtime add table public.pos_order_item';
  end if;
end $$;
