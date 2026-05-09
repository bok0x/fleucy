'use client';

import { animate } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
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
