// The Bomb Squad manual: original rules for each module, written once and
// used both to solve puzzles (engine) and to print the expert's pages.

import type { BsWireColor } from "@party/shared";

// ── Wires ────────────────────────────────────────────────────────────────

const count = (wires: BsWireColor[], color: BsWireColor) => wires.filter((w) => w === color).length;
const lastIndexOf = (wires: BsWireColor[], color: BsWireColor) => wires.lastIndexOf(color);

/** The one wire to cut, by number of wires. */
export function wireToCut(wires: BsWireColor[]): number {
  const n = wires.length;
  if (n === 4) {
    if (count(wires, "white") === 0) return 2;
    if (wires[0] === "black") return n - 1;
    if (count(wires, "blue") === 2) return lastIndexOf(wires, "blue");
    return 0;
  }
  if (n === 5) {
    if (wires[n - 1] === "red") return 3;
    if (count(wires, "yellow") > count(wires, "red")) return wires.indexOf("yellow");
    if (count(wires, "black") === 0) return 1;
    return 0;
  }
  // 6 wires
  if (count(wires, "yellow") === 1) return 4;
  if (wires[1] === "blue") return n - 1;
  if (count(wires, "red") === 0) return 2;
  return 3;
}

export const WIRE_RULES: { count: number; rules: string[] }[] = [
  {
    count: 4,
    rules: ["No white wires? Cut the 3rd wire.", "Otherwise, if the 1st wire is black, cut the last wire.", "Otherwise, if there are exactly two blue wires, cut the last blue wire.", "Otherwise, cut the 1st wire."],
  },
  {
    count: 5,
    rules: ["Last wire red? Cut the 4th wire.", "Otherwise, if there are more yellow wires than red wires, cut the first yellow wire.", "Otherwise, if there are no black wires, cut the 2nd wire.", "Otherwise, cut the 1st wire."],
  },
  {
    count: 6,
    rules: ["Exactly one yellow wire? Cut the 5th wire.", "Otherwise, if the 2nd wire is blue, cut the last wire.", "Otherwise, if there are no red wires, cut the 3rd wire.", "Otherwise, cut the 4th wire."],
  },
];

// ── Keypad ───────────────────────────────────────────────────────────────

/** Press the four symbols in the order they appear in the one column that has all four. */
export const KEYPAD_COLUMNS: string[][] = [
  ["★", "☂", "♞", "⚓", "☘", "✈", "♛"],
  ["☀", "♞", "☯", "⚡", "★", "⌛", "✂"],
  ["♫", "⚙", "☂", "☎", "☯", "☠", "⚓"],
  ["✂", "♛", "☘", "⚡", "♫", "☀", "⚙"],
  ["⌛", "☠", "✈", "☎", "♦", "♣", "★"],
];

/** Column indexes that contain every one of these symbols. */
export function columnsWith(symbols: string[]): number[] {
  return KEYPAD_COLUMNS.map((col, i) => (symbols.every((s) => col.includes(s)) ? i : -1)).filter((i) => i >= 0);
}

// ── Sound-alikes ─────────────────────────────────────────────────────────

/** Display word → the button to press. Groups are chosen to be miserable to say out loud. */
export const WORD_PARTNERS: Record<string, string> = {
  THERE: "THEIR",
  THEIR: "THEY'RE",
  "THEY'RE": "THERE",
  SEE: "SEA",
  SEA: "C",
  C: "SEE",
  YOU: "U",
  U: "EWE",
  EWE: "YOU",
  RED: "READ",
  READ: "REED",
  REED: "RED",
  NO: "KNOW",
  KNOW: "NOW",
  NOW: "NO",
  WAIT: "WEIGHT",
  WEIGHT: "WHAT",
  WHAT: "WAIT",
  TWO: "TOO",
  TOO: "TO",
  TO: "TWO",
  RIGHT: "WRITE",
  WRITE: "RITE",
  RITE: "RIGHT",
};

/** Words that sound like each other, for picking decoy buttons. */
export const WORD_GROUPS: string[][] = [
  ["THERE", "THEIR", "THEY'RE"],
  ["SEE", "SEA", "C"],
  ["YOU", "U", "EWE"],
  ["RED", "READ", "REED"],
  ["NO", "KNOW", "NOW"],
  ["WAIT", "WEIGHT", "WHAT"],
  ["TWO", "TOO", "TO"],
  ["RIGHT", "WRITE", "RITE"],
];
