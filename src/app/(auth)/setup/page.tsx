'use client';

import { useState } from 'react';
import { PinStep } from './pin-step';
import { TelegramStep } from './telegram-step';

export default function SetupPage() {
  const [step, setStep] = useState<'pin' | 'telegram'>('pin');

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <p className="mb-4 text-xs uppercase tracking-wide text-[var(--color-muted)]">
        Step {step === 'pin' ? 1 : 2} of 2
      </p>
      {step === 'pin' ? <PinStep onDone={() => setStep('telegram')} /> : <TelegramStep />}
    </div>
  );
}
