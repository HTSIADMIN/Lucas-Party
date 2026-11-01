// The phone's drawing pad: a square canvas, a few colours, two brush sizes,
// undo and clear. Strokes are recorded in the shared 0–1000 space (thinned so
// a drawing fits in one Realtime message) and handed over on submit.

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { DRAW_COLORS, DRAW_MAX_POINTS, DRAW_SIZE, DRAW_WIDTHS, drawingPoints, type DrawStroke } from "@party/shared";
import "./drawing.css";

/** Skip points closer than this to the last one (in drawing units). */
const MIN_STEP = 7;

export function DrawPad({ onSubmit, submitLabel = "Done!", disabled = false, autoSubmitRef }: { onSubmit(strokes: DrawStroke[]): void; submitLabel?: string; disabled?: boolean; autoSubmitRef?: { current: (() => void) | null } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<DrawStroke[]>([]);
  const current = useRef<DrawStroke | null>(null);
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(0);
  const [count, setCount] = useState(0);
  const [full, setFull] = useState(false);

  const ctx2d = () => canvas.current?.getContext("2d") ?? null;
  const scale = () => (canvas.current ? canvas.current.width / DRAW_SIZE : 1);

  const paintStroke = useCallback((g: CanvasRenderingContext2D, s: DrawStroke, from = 0) => {
    const k = scale();
    g.strokeStyle = DRAW_COLORS[s.c] ?? DRAW_COLORS[0];
    g.lineWidth = (DRAW_WIDTHS[s.w] ?? DRAW_WIDTHS[0]) * k;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    const start = Math.max(0, from - 2);
    g.moveTo(s.p[start]! * k, s.p[start + 1]! * k);
    if (s.p.length === 2) g.lineTo(s.p[0]! * k + 0.1, s.p[1]! * k);
    for (let i = start + 2; i < s.p.length; i += 2) g.lineTo(s.p[i]! * k, s.p[i + 1]! * k);
    g.stroke();
  }, []);

  const repaint = useCallback(() => {
    const g = ctx2d();
    if (!g || !canvas.current) return;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, canvas.current.width, canvas.current.height);
    for (const s of strokes.current) paintStroke(g, s);
  }, [paintStroke]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const resize = () => {
      const px = Math.round(el.getBoundingClientRect().width * Math.min(2, window.devicePixelRatio || 1));
      if (px > 0 && el.width !== px) {
        el.width = px;
        el.height = px;
        repaint();
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [repaint]);

  const pointAt = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = canvas.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * DRAW_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * DRAW_SIZE;
    return [Math.round(Math.min(DRAW_SIZE, Math.max(0, x))), Math.round(Math.min(DRAW_SIZE, Math.max(0, y)))];
  };

  const used = () => drawingPoints(strokes.current) + (current.current ? current.current.p.length / 2 : 0);

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || used() >= DRAW_MAX_POINTS) return setFull(used() >= DRAW_MAX_POINTS);
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = pointAt(e);
    current.current = { c: color, w: width, p: [x, y] };
    const g = ctx2d();
    if (g) paintStroke(g, current.current);
  };

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent];
    const before = s.p.length;
    for (const ev of events.length ? events : [e.nativeEvent]) {
      if (used() >= DRAW_MAX_POINTS) {
        setFull(true);
        break;
      }
      const [x, y] = pointAt(ev);
      const lx = s.p[s.p.length - 2]!;
      const ly = s.p[s.p.length - 1]!;
      if (Math.hypot(x - lx, y - ly) < MIN_STEP) continue;
      s.p.push(x, y);
    }
    const g = ctx2d();
    if (g && s.p.length > before) paintStroke(g, s, before);
  };

  const onUp = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setCount(strokes.current.length);
  };

  const submit = useCallback(() => {
    if (current.current) onUp();
    onSubmit(strokes.current.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSubmit]);

  // Lets the page auto-submit when the timer is about to run out.
  useEffect(() => {
    if (!autoSubmitRef) return;
    autoSubmitRef.current = submit;
    return () => {
      autoSubmitRef.current = null;
    };
  }, [autoSubmitRef, submit]);

  return (
    <div className="drawpad">
      <canvas ref={canvas} className="drawpad-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="Drawing pad" />
      <div className="drawpad-tools">
        <div className="drawpad-colors" role="radiogroup" aria-label="Colour">
          {DRAW_COLORS.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={color === i} aria-label={i === DRAW_COLORS.length - 1 ? "Eraser" : `Colour ${i + 1}`} className={`drawpad-swatch ${color === i ? "is-on" : ""} ${i === DRAW_COLORS.length - 1 ? "is-eraser" : ""}`} style={{ background: c }} onClick={() => setColor(i)} />
          ))}
        </div>
        <div className="drawpad-row">
          <button type="button" className={`btn btn-sm ${width === 0 ? "btn-accent" : "btn-light"}`} onClick={() => setWidth(0)}>
            Thin
          </button>
          <button type="button" className={`btn btn-sm ${width === 1 ? "btn-accent" : "btn-light"}`} onClick={() => setWidth(1)}>
            Thick
          </button>
          <button
            type="button"
            className="btn btn-sm btn-light"
            disabled={count === 0}
            onClick={() => {
              strokes.current.pop();
              setCount(strokes.current.length);
              setFull(false);
              repaint();
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="btn btn-sm btn-light"
            disabled={count === 0}
            onClick={() => {
              strokes.current = [];
              setCount(0);
              setFull(false);
              repaint();
            }}
          >
            Clear
          </button>
        </div>
        {full && <p className="drawpad-note">Out of ink! Undo a stroke or send it.</p>}
      </div>
      <button type="button" className="btn btn-accent btn-lg btn-block" disabled={disabled} onClick={submit}>
        {submitLabel}
      </button>
    </div>
  );
}
