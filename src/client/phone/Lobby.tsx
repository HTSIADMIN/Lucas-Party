// Phone lobby. Everyone sees their character and what's up next; the host
// also gets the game picker, room settings, and the player list.

import { useState } from "react";
import {
  CHARACTERS,
  GAME_CATALOG,
  THEMES,
  THEME_IDS,
  defaultOptions,
  getGameMeta,
  type GameId,
  type Pace,
  type PlayerPublic,
  type RoomView,
} from "@party/shared";
import { Character } from "../art/Character";
import { GameArt } from "../art/GameArt";
import type { RoomClient } from "../lib/roomClient";
import { CharacterPicker } from "../ui/CharacterPicker";
import { Segmented, Toggle } from "../ui/controls";
import { Modal, Sheet } from "../ui/Overlay";

const LIVE_GAMES = GAME_CATALOG.filter((g) => g.status === "live");

export function PlayerList({ room, client, me, canKick }: { room: RoomView; client: RoomClient; me: PlayerPublic; canKick: boolean }) {
  const [kicking, setKicking] = useState<PlayerPublic | null>(null);
  return (
    <div className="host-players">
      {room.players.map((p) => (
        <div key={p.id} className="host-player">
          <Character id={p.character} size={40} motion="none" dim={!p.connected} />
          <span className="grow">
            {p.name} {p.id === me.id && <span className="badge badge-info">You</span>} {p.isHost && <span className="badge badge-host">Host</span>}
            {!p.connected && <span className="badge badge-soon">Away</span>}
          </span>
          {canKick && !p.isHost && (
            <button type="button" className="btn btn-light btn-sm" onClick={() => setKicking(p)}>
              Remove
            </button>
          )}
        </div>
      ))}
      <Modal open={Boolean(kicking)} onClose={() => setKicking(null)} label="Remove player">
        <div className="stack">
          <h2>Remove {kicking?.name}?</h2>
          <p className="muted">They'll be sent out of the room and can't rejoin this party.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (kicking) client.host({ type: "kick", playerId: kicking.id });
                setKicking(null);
              }}
            >
              Remove
            </button>
            <button type="button" className="btn btn-light" onClick={() => setKicking(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function RoomSettingsControls({ room, client }: { room: RoomView; client: RoomClient }) {
  return (
    <div className="stack">
      <div className="stack-sm">
        <span className="label">Theme</span>
        <div className="theme-picker">
          {THEME_IDS.map((t) => (
            <button
              key={t}
              type="button"
              aria-label={THEMES[t].name}
              title={THEMES[t].name}
              aria-pressed={room.settings.theme === t}
              style={{ background: `linear-gradient(135deg, ${THEMES[t].swatch[0]} 55%, ${THEMES[t].swatch[1]} 55%)` }}
              onClick={() => client.host({ type: "setSettings", theme: t })}
            />
          ))}
        </div>
      </div>
      <div className="host-row">
        <span className="label">Timers</span>
        <Segmented<Pace>
          label="Timer pace"
          value={room.settings.pace}
          onChange={(pace) => client.host({ type: "setSettings", pace })}
          options={[
            { value: "relaxed", label: "Relaxed" },
            { value: "normal", label: "Normal" },
            { value: "speedy", label: "Speedy" },
          ]}
        />
      </div>
      <Toggle checked={room.settings.familyMode} onChange={(v) => client.host({ type: "setSettings", familyMode: v })} label="Family mode (hide cheeky prompts)" />
    </div>
  );
}

function GameOptions({ room, client, gameId }: { room: RoomView; client: RoomClient; gameId: GameId }) {
  const meta = getGameMeta(gameId);
  if (!meta?.options?.length) return null;
  const values = { ...defaultOptions(meta), ...room.settings.gameOptions[gameId] };
  return (
    <>
      {meta.options.map((opt) => (
        <div key={opt.key} className="host-row">
          <span className="label">{opt.label}</span>
          <Segmented<number> label={opt.label} value={values[opt.key] ?? opt.default} onChange={(value) => client.host({ type: "setGameOption", gameId, key: opt.key, value })} options={opt.choices} />
        </div>
      ))}
    </>
  );
}

export function HostLobby({ room, client, me }: { room: RoomView; client: RoomClient; me: PlayerPublic }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const selected = room.settings.gameId;
  const meta = selected ? getGameMeta(selected) : null;
  const here = room.players.filter((p) => p.connected).length;
  let blocker: string | null = null;
  if (!meta) blocker = "Pick a game";
  else if (here < meta.players[0]) blocker = `Need ${meta.players[0]}+ players (${here} here)`;
  else if (here > meta.players[1]) blocker = `Max ${meta.players[1]} players`;

  return (
    <>
      <div className="phone-card">
        <div className="host-row">
          <h2 className="phone-card-title">You're the host 👑</h2>
          <Toggle checked={room.locked} onChange={(locked) => client.host({ type: "lock", locked })} label="Lock" />
        </div>
        <p className="muted" style={{ fontWeight: 600 }}>
          Pick a game, wait for everyone to show up on the TV, then hit start.
        </p>
      </div>

      <div className="phone-card">
        <h3 className="phone-card-title">Pick a game</h3>
        <div className="host-games">
          {LIVE_GAMES.map((g) => (
            <button key={g.id} type="button" className="host-game" aria-pressed={selected === g.id} onClick={() => client.host({ type: "selectGame", gameId: g.id as GameId })}>
              <span className="host-game-art">
                <GameArt id={g.id} />
              </span>
              <span>
                <span className="host-game-name">{g.name}</span>
                <br />
                <span className="host-game-sub">
                  {g.players[0]}–{g.players[1]} players · {g.minutes[0]}–{g.minutes[1]} min
                </span>
              </span>
              <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>
                {selected === g.id ? "✅" : ""}
              </span>
            </button>
          ))}
        </div>
        {selected && <GameOptions room={room} client={client} gameId={selected} />}
      </div>

      <div className="phone-card">
        <h3 className="phone-card-title">Room</h3>
        <RoomSettingsControls room={room} client={client} />
      </div>

      <div className="phone-card">
        <h3 className="phone-card-title">
          Players ({room.players.length}/{room.maxPlayers})
        </h3>
        <PlayerList room={room} client={client} me={me} canKick />
        <button type="button" className="btn btn-light btn-sm" onClick={() => setConfirmClose(true)}>
          Close the room
        </button>
      </div>

      <div className="phone-sticky">
        <button type="button" className={`btn btn-accent btn-xl btn-block ${blocker ? "" : "pulse-ready"}`} disabled={Boolean(blocker)} onClick={() => client.host({ type: "start" })}>
          {blocker ?? `Start ${meta?.name}!`}
        </button>
      </div>

      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} label="Close room">
        <div className="stack">
          <h2>Close the room?</h2>
          <p className="muted">Everyone gets sent home and the TV shows "That's a wrap".</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={() => client.host({ type: "closeRoom" })}>
              Close room
            </button>
            <button type="button" className="btn btn-light" onClick={() => setConfirmClose(false)}>
              Keep partying
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function GuestLobby({ room, client, me }: { room: RoomView; client: RoomClient; me: PlayerPublic }) {
  const [picking, setPicking] = useState(false);
  const meta = room.settings.gameId ? getGameMeta(room.settings.gameId) : null;
  const taken = room.players.filter((p) => p.id !== me.id).map((p) => p.character);
  return (
    <>
      <div className="phone-lobby-me pop-in">
        <button type="button" onClick={() => setPicking(true)} style={{ background: "none", border: 0, cursor: "pointer" }} aria-label="Change character">
          <Character id={me.character} size={150} mood="happy" />
        </button>
        <span className="phone-lobby-name">{me.name}</span>
        <button type="button" className="btn btn-light btn-sm" onClick={() => setPicking(true)}>
          Change character
        </button>
      </div>
      <div className="phone-card" style={{ textAlign: "center" }}>
        <h2 className="phone-card-title">You're in! 🎉</h2>
        <p className="muted" style={{ fontWeight: 600 }}>
          {room.status === "pending"
            ? "Waiting for a host to arrive…"
            : meta
              ? `Up next: ${meta.name}. Waiting for ${room.hostName ?? "the host"} to start.`
              : `Waiting for ${room.hostName ?? "the host"} to pick a game.`}
        </p>
      </div>
      {meta && (
        <div className="phone-card">
          <div style={{ aspectRatio: "16 / 9", borderRadius: "var(--r-md)", overflow: "hidden", border: "var(--ow) solid var(--outline)" }}>
            <GameArt id={meta.id} />
          </div>
          <h3 className="phone-card-title">{meta.name}</h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontWeight: 600 }} className="stack-sm">
            {meta.howTo.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      <Sheet open={picking} onClose={() => setPicking(false)} label="Pick a character">
        <div className="stack">
          <h2>Pick a character</h2>
          <CharacterPicker
            value={me.character}
            taken={taken}
            onChange={(character) => {
              client.lobby({ type: "setCharacter", character });
              setPicking(false);
            }}
          />
          <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
            Greyed-out characters are taken. {CHARACTERS[me.character].name} says hi.
          </p>
        </div>
      </Sheet>
    </>
  );
}
