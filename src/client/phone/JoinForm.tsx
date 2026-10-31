import { useEffect, useState, type FormEvent } from "react";
import { Link } from "../lib/router";
import { NAME_MAX, cleanText, type CharacterId, type RoomInfoResponse } from "@party/shared";
import { api, errorMessage } from "../lib/api";
import type { JoinDetails } from "../lib/roomClient";
import { KEYS, local } from "../lib/storage";
import { CharacterPicker } from "../ui/CharacterPicker";

/** Guest join: name + character. Shown for QR scans and after a name clash. */
export function JoinForm({ code, error: initialError, onJoin }: { code: string; error?: string | null; onJoin(details: JoinDetails): void }) {
  const [info, setInfo] = useState<RoomInfoResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [name, setName] = useState(() => local.get(KEYS.name) ?? "");
  const [character, setCharacter] = useState<CharacterId | null>(() => (local.get(KEYS.character) as CharacterId | null) ?? null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    api<RoomInfoResponse>(`/api/rooms/${code}`)
      .then(setInfo)
      .catch((err) => setLookupError(errorMessage(err)));
  }, [code]);

  useEffect(() => {
    if (info && character && info.takenCharacters.includes(character)) setCharacter(null);
  }, [info, character]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = cleanText(name, NAME_MAX);
    if (!clean) return setError("Pick a name so your friends know who you are.");
    local.set(KEYS.name, clean);
    if (character) local.set(KEYS.character, character);
    onJoin({ name: clean, character: character ?? undefined });
  }

  if (lookupError) {
    return (
      <div className="phone-card">
        <h2 className="phone-card-title">Room {code} not found</h2>
        <p className="muted">{lookupError}</p>
        <Link to="/" className="btn btn-block">
          Try another code
        </Link>
      </div>
    );
  }

  if (info && !info.guestsAllowed) {
    return (
      <div className="phone-card">
        <h2 className="phone-card-title">Log in to join</h2>
        <p className="muted">This party only lets in players with an account.</p>
        <Link to={`/login?next=/play/${code}`} className="btn btn-block">
          Log in
        </Link>
        <Link to={`/signup?next=/play/${code}`} className="btn btn-light btn-block">
          Make an account
        </Link>
      </div>
    );
  }

  return (
    <form className="phone-card" onSubmit={submit}>
      <h2 className="phone-card-title">Join room {code}</h2>
      {info?.hostName && (
        <p className="muted" style={{ fontWeight: 600 }}>
          Hosted by {info.hostName} · {info.players}/{info.maxPlayers} players
        </p>
      )}
      <div className="field">
        <label className="label" htmlFor="pj-name">
          Your name
        </label>
        <input id="pj-name" className="input" value={name} maxLength={NAME_MAX} autoComplete="nickname" placeholder="e.g. Taco Tuesday" onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <span className="label">Pick your character</span>
        <CharacterPicker value={character} onChange={setCharacter} taken={info?.takenCharacters ?? []} size={54} />
      </div>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn btn-accent btn-lg btn-block">
        Let me in!
      </button>
      <p className="muted" style={{ fontSize: "var(--fs-sm)", textAlign: "center" }}>
        Have an account? <Link to={`/login?next=/play/${code}`}>Log in</Link> to keep your character.
      </p>
    </form>
  );
}
