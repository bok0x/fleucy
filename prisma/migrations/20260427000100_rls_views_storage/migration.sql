-- ===========================================
-- Enable RLS on all user-data tables
-- ===========================================
alter table accounts          enable row level security;
alter table categories        enable row level security;
alter table people            enable row level security;
alter table transactions      enable row level security;
alter table debts             enable row level security;
alter table debt_payments     enable row level security;
alter table recurring_rules   enable row level security;
alter table budgets           enable row level security;
alter table notifications     enable row level security;
alter table auth_pin          enable row level security;
alter table app_settings      enable row level security;

-- ===========================================
-- Helper: extract Clerk user id from JWT 'sub' claim
-- ===========================================
create or replace function public.clerk_user_id() returns text
  language sql stable
  as $$ select coalesce(auth.jwt() ->> 'sub', '') $$;

-- ===========================================
-- Owner-only policy for each table
-- ===========================================
create policy "owner_all_accounts" on accounts
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_categories" on categories
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_people" on people
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_transactions" on transactions
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_debts" on debts
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_debt_payments" on debt_payments
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_recurring_rules" on recurring_rules
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_budgets" on budgets
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_notifications" on notifications
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_auth_pin" on auth_pin
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_app_settings" on app_settings
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

-- ===========================================
-- Storage bucket policies (receipts, avatars)
-- Path convention: <bucket>/<owner_id>/<filename>
-- ===========================================
create policy "owner_read_receipts" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_write_receipts" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_delete_receipts" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_read_avatars" on storage.objects
  for select using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_write_avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_delete_avatars" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

-- ===========================================
-- Views (computed, RLS inherited via underlying tables)
-- ===========================================

-- v_account_balances: opening + sum income - sum expense, confirmed only
create or replace view v_account_balances
  with (security_invoker = true) as
select
  a.id                                                       as account_id,
  a.owner_id,
  a.name,
  a.kind,
  a.opening_balance_fen
    + coalesce(sum(t.amount_fen) filter (where t.type = 'income'), 0)
    - coalesce(sum(t.amount_fen) filter (where t.type = 'expense'), 0)         as balance_fen,
  a.low_balance_threshold_fen
from accounts a
left join transactions t
  on t.account_id = a.id
  and t.deleted_at is null
  and t.is_pending = false
where a.is_archived = false
group by a.id, a.owner_id, a.name, a.kind, a.opening_balance_fen, a.low_balance_threshold_fen;

-- v_monthly_summary: per-month income/expense/net by category
create or replace view v_monthly_summary
  with (security_invoker = true) as
select
  date_trunc('month', t.occurred_at)::date  as month,
  t.owner_id,
  t.category_id,
  t.type,
  sum(t.amount_fen)                          as total_fen,
  count(*)                                   as txn_count
from transactions t
where t.deleted_at is null and t.is_pending = false
group by 1, 2, 3, 4;

-- v_debt_summary: per-direction totals + overdue list
create or replace view v_debt_summary
  with (security_invoker = true) as
select
  d.owner_id,
  d.direction,
  count(*) filter (where d.status in ('open','partially_paid'))                as open_count,
  coalesce(sum(d.principal_fen) filter (where d.status in ('open','partially_paid')), 0)
    - coalesce(
        (select sum(p.amount_fen)
         from debt_payments p
         where p.debt_id = any (array_agg(d.id) filter (where d.status in ('open','partially_paid')))),
        0
      )                                                                         as outstanding_fen,
  count(*) filter (where d.status in ('open','partially_paid') and d.due_date < current_date) as overdue_count
from debts d
group by d.owner_id, d.direction;

-- ===========================================
-- Notification dedup index (one per kind+related_id+day-bucket)
-- Uses an immutable UTC-day helper so the expression index is accepted by Postgres.
-- ===========================================
create or replace function public.utc_day(ts timestamptz) returns date
  language sql immutable parallel safe
  as $$ select (ts at time zone 'UTC')::date $$;

create unique index notifications_dedup_daily
  on notifications (owner_id, kind, related_id, public.utc_day(created_at))
  where dismissed_at is null;
