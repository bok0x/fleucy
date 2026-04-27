export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Welcome to Fleucy. Widgets arrive in Phase 1.
        </p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center text-sm text-[var(--color-muted)]">
        Phase 0 complete — foundation is wired up.
      </div>
    </div>
  );
}
