import { LayoutDashboard, ListChecks, Menu, Users } from 'lucide-react';
import Link from 'next/link';

const items = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/transactions', label: 'Tx', icon: ListChecks },
  { href: '/debts', label: 'Debts', icon: Users },
  { href: '/settings', label: 'More', icon: Menu },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-card)] md:hidden">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2 text-xs">
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
