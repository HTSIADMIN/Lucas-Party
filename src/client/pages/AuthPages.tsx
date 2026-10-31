import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "../lib/router";
import { NAME_MAX, PASSWORD_MIN, USERNAME_RE, type CharacterId } from "@party/shared";
import { Telly } from "../art/Telly";
import { errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { CharacterPicker } from "../ui/CharacterPicker";

/** Only follow same-site relative redirects. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-wrap">
      <div className="card auth-card pop-in">
        <div className="auth-head">
          <Telly size={74} pose="wave" />
          <div className="stack-sm">
            <h1 style={{ fontSize: "var(--fs-h2)" }}>Welcome back</h1>
            <p className="muted">Log in to host parties or keep your character.</p>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="login-user">
              Username
            </label>
            <input id="login-user" className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-pass">
              Password
            </label>
            <input id="login-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="muted" style={{ textAlign: "center", fontWeight: 600 }}>
          New here? <Link to={`/signup${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>Make an account</Link>
        </p>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [character, setCharacter] = useState<CharacterId>("blip");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!USERNAME_RE.test(username.trim())) return setError("Usernames are 3–20 letters, numbers or underscores.");
    if (password.length < PASSWORD_MIN) return setError(`Passwords need at least ${PASSWORD_MIN} characters.`);
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await signup({ username: username.trim(), password, displayName: displayName.trim() || undefined, character });
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-wrap">
      <div className="card auth-card pop-in" style={{ width: "min(560px, 100%)" }}>
        <div className="auth-head">
          <Telly size={74} pose="cheer" mood="win" />
          <div className="stack-sm">
            <h1 style={{ fontSize: "var(--fs-h2)" }}>Join the crew</h1>
            <p className="muted">Accounts can join any party. Hosting gets unlocked by the admin.</p>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="su-user">
              Username
            </label>
            <input id="su-user" className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <span className="field-hint">3–20 letters, numbers or underscores. This is how you log in.</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="su-name">
              Display name <span className="field-hint">(shown on the TV)</span>
            </label>
            <input id="su-name" className="input" maxLength={NAME_MAX} value={displayName} placeholder={username || "Same as username"} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="row wrap" style={{ alignItems: "start" }}>
            <div className="field grow">
              <label className="label" htmlFor="su-pass">
                Password
              </label>
              <input id="su-pass" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="field grow">
              <label className="label" htmlFor="su-pass2">
                Confirm password
              </label>
              <input id="su-pass2" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <span className="label">Your character</span>
            <CharacterPicker value={character} onChange={setCharacter} size={56} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="muted" style={{ textAlign: "center", fontWeight: 600 }}>
          Already have one? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
