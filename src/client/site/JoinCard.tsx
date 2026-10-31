import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "../lib/router";
import { NAME_MAX, cleanText, normalizeRoomCode, type RoomInfoResponse } from "@party/shared";
import { Character } from "../art/Character";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { KEYS, local, session } from "../lib/storage";
import { RoomCodeInput } from "../ui/RoomCodeInput";

export function JoinCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => normalizeRoomCode(params.get("code") ?? ""));
  const [name, setName] = useState(() => local.get(KEYS.name) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const cleanName = cleanText(name, NAME_MAX);
    if (code.length !== 4) return setError("Room codes are 4 letters — check the TV.");
    if (!user && !cleanName) return setError("Pick a name so your friends know who you are.");
    setBusy(true);
    setError(null);
    try {
      const info = await api<RoomInfoResponse>(`/api/rooms/${code}`);
      if (!user && !info.guestsAllowed) {
        setError("This party needs an account — log in first.");
        return;
      }
      if (!user) local.set(KEYS.name, cleanName);
      session.set(KEYS.join(code), JSON.stringify({ name: cleanName }));
      navigate(`/play/${code}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card join-card" onSubmit={submit}>
      <span className="badge badge-host join-sticker">Got a code?</span>
      <div className="join-card-title">
        <h2>Join a party</h2>
        <span className="muted" style={{ fontWeight: 700 }}>4 letters on the TV</span>
      </div>
      <RoomCodeInput value={code} onChange={(c) => { setCode(c); setError(null); }} />
      {user ? (
        <div className="join-as">
          <Character id={user.character} size={38} motion="none" mood="happy" />
          <span>
            Playing as <b>{user.displayName}</b>
          </span>
        </div>
      ) : (
        <div className="field">
          <label className="label" htmlFor="join-name">
            Your name
          </label>
          <input id="join-name" className="input" value={name} maxLength={NAME_MAX} placeholder="e.g. Taco Tuesday" autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={busy}>
        {busy ? "Finding the party…" : "Join!"}
      </button>
      {!user && (
        <p className="muted" style={{ fontSize: "var(--fs-sm)", textAlign: "center" }}>
          Hosting tonight? <Link to="/login">Log in</Link> · New here? <Link to="/signup">Make an account</Link>
        </p>
      )}
    </form>
  );
}
