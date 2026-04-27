'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeSetupAction, setTelegramAction } from './actions';

export function TelegramStep() {
  const [enabled, setEnabled] = useState(false);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await setTelegramAction(fd);
      await completeSetupAction();
    });
  };

  const onSkip = () =>
    start(async () => {
      await completeSetupAction();
    });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Bind Telegram (optional)</h2>
      <p className="text-sm text-[var(--color-muted)]">
        Reminders can be pushed to your Telegram via n8n. Paste your Telegram chat id (find it via
        @userinfobot). You can change or skip this later.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable Telegram reminders
      </label>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="chatId">Telegram chat id</Label>
          <Input id="chatId" name="chatId" placeholder="e.g. 123456789" />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={pending}>
          Skip
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? 'Finishing…' : 'Finish setup'}
        </Button>
      </div>
    </form>
  );
}
