import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env';
import { signSession, verifySession } from './session';

const BCRYPT_COST = 12;

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return hash(pin, BCRYPT_COST);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return compare(pin, pinHash);
}

const COOKIE_NAME = 'pin_unlocked';

export async function setPinCookie(userId: string, lockMinutes: number): Promise<void> {
  const env = serverEnv();
  const exp = Date.now() + lockMinutes * 60_000;
  const token = signSession({ userId, exp }, env.PIN_SESSION_SECRET);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp),
  });
}

export async function clearPinCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function readPinCookie(): Promise<{ userId: string } | null> {
  const env = serverEnv();
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = verifySession(value, env.PIN_SESSION_SECRET);
  return payload ? { userId: payload.userId } : null;
}
