// Full Moon — TV. The village sits in a semicircle around Telly, who narrates
// every phase in a speech bubble. Night darkens the sky (CSS only), ghosts
// stay dimmed with their role tag, and night progress is a count — never who.

import type { CSSProperties, ReactNode } from "react";
import { FM_MAX_DAYS, FM_SKIP, fmTeamOf, type FmSeat, type FmTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import type { Mood } from "../../art/Face";
import { Telly, type TellyPose } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, nameOf, playerMap } from "../shared";
import { Lineup, RoleTag, aRole } from "./parts";
import "./fullmoon.css";

type Room = TvGameProps["room"];
type SkyMode = "dusk" | "night" | "dawn" | "day" | "blood";
type Motion = "bob" | "jump" | "shake" | "none";

function skyOf(view: View): SkyMode {
  switch (view.phase) {
    case "intro":
    case "roles":
      return "dusk";
    case "night":
      return "night";
    case "dawn":
      return "dawn";
    case "finale":
      return view.winner === "wolves" ? "blood" : "day";
    default:
      return "day";
  }
}

/** Sits between the theme backdrop and the stage, so night falls without dimming the content. */
function Sky({ mode }: { mode: SkyMode }) {
  return (
    <div className={`fm-sky is-${mode}`} aria-hidden="true">
      <div className="fm-sky-layer fm-sky-dusk" />
      <div className="fm-sky-layer fm-sky-night" />
      <div className="fm-sky-layer fm-sky-dawn" />
      <div className="fm-stars" />
      <div className="fm-moon" />
    </div>
  );
}

const NIGHT_LINES = [
  "Night falls on the village. Everybody, tap your phone — quietly…",
  "The moon is up again. Something is prowling between the houses…",
  "Another night. Lock your doors, and tap your phones.",
  "Owls hoot. Floorboards creak. Somebody here is very, very hungry…",
];

/** Werewolves not yet unmasked — public, since every death reveals a role. */
function wolvesLoose(view: View): number {
  return view.roleCounts.wolf - view.seats.filter((s) => !s.alive && s.role === "wolf").length;
}

interface Narration {
  text: ReactNode;
  mood: Mood;
  pose: TellyPose;
}

function narrate(view: View, room: Room): Narration {
  const who = (id: string | null) => <b>{nameOf(room, id)}</b>;
  const roleOf = (id: string | null) => view.seats.find((s) => s.id === id)?.role ?? null;
  switch (view.phase) {
    case "roles":
      return { text: "Peek at your phone to meet the real you. Keep a straight face — and your screen to yourself!", mood: "cheeky", pose: "wave" };
    case "night":
      return { text: NIGHT_LINES[(view.day - 1) % NIGHT_LINES.length], mood: "think", pose: "idle" };
    case "dawn": {
      const role = roleOf(view.victimId);
      if (view.victimId && role) {
        return { text: <>The rooster crows… and {who(view.victimId)} is found at dawn! They were <b>{aRole(role)}</b>.</>, mood: "shock", pose: "idle" };
      }
      return { text: "The sun comes up and… everyone's here! Nobody died last night.", mood: "happy", pose: "cheer" };
    }
    case "discuss": {
      if (view.day >= FM_MAX_DAYS) return { text: "Final day! If the werewolves survive this vote, they win. Talk fast!", mood: "shock", pose: "cheer" };
      const loose = wolvesLoose(view);
      return {
        text: <>Day {view.day}. {loose === 1 ? "A werewolf walks" : `${loose} werewolves walk`} among you… Argue it out, then tap <b>Ready to vote</b>.</>,
        mood: "think",
        pose: "wave",
      };
    }
    case "vote":
      return { text: <>Time to vote! Tap a name on your phone — or <b>Skip</b>.</>, mood: "cheeky", pose: "wave" };
    case "verdict": {
      const role = roleOf(view.eliminatedId);
      if (view.verdict === "eliminated" && role) {
        return { text: <>The village has spoken: {who(view.eliminatedId)} is out! They were <b>{aRole(role)}</b>.</>, mood: "shock", pose: "idle" };
      }
      if (view.verdict === "tie") return { text: "A tie! The village can't agree, so nobody leaves today.", mood: "think", pose: "idle" };
      if (view.verdict === "skipped") return { text: "The village skips the vote. Nobody leaves… for now.", mood: "think", pose: "idle" };
      return { text: "Nobody voted?! Then nobody leaves today.", mood: "sad", pose: "idle" };
    }
    case "finale":
      if (view.ending === "cleared") return { text: "Every werewolf is gone. The village can finally sleep — villagers win!", mood: "win", pose: "cheer" };
      if (view.ending === "outlasted") return { text: `${FM_MAX_DAYS} days, and the werewolves are still loose. They win!`, mood: "shock", pose: "idle" };
      return { text: "The werewolves outnumber the villagers now… werewolves win!", mood: "shock", pose: "idle" };
    default:
      return { text: "", mood: "happy", pose: "wave" };
  }
}

