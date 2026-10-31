// The phone controller: join flow → lobby (host gets the controls) → the
// running game's phone view. Host in-game controls live in a bottom sheet.

import { Suspense, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "../lib/router";
import { isRoomCode, normalizeRoomCode, type ErrorCode, type RoomEvent } from "@party/shared";
import { Backdrop } from "../art/Backdrop";
import { Character } from "../art/Character";
import { Telly } from "../art/Telly";
import { GAME_VIEWS } from "../games/registry";
import { PhoneMessage } from "../games/shared";
import { useAuth } from "../lib/auth";
import { useDocumentTheme, useWakeLock, vibrate } from "../lib/device";
import { useRoomClient } from "../lib/hooks";
import { realtimeConfigured } from "../realtime/supabase";
import type { JoinDetails, RoomClient } from "../lib/roomClient";
import { KEYS, session } from "../lib/storage";
import { JoinForm } from "../phone/JoinForm";
import { GuestLobby, HostLobby, PlayerList, RoomSettingsControls } from "../phone/Lobby";
import { Modal, Sheet } from "../ui/Overlay";
import { useToast } from "../ui/Toasts";

const RETRY_WITH_FORM: ErrorCode[] = ["name_taken", "name_required"];

function initialJoin(code: string): JoinDetails | null {
  if (session.get(KEYS.seat(code))) return {};
  const intent = session.get(KEYS.join(code));
  if (intent) {
    try {
      return JSON.parse(intent) as JoinDetails;
    } catch {
      return null;
    }
  }
  return null;
}

function HostSheet({ client, open, onClose }: { client: RoomClient; open: boolean; onClose(): void }) {
  const room = client.room!;
  const me = room.players.find((p) => p.id === client.playerId)!;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const over = room.game?.over;
  return (
    <Sheet open={open} onClose={onClose} label="Host controls">
      <div className="stack">
        <h2>Host controls</h2>
        {!over && (
          <div className="host-controls">
            {room.paused ? (
              <button type="button" className="btn btn-success btn-lg" onClick={() => client.host({ type: "resume" })}>
                ▶ Resume
              </button>
            ) : (
              <button type="button" className="btn btn-accent btn-lg" onClick={() => client.host({ type: "pause" })}>
                ⏸ Pause
              </button>
            )}
            <button type="button" className="btn btn-lg" disabled={room.paused} onClick={() => client.host({ type: "skip" })}>
              ⏭ Skip
            </button>
            <button type="button" className="btn btn-light" disabled={room.paused || room.deadline === null} onClick={() => client.host({ type: "extend", ms: 15_000 })}>
              +15 seconds
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmEnd(true)}>
              End game
            </button>
          </div>
        )}
        {over && (
          <div className="host-controls">
            <button type="button" className="btn btn-accent btn-lg" onClick={() => client.host({ type: "playAgain" })}>
              Play again
            </button>
            <button type="button" className="btn btn-lg" onClick={() => client.host({ type: "endGame" })}>
              New game
            </button>
          </div>
        )}
        <RoomSettingsControls room={room} client={client} />
        <h3>Players</h3>
        <PlayerList room={room} client={client} me={me} canKick />
      </div>
      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} label="End game">
        <div className="stack">
          <h2>End this game?</h2>
          <p className="muted">Everyone goes back to the lobby. Scores from this game are dropped.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                client.host({ type: "endGame" });
                setConfirmEnd(false);
                onClose();
              }}
            >
              End game
            </button>
            <button type="button" className="btn btn-light" onClick={() => setConfirmEnd(false)}>
              Keep playing
            </button>
          </div>
        </div>
      </Modal>
    </Sheet>
  );
}

