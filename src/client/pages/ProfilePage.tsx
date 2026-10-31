import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "../lib/router";
import { NAME_MAX, PASSWORD_MIN, ROLE_LABEL, canHost, type CharacterId } from "@party/shared";
import { Character } from "../art/Character";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { CharacterPicker } from "../ui/CharacterPicker";

export function ProfilePage() {
  const { user, loading, update } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [character, setCharacter] = useState<CharacterId>("blip");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setCharacter(user.character);
    }
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login?next=/profile" replace />;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    try {
      await update({ displayName, character });
      setSaved("Saved!");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.next.length < PASSWORD_MIN) return setPwMsg({ ok: false, text: `Passwords need at least ${PASSWORD_MIN} characters.` });
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: "Those passwords don't match." });
    try {
      await api("/api/auth/password", { body: { currentPassword: pw.current, newPassword: pw.next } });
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password changed. Other devices were signed out." });
    } catch (err) {
      setPwMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="row">
          <Character id={user.character} size={88} mood="happy" />
          <div className="stack-sm">
            <h1 className="page-title">{user.displayName}</h1>
            <div className="row-sm">
              <span className={`badge badge-${user.role === "player" ? "soon" : user.role}`}>{ROLE_LABEL[user.role]}</span>
              <span className="on-bg-muted">@{user.username}</span>
            </div>
          </div>
        </div>
        {canHost(user.role) && (
          <Link to="/host" className="btn btn-accent">
            Host a party
          </Link>
        )}
      </div>

      {!canHost(user.role) && (
        <div className="card card-sm" style={{ marginBottom: 20 }}>
          <b>Want to host?</b> Hosting is unlocked by the admin. Send them your username: <code>@{user.username}</code>
        </div>
      )}

      <div className="stack-lg">
        <form className="card stack" onSubmit={saveProfile}>
          <h2 className="card-title">Your look</h2>
          <div className="field">
            <label className="label" htmlFor="pf-name">
              Display name (shown on the TV)
            </label>
            <input id="pf-name" className="input" maxLength={NAME_MAX} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Character</span>
            <CharacterPicker value={character} onChange={setCharacter} size={60} />
          </div>
          {error && <div className="form-error">{error}</div>}
          {saved && <div className="form-ok">{saved}</div>}
          <button type="submit" className="btn">
            Save
          </button>
        </form>

        <form className="card stack" onSubmit={changePassword}>
          <h2 className="card-title">Password</h2>
          <div className="field">
            <label className="label" htmlFor="pf-cur">
              Current password
            </label>
            <input id="pf-cur" className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          </div>
          <div className="row wrap" style={{ alignItems: "start" }}>
            <div className="field grow">
              <label className="label" htmlFor="pf-new">
                New password
              </label>
              <input id="pf-new" className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
            </div>
            <div className="field grow">
              <label className="label" htmlFor="pf-new2">
                Confirm
              </label>
              <input id="pf-new2" className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </div>
          </div>
          {pwMsg && <div className={pwMsg.ok ? "form-ok" : "form-error"}>{pwMsg.text}</div>}
          <button type="submit" className="btn btn-light">
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}
