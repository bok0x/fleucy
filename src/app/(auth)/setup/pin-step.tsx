'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setPinAction } from './actions';

export function PinStep({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await setPinAction(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Set your PIN</h2>
      <p className="text-sm text-[var(--color-muted)]">
        4–6 digits. You'll enter this every time you open the app.
      </p>

      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm PIN</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          required
        />
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
