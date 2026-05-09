import 'server-only';

type SecurityEvent = {
  event: string;
  userId?: string;
  outcome: 'success' | 'failure';
  detail?: string;
};

export function logSecurityEvent(input: SecurityEvent) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: 'security',
      ...input,
    }),
  );
}
