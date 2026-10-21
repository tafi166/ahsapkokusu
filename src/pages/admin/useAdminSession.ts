import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminUser } from "@/lib/adminApi";

export type AdminSession =
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  | { status: "signed-in"; user: AdminUser };

/** The admin's server-side session: resumed from the cookie on load, ended on logout. */
export function useAdminSession() {
  const [session, setSession] = useState<AdminSession>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    adminApi
      .me()
      .then((user) => {
        if (!cancelled) setSession(user ? { status: "signed-in", user } : { status: "signed-out" });
      })
      .catch((e: unknown) => {
        if (!cancelled) setSession({ status: "signed-out", error: e instanceof Error ? e.message : undefined });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await adminApi.login(email, password);
    setSession({ status: "signed-in", user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setSession({ status: "signed-out" });
    }
  }, []);

  return { session, login, logout };
}