function PhoneRoom({ client }: { client: RoomClient }) {
  const room = client.room!;
  const me = room.players.find((p) => p.id === client.playerId);
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    if (!room.game) setSheet(false);
  }, [room.game]);
  if (!me) return <PhoneMessage title="Connecting…" />;
  const isHost = me.isHost;
  const game = room.game;
  const View = game ? GAME_VIEWS[game.id]?.Phone : null;

  let content;
  if (game && game.view === null) {
    content = (
      <PhoneMessage character={me.character} mood="think" title="Game in progress">
        <p>You'll jump in next game. Watch the TV!</p>
      </PhoneMessage>
    );
  } else if (game && View) {
    content = (
      <Suspense fallback={<PhoneMessage title="Loading…" />}>
        <View room={room} view={game.view} client={client} playerId={me.id} isHost={isHost} />
      </Suspense>
    );
  } else if (isHost) {
    content = <HostLobby room={room} client={client} me={me} />;
  } else {
    content = <GuestLobby room={room} client={client} me={me} />;
  }

  return (
    <>
      <header className="phone-bar">
        <span className="phone-code">{room.code}</span>
        <span className={`dot ${client.status === "open" ? "" : "is-off"}`} title={client.status} />
        <span className="grow" />
        <span className="phone-me">
          <Character id={me.character} size={30} motion="none" mood="happy" />
          {me.name}
        </span>
        {isHost && game && (
          <button type="button" className="btn btn-accent btn-sm" onClick={() => setSheet(true)}>
            👑 Host
          </button>
        )}
      </header>
      <main className="phone-main">
        {room.paused && (
          <div className="phone-card" style={{ textAlign: "center" }}>
            <b>⏸ Paused by the host</b>
          </div>
        )}
        {content}
        {isHost && game?.over && (
          <div className="phone-sticky host-controls">
            <button type="button" className="btn btn-accent btn-lg" onClick={() => client.host({ type: "playAgain" })}>
              Play again
            </button>
            <button type="button" className="btn btn-lg" onClick={() => client.host({ type: "endGame" })}>
              New game
            </button>
          </div>
        )}
      </main>
      {isHost && game && <HostSheet client={client} open={sheet} onClose={() => setSheet(false)} />}
    </>
  );
}

function PhoneClosed({ title, text }: { title: string; text: string }) {
  return (
    <main className="phone-main">
      <div className="phone-message">
        <Telly size={140} pose="idle" mood="sad" />
        <h2 className="phone-message-title">{title}</h2>
        <div className="phone-message-body">
          <p>{text}</p>
        </div>
        <Link to="/" className="btn btn-accent btn-lg">
          Back home
        </Link>
      </div>
    </main>
  );
}

export function PlayPage() {
  const { code: raw } = useParams();
  const code = normalizeRoomCode(raw ?? "");
  const { user, loading } = useAuth();
  const toast = useToast();
  const [join, setJoin] = useState<JoinDetails | null>(() => initialJoin(code));
  const [formError, setFormError] = useState<string | null>(null);

  // Logged-in players skip the form: their account brings a name and character.
  useEffect(() => {
    if (!loading && user && !join) setJoin({});
  }, [loading, user, join]);

  const onEvent = useCallback(
    (e: RoomEvent) => {
      vibrate(e.haptic);
      if (e.text && e.to) toast(e.text);
      if (e.kind === "error" && e.text) toast(e.text, { error: true });
    },
    [toast],
  );
  const client = useRoomClient(isRoomCode(code) && realtimeConfigured() ? code : undefined, join, onEvent);
  const theme = client?.room?.settings.theme ?? "showtime";
  useDocumentTheme(theme);
  useWakeLock(Boolean(client?.room?.game));

  // A fatal "pick another name" error drops back to the form.
  useEffect(() => {
    if (client?.error?.fatal && RETRY_WITH_FORM.includes(client.error.code)) {
      setFormError(client.error.message);
      session.remove(KEYS.join(code));
      setJoin(null);
    } else if (client?.error && !client.error.fatal) {
      toast(client.error.message, { error: true });
    }
  }, [client, client?.error, code, toast]);

  let body;
  if (!isRoomCode(code)) {
    body = <PhoneClosed title="Hmm…" text="That room code doesn't look right. Codes are 4 letters." />;
  } else if (!realtimeConfigured()) {
    body = <PhoneClosed title="Not set up yet" text="Realtime isn't configured on this server (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)." />;
  } else if (loading && !join) {
    body = <PhoneMessage title="Loading…" />;
  } else if (!join) {
    body = (
      <main className="phone-main">
        <JoinForm
          code={code}
          error={formError}
          onJoin={(details) => {
            setFormError(null);
            setJoin(details);
          }}
        />
      </main>
    );
  } else if (!client || (!client.room && client.status !== "closed")) {
    body = (
      <main className="phone-main">
        <PhoneMessage title={client?.status === "reconnecting" ? "Reconnecting…" : "Joining…"} />
      </main>
    );
  } else if (client.status === "closed") {
    body = <PhoneClosed title={client.error ? "Can't join" : "That's a wrap!"} text={client.closedReason ?? client.error?.message ?? "This room has closed."} />;
  } else {
    body = <PhoneRoom client={client} />;
  }

  return (
    <div className="phone">
      <Backdrop theme={theme} />
      {body}
    </div>
  );
}
