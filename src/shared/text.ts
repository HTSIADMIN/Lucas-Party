// Control and invisible "format" characters (zero-width spaces, bidi overrides,
// BOMs…) have no business in a party-game answer and can garble the TV layout.
// The zero-width joiner is kept so multi-part emoji survive.
const ZWJ = String.fromCharCode(0x200d);
const STRIP_RE = new RegExp(`(?!${ZWJ})[\\p{Cc}\\p{Cf}]`, "gu");
const MARKS_RE = /\p{M}/gu;
const NON_ALNUM_RE = /[^\p{L}\p{N}]+/gu;

/**
 * Normalizes free text typed on a phone: collapses whitespace, strips control
 * characters, trims, and clamps to `max` characters without splitting emoji.
 */
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  const flat = input.replace(/\s+/g, " ").replace(STRIP_RE, "").trim();
  const chars = Array.from(flat);
  return chars.length > max ? chars.slice(0, max).join("").trim() : flat;
}

/** Case-, accent-, space- and punctuation-insensitive key ("Jinx!" detection, name clashes). */
export function textKey(input: string): string {
  return input.toLowerCase().normalize("NFKD").replace(MARKS_RE, "").replace(NON_ALNUM_RE, "");
}
