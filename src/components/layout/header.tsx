'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
      <div className="text-sm text-[var(--color-muted)]">¥ RMB</div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: 'size-7' } }} />
      </div>
    </header>
  );
}
