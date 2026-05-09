'use client';

import { type ChangeEvent, useEffect, useState } from 'react';
import { fenToDisplay } from '@/lib/money';
import { cn } from '@/lib/utils/cn';

interface Props {
  value: bigint;
  onChange: (fen: bigint) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Controlled money input. Displays in yuan (e.g. "123.45"),
 * communicates in bigint fen to parent. Shows ¥ prefix label.
 */
export function AmountInput({
  value,
  onChange,
  placeholder = '0.00',
  disabled,
  className,
  id,
}: Props) {
  const [display, setDisplay] = useState(value === 0n ? '' : fenToDisplay(value));

  useEffect(() => {
    setDisplay(value === 0n ? '' : fenToDisplay(value));
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits and dot, then enforce single dot + 2dp
    let s = e.target.value.replace(/[^\d.]/g, '');
    const dot = s.indexOf('.');
    if (dot !== -1) {
      s =
        s.slice(0, dot + 1) +
        s
          .slice(dot + 1)
          .replace(/\./g, '')
          .slice(0, 2);
    }

    setDisplay(s);

    if (!s || s === '.') {
      onChange(0n);
      return;
    }
    const fen = BigInt(Math.round(Number.parseFloat(s) * 100));
    onChange(fen);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
        ¥
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent pl-7 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
    </div>
  );
}
