import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-sm text-[var(--color-muted)]">
        The page you are looking for does not exist or was moved.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
