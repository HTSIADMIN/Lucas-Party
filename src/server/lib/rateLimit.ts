// Fixed-window rate limiter kept in memory. Good enough for one process.

interface Window { count: number; resetAt: number }

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor() {
    setInterval(() => this.prune(), 60_000).unref();
  }

  /** Returns true if the action is allowed (and counts it). */
  hit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (w.count >= max) return false;
    w.count++;
    return true;
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, w] of this.windows) if (w.resetAt <= now) this.windows.delete(key);
  }
}
