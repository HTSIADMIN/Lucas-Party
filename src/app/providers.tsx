"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AuthProvider } from "@/client/lib/auth";
import { ToastProvider } from "@/client/ui/Toasts";

/**
 * The whole UI is a live client app (TV screen, phone controller), so it
 * renders in the browser only — no server render to hydrate against.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
