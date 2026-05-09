import Link from 'next/link';

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Support</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Need help? Contact Fleucy support and include steps to reproduce the issue.
      </p>
      <div className="rounded-md border border-[var(--color-border)] p-4 text-sm">
        <p>
          Email:{' '}
          <a className="underline" href="mailto:support@fleucy.app">
            support@fleucy.app
          </a>
        </p>
        <p className="mt-1 text-[var(--color-muted)]">
          Target response time: within 2 business days.
        </p>
      </div>
      <Link href="/settings" className="text-sm underline">
        Back to settings
      </Link>
    </main>
  );
}
