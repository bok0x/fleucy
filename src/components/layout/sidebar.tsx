'use client';

import { UserButton } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, ListChecks, Settings, Tag, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ListChecks },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/debts', label: 'Debts', icon: Users },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/settings', label: 'Settings', icon: Settings },
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
          style={{
            background: 'linear-gradient(135deg, var(--color-gradient-a), var(--color-gradient-b))',
          }}
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
                background: active
                  ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                  : 'transparent',
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
          <UserButton />
        </div>
      </div>
    </motion.aside>
  );
}
