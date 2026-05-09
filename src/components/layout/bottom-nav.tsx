'use client';

import { CreditCard, LayoutDashboard, ListChecks, Menu, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns', icon: ListChecks },
  { href: '/subscriptions', label: 'Subs', icon: CreditCard },
  { href: '/debts', label: 'Debts', icon: Users },
  { href: '/settings', label: 'Settings', icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] md:hidden"
      style={{
        backdropFilter: 'blur(12px)',
        background: 'var(--color-sidebar-glass)',
      }}
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
