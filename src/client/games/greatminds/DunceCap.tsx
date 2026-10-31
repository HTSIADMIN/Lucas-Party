// The Dunce Cap: a little cone hat that sits on whoever gave the lone odd answer.
export function DunceCap({ className, size = "1em" }: { className?: string; size?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 48" aria-label="Dunce Cap" role="img">
      <path d="M20 3 L35 42 Q20 48 5 42 Z" fill="#FFD23F" stroke="#1B1033" strokeWidth="3" strokeLinejoin="round" />
      <path d="M9 32 Q20 37 31 32 L33.5 38.5 Q20 44 6.5 38.5 Z" fill="#FF5A5F" stroke="#1B1033" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="20" cy="4" r="3.5" fill="#FF6FCB" stroke="#1B1033" strokeWidth="2.5" />
      <text x="20" y="28" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill="#1B1033">D</text>
    </svg>
  );
}
