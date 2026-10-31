import { useEffect, useState } from "react";
import type { ThemeId } from "@party/shared";
import { api } from "./api";

/** Short buzz on phones that support it. */
export function vibrate(pattern: number | number[] | undefined): void {
  if (!pattern) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

/** Keeps the screen awake while `active` (phones in a game, the TV always). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock?.release();
      } catch {
        // Denied or unsupported — the game still works.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}

export function useDocumentTheme(theme: ThemeId): void {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // ignore
  }
}

interface Meta { publicUrl: string | null; lanAddresses: string[] }
let metaPromise: Promise<Meta> | null = null;

/**
 * The address phones should type to join. Uses PUBLIC_URL when configured; in
 * development on localhost it swaps in the computer's LAN IP so phones on the
 * same Wi-Fi can reach it.
 */
export function useJoinBase(): { href: string; display: string } {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    metaPromise ??= api<Meta>("/api/meta").catch(() => ({ publicUrl: null, lanAddresses: [] }));
    void metaPromise.then(setMeta);
  }, []);
  let href = window.location.origin;
  if (meta?.publicUrl) href = meta.publicUrl;
  else if (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) && meta?.lanAddresses[0]) {
    href = `${window.location.protocol}//${meta.lanAddresses[0]}${window.location.port ? `:${window.location.port}` : ""}`;
  }
  return { href, display: href.replace(/^https?:\/\//, "") };
}