function Head({ view, room, client }: { view: View; room: Room; client: TvGameProps["client"] }) {
  const map = playerMap(room);
  const label =
    view.phase === "roles"
      ? "🎭 Secret roles"
      : view.phase === "night"
        ? `🌙 Night ${view.day}`
        : view.phase === "dawn"
          ? `🌅 Dawn ${view.day}`
          : view.phase === "finale"
            ? "🌕 The end"
            : `☀️ Day ${view.day}`;
  const progress =
    view.phase === "roles"
      ? `${view.doneIds.length} of ${view.seats.length} ready`
      : view.phase === "night"
        ? `${view.nightDone} of ${view.aliveCount} have chosen`
        : view.phase === "discuss"
          ? `${view.doneIds.length} of ${view.aliveCount} ready to vote`
          : view.phase === "vote"
            ? `${view.doneIds.length} of ${view.aliveCount} voted`
            : null;
  const skippers = Object.entries(view.votes ?? {})
    .filter(([, target]) => target === FM_SKIP)
    .map(([voter]) => voter);
  return (
    <div className="fm-head">
      <span className="tv-pill">{label}</span>
      {view.phase === "roles" && <Lineup counts={view.roleCounts} />}
      {(view.phase === "discuss" || view.phase === "vote") && <span className="fm-chip">🐺 {wolvesLoose(view)} still on the loose</span>}
      {progress && <span className="fm-chip">{progress}</span>}
      {view.phase === "verdict" && skippers.length > 0 && (
        <span className="fm-chip fm-skips">
          Skip
          {skippers.map((id) => {
            const p = map.get(id);
            return p ? <Character key={id} id={p.character} size="1.7em" motion="none" mood="idle" /> : null;
          })}
        </span>
      )}
      {view.phase === "finale" && <span className="fm-banner slam-in">{view.winner === "village" ? "The village wins!" : "The werewolves win!"}</span>}
      <span className="fm-head-timer">
        <Timer client={client} room={room} size="4.6em" />
      </span>
    </div>
  );
}

/** Seats on a U: the ends sit high beside Telly, the middle swoops low in front of him. */
function seatStyle(i: number, n: number): CSSProperties {
  const t = n <= 1 ? 0.5 : i / (n - 1);
  return { left: `${7 + t * 86}%`, top: `${(Math.sin(Math.PI * t) * 12.5).toFixed(2)}em` };
}

function seatLook(view: View, seat: FmSeat, done: boolean): { mood: Mood; motion: Motion } {
  if (view.phase === "finale") {
    const won = seat.role !== null && fmTeamOf(seat.role) === view.winner;
    return { mood: won ? "win" : "sad", motion: won ? "jump" : "none" };
  }
  if ((view.phase === "dawn" && seat.id === view.victimId) || (view.phase === "verdict" && seat.id === view.eliminatedId)) return { mood: "shock", motion: "shake" };
  if (!seat.alive) return { mood: "sad", motion: "none" };
  switch (view.phase) {
    case "night":
      return { mood: "idle", motion: "none" };
    case "dawn":
      return { mood: view.victimId ? "shock" : "happy", motion: "none" };
    case "roles":
    case "discuss":
    case "vote":
      return { mood: done ? "happy" : "think", motion: done ? "none" : "bob" };
    default:
      return { mood: "idle", motion: "none" };
  }
}

