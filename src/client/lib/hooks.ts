import { useEffect, useReducer, useRef, useState } from "react";
import type { RoomEvent } from "@party/shared";
import { HostSession, type ScreenCredentials } from "../realtime/host";
import { ViewerSession } from "../realtime/viewer";
import { RoomClient, type JoinDetails } from "./roomClient";

/** Anything that can tell the room's time (the TV's clock). */
export interface ClockLike {
  serverNow(): number;
}

/**
 * A phone's connection, owned for the component's lifetime. Pass `join: null`
 * until the player has picked a name — nothing connects until then.
 */
export function useRoomClient(code: string | undefined, join: JoinDetails | null, onEvent?: (e: RoomEvent) => void): RoomClient | null {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [client, setClient] = useState<RoomClient | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const joinKey = join ? `${join.name ?? ""}|${join.character ?? ""}` : null;

  useEffect(() => {
    if (!code || joinKey === null) return;
    const c = new RoomClient({ code, join: join ?? {}, onChange: rerender, onEvent: (e) => onEventRef.current?.(e) });
    setClient(c);
    return () => {
      c.close();
      setClient(null);
    };
    // `join` is captured through joinKey on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, joinKey]);

  return client;
}

/** The TV: hosts the room when this tab holds its credentials, otherwise watches. */
export function useTvSession(
  code: string,
  creds: ScreenCredentials | null,
  tvUserId: string | null,
  onEvent?: (e: RoomEvent) => void,
): HostSession | ViewerSession | null {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [sessionObj, setSession] = useState<HostSession | ViewerSession | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const credsKey = creds ? `${creds.code}:${creds.screenKey}` : null;
  const userRef = useRef(tvUserId);
  userRef.current = tvUserId;

  useEffect(() => {
    const s = creds
      ? new HostSession(creds, { onChange: rerender, onEvent: (e) => onEventRef.current?.(e), tvUserId: userRef.current })
      : new ViewerSession(code, rerender);
    setSession(s);
    return () => {
      s.dispose();
      setSession(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, credsKey]);

  return sessionObj;
}

/** Re-renders every `ms` and returns the current room time. */
export function useServerNow(client: ClockLike | null, ms = 250): number {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = window.setInterval(tick, ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return client ? client.serverNow() : Date.now();
}

/**
 * Countdown toward a room deadline. Also tracks the phase's full length (the
 * gap between first seeing a deadline and the deadline itself) for rings/bars.
 */
export function useCountdown(client: ClockLike | null, deadline: number | null, pausedRemainingMs: number | null = null) {
  const now = useServerNow(client, 200);
  const totalRef = useRef<{ deadline: number; total: number } | null>(null);
  if (deadline !== null && totalRef.current?.deadline !== deadline) {
    const fresh = Math.max(1, deadline - now);
    // A deadline that moved later (host added time) keeps the larger total.
    const prev = totalRef.current;
    totalRef.current = { deadline, total: prev && deadline > prev.deadline && deadline - prev.deadline < 61_000 ? Math.max(prev.total, fresh) : fresh };
  }
  if (pausedRemainingMs !== null) {
    const total = totalRef.current?.total ?? pausedRemainingMs;
    return { remainingMs: pausedRemainingMs, total, fraction: Math.min(1, pausedRemainingMs / total), seconds: Math.ceil(pausedRemainingMs / 1000) };
  }
  if (deadline === null) return { remainingMs: 0, total: 0, fraction: 0, seconds: 0 };
  const remainingMs = Math.max(0, deadline - now);
  const total = totalRef.current?.total ?? remainingMs;
  return { remainingMs, total, fraction: total ? Math.min(1, remainingMs / total) : 0, seconds: Math.ceil(remainingMs / 1000) };
}

/** requestAnimationFrame loop that hands you the current room time. */
export function useAnimationFrame(active: boolean, callback: (serverNow: number) => void, client: ClockLike | null) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      cb.current(client ? client.serverNow() : Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, client]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
