import { Link } from "../lib/router";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="logo-mark">
      <path d="M24 14 L16 3 M40 14 L49 2" stroke="#1B1033" strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="4" r="3.5" fill="#FF4FA3" stroke="#1B1033" strokeWidth="2.5" />
      <circle cx="49" cy="3" r="3.5" fill="#5FEFE4" stroke="#1B1033" strokeWidth="2.5" />
      <rect x="4" y="13" width="56" height="46" rx="13" fill="#FFC93C" stroke="#1B1033" strokeWidth="4" />
      <rect x="10" y="19" width="38" height="34" rx="9" fill="#5FEFE4" stroke="#1B1033" strokeWidth="3" />
      <ellipse cx="22" cy="33" rx="3" ry="4" fill="#1B1033" />
      <ellipse cx="36" cy="33" rx="3" ry="4" fill="#1B1033" />
      <path d="M22 41 Q29 47 36 41" fill="none" stroke="#1B1033" strokeWidth="3" strokeLinecap="round" />
      <circle cx="54" cy="27" r="3" fill="#E3A714" stroke="#1B1033" strokeWidth="2" />
      <circle cx="54" cy="38" r="3" fill="#E3A714" stroke="#1B1033" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className={`logo ${compact ? "is-compact" : ""}`} aria-label="Lucas Games home">
      <LogoMark size={compact ? 34 : 42} />
      <span className="logo-text">
        <span className="logo-word">Lucas Games</span>
        {!compact && <span className="logo-tag">Party Night</span>}
      </span>
    </Link>
  );
}
