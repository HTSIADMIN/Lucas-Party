// Randomness for anything that decides an outcome. Uses the Web Crypto API,
// which exists in browsers (the TV runs the games) and in Node 19+ (tests,
// server). Never Math.random.

const cryptoApi: Crypto = globalThis.crypto;
const words = new Uint32Array(2);

/** Float in [0, 1) built from 53 random bits (a double's full precision). */
export function randomFloat(): number {
  cryptoApi.getRandomValues(words);
  return (words[0]! * 2 ** 21 + (words[1]! >>> 11)) / 2 ** 53;
}

/** Integer in [min, maxExclusive), without modulo bias. */
export function randomInt(min: number, maxExclusive: number): number {
  const range = maxExclusive - min;
  if (!Number.isInteger(range) || range <= 0) throw new Error(`bad range ${min}..${maxExclusive}`);
  return min + Math.floor(randomFloat() * range);
}

export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick() from an empty list");
  return items[randomInt(0, items.length)]!;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function randomToken(length = 18): string {
  let out = "";
  for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[randomInt(0, TOKEN_ALPHABET.length)];
  return out;
}
