import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CharacterId, MeResponse } from "@party/shared";
import { api } from "./api";

export type Me = NonNullable<MeResponse["user"]>;

interface AuthValue {
  user: Me | null;
  loading: boolean;
  refresh(): Promise<void>;
  login(username: string, password: string): Promise<Me>;
  signup(input: { username: string; password: string; displayName?: string; character?: CharacterId }): Promise<Me>;
  logout(): Promise<void>;
  update(patch: { displayName?: string; character?: CharacterId }): Promise<Me>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api<MeResponse>("/api/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      refresh,
      async login(username, password) {
        const res = await api<{ user: Me }>("/api/auth/login", { body: { username, password } });
        setUser(res.user);
        return res.user;
      },
      async signup(input) {
        const res = await api<{ user: Me }>("/api/auth/signup", { body: input });
        setUser(res.user);
        return res.user;
      },
      async logout() {
        await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        setUser(null);
      },
      async update(patch) {
        const res = await api<{ user: Me }>("/api/auth/me", { method: "PATCH", body: patch });
        setUser(res.user);
        return res.user;
      },
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
