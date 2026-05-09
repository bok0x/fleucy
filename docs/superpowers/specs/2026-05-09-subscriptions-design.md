# Subscriptions Feature Design

**Date:** 2026-05-09  
**Status:** Approved  
**Scope:** Phase 1 addition — monthly/yearly subscription tracking with dedicated UI page and dashboard tile

---

## Context

Users want to track recurring subscription expenses (Spotify, Netflix, Apple One, Shahid, Internet, VPN, etc.) as a first-class feature — separate from ad-hoc transactions. Subscriptions differ from arbitrary recurring expenses in that they:

- Have a named service provider
- Recur on a predictable cycle (monthly or yearly)
- Are mentally distinct for the user ("what am I paying every month?")
- Benefit from a dedicated page with cost aggregation

---

## Architecture Decision

**Extend `recurring_rules` with an `is_subscription` flag** rather than creating a new table.

Rationale:
- `recurring_rules` already stores every field a subscription needs (name, amount_fen, account_id, category_id, cadence, day_of_month, start_date, end_date, is_active, last_generated_for_date)
- Auto-transaction generation is already wired via the n8n `fleucy-daily-evaluation.json` workflow — subscriptions inherit this for free
- New table would duplicate all of this with no net gain

---

## Database Changes

### Migration: `20260509000000_add_subscription_fields`

```sql
ALTER TABLE recurring_rules
  ADD COLUMN is_subscription    BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN website_url        TEXT,
  ADD COLUMN subscription_notes TEXT,
  ADD COLUMN service_type       TEXT;
  -- service_type values: streaming | internet | software | music | vpn | other

CREATE INDEX idx_recurring_rules_subscriptions
  ON recurring_rules (owner_id, is_subscription)
  WHERE is_subscription = TRUE;
```

### Prisma Schema additions (recurring_rules model)

```prisma
isSubscription    Boolean  @default(false) @map("is_subscription")
websiteUrl        String?  @map("website_url")
subscriptionNotes String?  @map("subscription_notes")
serviceType       String?  @map("service_type")
```

---

## Backend — `src/features/subscriptions/`

### `schemas.ts`

```typescript
export const SERVICE_TYPES = ['streaming', 'internet', 'software', 'music', 'vpn', 'other'] as const;
export type ServiceType = typeof SERVICE_TYPES[number];

export const subscriptionSchema = z.object({
  name:               z.string().trim().min(1).max(100),
  amount_fen:         fenSchema,
  cadence:            z.enum(['monthly', 'yearly']),
  day_of_month:       z.coerce.number().int().min(1).max(28), // capped at 28 for safety
  account_id:         z.string().uuid(),
  category_id:        z.string().uuid().optional(),
  start_date:         isoDateSchema,
  end_date:           isoDateSchema.optional(),
  website_url:        z.string().url().optional().or(z.literal('')),
  subscription_notes: optionalText(500),
  service_type:       z.enum(SERVICE_TYPES).optional(),
});

export interface Subscription {
  id:                 string;
  owner_id:           string;
  name:               string;
  amount_fen:         bigint;
  cadence:            'monthly' | 'yearly';
  day_of_month:       number | null;
  account_id:         string;
  category_id:        string | null;
  start_date:         string;
  end_date:           string | null;
  is_active:          boolean;
  is_subscription:    boolean;
  website_url:        string | null;
  subscription_notes: string | null;
  service_type:       string | null;
  last_generated_for_date: string | null;
}
```

### `queries.ts`

`useSubscriptions()` — React Query hook, queries `recurring_rules` where `is_subscription = true`, joins accounts and categories. Returns `Subscription[]` sorted by name.

### `actions.ts`

| Action | Behavior |
|---|---|
| `createSubscriptionAction` | Inserts into `recurring_rules` with `is_subscription=true`, `type='expense'` |
| `updateSubscriptionAction` | Updates all mutable fields |
| `toggleSubscriptionAction` | Flips `is_active` |
| `deleteSubscriptionAction` | Hard delete (subscriptions aren't financial records themselves) |

All actions: auth check → Zod parse → Supabase mutation → revalidatePath('/subscriptions').

---

## Frontend

### Route: `src/app/(app)/subscriptions/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Subscriptions                    [+ Add]   │
├─────────────────────────────────────────────┤
│  Monthly ¥328  │  Yearly ¥3,936  │  Active 7│
├─────────────────────────────────────────────┤
│  [All][Streaming][Internet][Software]        │
│  [Music][VPN][Other]                        │
├─────────────────────────────────────────────┤
│  🎵 Spotify     ¥38/mo   Day 5   ● Active   │
│  📺 Netflix     ¥68/mo   Day 12  ● Active   │
│  🍎 Apple One   ¥88/mo   Day 1   ● Active   │
│  📡 Shahid      ¥25/mo   Day 1   ● Active   │
│  🌐 Internet    ¥120/mo  Day 15  ● Active   │
│  🔒 VPN         ¥15/yr   Day 20  ⊘ Paused   │
└─────────────────────────────────────────────┘
```

**Components:**
- `SubscriptionCard` — name, service_type badge, amount + cadence, billing day, account name, active toggle (calls `toggleSubscriptionAction`), edit/delete menu
- `SubscriptionSheet` — Sheet (shadcn) for create/edit form
- `SubscriptionStats` — three summary cards (monthly total, yearly total, active count)
- `ServiceTypeFilter` — tab-bar filtering client-side

**Monthly total calculation:**
- Sum `amount_fen` for cadence='monthly' active subscriptions
- Yearly active: divide amount by 12, add to monthly total
- Display both a monthly and annualized figure

### Dashboard Tile: `SubscriptionsTile`

Add to bento grid in `src/features/dashboard/`:

- Shows: monthly subscription spend (sum of active subscriptions, normalized to monthly)
- Sub-label: "N active subscriptions"
- Links to `/subscriptions`
- Follows existing `StatTile` pattern

### Navigation

Add "Subscriptions" to:
- `src/components/layout/sidebar.tsx` (icon rail) — use `CreditCard` or `RefreshCw` icon from Lucide
- `src/components/layout/bottom-nav.tsx` — mobile bottom bar

### `src/proxy.ts`

No changes needed — `/subscriptions` falls under `(app)` which is already Clerk + PIN protected.

---

## Auto-Transaction Generation

Subscriptions inherit the existing n8n recurring rule generation workflow:
- `fleucy-daily-evaluation.json` queries `recurring_rules` where `is_active=true` and generates transactions
- Since subscriptions are recurring_rules with `is_subscription=true`, they are picked up automatically
- No changes to the n8n workflow required

---

## Implementation Order

1. Migration SQL file
2. Prisma schema update + `pnpm prisma generate`
3. `src/features/subscriptions/schemas.ts`
4. `src/features/subscriptions/queries.ts`
5. `src/features/subscriptions/actions.ts`
6. `src/app/(app)/subscriptions/page.tsx` + child components
7. `SubscriptionsTile` in dashboard
8. Navigation links (sidebar + bottom-nav)

---

## Verification

- Create a subscription → appears in list, auto-generates transaction next billing day
- Pause subscription → `is_active=false`, excluded from monthly total
- Delete subscription → removed from list, no future transactions generated
- Dashboard tile → shows correct monthly total matching subscriptions page sum
- Filter by service_type → correct subset shown
- Yearly subscription → normalized monthly amount shown in stats
- All actions require auth — test with invalid session → redirect to login
