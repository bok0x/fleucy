'use client';

import { Delete, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { VerifyResult } from './actions';
import { verifyPinAction } from './actions';

export function Keypad() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const submit = (value: string) => {
    if (value.length < 4) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('pin', value);
      const result: VerifyResult = await verifyPinAction(fd);
      if (result.ok) {
        router.replace(next);
        return;
      }
      setPin('');
      switch (result.reason) {
        case 'invalid_format':
          setError('PIN must be 4–6 digits');
          break;
        case 'no_pin_set':
          toast.error('No PIN set. Complete setup first.');
          router.replace('/setup');
          break;
        case 'wrong_pin':
          setError(
            `Incorrect PIN. ${result.remaining} attempt${result.remaining === 1 ? '' : 's'} remaining.`,
          );
          break;
        case 'locked': {
          const minutes = Math.ceil(((result.lockedUntilMs ?? Date.now()) - Date.now()) / 60_000);
          setError(`Locked for ${minutes} more minute${minutes === 1 ? '' : 's'}.`);
          break;
        }
      }
    });
  };

  const tap = (digit: string) => {
    if (pending) return;
    setError(null);
    const newPin = (pin + digit).slice(0, 6);
    setPin(newPin);
    if (newPin.length >= 6) submit(newPin);
  };

  const back = () => {
    if (pending) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const DOT_KEYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'] as const;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <Lock className="size-8 text-[var(--color-muted)]" aria-hidden />
      <h1 className="text-xl font-semibold">Enter your PIN</h1>

      <div className="flex gap-3" aria-live="polite">
        {DOT_KEYS.map((k, i) => (
          <span
            key={k}
            className="size-3 rounded-full border border-[var(--color-border)]"
            style={{ background: i < pin.length ? 'var(--color-primary)' : 'transparent' }}
          />
        ))}
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Button
            key={d}
            type="button"
            variant="outline"
            className="h-14 w-14 text-lg"
            onClick={() => tap(d)}
            disabled={pending}
          >
            {d}
          </Button>
        ))}
        <div />
        <Button
          type="button"
          variant="outline"
          className="h-14 w-14 text-lg"
          onClick={() => tap('0')}
          disabled={pending}
        >
          0
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-14 w-14"
          onClick={back}
          disabled={pending}
          aria-label="Backspace"
        >
          <Delete className="size-5" />
        </Button>
      </div>

      <button
        type="button"
        onClick={() => submit(pin)}
        disabled={pin.length < 4 || pending}
        className="text-sm text-[var(--color-muted)] underline-offset-4 hover:underline disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}
