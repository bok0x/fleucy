import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Fleucy stores your finance records under your user account and protects tenant data with
        row-level security. You can export your data or delete your account data from Settings.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Data collected: transactions, accounts, categories, debts, people, and settings.</li>
        <li>Authentication is handled by Clerk.</li>
        <li>Database and file storage are hosted via Supabase.</li>
        <li>Session lock is enforced by a PIN cookie and expiry controls.</li>
      </ul>
      <p className="text-sm text-[var(--color-muted)]">
        Questions? Contact support via the in-app support page.
      </p>
      <Link href="/dashboard" className="text-sm underline">
        Back to app
      </Link>
    </main>
  );
}
