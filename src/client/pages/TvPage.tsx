// The TV: creates (or attaches to) a room, shows the lobby with the code + QR,
// then hands the stage to the running game's TV view. Plays all the sound.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "../lib/router";
import { CHARACTERS, getGameMeta, isRoomCode, normalizeRoomCode, type RoomEvent, type RoomView } from "@party/shared";
import { Backdrop } from "../art/Backdrop";
import { Character } from "../art/Character";
import { GameArt } from "../art/GameArt";
import { Telly } from "../art/Telly";
import { GAME_VIEWS } from "../games/registry";
import { api, ApiError, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toggleFullscreen, useDocumentTheme, useJoinBase, useWakeLock } from "../lib/device";
import { useTvSession } from "../lib/hooks";
import { loadScreenCredentials, saveScreenCredentials, type ScreenCredentials } from "../realtime/host";
import { realtimeConfigured } from "../realtime/supabase";
import { audioUnlocked, play, unlockAudio } from "../lib/sfx";
import { Logo } from "../ui/Logo";
import { QrCode } from "../ui/QrCode";

const TOAST_KINDS = new Set(["joined", "hostArrived", "kicked", "paused", "error", "lint"]);

function TvLoading({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="tv-loading">
      <Backdrop theme="showtime" />
      <Telly size={180} pose="wave" />
      <h1 className="tv-title" style={{ fontSize: "2.4em" }}>
        {text}
      </h1>
      {children}
    </div>
  );
}

/** /tv with no code: open a room (active for hosts, "pending" for everyone else). */
function TvCreate() {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<{ message: string; codes: string[] } | null>(null);
  const create = useCallback(async () => {
    setError(null);
    try {
      const res = await api<ScreenCredentials>("/api/rooms", { body: {} });
      // This tab now hosts the room: the game runs here, so keep its keys per tab.
      saveScreenCredentials({ code: res.code, screenSecret: res.screenSecret, screenKey: res.screenKey, owner: res.owner });
      navigate(`/tv/${res.code}`, { replace: true });
    } catch (err) {
      const codes = err instanceof ApiError && Array.isArray(err.data.codes) ? (err.data.codes as string[]) : [];
      setError({ message: errorMessage(err), codes });
    }
  }, [navigate]);
  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;
    void create();
  }, [loading, create]);

  if (!error) return <TvLoading text="Warming up the studio…" />;
  return (
    <TvLoading text="Hold on!">
      <div className="card stack" style={{ maxWidth: 560, fontSize: 18 }}>
        <p style={{ fontWeight: 700 }}>{error.message}</p>
        {error.codes.length > 0 && (
          <div className="row wrap">
            {error.codes.map((c) => (
              <Link key={c} to={`/tv/${c}`} className="btn btn-light btn-sm">
                Open {c}
              </Link>
            ))}
            <Link to="/host" className="btn btn-sm">
              Manage rooms
            </Link>
          </div>
        )}
        <button type="button" className="btn btn-accent" onClick={() => void create()}>
          Try again
        </button>
      </div>
    </TvLoading>
  );
}

function CodeTiles({ code }: { code: string }) {
  return (
    <div className="tv-code" aria-label={`Room code ${code.split("").join(" ")}`}>
      {code.split("").map((ch, i) => (
        <span key={i}>{ch}</span>
      ))}
    </div>
  );
}

function lobbyLine(room: RoomView, joinDisplay: string): string {
  const meta = room.settings.gameId ? getGameMeta(room.settings.gameId) : null;
  const here = room.players.filter((p) => p.connected).length;
  if (room.status === "pending") return "Waiting for a host… Hosts: log in on your phone and join with this code to unlock the room.";
  if (room.players.length === 0) return `Grab your phones! Go to ${joinDisplay} and type the code.`;
  if (!room.hostOnline) return `${room.hostName} is hosting — join on your phone to get the host controls.`;
  if (meta) {
    if (here < meta.players[0]) return `Up next: ${meta.name}! It needs ${meta.players[0] - here} more player${meta.players[0] - here === 1 ? "" : "s"}.`;
    return `Up next: ${meta.name}! ${room.hostName}, press START on your phone.`;
  }
  return `${room.hostName} is picking a game…`;
}

