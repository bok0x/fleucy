import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/session';

const SECRET = 'a'.repeat(64);

describe('signSession/verifySession', () => {
  it('round-trips a payload', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() + 60_000 }, SECRET);
    const result = verifySession(token, SECRET);
    expect(result?.userId).toBe('u_1');
  });
  it('returns null on tampered payload', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() + 60_000 }, SECRET);
    const tampered = `${token.slice(0, -2)}XX`;
    expect(verifySession(tampered, SECRET)).toBeNull();
  });
  it('returns null when expired', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() - 1 }, SECRET);
    expect(verifySession(token, SECRET)).toBeNull();
  });
  it('returns null when secret differs', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() + 60_000 }, SECRET);
    expect(verifySession(token, 'b'.repeat(64))).toBeNull();
  });
  it('returns null on garbage input', () => {
    expect(verifySession('garbage', SECRET)).toBeNull();
    expect(verifySession('', SECRET)).toBeNull();
  });
});
