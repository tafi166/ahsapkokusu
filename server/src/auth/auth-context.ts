import type { Role } from '../generated/prisma/client';

/** Who is making the request — set by AuthGuard on authenticated routes. */
export interface AuthContext {
  userId: string;
  role: Role;
  sessionId: string;
  csrfToken: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}
