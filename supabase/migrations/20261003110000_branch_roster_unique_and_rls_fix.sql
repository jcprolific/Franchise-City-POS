-- Match remote hotfixes: roster upsert constraint + branch RLS without auth.users.

drop index if exists branch_roster_source_unique;

alter table public.branch
  drop constraint if exists branch_roster_source_unique;

alter table public.branch
  add constraint branch_roster_source_unique unique (brand_id, source_sheet, source_row);

drop policy if exists "branch read scoped" on public.branch;

create policy "branch read scoped"
on public.branch
for select
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or owner_user_id = auth.uid()
  or id in (select p.branch_id from public.profiles p where p.id = auth.uid())
  or lower(coalesce(franchisee_email, '')) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
);
