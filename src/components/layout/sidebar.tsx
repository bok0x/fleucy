import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Settings,
  Tag,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ListChecks },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/debts', label: 'Debts', icon: Users },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/budgets', label: 'Budgets', icon: Target },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden border-r border-[var(--color-border)] bg-[var(--color-card)] md:flex md:w-56 md:flex-col">
      <div className="px-4 py-5 text-lg font-semibold">Fleucy</div>
      <nav className="flex-1 space-y-1 px-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