function TvLobby({ room }: { room: RoomView }) {
  const joinBase = useJoinBase();
  const meta = room.settings.gameId ? getGameMeta(room.settings.gameId) : null;
  const seats = Array.from({ length: room.maxPlayers }, (_, i) => room.players[i] ?? null);
  return (
    <div className="tv-lobby">
      <section className="card tv-join">
        <div className="tv-join-steps">
          <span className="tv-join-label">Join on your phone at</span>
          <span className="tv-join-url">{joinBase.display}</span>
          <span className="tv-join-label">with the code</span>
          <CodeTiles code={room.code} />
        </div>
        <div className="tv-qr">
          <QrCode value={`${joinBase.href}/play/${room.code}`} size={220} />
          <span>or scan me</span>
        </div>
      </section>
      <section className="tv-seats" aria-label="Players">
        {seats.map((p, i) =>
          p ? (
            <div key={p.id} className={`tv-seat is-filled ${p.connected ? "" : "is-away"}`} style={{ background: `color-mix(in srgb, ${CHARACTERS[p.character].color} 22%, var(--surface))` }}>
              <Character id={p.character} size="5.6em" mood={p.isHost ? "win" : "happy"} motion="bob" />
              <span className="tv-seat-name">{p.name}</span>
              {p.isHost ? <span className="badge badge-host">Host</span> : !p.connected ? <span className="badge badge-soon">Away</span> : null}
            </div>
          ) : (
            <div key={`empty-${i}`} className="tv-seat">
              <span className="tv-seat-num">{i + 1}</span>
              <span>Open seat</span>
            </div>
          ),
        )}
      </section>
      <section className="tv-lobby-status">
        <Telly size={150} pose={room.players.length ? "cheer" : "wave"} mood={room.status === "pending" ? "think" : "happy"} />
        <div className="bubble">{lobbyLine(room, joinBase.display)}</div>
        {meta && (
          <div className="card tv-up-next">
            <div className="tv-up-next-art">
              <GameArt id={meta.id} />
            </div>
            <div className="stack-sm">
              <span className="badge badge-host" style={{ width: "max-content" }}>
                Up next
              </span>
              <h3>{meta.name}</h3>
              <p className="muted" style={{ fontWeight: 600 }}>
                {meta.tagline}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PlayerStrip({ room }: { room: RoomView }) {
  return (
    <div className="tv-players">
      {room.players.map((p) => (
        <div key={p.id} className={`tv-player ${p.connected ? "" : "is-away"} ${p.inGame ? "" : "is-out"}`}>
          {p.isHost && <span className="tv-crown">👑</span>}
          <Character id={p.character} size="3.6em" motion="none" mood="idle" dim={!p.connected} />
          <span className="tv-player-name">{p.name}</span>
          {p.score !== null && <span className="tv-player-score tabular">{p.score.toLocaleString()}</span>}
        </div>
      ))}
    </div>
  );
}

function TvRoom({ code }: { code: string }) {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(audioUnlocked());
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const nextToast = useRef(1);
  const onEvent = useCallback((e: RoomEvent) => {
    play(e.sfx);
    // Game beats (round titles, ZINGER!, BOOM…) are drawn by the game itself;
    // toasts are for room chatter.
    if (e.text && TOAST_KINDS.has(e.kind)) {
      const id = nextToast.current++;
      setToasts((list) => [...list.slice(-2), { id, text: e.text! }]);
      window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
    }
  }, []);
  const { user } = useAuth();
  const creds = useMemo(() => loadScreenCredentials(code), [code]);
  const client = useTvSession(code, creds, user?.id ?? null, onEvent);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    // A screen without this room's keys only watches; check the room exists at all.
    if (creds) return;
    api(`/api/rooms/${code}`).catch(() => setMissing(true));
  }, [code, creds]);
  const room = client?.room ?? null;
  useDocumentTheme(room?.settings.theme ?? "showtime");
  useWakeLock(true);
  const joinBase = useJoinBase();

  if (!realtimeConfigured()) return <TvLoading text="Realtime isn't set up"><p className="tv-sub">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p></TvLoading>;
  if (!client) return <TvLoading text="Tuning in…" />;
  if (missing && !client.room) {
    return (
      <TvLoading text="No signal!">
        <p className="tv-sub">Room {code} doesn't exist or already closed.</p>
        <button type="button" className="btn btn-accent btn-lg" onClick={() => navigate("/tv", { replace: true })}>
          Start a new room
        </button>
      </TvLoading>
    );
  }
  if (client.status === "closed") {
    return (
      <TvLoading text="That's a wrap!">
        <p className="tv-sub">{client.closedReason ?? client.error?.message ?? "This room has closed."}</p>
        <div className="row center">
          <button type="button" className="btn btn-accent btn-lg" onClick={() => navigate("/tv", { replace: true })}>
            Start a new room
          </button>
          <Link to="/" className="btn btn-ghost btn-lg">
            Home
          </Link>
        </div>
      </TvLoading>
    );
  }
  if (!room) return <TvLoading text={creds ? "Tuning in…" : "Watching — waiting for the TV…"} />;

  const game = room.game;
  const watching = client.role === "viewer";
  const View = game ? GAME_VIEWS[game.id]?.Tv : null;

  return (
    <div className="tv">
      <Backdrop theme={room.settings.theme} />
      <header className="tv-top">
        <Logo compact to="/" />
        {watching && <span className="badge badge-info">Watching</span>}
        {!soundOn && !watching && (
          <button type="button" className="btn btn-accent btn-sm tv-sound" onClick={() => void unlockAudio().then(setSoundOn)}>
            🔊 Click for sound
          </button>
        )}
        <div className="tv-top-right">
          {game && (
            <div className="tv-top-join">
              <span>Join at {joinBase.display}</span>
              <span className="tv-top-code">{room.code}</span>
            </div>
          )}
          <button type="button" className="btn btn-light btn-sm btn-icon tv-fullscreen" onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen">
            ⛶
          </button>
        </div>
      </header>
      <main className="tv-stage">
        {game && View ? (
          <Suspense fallback={<div className="tv-center"><div className="spinner" /></div>}>
            <View room={room} view={game.view} client={client} />
          </Suspense>
        ) : (
          <TvLobby room={room} />
        )}
      </main>
      {game ? <PlayerStrip room={room} /> : <div />}

      {room.paused && (
        <div className="tv-pause">
          <Telly size={170} pose="idle" mood="think" />
          <h1 className="tv-title">Paused</h1>
          <p className="tv-sub">The host hit pause. Grab a snack!</p>
        </div>
      )}
      {client.status === "reconnecting" && <div className="tv-banner badge badge-danger">Reconnecting…</div>}
      <div className="tv-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TvPage() {
  const { code } = useParams();
  if (!code) return <TvCreate />;
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) {
    return (
      <TvLoading text="Hmm, that code looks off">
        <Link to="/tv" className="btn btn-accent btn-lg">
          Start a new room
        </Link>
      </TvLoading>
    );
  }
  return <TvRoom key={normalized} code={normalized} />;
}
