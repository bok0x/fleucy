import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  userId: string;
  /** Unix ms */
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

export function signSession(payload: SessionPayload, secret: string): string {
  const json = JSON.stringify(payload);
  const body = b64url(json);
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string, secret: string): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const dotIndex = token.lastIndexOf('.');
  const body = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!body || !sig) return null;

  const expected = createHmac('sha256', secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sig);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
