import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Fleucy is provided on a best-effort basis for personal finance tracking. You are responsible
        for validating your own financial records and decisions.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Keep your login and PIN credentials secure.</li>
        <li>Do not misuse or abuse the service.</li>
        <li>Data export and deletion controls are available in Settings.</li>
        <li>The service may evolve during beta and features may change.</li>
      </ul>
      <Link href="/dashboard" className="text-sm underline">
        Back to app
      </Link>
    </main>
  );
}