function Village({ view, room }: { view: View; room: Room }) {
  const map = playerMap(room);
  const narration = narrate(view, room);
  const ballots = new Map<string, string[]>();
  for (const [voter, target] of Object.entries(view.votes ?? {})) ballots.set(target, [...(ballots.get(target) ?? []), voter]);
  return (
    <div className={`fm-town is-${view.phase}`}>
      <div className="fm-narrator">
        <Telly className="fm-telly" mood={narration.mood} pose={narration.pose} />
        <div key={`${view.phase}-${view.day}`} className="bubble fm-bubble pop-in">
          {narration.text}
        </div>
      </div>
      {view.seats.map((seat, i) => {
        const p = map.get(seat.id);
        const done = view.doneIds.includes(seat.id);
        const look = seatLook(view, seat, done);
        const flagged = (view.phase === "dawn" && seat.id === view.victimId) || (view.phase === "verdict" && seat.id === view.eliminatedId);
        const points = view.phase === "finale" ? view.scores.find((r) => r.playerId === seat.id)?.gained : undefined;
        const classes = ["fm-seat", seat.alive ? "is-alive" : "is-dead", flagged && "is-flagged", p && !p.connected && "is-away"].filter(Boolean).join(" ");
        return (
          <div key={seat.id} className={classes} style={seatStyle(i, view.seats.length)}>
            {view.phase === "verdict" && (
              <div className="fm-votes">
                {(ballots.get(seat.id) ?? []).map((voter) => {
                  const vp = map.get(voter);
                  return vp ? <Character key={voter} id={vp.character} size="1.8em" motion="none" mood="cheeky" /> : null;
                })}
              </div>
            )}
            <div className="fm-seat-body">
              {p ? <Character id={p.character} size="5em" mood={look.mood} motion={look.motion} dim={!seat.alive} /> : <span className="fm-seat-missing">?</span>}
              {view.phase === "night" && seat.alive && (
                <span className="fm-zzz" aria-hidden="true">
                  z<small>z</small>
                </span>
              )}
              {!seat.alive && (
                <span className="fm-ghost-mark" aria-hidden="true">
                  👻
                </span>
              )}
              {done && <span className="token-check is-done">✓</span>}
            </div>
            <span className="token-name">{p?.name ?? "Someone"}</span>
            {seat.role && <RoleTag role={seat.role} />}
            {points !== undefined && <span className={`fm-points ${points > 0 ? "" : "is-zero"}`}>+{points.toLocaleString()}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Intro({ view }: { view: View }) {
  return (
    <div className="tv-center fm-intro">
      <h1 className="tv-title slam-in">Full Moon</h1>
      <Telly size={150} pose="cheer" mood="cheeky" />
      <div className="card tv-rules">
        <ol>
          <li>
            Your phone deals you a <b>secret role</b>. Keep it to yourself!
          </li>
          <li>
            At <b>night</b>, everyone taps their phone: werewolves hunt, the seer peeks, the doctor protects.
          </li>
          <li>
            By <b>day</b>, argue it out and vote someone out of the village.
          </li>
        </ol>
        <p className="muted fm-rules-note">Villagers win when every werewolf is gone. Werewolves win once they match the villagers.</p>
      </div>
      <Lineup counts={view.roleCounts} />
    </div>
  );
}

export default function FullMoonTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  let content: ReactNode;
  if (view.phase === "intro") content = <Intro view={view} />;
  else if (view.phase === "podium") content = <Podium room={room} rows={view.scores} />;
  else {
    content = (
      <div className={`fm-stage is-${view.phase}`}>
        <Head view={view} room={room} client={client} />
        <Village view={view} room={room} />
      </div>
    );
  }
  // The sky stays mounted across phases so night can fade in and out.
  return (
    <>
      <Sky mode={skyOf(view)} />
      {content}
    </>
  );
}
