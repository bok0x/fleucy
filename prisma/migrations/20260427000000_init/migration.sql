-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('cash', 'bank', 'mobile_wallet');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "DebtDirection" AS ENUM ('owed_to_me', 'i_owe');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('open', 'partially_paid', 'settled', 'written_off');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('recurring_due', 'debt_due', 'budget_overrun', 'low_balance');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AccountKind" NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "opening_balance_fen" BIGINT NOT NULL DEFAULT 0,
    "low_balance_threshold_fen" BIGINT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'circle',
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "relationship_tag" TEXT,
    "notes" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TxType" NOT NULL,
    "amount_fen" BIGINT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,
    "receipt_url" TEXT,
    "recurring_rule_id" UUID,
    "is_pending" BOOLEAN NOT NULL DEFAULT false,
    "debt_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "person_id" UUID NOT NULL,
    "direction" "DebtDirection" NOT NULL,
    "principal_fen" BIGINT NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "status" "DebtStatus" NOT NULL DEFAULT 'open',
    "origin_account_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payments" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "debt_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount_fen" BIGINT NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_rules" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount_fen" BIGINT NOT NULL,
    "cadence" "Cadence" NOT NULL,
    "day_of_month" INTEGER,
    "day_of_week" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "last_generated_for_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "category_id" UUID,
    "monthly_limit_fen" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_to" TEXT,
    "related_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),
    "dismissed_at" TIMESTAMPTZ(6),
    "telegram_sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_pin" (
    "owner_id" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_pin_pkey" PRIMARY KEY ("owner_id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "owner_id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'CNY',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "pin_lock_minutes" INTEGER NOT NULL DEFAULT 10,
    "reminder_days_before_due" INTEGER NOT NULL DEFAULT 3,
    "telegram_chat_id" TEXT,
    "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
    "setup_completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("owner_id")
);

-- CreateIndex
CREATE INDEX "accounts_owner_id_idx" ON "accounts"("owner_id");

-- CreateIndex
CREATE INDEX "categories_owner_id_type_idx" ON "categories"("owner_id", "type");

-- CreateIndex
CREATE INDEX "people_owner_id_idx" ON "people"("owner_id");

-- CreateIndex
CREATE INDEX "transactions_owner_id_occurred_at_idx" ON "transactions"("owner_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_owner_id_account_id_idx" ON "transactions"("owner_id", "account_id");

-- CreateIndex
CREATE INDEX "transactions_owner_id_category_id_idx" ON "transactions"("owner_id", "category_id");

-- CreateIndex
CREATE INDEX "transactions_owner_id_is_pending_idx" ON "transactions"("owner_id", "is_pending");

-- CreateIndex
CREATE INDEX "debts_owner_id_status_idx" ON "debts"("owner_id", "status");

-- CreateIndex
CREATE INDEX "debts_owner_id_person_id_idx" ON "debts"("owner_id", "person_id");

-- CreateIndex
CREATE INDEX "debts_owner_id_due_date_idx" ON "debts"("owner_id", "due_date");

-- CreateIndex
CREATE INDEX "debt_payments_owner_id_debt_id_idx" ON "debt_payments"("owner_id", "debt_id");

-- CreateIndex
CREATE INDEX "recurring_rules_owner_id_is_active_idx" ON "recurring_rules"("owner_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_owner_category_unique" ON "budgets"("owner_id", "category_id");

-- CreateIndex
CREATE INDEX "notifications_owner_id_created_at_idx" ON "notifications"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_owner_id_telegram_sent_at_idx" ON "notifications"("owner_id", "telegram_sent_at");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_fkey" FOREIGN KEY ("recurring_rule_id") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_origin_account_id_fkey" FOREIGN KEY ("origin_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

