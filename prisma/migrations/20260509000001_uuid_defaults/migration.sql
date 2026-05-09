-- Add gen_random_uuid() defaults to all UUID primary key columns.
-- Prisma migrations don't include DB-level defaults for UUIDs (Prisma
-- generates them at the ORM layer). Since runtime writes go through
-- supabase-js directly, the DB must supply the default.

ALTER TABLE accounts         ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE categories       ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE people           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transactions     ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE debts            ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE debt_payments    ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE recurring_rules  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE budgets          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE notifications    ALTER COLUMN id SET DEFAULT gen_random_uuid();
