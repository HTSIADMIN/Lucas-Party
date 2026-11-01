import { useServerNow, type ClockLike } from "../../lib/hooks";

/** mm:ss until the bomb goes off, flashing in the last 30 seconds. */
export function Countdown({ client, explodesAt, className = "" }: { client: ClockLike; explodesAt: number; className?: string }) {
  const now = useServerNow(client, 200);
  const left = Math.max(0, explodesAt - now);
  const secs = Math.ceil(left / 1000);
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return <span className={`bs-countdown tabular ${secs <= 30 ? "is-urgent" : ""} ${className}`}>{text}</span>;
}
