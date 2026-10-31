// Expressions shared by the Party Crew and Telly. Drawn around (0,0): eyes at
// x = ±11, mouth 12 units below.

export type Mood = "idle" | "happy" | "sad" | "shock" | "think" | "cheeky" | "win";
export const MOODS: Mood[] = ["idle", "happy", "sad", "shock", "think", "cheeky", "win"];

export const INK = "#1B1033";
const TONGUE = "#FF7AA8";
const SPARKLE = "M0 -6.5 L1.9 -1.9 L6.5 0 L1.9 1.9 L0 6.5 L-1.9 1.9 L-6.5 0 L-1.9 -1.9 Z";

interface FaceProps {
  x: number;
  y: number;
  mood?: Mood;
  ink?: string;
  glint?: string;
  cheeks?: boolean;
  scale?: number;
}

function Eye({ cx, mood, ink, glint }: { cx: number; mood: Mood; ink: string; glint: string }) {
  switch (mood) {
    case "happy":
      return <path d={`M${cx - 5} 1.5 Q${cx} -5 ${cx + 5} 1.5`} fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />;
    case "win":
      return <path d={SPARKLE} transform={`translate(${cx} 0)`} fill="#FFC93C" stroke={ink} strokeWidth={1.6} strokeLinejoin="round" />;
    case "shock":
      return (
        <>
          <circle cx={cx} cy={0} r={6.2} fill="#fff" stroke={ink} strokeWidth={2.4} />
          <circle cx={cx} cy={0.5} r={2.6} fill={ink} />
        </>
      );
    case "sad":
      return (
        <>
          <ellipse cx={cx} cy={1} rx={4} ry={4.8} fill={ink} />
          <circle cx={cx - 1.2} cy={-0.6} r={1.3} fill={glint} />
        </>
      );
    case "think":
      return (
        <>
          <ellipse cx={cx} cy={0} rx={4.2} ry={5.6} fill={ink} />
          <circle cx={cx + 0.6} cy={-2.6} r={1.5} fill={glint} />
        </>
      );
    default:
      return (
        <>
          <ellipse cx={cx} cy={0} rx={4.2} ry={5.6} fill={ink} />
          <circle cx={cx - 1.3} cy={-2} r={1.5} fill={glint} />
        </>
      );
  }
}

function Brows({ mood, ink }: { mood: Mood; ink: string }) {
  const s = { fill: "none", stroke: ink, strokeWidth: 2.6, strokeLinecap: "round" as const };
  if (mood === "sad") return <><path d="M-16 -7 L-7 -10.5" {...s} /><path d="M7 -10.5 L16 -7" {...s} /></>;
  if (mood === "think") return <path d="M6 -10 Q11 -14.5 16 -11" {...s} />;
  if (mood === "shock") return <><path d="M-15 -11 Q-11 -14 -7 -11" {...s} /><path d="M7 -11 Q11 -14 15 -11" {...s} /></>;
  if (mood === "cheeky") return <path d="M-16 -9 Q-11 -12 -6 -9.5" {...s} />;
  return null;
}

function Mouth({ mood, ink }: { mood: Mood; ink: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (mood) {
    case "happy":
      return (
        <>
          <path d="M-9 -1.5 Q0 13 9 -1.5 Z" fill={ink} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M-4.5 6.2 Q0 2.8 4.5 6.2 Q0 9.4 -4.5 6.2 Z" fill={TONGUE} />
        </>
      );
    case "win":
      return (
        <>
          <path d="M-11 -2 Q0 15.5 11 -2 Z" fill={ink} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M-5.5 7.4 Q0 3.4 5.5 7.4 Q0 11 -5.5 7.4 Z" fill={TONGUE} />
        </>
      );
    case "sad":
      return <path d="M-7 5 Q0 -2 7 5" {...line} />;
    case "shock":
      return <ellipse cx={0} cy={2} rx={4} ry={5} fill={ink} />;
    case "think":
      return <path d="M-6 2.5 Q0 0.5 6 3" {...line} />;
    case "cheeky":
      return <path d="M-7 1 Q2 8 9 -3" {...line} />;
    default:
      return <path d="M-7 0 Q0 6 7 0" {...line} />;
  }
}

export function Face({ x, y, mood = "idle", ink = INK, glint = "#fff", cheeks = true, scale = 1 }: FaceProps) {
  const blinks = mood === "idle" || mood === "think" || mood === "sad";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {cheeks && (
        <>
          <ellipse cx={-17} cy={7} rx={5.5} ry={3.2} fill="#FF7FA9" opacity={0.55} />
          <ellipse cx={17} cy={7} rx={5.5} ry={3.2} fill="#FF7FA9" opacity={0.55} />
        </>
      )}
      <g className={blinks ? "char-eyes" : undefined}>
        <Eye cx={-11} mood={mood} ink={ink} glint={glint} />
        {mood === "cheeky" ? (
          <path d="M6 0.5 Q11 -4 16 0.5" fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
        ) : (
          <Eye cx={11} mood={mood} ink={ink} glint={glint} />
        )}
      </g>
      <Brows mood={mood} ink={ink} />
      <g transform="translate(0 12)">
        <Mouth mood={mood} ink={ink} />
      </g>
    </g>
  );
}
