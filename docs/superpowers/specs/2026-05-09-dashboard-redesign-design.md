# Dashboard & Theme System Redesign — Design Spec

**Date:** 2026-05-09  
**Status:** Approved for planning

---

## Context

The current dashboard uses a basic two-column layout (sidebar + content) with hand-rolled SVG charts and a simple light/dark toggle. The goal is a **wow-tier** redesign: Apple-level visual polish, CRM-style bento grid dashboard, glassmorphism icon-rail sidebar, Framer Motion entrance animations, and a 6-theme system (each with dark + light variants) covering girls, students, and freelancer personas.

---

## Design Decisions

| Dimension | Decision |
|---|---|
| Dashboard layout | Bento Grid (asymmetric Apple WWDC-style mosaic) |
| Navigation | Icon Rail — 64px collapsed, 220px on hover, glassmorphism |
| Theme count | 6 themes × 2 modes (dark/light) = 12 combinations |
| Animation lib | `framer-motion` (add to deps) |
| Chart lib | `recharts` (add to deps, replace hand-rolled SVG charts) |
| CSS token format | oklch for existing; raw hex/rgba for theme gradient values |

---

## Theme System

### 6 Themes

| ID | Name | Persona | Primary accent | Background dark |
|---|---|---|---|---|
| `aurora` | ✨ Aurora | Girls | `#c77dff` → `#7b2ff7` | `#1a0533` |
| `blossom` | 🌸 Blossom | Girls | `#ff4d6d` → `#ffb347` | `#1a0e14` |
| `midnight` | 🌙 Midnight | Students | `#4facfe` → `#00f2fe` | `#020818` |
| `slate` | 💼 Slate Pro | Freelancers | `#6366f1` → `#0ea5e9` | `#0f172a` |
| `neon` | ⚡ Neon | Freelancers | `#00d2ff` → `#e100ff` | `#0a0a0a` |
| `ocean` | 🔷 Ocean | Universal | `#1d4ed8` → `#2563eb` | `#0a0f1a` |

Each theme also has a **light variant** — white/off-white background, same accent hues at reduced lightness.

### Architecture

- **Storage:** `next-themes` handles dark/light via `.dark` class. Theme name stored in `localStorage` key `fleucy-theme`.
- **Application:** `data-theme="aurora"` attribute on `<html>` element (alongside `.dark` / no class).
- **CSS:** One `[data-theme="X"]` block per theme in `globals.css` overrides the base CSS variables. Dark variant lives inside `[data-theme="X"].dark`.

### CSS Variables per Theme

Each theme block overrides:
```css
[data-theme="ocean"] {
  --color-primary: #2563eb;
  --color-primary-fg: #ffffff;
  --color-gradient-a: #1d4ed8;   /* hero card gradient start */
  --color-gradient-b: #1e40af;   /* hero card gradient end */
  --color-glow: rgba(37,99,235,0.25);
  --color-bg: oklch(99% 0 0);
  --color-card: oklch(100% 0 0);
  --color-sidebar: rgba(255,255,255,0.7);
  --color-border: oklch(92% 0 0);
}
[data-theme="ocean"].dark {
  --color-bg: #0a0f1a;
  --color-card: #111827;
  --color-sidebar: rgba(10,15,26,0.7);
  --color-border: rgba(255,255,255,0.07);
}
```

---

## Dashboard — Bento Grid

### Grid Layout

```
Desktop (md+):
+---------------------------+----------+
|  NET WORTH  (col 1-3)     | ACCOUNTS |
|  hero gradient card       | (col 4)  |
+--------+--------+---------+----------+
| INCOME | EXPENSE|  NET    | (col 4 continued)
+--------+--------+---------+
|  MONTHLY TREND (col 1-3)  | CATEGORY |
|  Recharts LineChart       | Recharts |
+---------------------------+ Donut    |
                             +----------+
```

CSS: `grid-template-columns: repeat(4, 1fr)` with explicit `grid-column` / `grid-row` spans per tile.

### Bento Tiles

| Tile | Grid span | Content |
|---|---|---|
| `NetWorthTile` | col 1-3, row 1 | Large gradient hero, animated number count-up, % change badge |
| `AccountsTile` | col 4, row 1-2 | Scrollable account list, each with mini balance bar |
| `IncomeTile` | col 1, row 2 | Accent border-left green, animated number |
| `ExpenseTile` | col 2, row 2 | Accent border-left red, animated number |
| `NetTile` | col 3, row 2 | Accent border-left primary, animated number, color-adaptive |
| `TrendChartTile` | col 1-3, row 3 | Recharts `<LineChart>` — income vs expense, 6 months |
| `CategoryTile` | col 4, row 3 | Recharts `<PieChart>` donut + legend |

