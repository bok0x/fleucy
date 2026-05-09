# Dashboard & Theme System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat stacked-widget dashboard with a glassmorphism bento-grid layout, icon-rail sidebar, Framer Motion entrance animations, and a 6-palette × dark/light theme system.

**Architecture:** A `PaletteProvider` context sets `data-theme` on `<html>` (alongside next-themes' `.dark` class). CSS `[data-theme="X"].dark` blocks in `globals.css` override the base CSS variables per palette. Framer Motion animates each bento tile on mount with a stagger. Recharts replaces hand-rolled SVG charts.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, framer-motion ^11, recharts ^2, next-themes (existing), Lucide icons (existing)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/themes.ts` | Create | Theme config array (id, name, emoji, gradientA, gradientB) |
| `src/providers/palette-provider.tsx` | Create | PaletteContext — localStorage sync + `data-theme` attr on `<html>` |
| `src/providers/theme-provider.tsx` | Modify | Keep as-is (next-themes dark/light) |
| `src/app/layout.tsx` | Modify | Wrap with PaletteProvider |
| `src/app/globals.css` | Modify | Add `--color-gradient-a/b`, `--color-glow`, `--color-sidebar-glass` vars; add 6 × [data-theme] blocks |
| `src/components/theme-switcher.tsx` | Create | Palette picker popover (6 swatches + dark toggle) |
| `src/components/layout/sidebar.tsx` | Rewrite | Icon rail: 64px collapsed → 220px hover, glassmorphism, Framer Motion |
| `src/components/layout/shell.tsx` | Modify | Grid col from `14rem` → `64px` |
| `src/components/layout/bottom-nav.tsx` | Modify | Active tab uses `--color-primary` |
| `src/components/layout/header.tsx` | Modify | Remove theme toggle button (now in sidebar) |
| `src/features/dashboard/tiles/bento-grid.tsx` | Create | Grid wrapper with Framer Motion stagger container |
| `src/features/dashboard/tiles/net-worth-tile.tsx` | Create | Hero gradient tile, animated count-up |
| `src/features/dashboard/tiles/stat-tile.tsx` | Create | Reusable income/expense/net tile with accent border |
| `src/features/dashboard/tiles/accounts-tile.tsx` | Create | Account list with mini balance bars |
| `src/features/dashboard/tiles/trend-chart-tile.tsx` | Create | Recharts LineChart (income vs expense, 6 months) |
| `src/features/dashboard/tiles/category-tile.tsx` | Create | Recharts PieChart donut + legend |
| `src/app/(app)/dashboard/page.tsx` | Rewrite | Assemble BentoGrid with all tiles |

---

## Task 1 — Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install framer-motion and recharts**

```bash
pnpm add framer-motion recharts
```

- [ ] **Step 2: Verify TypeScript can import them**

```bash
pnpm typecheck
```

Expected: zero errors (both packages ship their own types).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add framer-motion and recharts"
```

---

## Task 2 — Theme CSS Variables

**Files:** `src/app/globals.css`

- [ ] **Step 1: Add shared gradient/glow vars to the existing `@theme` block**

Open `src/app/globals.css`. Inside the existing `@theme { … }` block (after `--radius-card: 14px;`), add:

```css
  --color-gradient-a: #1d4ed8;
  --color-gradient-b: #1e40af;
  --color-glow: rgba(37, 99, 235, 0.25);
  --color-sidebar-glass: rgba(255, 255, 255, 0.65);
```

- [ ] **Step 2: Add the dark-mode sidebar glass override**

Inside the existing first `.dark { … }` block (the one under `/* Dark mode via next-themes … */`), add at the end:

```css
  --color-sidebar-glass: rgba(10, 15, 26, 0.65);
```

- [ ] **Step 3: Append the 6 theme blocks at the end of the file**

Add this entire block at the bottom of `src/app/globals.css`:

```css
/* ── Palette themes ────────────────────────────────────────────────── */
/* Aurora – girls, purple/pink */
[data-theme="aurora"] {
  --color-primary: oklch(72% 0.23 308);
  --color-primary-fg: oklch(99% 0 0);
  --color-gradient-a: #c77dff;
  --color-gradient-b: #7b2ff7;
  --color-glow: rgba(199, 125, 255, 0.28);
}
[data-theme="aurora"].dark {
  --color-bg: #1a0533;
  --color-card: #2d1b69;
  --color-border: rgba(255, 255, 255, 0.07);
  --color-sidebar-glass: rgba(26, 5, 51, 0.7);
}

/* Blossom – girls, rose/peach */
[data-theme="blossom"] {
  --color-primary: oklch(65% 0.23 15);
  --color-primary-fg: oklch(99% 0 0);
  --color-gradient-a: #ff4d6d;
  --color-gradient-b: #ffb347;
  --color-glow: rgba(255, 77, 109, 0.28);
}
[data-theme="blossom"].dark {
  --color-bg: #1a0e14;
  --color-card: #2d1527;
  --color-border: rgba(255, 255, 255, 0.07);
  --color-sidebar-glass: rgba(26, 14, 20, 0.7);
}

/* Midnight – students, electric blue */
[data-theme="midnight"] {
  --color-primary: oklch(68% 0.2 220);
  --color-primary-fg: oklch(99% 0 0);
  --color-gradient-a: #4facfe;
  --color-gradient-b: #00f2fe;
  --color-glow: rgba(79, 172, 254, 0.28);
}
[data-theme="midnight"].dark {
  --color-bg: #020818;
  --color-card: #0a1628;
  --color-border: rgba(255, 255, 255, 0.07);
  --color-sidebar-glass: rgba(2, 8, 24, 0.7);
}

/* Slate Pro – freelancers, indigo/cyan */
[data-theme="slate"] {
  --color-primary: oklch(62% 0.2 264);
  --color-primary-fg: oklch(99% 0 0);
  --color-gradient-a: #6366f1;
  --color-gradient-b: #0ea5e9;
  --color-glow: rgba(99, 102, 241, 0.28);
}
[data-theme="slate"].dark {
  --color-bg: #0f172a;
  --color-card: #1e293b;
  --color-border: rgba(255, 255, 255, 0.07);
  --color-sidebar-glass: rgba(15, 23, 42, 0.7);
}

/* Neon – freelancers, cyberpunk */
[data-theme="neon"] {
  --color-primary: oklch(72% 0.22 198);
  --color-primary-fg: oklch(5% 0 0);
  --color-gradient-a: #00d2ff;
  --color-gradient-b: #e100ff;
  --color-glow: rgba(0, 210, 255, 0.35);
}
[data-theme="neon"].dark {
  --color-bg: #0a0a0a;
  --color-card: #111111;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-sidebar-glass: rgba(10, 10, 10, 0.8);
}

/* Ocean – universal, dark + blue only */
[data-theme="ocean"] {
  --color-primary: oklch(58% 0.22 250);
  --color-primary-fg: oklch(99% 0 0);
  --color-gradient-a: #1d4ed8;
  --color-gradient-b: #1e40af;
  --color-glow: rgba(29, 78, 216, 0.28);
}
[data-theme="ocean"].dark {
  --color-bg: #0a0f1a;
  --color-card: #111827;
  --color-border: rgba(255, 255, 255, 0.07);
  --color-sidebar-glass: rgba(10, 15, 26, 0.7);
}
```

- [ ] **Step 4: Start dev server and confirm no CSS parse errors**

```bash
pnpm dev
```

Open http://localhost:3000. App should render with no visual breakage. Stop server (`Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add 6-palette CSS variable blocks"
```

---

## Task 3 — Theme Config + PaletteProvider

**Files:**
- Create: `src/lib/themes.ts`
- Create: `src/providers/palette-provider.tsx`

- [ ] **Step 1: Create theme config**

Create `src/lib/themes.ts`:

```ts
export type PaletteId = 'aurora' | 'blossom' | 'midnight' | 'slate' | 'neon' | 'ocean';

export interface Palette {
  id: PaletteId;
  name: string;
  emoji: string;
  gradientA: string;
  gradientB: string;
  persona: string;
}

export const PALETTES: Palette[] = [
  { id: 'aurora',   name: 'Aurora',    emoji: '✨', gradientA: '#c77dff', gradientB: '#7b2ff7', persona: 'Girls' },
  { id: 'blossom',  name: 'Blossom',   emoji: '🌸', gradientA: '#ff4d6d', gradientB: '#ffb347', persona: 'Girls' },
  { id: 'midnight', name: 'Midnight',  emoji: '🌙', gradientA: '#4facfe', gradientB: '#00f2fe', persona: 'Students' },
  { id: 'slate',    name: 'Slate Pro', emoji: '💼', gradientA: '#6366f1', gradientB: '#0ea5e9', persona: 'Freelancers' },
  { id: 'neon',     name: 'Neon',      emoji: '⚡', gradientA: '#00d2ff', gradientB: '#e100ff', persona: 'Freelancers' },
  { id: 'ocean',    name: 'Ocean',     emoji: '🔷', gradientA: '#1d4ed8', gradientB: '#1e40af', persona: 'Universal' },
];

export const DEFAULT_PALETTE: PaletteId = 'ocean';
```

- [ ] **Step 2: Create PaletteProvider**

Create `src/providers/palette-provider.tsx`:

```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { DEFAULT_PALETTE, type PaletteId } from '@/lib/themes';

const STORAGE_KEY = 'fleucy-palette';

interface PaletteContextValue {
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  paletteId: DEFAULT_PALETTE,
  setPalette: () => {},
});

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as PaletteId | null;
    const initial = stored ?? DEFAULT_PALETTE;
    setPaletteState(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteState(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute('data-theme', id);
  }, []);

  return (
    <PaletteContext.Provider value={{ paletteId, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}
```

- [ ] **Step 3: Write a unit test for the theme config**

Create `src/tests/unit/themes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PALETTES, DEFAULT_PALETTE } from '@/lib/themes';

describe('PALETTES', () => {
  it('has exactly 6 entries', () => {
    expect(PALETTES).toHaveLength(6);
  });

  it('every palette has required fields', () => {
    for (const p of PALETTES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.gradientA).toMatch(/^#/);
      expect(p.gradientB).toMatch(/^#/);
    }
  });

  it('DEFAULT_PALETTE is in PALETTES', () => {
    expect(PALETTES.map(p => p.id)).toContain(DEFAULT_PALETTE);
  });
});
```

- [ ] **Step 4: Run the test**

```bash
pnpm test:run src/tests/unit/themes.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/themes.ts src/providers/palette-provider.tsx src/tests/unit/themes.test.ts
git commit -m "feat(theme): add palette config and PaletteProvider"
```

---

## Task 4 — Wire PaletteProvider into Root Layout

**Files:** `src/app/layout.tsx`

- [ ] **Step 1: Add PaletteProvider to the provider tree**

Edit `src/app/layout.tsx`:

```tsx
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { PaletteProvider } from '@/providers/palette-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleucy',
  description: 'Personal finance OS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen antialiased">
          <ThemeProvider>
            <PaletteProvider>
              <QueryProvider>
                {children}
                <Toaster richColors position="top-right" />
              </QueryProvider>
            </PaletteProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Verify app still starts**

```bash
pnpm dev
```

Open http://localhost:3000. Check browser DevTools → `<html>` element should have `data-theme="ocean"` attribute after hydration. Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(theme): wire PaletteProvider into root layout"
```

---

## Task 5 — Theme Switcher Component

**Files:** Create `src/components/theme-switcher.tsx`

- [ ] **Step 1: Create the theme switcher**

```tsx
'use client';

import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PALETTES, type PaletteId } from '@/lib/themes';
import { usePalette } from '@/providers/palette-provider';

export function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const { paletteId, setPalette } = usePalette();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Palette swatches */}
      <div
        className="flex gap-1.5 overflow-hidden transition-all duration-200"
        style={{ maxWidth: collapsed ? 40 : 200 }}
      >
        {collapsed ? (
          <Palette className="size-5 text-[var(--color-muted)]" />
        ) : (
          PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => setPalette(p.id)}
              className="size-6 flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                background: `linear-gradient(135deg, ${p.gradientA}, ${p.gradientB})`,
                boxShadow:
                  paletteId === p.id
                    ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${p.gradientA}`
                    : 'none',
              }}
            />
          ))
        )}
      </div>

      {/* Dark / Light toggle */}
      {!collapsed && (
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-white/5"
        >
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/theme-switcher.tsx
git commit -m "feat(theme): add ThemeSwitcher component"
```

---

## Task 6 — Icon Rail Sidebar

**Files:** Rewrite `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar**

Replace the entire content of `src/components/layout/sidebar.tsx`:

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { UserButton } from '@clerk/nextjs';

const items = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ListChecks },
  { href: '/accounts',     label: 'Accounts',     icon: Wallet },
  { href: '/debts',        label: 'Debts',        icon: Users },
  { href: '/categories',   label: 'Categories',   icon: Tag },
  { href: '/settings',     label: 'Settings',     icon: Settings },
];

const COLLAPSED_W = 64;
const EXPANDED_W = 220;

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.aside
      className="hidden md:flex flex-col border-r border-[var(--color-border)] overflow-hidden"
      animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      transition={spring}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        background: 'var(--color-sidebar-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 overflow-hidden">
        <div
          className="size-8 flex-shrink-0 rounded-lg"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-a), var(--color-gradient-b))' }}
        />
        <AnimatePresence>
          {expanded && (
            <motion.span
              key="logo-label"
              className="text-base font-bold whitespace-nowrap overflow-hidden"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              Fleucy
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors overflow-hidden"
              style={{
                background: active ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                borderLeft: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >
              <Icon className="size-5 flex-shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    key={`label-${href}`}
                    className="text-sm font-medium whitespace-nowrap"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.12 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: theme switcher + user */}
      <div className="flex flex-col gap-3 pb-4 pt-2 overflow-hidden">
        <ThemeSwitcher collapsed={!expanded} />
        <div className="px-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </motion.aside>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Visual check — start dev server**

```bash
pnpm dev
```

Open http://localhost:3000/dashboard. Sidebar should be 64px wide. Hover → expands to 220px with spring animation. Labels slide in. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(sidebar): icon rail with glassmorphism and Framer Motion"
```

---

## Task 7 — Shell Layout + Header Cleanup

**Files:**
- Modify: `src/components/layout/shell.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Update shell grid column**

In `src/components/layout/shell.tsx`, change `md:grid-cols-[14rem_1fr]` to `md:grid-cols-[64px_1fr]`:

```tsx
import { BottomNav } from './bottom-nav';
import { Header } from './header';
import { Sidebar } from './sidebar';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[64px_1fr]">
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 pb-20 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Update bottom nav active color**

In `src/components/layout/bottom-nav.tsx`, replace the active className with a style prop so it picks up the theme primary:

```tsx
'use client';

import { LayoutDashboard, ListChecks, Menu, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ListChecks },
  { href: '/debts',        label: 'Debts',        icon: Users },
  { href: '/settings',     label: 'Settings',     icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-card)] md:hidden"
      style={{ backdropFilter: 'blur(12px)', background: 'var(--color-sidebar-glass)' }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors"
            style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted)' }}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Remove theme toggle from header (now in sidebar)**

Read `src/components/layout/header.tsx` first, then remove the theme toggle button (`useTheme` / Sun / Moon icon block). Keep the rest (currency indicator, bell, UserButton if present). The exact edit depends on what's in header.tsx — find and remove only the dark/light toggle portion.

- [ ] **Step 4: Visual check**

```bash
pnpm dev
```

Sidebar should overlay the grid correctly (not push content sideways), because the sidebar uses absolute/fixed positioning at 64px but with `md:grid-cols-[64px_1fr]` the grid accounts for it. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/shell.tsx src/components/layout/bottom-nav.tsx src/components/layout/header.tsx
git commit -m "feat(layout): update shell grid, bottom-nav theme color, remove header toggle"
```

---

## Task 8 — BentoGrid Wrapper

**Files:** Create `src/features/dashboard/tiles/bento-grid.tsx`

- [ ] **Step 1: Create bento grid with Framer Motion stagger**

```tsx
'use client';

import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

export const tileVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
};

export function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      // grid-cols-1 on mobile, 4-col bento on md+
      className="grid gap-4 grid-cols-1 md:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function BentoTile({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={tileVariants}
      whileHover={{ y: -3, boxShadow: '0 20px 40px var(--color-glow)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/tiles/bento-grid.tsx
git commit -m "feat(dashboard): add BentoGrid and BentoTile with Framer Motion"
```

---

## Task 9 — NetWorthTile

**Files:** Create `src/features/dashboard/tiles/net-worth-tile.tsx`

- [ ] **Step 1: Create the hero gradient tile with count-up animation**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { animate, motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useNetWorth } from '@/features/dashboard/queries';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

function AnimatedNumber({ value }: { value: bigint }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const target = Number(value);
    const controls = animate(0, target, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate(v) {
        if (ref.current) {
          ref.current.textContent = formatRMB(BigInt(Math.round(v)));
        }
      },
    });
    return () => controls.stop();
  }, [value]);

  return <span ref={ref}>¥0.00</span>;
}

