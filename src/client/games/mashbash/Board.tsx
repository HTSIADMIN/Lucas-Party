// The Mash Bash board: a snaking track of spaces from START to FINISH with
// boost and slip spaces, and everyone's character standing on their space.

import { CHARACTERS, MB_BOOSTS, MB_FINISH, MB_SLIPS, type RoomView } from "@party/shared";
import { Character } from "../../art/Character";
import { playerMap } from "../shared";

const COLS = 8;

function cellPlace(i: number): { row: number; col: number } {
  const row = Math.floor(i / COLS);
  const raw = i % COLS;
  return { row: row + 1, col: (row % 2 === 0 ? raw : COLS - 1 - raw) + 1 };
}

export function Board({ room, positions, highlight = [] }: { room: RoomView; positions: Record<string, number>; highlight?: string[] }) {
  const map = playerMap(room);
  const byCell = new Map<number, string[]>();
  for (const [id, pos] of Object.entries(positions)) byCell.set(pos, [...(byCell.get(pos) ?? []), id]);
  return (
    <div className="mb-board">
      {Array.from({ length: MB_FINISH + 1 }, (_, i) => {
        const { row, col } = cellPlace(i);
        const kind = i === 0 ? "start" : i === MB_FINISH ? "finish" : MB_BOOSTS.includes(i) ? "boost" : MB_SLIPS.includes(i) ? "slip" : "plain";
        const here = byCell.get(i) ?? [];
        return (
          <div key={i} className={`mb-cell is-${kind}`} style={{ gridRow: row, gridColumn: col }}>
            <span className="mb-cell-label">{kind === "start" ? "START" : kind === "finish" ? "FINISH" : kind === "boost" ? "+3" : kind === "slip" ? "−3" : i}</span>
            <div className="mb-cell-tokens">
              {here.map((id) => {
                const p = map.get(id);
                return p ? (
                  <span key={id} className={`mb-token ${highlight.includes(id) ? "is-moving" : ""}`} style={{ borderColor: CHARACTERS[p.character].color }}>
                    <Character id={p.character} size="1.9em" motion="none" mood={highlight.includes(id) ? "happy" : "idle"} />
                  </span>
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