Mobile: Single column stack in order: NetWorth → Income/Expense/Net row → Trend → Category → Accounts.

---

## Sidebar — Icon Rail

### Specs

- **Collapsed width:** 64px (icons centered)
- **Expanded width:** 220px (on hover, `whileHover` Framer Motion spring)
- **Background:** `var(--color-sidebar)` + `backdrop-filter: blur(20px) saturate(180%)`
- **Border:** `border-right: 1px solid var(--color-border)`
- **Transition:** Framer Motion `layout` animation on the sidebar `<motion.nav>`, spring `{stiffness:300, damping:30}`

### Nav Items

Each item: icon (Lucide) + label (hidden when collapsed, slides in on expand).

Active state: `background: rgba(var(--primary-rgb), 0.15)` + `border-left: 2px solid var(--color-primary)` + icon tinted to primary.

Logo at top, theme switcher + user avatar at bottom.

### Mobile

Keep existing `bottom-nav.tsx` (4 tabs). No sidebar on mobile. Align bottom-nav icons with theme primary color.

---

## Navigation Items (unchanged set)

Dashboard · Transactions · Accounts · Debts · Categories · Settings

---

## Animations (Framer Motion)

### Bento Grid Entrance

```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const tile = { hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 22 } } }
```

Wrap `<motion.div variants={container}>` around the grid, each tile is `<motion.div variants={tile}>`.

### Hover Effects

Cards: `whileHover={{ y: -3, boxShadow: '0 20px 40px var(--color-glow)' }}` with `transition: { type: 'spring', stiffness: 400, damping: 25 }`.

### Number Count-Up

`useMotionValue` + `useTransform` + `animate()` on mount. Net worth counts up from 0 → actual value over 1.2s with `easeOut`.

### Sidebar Expand

`<motion.nav animate={{ width: hovered ? 220 : 64 }}>` with spring. Labels: `<AnimatePresence>` fade-in when expanded.

### Theme Switch

Wrap the whole shell in `<AnimatePresence>`. On theme change, short `opacity` crossfade (200ms) using `key={theme}`.

---

## Theme Switcher UI

Location: bottom of the sidebar (above user avatar).

Collapsed: palette icon. Expanded: shows 6 colored dots in a row.

Clicking opens a small popover (Radix `Popover`) showing:
- 6 theme swatches (colored circles)
- Dark / Light toggle below

Theme + mode stored together: `localStorage.setItem('fleucy-theme', 'aurora')` + next-themes `setTheme('dark'|'light')`.

---

## New Dependencies

```bash
pnpm add framer-motion recharts
```

- `framer-motion` ^11.x — animations
- `recharts` ^2.x — LineChart, BarChart, PieChart

---

## Files Changed / Created

### New files
- `src/lib/themes.ts` — theme config array (id, name, emoji, cssVars)
- `src/components/theme-switcher.tsx` — 6-theme palette picker popover
- `src/features/dashboard/tiles/net-worth-tile.tsx`
- `src/features/dashboard/tiles/stat-tile.tsx` (reused for income/expense/net)
- `src/features/dashboard/tiles/accounts-tile.tsx`
- `src/features/dashboard/tiles/trend-chart-tile.tsx`
- `src/features/dashboard/tiles/category-tile.tsx`
- `src/features/dashboard/tiles/bento-grid.tsx` — grid wrapper with motion container

### Modified files
- `src/app/globals.css` — add 6 × 2 theme CSS variable blocks
- `src/app/layout.tsx` — add `data-theme` attribute support to ThemeProvider
- `src/components/layout/sidebar.tsx` — full rewrite to icon rail glassmorphism
- `src/components/layout/shell.tsx` — update sidebar width variable (`--sidebar-w: 64px`)
- `src/components/layout/bottom-nav.tsx` — apply theme primary color to active tab
- `src/app/(app)/dashboard/page.tsx` — replace current widgets with `<BentoGrid>`
- `package.json` — add framer-motion, recharts

---

## Verification

1. `pnpm dev` — confirm app starts, no TS errors
2. Dashboard loads → tiles stagger in with spring animation
3. Hover a tile → lifts with glow shadow
4. Net worth number counts up from 0 on mount
5. Hover sidebar → expands from 64→220px with spring, labels slide in
6. Open theme switcher → select Aurora dark → all CSS vars update instantly, crossfade
7. Select Ocean light → bg switches to white, accent stays blue
8. Switch to Neon dark → glowing cyan/purple accents appear
9. Mobile (<768px): sidebar hidden, bottom-nav visible, bento stacks to 1 col
10. `pnpm typecheck` passes
11. `pnpm test:run` passes
