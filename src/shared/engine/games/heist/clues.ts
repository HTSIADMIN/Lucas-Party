// Clue generation for Heist Night. Codes use distinct digits. We build every
// clue that's TRUE for the secret code, then add them in random order —
// keeping only clues that rule something out — until exactly one code fits.

export interface Clue {
  text: string;
  test(code: number[]): boolean;
}

const ORD = ["1st", "2nd", "3rd", "4th", "5th"];

/** Every code of `length` distinct digits. */
export function allCodes(length: number): number[][] {
  const out: number[][] = [];
  const walk = (prefix: number[]) => {
    if (prefix.length === length) return void out.push(prefix);
    for (let d = 0; d <= 9; d++) if (!prefix.includes(d)) walk([...prefix, d]);
  };
  walk([]);
  return out;
}

/** All clues that are true for this code. */
export function trueClues(code: number[]): Clue[] {
  const n = code.length;
  const clues: Clue[] = [];
  const sum = code.reduce((a, b) => a + b, 0);
  clues.push({ text: `The digits add up to ${sum}.`, test: (c) => c.reduce((a, b) => a + b, 0) === sum });
  for (let i = 0; i < n; i++) {
    const d = code[i]!;
    const parity = d % 2 === 0 ? "even" : "odd";
    clues.push({ text: `The ${ORD[i]} digit is ${parity}.`, test: (c) => c[i]! % 2 === d % 2 });
    const lo = Math.max(0, d - 2);
    const hi = Math.min(9, d + 1);
    clues.push({ text: `The ${ORD[i]} digit is between ${lo} and ${hi}.`, test: (c) => c[i]! >= lo && c[i]! <= hi });
    clues.push({ text: d >= 5 ? `The ${ORD[i]} digit is 5 or more.` : `The ${ORD[i]} digit is 4 or less.`, test: (c) => (c[i]! >= 5) === (d >= 5) });
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const e = code[j]!;
      if (d > e) clues.push({ text: `The ${ORD[i]} digit is bigger than the ${ORD[j]}.`, test: (c) => c[i]! > c[j]! });
      if (d - e > 0 && d - e <= 4) clues.push({ text: `The ${ORD[i]} digit is ${d - e} more than the ${ORD[j]}.`, test: (c) => c[i]! - c[j]! === d - e });
    }
  }
  for (let digit = 0; digit <= 9; digit++) {
    if (code.includes(digit)) clues.push({ text: `There's a ${digit} somewhere in the code.`, test: (c) => c.includes(digit) });
    else clues.push({ text: `There's no ${digit} in the code.`, test: (c) => !c.includes(digit) });
  }
  const max = Math.max(...code);
  const maxAt = code.indexOf(max);
  clues.push({ text: `The biggest digit is in the ${ORD[maxAt]} spot.`, test: (c) => c.indexOf(Math.max(...c)) === maxAt });
  const min = Math.min(...code);
  const minAt = code.indexOf(min);
  clues.push({ text: `The smallest digit is in the ${ORD[minAt]} spot.`, test: (c) => c.indexOf(Math.min(...c)) === minAt });
  return clues;
}

/** Picks clues (in `shuffle` order) until exactly one code fits. */
export function solveSet(code: number[], shuffle: <T>(items: readonly T[]) => T[]): Clue[] {
  let candidates = allCodes(code.length);
  const chosen: Clue[] = [];
  for (const clue of shuffle(trueClues(code))) {
    const next = candidates.filter((c) => clue.test(c));
    if (next.length === candidates.length) continue;
    chosen.push(clue);
    candidates = next;
    if (candidates.length === 1) break;
  }
  return chosen;
}

/** How many digits of a guess are the right digit in the right spot. */
export function inPlace(code: number[], guess: number[]): number {
  return guess.filter((d, i) => code[i] === d).length;
}
