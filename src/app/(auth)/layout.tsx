import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {children}
        <div className="flex justify-center gap-4 text-xs text-[var(--color-muted)]">
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline">
            Terms
          </Link>
          <Link href="/support" className="underline">
            Support
          </Link>
        </div>
      </div>
    </main>
  );
}
