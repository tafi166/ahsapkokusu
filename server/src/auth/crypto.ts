import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';

/** 256-bit random token, URL-safe. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

// Verified against when the email is unknown, so both failure paths cost the same.
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(hash: string | null, password: string): Promise<boolean> {
  if (hash === null) {
    dummyHash ??= hashPassword(randomToken());
    await argon2.verify(await dummyHash, password);
    return false;
  }
  return argon2.verify(hash, password);
}
