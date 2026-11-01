// Main and side pots, built from what each player put in over the whole hand.
// Pure functions so the engine, the views and the tests agree on the maths.

export interface Contribution {
  id: string;
  /** Total chips this player put in this hand. */
  amount: number;
  /** Still contesting the pot (hasn't folded). Folded chips stay in as dead money. */
  live: boolean;
}

export interface PotLayer {
  amount: number;
  eligibleIds: string[];
}

/**
 * Slices the money into layers at every live player's total: the main pot is
 * what everyone could match, each side pot the next slice up, contested only
 * by the players who put in at least that much. Main pot first.
 */
export function buildPots(contributions: Contribution[]): PotLayer[] {
  const levels = [...new Set(contributions.filter((c) => c.live && c.amount > 0).map((c) => c.amount))].sort((a, b) => a - b);
  const pots: PotLayer[] = [];
  let floor = 0;
  for (const level of levels) {
    let amount = 0;
    for (const c of contributions) amount += Math.max(0, Math.min(c.amount, level) - floor);
    const eligibleIds = contributions.filter((c) => c.live && c.amount >= level).map((c) => c.id);
    if (amount > 0) pots.push({ amount, eligibleIds });
    floor = level;
  }
  // Folded money above every live total (rare once uncalled bets go back) joins the top pot.
  const total = contributions.reduce((n, c) => n + c.amount, 0);
  const counted = pots.reduce((n, p) => n + p.amount, 0);
  if (total > counted) {
    const top = pots[pots.length - 1];
    if (top) top.amount += total - counted;
    else pots.push({ amount: total - counted, eligibleIds: contributions.filter((c) => c.live).map((c) => c.id) });
  }
  return pots;
}

/**
 * Splits a pot evenly. `winnerIds` must be in seat order starting left of the
 * button: leftover odd chips go one each to the first winners in that order.
 */
export function splitPot(amount: number, winnerIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (winnerIds.length === 0) return out;
  const share = Math.floor(amount / winnerIds.length);
  let odd = amount - share * winnerIds.length;
  for (const id of winnerIds) {
    out[id] = (out[id] ?? 0) + share + (odd > 0 ? 1 : 0);
    if (odd > 0) odd--;
  }
  return out;
}
