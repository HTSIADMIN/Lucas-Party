import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "../lib/router";
import { ROLE_LABEL, THEMES, THEME_IDS, canHost, isThemeId, type ThemeId } from "@party/shared";
import { Backdrop } from "../art/Backdrop";
import { Character } from "../art/Character";
import { useAuth } from "../lib/auth";
import { useDocumentTheme } from "../lib/device";
import { KEYS, local } from "../lib/storage";
import { Logo } from "../ui/Logo";

function storedTheme(): ThemeId {
  const t = local.get(KEYS.siteTheme);
  return isThemeId(t) ? t : "showtime";
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);
  if (!user) return null;
  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Character id={user.character} size={34} motion="none" mood="happy" />
        <span>{user.displayName}</span>
        {user.role !== "player" && <span className={`badge badge-${user.role}`}>{ROLE_LABEL[user.role]}</span>}
      </button>
      {open && (
        <div className="user-menu-pop card card-sm">
          {canHost(user.role) && <Link to="/host">📺 Host a party</Link>}
          <Link to="/profile">🙂 Profile</Link>
          {user.role === "admin" && <Link to="/admin">🛠️ Admin</Link>}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            👋 Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<ThemeId>(storedTheme);
  useDocumentTheme(theme);
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="site">
      <Backdrop theme={theme} />
      <header className="site-nav">
        <div className="container site-nav-inner">
          <Logo />
          <nav className="site-nav-links" aria-label="Main">
            <NavLink to="/games">Games</NavLink>
            <Link to="/#how">How it works</Link>
            {user && canHost(user.role) && <NavLink to="/host">Host</NavLink>}
          </nav>
          <div className="site-nav-right">
            {!loading && !user && (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/signup" className="btn btn-sm">
                  Sign up
                </Link>
              </>
            )}
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container site-footer-inner">
          <span>
            © {new Date().getFullYear()} Lucas Games · Party night for friends · <Link to="/design">Design system</Link>
          </span>
          <div className="theme-dots" role="group" aria-label="Site theme">
            <span>Theme</span>
            {THEME_IDS.map((t) => (
              <button
                key={t}
                type="button"
                className="theme-dot"
                title={THEMES[t].name}
                aria-label={THEMES[t].name}
                aria-pressed={theme === t}
                style={{ background: `linear-gradient(135deg, ${THEMES[t].swatch[0]} 50%, ${THEMES[t].swatch[1]} 50%)` }}
                onClick={() => {
                  setTheme(t);
                  local.set(KEYS.siteTheme, t);
                }}
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
