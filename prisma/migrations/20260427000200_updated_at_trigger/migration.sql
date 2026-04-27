-- Add DEFAULT now() to all updated_at columns (fixes INSERT via Supabase JS)
-- and a trigger that auto-sets updated_at on every UPDATE row.
-- Needed because @updatedAt is Prisma-only; raw Supabase JS queries don't inject it.

-- 1. Set DEFAULT now() on every updated_at column
alter table accounts          alter column updated_at set default now();
alter table categories        alter column updated_at set default now();
alter table people            alter column updated_at set default now();
alter table transactions      alter column updated_at set default now();
alter table debts             alter column updated_at set default now();
alter table recurring_rules   alter column updated_at set default now();
alter table budgets           alter column updated_at set default now();
alter table auth_pin          alter column updated_at set default now();
alter table app_settings      alter column updated_at set default now();

-- 2. Generic trigger function that sets updated_at = now() on every UPDATE
create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Attach trigger to every table with an updated_at column
create trigger trg_accounts_updated_at
  before update on accounts
  for each row execute function public.set_updated_at();

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function public.set_updated_at();

create trigger trg_people_updated_at
  before update on people
  for each row execute function public.set_updated_at();

create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function public.set_updated_at();

create trigger trg_debts_updated_at
  before update on debts
  for each row execute function public.set_updated_at();

create trigger trg_recurring_rules_updated_at
  before update on recurring_rules
  for each row execute function public.set_updated_at();

create trigger trg_budgets_updated_at
  before update on budgets
  for each row execute function public.set_updated_at();

create trigger trg_auth_pin_updated_at
  before update on auth_pin
  for each row execute function public.set_updated_at();

create trigger trg_app_settings_updated_at
  before update on app_settings
  for each row execute function public.set_updated_at();
