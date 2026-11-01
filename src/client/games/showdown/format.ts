import type { SdKind, SdResultLine } from "@party/shared";

/** "245 ms" for a draw, "7.12s" for a clock, or why there's no time. */
export function formatTime(line: SdResultLine, kind: SdKind): string {
  if (line.foul) return "Flinched!";
  if (line.ms === null) return "No shot";
  if (kind === "draw") return `${line.ms} ms`;
  return `${(line.ms / 1000).toFixed(2)}s`;
}
