-- Add subscription tracking fields to recurring_rules.
-- Subscriptions are recurring_rules with is_subscription = TRUE.
-- Existing rows default to FALSE (not subscriptions).

ALTER TABLE recurring_rules
  ADD COLUMN is_subscription    BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN website_url        TEXT,
  ADD COLUMN subscription_notes TEXT,
  ADD COLUMN service_type       TEXT;
-- service_type accepted values: streaming | internet | software | music | vpn | other
-- Enforced at application layer (Zod), not DB constraint, for flexibility.

CREATE INDEX idx_recurring_rules_subscriptions
  ON recurring_rules (owner_id, is_subscription)
  WHERE is_subscription = TRUE;
