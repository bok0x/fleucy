'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js requires this exact function name
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-[var(--color-muted)]">
        We could not load this page. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
