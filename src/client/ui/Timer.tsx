import type { RoomView } from "@party/shared";
import { useCountdown } from "../lib/hooks";
import type { ClockLike } from "../lib/hooks";

interface Props {
  client: ClockLike | null;
  room: RoomView;
  size?: number | string;
  /** Hide entirely when there's no deadline. */
  hideIdle?: boolean;
}

/** Countdown ring for the current phase. Pulses red under 5 seconds. */
export function Timer({ client, room, size = 76, hideIdle = true }: Props) {
  const { fraction, seconds, remainingMs } = useCountdown(client, room.deadline, room.pausedRemainingMs);
  const idle = room.deadline === null && room.pausedRemainingMs === null;
  if (idle && hideIdle) return null;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const urgent = !room.paused && remainingMs > 0 && remainingMs <= 5000;
  return (
    <div className={`timer ${urgent ? "is-urgent" : ""}`} style={{ width: size, height: size }} role="timer" aria-label={`${seconds} seconds left`}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r={r} fill="#fff" stroke="#1B1033" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={urgent ? "var(--danger)" : "var(--accent)"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <span className="timer-value" style={{ fontSize: `calc(${typeof size === "number" ? `${size}px` : size} * 0.36)`, color: "var(--ink-900)" }}>
        {room.paused ? "II" : seconds}
      </span>
    </div>
  );
}