export function NetWorthTile() {
  const { data, isLoading, isError, refetch } = useNetWorth();

  return (
    <BentoTile
      className="flex flex-col justify-between min-h-[120px] md:[grid-column:1/4]"
      style={{
        background: 'linear-gradient(135deg, var(--color-gradient-a), var(--color-gradient-b))',
        border: 'none',
        color: '#fff',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-80">Total Net Worth</p>
        <TrendingUp className="size-4 opacity-60" />
      </div>

      {isError ? (
        <button type="button" className="text-sm underline opacity-80" onClick={() => refetch()}>
          Failed — Retry
        </button>
      ) : isLoading ? (
        <div className="h-10 w-48 animate-pulse rounded-lg bg-white/20" />
      ) : (
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
          <AnimatedNumber value={data ?? 0n} />
        </p>
      )}
    </BentoTile>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/tiles/net-worth-tile.tsx
git commit -m "feat(dashboard): add NetWorthTile with count-up animation"
```

---

## Task 10 — StatTile (Income / Expense / Net)

**Files:** Create `src/features/dashboard/tiles/stat-tile.tsx`

- [ ] **Step 1: Create reusable stat tile**

```tsx
'use client';

import type { LucideIcon } from 'lucide-react';
import { BentoTile } from './bento-grid';
import { formatRMB } from '@/lib/money';

interface StatTileProps {
  label: string;
  value: bigint;
  icon: LucideIcon;
  accentColor: string;
  className?: string;
}

export function StatTile({ label, value, icon: Icon, accentColor, className }: StatTileProps) {
  return (
    <BentoTile
      className={className}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <Icon className="size-3.5" style={{ color: accentColor }} />
        {label}
      </div>
      <p
        className="mt-2 text-2xl font-bold tabular-nums"
        style={{ color: accentColor }}
      >
        {formatRMB(value)}
      </p>
    </BentoTile>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/tiles/stat-tile.tsx
git commit -m "feat(dashboard): add StatTile component"
```

---

## Task 11 — AccountsTile

**Files:** Create `src/features/dashboard/tiles/accounts-tile.tsx`

- [ ] **Step 1: Create accounts tile**

```tsx
'use client';

import { Wallet } from 'lucide-react';
import { useAccountBalances } from '@/features/accounts/queries';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

export function AccountsTile() {
  const { data, isLoading, isError, refetch } = useAccountBalances();

  const accounts = data ?? [];
  const maxBalance = accounts.reduce((m, a) => {
    const b = BigInt(a.balance_fen);
    return b > m ? b : m;
  }, 1n);

  return (
    <BentoTile className="md:[grid-column:4/5] md:[grid-row:1/3]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[var(--color-muted)]">Accounts</p>
        <Wallet className="size-4 text-[var(--color-muted)]" />
      </div>

      {isError && (
        <button type="button" onClick={() => refetch()} className="text-xs underline text-[var(--color-muted)]">
          Retry
        </button>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3 overflow-y-auto max-h-[280px]">
          {accounts.length === 0 && (
            <p className="text-xs text-[var(--color-muted)]">No accounts yet.</p>
          )}
          {accounts.map((acc) => {
            const balance = BigInt(acc.balance_fen);
            const pct = maxBalance > 0n ? Number((balance * 100n) / maxBalance) : 0;
            return (
              <div key={acc.account_id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate text-[var(--color-fg)]">{acc.name}</span>
                  <span className="tabular-nums text-[var(--color-muted)]">
                    {formatRMB(balance)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--color-gradient-a), var(--color-gradient-b))',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BentoTile>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/tiles/accounts-tile.tsx
git commit -m "feat(dashboard): add AccountsTile with balance bars"
```

---

## Task 12 — TrendChartTile (Recharts)

**Files:** Create `src/features/dashboard/tiles/trend-chart-tile.tsx`

- [ ] **Step 1: Create the line chart tile**

```tsx
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMonthlyTrend } from '@/features/dashboard/queries';
import { fenToDisplay } from '@/lib/money';
import { BentoTile } from './bento-grid';

export function TrendChartTile() {
  const { data, isLoading, isError, refetch } = useMonthlyTrend(6);

  const chartData = (data ?? []).map((r) => ({
    label: r.label,
    income: Number(r.income) / 100,
    expense: Number(r.expense) / 100,
  }));

  return (
    <BentoTile className="md:[grid-column:1/4] md:[grid-row:3/4]">
      <p className="mb-4 text-sm font-medium text-[var(--color-muted)]">
        Income vs Expense — last 6 months
      </p>

      {isError && (
        <button type="button" onClick={() => refetch()} className="text-xs underline text-[var(--color-muted)]">
          Retry
        </button>
      )}

      {isLoading && (
        <div className="h-48 animate-pulse rounded-lg bg-[var(--color-border)]" />
      )}

      {!isLoading && !isError && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `¥${v}`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`¥${v.toFixed(2)}`, '']}
              labelStyle={{ color: 'var(--color-fg)' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: 'var(--color-muted)' }}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="var(--color-danger)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </BentoTile>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/tiles/trend-chart-tile.tsx
git commit -m "feat(dashboard): add TrendChartTile with Recharts LineChart"
```

---

## Task 13 — CategoryTile (Recharts Donut)

**Files:** Create `src/features/dashboard/tiles/category-tile.tsx`

- [ ] **Step 1: Create the donut chart tile**

```tsx
'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExpenseByCategory } from '@/features/dashboard/queries';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

export function CategoryTile() {
  const { data, isLoading, isError, refetch } = useExpenseByCategory();

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.total, 0n);

  const chartData = rows.map((r) => ({
    name: r.name,
    value: Number(r.total),
    color: r.color,
    pct: total > 0n ? Number((r.total * 10000n) / total) / 100 : 0,
  }));

  return (
    <BentoTile className="md:[grid-column:4/5] md:[grid-row:3/4]">
      <p className="mb-3 text-sm font-medium text-[var(--color-muted)]">
        By category
      </p>

      {isError && (
        <button type="button" onClick={() => refetch()} className="text-xs underline text-[var(--color-muted)]">
          Retry
        </button>
      )}

      {isLoading && (
        <div className="h-40 animate-pulse rounded-lg bg-[var(--color-border)]" />
      )}

      {!isLoading && !isError && total === 0n && (
        <p className="text-xs text-[var(--color-muted)]">No expense data yet.</p>
      )}

      {!isLoading && !isError && total > 0n && (
        <>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [formatRMB(BigInt(v)), '']}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 space-y-1.5">
            {chartData.slice(0, 4).map((r) => (
              <div key={r.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="truncate max-w-[90px] text-[var(--color-fg)]">{r.name}</span>
                </div>
                <span className="tabular-nums text-[var(--color-muted)]">{r.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </BentoTile>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/tiles/category-tile.tsx
git commit -m "feat(dashboard): add CategoryTile with Recharts PieChart donut"
```

---

## Task 14 — Dashboard Page Assembly

**Files:** Rewrite `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Rewrite the dashboard page**

Replace the entire content of `src/app/(app)/dashboard/page.tsx`:

```tsx
'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useMonthSummary } from '@/features/dashboard/queries';
import { AccountsTile } from '@/features/dashboard/tiles/accounts-tile';
import { BentoGrid } from '@/features/dashboard/tiles/bento-grid';
import { CategoryTile } from '@/features/dashboard/tiles/category-tile';
import { NetWorthTile } from '@/features/dashboard/tiles/net-worth-tile';
import { StatTile } from '@/features/dashboard/tiles/stat-tile';
import { TrendChartTile } from '@/features/dashboard/tiles/trend-chart-tile';
import { QuickAddModal } from '../transactions/quick-add-modal';

function MonthStats() {
  const { data, isLoading } = useMonthSummary();
  const income = data?.income ?? 0n;
  const expense = data?.expense ?? 0n;
  const net = data?.net ?? 0n;

  if (isLoading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 h-[88px] animate-pulse" />
        ))}
      </>
    );
  }

  return (
    <>
      <StatTile
        label="Income"
        value={income}
        icon={TrendingUp}
        accentColor="var(--color-success)"
        className="md:[grid-column:1/2] md:[grid-row:2/3]"
      />
      <StatTile
        label="Expense"
        value={expense}
        icon={TrendingDown}
        accentColor="var(--color-danger)"
        className="md:[grid-column:2/3] md:[grid-row:2/3]"
      />
      <StatTile
        label="Net"
        value={net}
        icon={Minus}
        accentColor={net >= 0n ? 'var(--color-success)' : 'var(--color-danger)'}
        className="md:[grid-column:3/4] md:[grid-row:2/3]"
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <QuickAddModal />
      </div>

      <BentoGrid>
        {/* Row 1 */}
        <NetWorthTile />
        <AccountsTile />

        {/* Row 2 */}
        <MonthStats />

        {/* Row 3 */}
        <TrendChartTile />
        <CategoryTile />
      </BentoGrid>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Visual check in browser**

```bash
pnpm dev
```

Open http://localhost:3000/dashboard. Verify:
- Bento grid tiles stagger in on load
- Net worth tile spans 3 columns with gradient background  
- Income / Expense / Net tiles in row 2
- Accounts tile spans rows 1-2 on the right
- Line chart in row 3 spans 3 cols
- Donut chart in row 3 col 4
- Mobile: visit at 375px width → single column stack
- Hover a tile → lifts 3px with glow shadow

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): assemble bento grid with all tiles"
```

---

## Task 15 — Theme Switcher End-to-End Test

- [ ] **Step 1: Manual theme switching**

```bash
pnpm dev
```

Test each theme:
1. Hover sidebar → expand → click the palette dots
2. Switch to **Aurora** dark → page bg turns deep purple, gradient tile shifts to purple/pink
3. Switch to **Blossom** dark → bg shifts to dark rose, gradient tile is coral/peach
4. Switch to **Midnight** dark → near-black navy bg, gradient is electric blue/cyan
5. Switch to **Slate Pro** dark → slate blue bg, gradient is indigo/sky
6. Switch to **Neon** dark → pure black, gradient is cyan/magenta
7. Switch to **Ocean** light → white bg, blue accents
8. Reload page → theme persists (localStorage)
9. Sidebar collapses back to 64px on mouse leave

Stop server.

- [ ] **Step 2: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass (including the new `themes.test.ts`).

- [ ] **Step 3: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: zero errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(dashboard): complete redesign — bento grid, themes, animated sidebar"
```
