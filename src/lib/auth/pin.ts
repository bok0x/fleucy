import { compare, hash } from 'bcryptjs';

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
