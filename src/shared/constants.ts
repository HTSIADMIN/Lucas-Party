/** Hard cap on seats in one party. Late joiners past this get "room full". */
export const MAX_PLAYERS = 8;

export const ROOM_CODE_LENGTH = 4;
/** No vowels (so codes never spell words), no Y, nothing that reads like a digit. */
export const ROOM_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";

/** Names are shown on the TV in small seats, so they stay short. */
export const NAME_MAX = 14;
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function isRoomCode(input: string): boolean {
  if (input.length !== ROOM_CODE_LENGTH) return false;
  for (const ch of input) if (!ROOM_CODE_ALPHABET.includes(ch)) return false;
  return true;
}
