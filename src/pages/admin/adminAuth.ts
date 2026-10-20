/**
 * A soft client-side gate for `/admin` — NOT real authentication.
 *
 * This is a static SPA with no backend (see README "Known limitations"),
 * so there is no server to check a password against or a session to
 * secure. This exists only to stop the panel from being one accidental
 * click away for casual visitors; anyone who reads this file (or the
 * bundled JS) can see the password. Do not deploy this admin route on a
 * public domain without putting a real auth layer (or at least a
 * server-side basic-auth rule) in front of it.
 */
const SESSION_KEY = "parametrika.admin.authed.v1";
export const ADMIN_PASSWORD = "parametrika-admin";

export function isAdminAuthed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function tryAdminLogin(password: string): boolean {
  const ok = password === ADMIN_PASSWORD;
  if (ok) {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable — login still "succeeds" for this render but won't survive a refresh
    }
  }
  return ok;
}

export function adminLogout(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // noop
  }
}
