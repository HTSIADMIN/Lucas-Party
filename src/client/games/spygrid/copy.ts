// Wording shared by the Spy Grid TV and phone views.

import { SPY_TEAM_NAME, type SpyCommonView, type SpyTeam, type SpyTurnEnd } from "@party/shared";

export function otherTeam(team: SpyTeam): SpyTeam {
  return team === "red" ? "blue" : "red";
}

/** What ended the last turn — “Spring” was a bystander — turn over! */
export function turnNoteText(view: SpyCommonView, end: SpyTurnEnd): string {
  const team = SPY_TEAM_NAME[end.team];
  const word = view.lastFlip ? view.cards[view.lastFlip.index]?.word : undefined;
  switch (end.reason) {
    case "bystander":
      return `“${word}” was a bystander — turn over!`;
    case "opponent":
      return `“${word}” was a ${SPY_TEAM_NAME[otherTeam(end.team)]} agent — turn over!`;
    case "outOfGuesses":
      return `${team} used every guess.`;
    case "endTurn":
      return `${team} ended their turn.`;
    case "guessTimeout":
      return `${team} ran out of time.`;
    case "clueTimeout":
      return `No clue from ${team} — the turn passes.`;
  }
}

/** One line on how the board ended. */
export function boardResultText(view: SpyCommonView): string {
  if (!view.winner) return "Nobody gave a clue for too long, so this board is called off.";
  const winner = SPY_TEAM_NAME[view.winner];
  const loser = SPY_TEAM_NAME[otherTeam(view.winner)];
  if (view.outcome === "assassin") return `${loser} flipped the assassin!`;
  if (view.lastFlip && view.lastFlip.team !== view.winner) return `${loser} flipped ${winner}'s last agent!`;
  return `${winner} found all their agents!`;
}
