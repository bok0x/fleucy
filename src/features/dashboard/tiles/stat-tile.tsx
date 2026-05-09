'use client';

import type { LucideIcon } from 'lucide-react';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

interface StatTileProps {
  label: string;
  value: bigint;
  icon: LucideIcon;
  accentColor: string;
  className?: string;
}

export function StatTile({ label, value, icon: Icon, accentColor, className }: StatTileProps) {
  return (
    <BentoTile className={className} style={{ borderLeft: `3px solid ${accentColor}` }}>
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <Icon className="size-3.5" style={{ color: accentColor }} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: accentColor }}>
        {formatRMB(value)}
      </p>
    </BentoTile>
  );
}
