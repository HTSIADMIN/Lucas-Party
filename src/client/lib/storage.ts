// Storage can throw (private mode, blocked site data), so every access is guarded.

function wrap(get: () => Storage) {
  return {
    get(key: string): string | null {
      try {
        return get().getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        get().setItem(key, value);
      } catch {
        // ignore
      }
    },
    remove(key: string): void {
      try {
        get().removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

/** Survives across visits: remembered name, theme preference, sound settings. */
export const local = wrap(() => window.localStorage);
/** Per-tab: the seat token, so two tabs in one browser are two different players. */
export const session = wrap(() => window.sessionStorage);

export const KEYS = {
  name: "lp:name",
  character: "lp:character",
  siteTheme: "lp:theme",
  sound: "lp:sound",
  seat: (code: string) => `lp:seat:${code}`,
  join: (code: string) => `lp:join:${code}`,
  /** The hosting TV's credentials for a room (per tab). */
  screen: (code: string) => `lp:screen:${code}`,
  /** The hosting TV's room snapshot, so a refresh resumes mid-game. */
  screenSnapshot: (code: string) => `lp:screen-snap:${code}`,
};
