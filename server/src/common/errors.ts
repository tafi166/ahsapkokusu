import { Prisma } from '../generated/prisma/client';

/** Unique-constraint violation (e.g. a duplicate email) — callers turn it into 409. */
export function isUniqueConflict(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}
