// Full Moon — phone. Your secret role card (re-viewable from "My role"), the
// night picker for your role, the seer's vision at dawn, "Ready to vote" by
// day, then the vote. The dead get a ghost screen that sees everything.

import { useState } from "react";
import { FM_ROLES, FM_SKIP, fmTeamOf, type FmPhase, type FmPlayer, type FmRole } from "@party/shared";
import { Character } from "../../art/Character";
import type { Mood } from "../../art/Face";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import { RoleTag, aRole } from "./parts";
import "./fullmoon.css";

type Room = PhoneGameProps["room"];
type Client = PhoneGameProps["client"];

interface Props {
  view: FmPlayer;
  room: Room;
  playerId: string;
}

const NIGHT_COPY: Record<FmRole, { title: string; hint: string }> = {
  wolf: { title: "Choose tonight's victim", hint: "Agree with your pack — the most-picked name gets attacked." },
  seer: { title: "Who will you peek at?", hint: "At dawn you'll learn whether they're a werewolf." },
  doctor: { title: "Who will you protect?", hint: "If the werewolves come for them, they survive. Not the same person two nights running." },
  villager: { title: "Who do you suspect?", hint: "Just a hunch. Everyone taps at night, so nobody can tell who's who." },
};

const GHOST_PHASES: FmPhase[] = ["night", "dawn", "discuss", "vote", "verdict"];

function Avatar({ room, id, size = 44, mood = "idle" }: { room: Room; id: string; size?: number; mood?: Mood }) {
  const p = room.players.find((x) => x.id === id);
  return p ? <Character id={p.character} size={size} motion="none" mood={mood} /> : null;
}

function RoleCard({ view, room, playerId }: Props) {
  if (!view.role) return null;
  const info = FM_ROLES[view.role];
  const pack = view.packIds.filter((id) => id !== playerId);
  const dead = new Set(view.seats.filter((s) => !s.alive).map((s) => s.id));
  return (
    <div className="phone-card fm-role-card pop-in">
      <span className="fm-role-emoji" aria-hidden="true">
        {info.emoji}
      </span>
      <span className="fm-kicker">You are {info.article}</span>
      <h2 className="fm-role-name">{info.name}</h2>
      <p className="fm-role-goal">{info.goal}</p>
      <span className="badge">{info.team === "wolves" ? "Team Werewolf" : "Team Village"}</span>
      {view.role === "wolf" && (
        <div className="fm-role-extra">
          <span className="fm-kicker">{pack.length ? "Your pack" : "You hunt alone"}</span>
          {pack.length > 0 && (
            <div className="fm-pack">
              {pack.map((id) => (
                <div key={id} className="fm-pack-mate">
                  <Avatar room={room} id={id} size={52} mood={dead.has(id) ? "sad" : "cheeky"} />
                  <span>
                    {nameOf(room, id)}
                    {dead.has(id) ? " 💀" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {view.role === "seer" && view.visions.length > 0 && (
        <div className="fm-role-extra">
          <span className="fm-kicker">Your visions</span>
          <ul className="fm-visions">
            {view.visions.map((v) => (
              <li key={`${v.day}-${v.targetId}`}>
                <Avatar room={room} id={v.targetId} size={34} />
                <span className="grow">{nameOf(room, v.targetId)}</span>
                <span className={`badge ${v.wolf ? "badge-danger" : ""}`}>{v.wolf ? "🐺 Werewolf" : "Not a werewolf"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {view.role === "doctor" && view.lastProtectedId && (
        <p className="fm-role-goal">
          Last night you protected <b>{nameOf(room, view.lastProtectedId)}</b>.
        </p>
      )}
    </div>
  );
}

/** Collapsed by default so the role isn't sitting on screen; re-keyed per phase so it closes itself. */
function RoleToggle(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fm-role-toggle">
      <button type="button" className="btn btn-light btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide my role" : "🎭 My role"}
      </button>
      {open && <RoleCard {...props} />}
    </div>
  );
}

function NightPicker({ view, room, playerId, client }: Props & { client: Client }) {
  const role = view.role ?? "villager";
  const copy = NIGHT_COPY[role];
  // Werewolves see where the rest of the pack is pointing.
  const packOn = new Map<string, string[]>();
  for (const [wolf, target] of Object.entries(view.packPicks)) packOn.set(target, [...(packOn.get(target) ?? []), wolf]);
  const visionOf = (id: string) => [...view.visions].reverse().find((v) => v.targetId === id);
  // The doctor also sees last night's guard, greyed out, so the rule is obvious.
  const shown = view.seats
    .filter((s) => {
      if (!s.alive) return false;
      if (role === "wolf") return !view.packIds.includes(s.id);
      if (role === "doctor") return true;
      return s.id !== playerId;
    })
    .map((s) => s.id);
  return (
    <div className="phone-card fm-night pop-in">
      <span className="fm-kicker">🌙 Night {view.day}</span>
      <h2 className="phone-card-title">{copy.title}</h2>
      <p className="fm-hint">{copy.hint}</p>
      <div className="phone-choices">
        {shown.map((id) => {
          const allowed = view.nightTargets.includes(id);
          const vision = role === "seer" ? visionOf(id) : undefined;
          return (
            <button key={id} type="button" className={`choice ${view.myPick === id ? "is-picked" : ""}`} disabled={!allowed} onClick={() => client.input({ type: "pick", targetId: id })}>
              <Avatar room={room} id={id} />
              <span className="grow">
                {nameOf(room, id)}
                {id === playerId ? " (you)" : ""}
              </span>
              {(packOn.get(id) ?? []).map((wolf) => (
                <Avatar key={wolf} room={room} id={wolf} size={30} mood="cheeky" />
              ))}
              {vision && <span className={`badge ${vision.wolf ? "badge-danger" : ""}`}>{vision.wolf ? "🐺 Werewolf" : "Not a wolf"}</span>}
              {!allowed && <span className="badge">Guarded last night</span>}
            </button>
          );
        })}
      </div>
      <p className="fm-hint">{view.myPick ? "Locked in — tap another name to change your mind." : "The night ends once everyone has chosen."}</p>
    </div>
  );
}

function Dawn({ view, room, playerId }: Props) {
  const me = room.players.find((p) => p.id === playerId);
  const vision = view.role === "seer" ? view.visions.find((v) => v.day === view.day) : undefined;
  if (vision) {
    return (
      <div className="phone-card fm-vision pop-in">
        <span className="fm-kicker">🔮 Your vision</span>
        <Avatar room={room} id={vision.targetId} size={110} mood={vision.wolf ? "cheeky" : "happy"} />
        <h2 className="phone-card-title">
          {nameOf(room, vision.targetId)} {vision.wolf ? "is a WEREWOLF!" : "is not a werewolf."}
        </h2>
        <p className="fm-hint">Only you can see this. Use it wisely…</p>
      </div>
    );
  }
  return (
    <PhoneMessage character={me?.character} mood={view.victimId ? "shock" : "happy"} title="The sun rises…">
      <p>{view.victimId ? `${nameOf(room, view.victimId)} didn't make it through the night.` : "Everyone made it through the night!"}</p>
      <p>Eyes on the TV.</p>
    </PhoneMessage>
  );
}

function Discuss({ view, client }: { view: FmPlayer; client: Client }) {
  return (
    <div className="phone-card pop-in">
      <span className="label">☀️ Day {view.day}</span>
      <h2 className="phone-card-title">Who's the werewolf?</h2>
      <p className="muted fm-strong">Talk it out with the village. When you've heard enough, tap below.</p>
      <button type="button" className="btn btn-accent btn-lg btn-block" disabled={view.done} onClick={() => client.input({ type: "ready" })}>
        {view.done ? "Waiting for the others…" : "Ready to vote"}
      </button>
    </div>
  );
}

function Vote({ view, room, client }: Props & { client: Client }) {
  const locked = view.myVote !== null;
  return (
    <div className="phone-card pop-in">
      <h2 className="phone-card-title">Vote someone out</h2>
      <div className="phone-choices">
        {view.voteTargets.map((id) => (
          <button key={id} type="button" className={`choice ${view.myVote === id ? "is-picked" : ""}`} disabled={locked} onClick={() => client.input({ type: "vote", targetId: id })}>
            <Avatar room={room} id={id} />
            <span className="grow">{nameOf(room, id)}</span>
          </button>
        ))}
        <button type="button" className={`choice ${view.myVote === FM_SKIP ? "is-picked" : ""}`} disabled={locked} onClick={() => client.input({ type: "vote", targetId: FM_SKIP })}>
          <span className="fm-skip-icon" aria-hidden="true">
            🤷
          </span>
          <span className="grow">Skip — nobody today</span>
        </button>
      </div>
      {locked && <p className="muted fm-strong fm-center">Vote locked in. Waiting for the village…</p>}
    </div>
  );
}

function Verdict({ view, room, playerId }: Props) {
  const me = room.players.find((p) => p.id === playerId);
  const role = view.seats.find((s) => s.id === view.eliminatedId)?.role ?? null;
  if (view.verdict === "eliminated" && view.eliminatedId && role) {
    return (
      <PhoneMessage character={me?.character} mood="shock" title={`${nameOf(room, view.eliminatedId)} is out!`}>
        <p>
          They were {aRole(role)} {FM_ROLES[role].emoji}
        </p>
      </PhoneMessage>
    );
  }
  const line = view.verdict === "tie" ? "It's a tie — the village can't agree." : view.verdict === "skipped" ? "The village skipped the vote." : "Nobody voted.";
  return (
    <PhoneMessage character={me?.character} mood="think" title="Nobody leaves today">
      <p>{line}</p>
    </PhoneMessage>
  );
}

function Ghost({ view, room, playerId }: Props) {
  const mine = view.seats.find((s) => s.id === playerId);
  const g = view.ghost;
  const how = !mine?.death ? "" : mine.death.cause === "wolves" ? `The werewolves got you on night ${mine.death.day}.` : `The village voted you out on day ${mine.death.day}.`;
  const moves: string[] = [];
  if (g) {
    for (const [wolf, target] of Object.entries(g.wolfPicks)) moves.push(`🐺 ${nameOf(room, wolf)} is stalking ${nameOf(room, target)}`);
    if (g.seerPick) moves.push(`🔮 The seer peeks at ${nameOf(room, g.seerPick)}`);
    if (g.doctorPick) moves.push(`🩺 The doctor guards ${nameOf(room, g.doctorPick)}`);
  }
  const ballots = Object.entries(g?.votes ?? {});
  return (
    <>
      <div className="phone-card fm-ghost pop-in">
        <span className="fm-ghost-emoji" aria-hidden="true">
          👻
        </span>
        <h2 className="phone-card-title">You're a ghost</h2>
        <p className="muted fm-strong">{how} No hints for the living — but you can watch everything.</p>
      </div>
      {view.phase === "night" && (
        <div className="phone-card fm-night">
          <span className="fm-kicker">🌙 Tonight in the village</span>
          {moves.length ? (
            <ul className="fm-list">
              {moves.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="fm-hint">Nobody has made a move yet…</p>
          )}
        </div>
      )}
      {view.phase === "vote" && (
        <div className="phone-card">
          <span className="label">Votes so far</span>
          {ballots.length ? (
            <ul className="fm-list">
              {ballots.map(([voter, target]) => (
                <li key={voter}>
                  {nameOf(room, voter)} → {target === FM_SKIP ? "Skip" : nameOf(room, target)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted fm-strong">No votes yet…</p>
          )}
        </div>
      )}
      <div className="phone-card">
        <span className="label">Who's who</span>
        <ul className="fm-list fm-whoswho">
          {view.seats.map((s) => (
            <li key={s.id} className={s.alive ? "" : "is-dead"}>
              <Avatar room={room} id={s.id} size={34} mood={s.alive ? "idle" : "sad"} />
              <span className="grow">
                {nameOf(room, s.id)}
                {s.alive ? "" : " 💀"}
              </span>
              {s.role && <RoleTag role={s.role} />}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Finale({ view, room, playerId }: Props) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view.role) return null;
  const won = fmTeamOf(view.role) === view.winner;
  const b = view.breakdown;
  return (
    <PhoneMessage character={me?.character} mood={won ? "win" : "sad"} title={view.winner === "village" ? "The village wins!" : "The werewolves win!"}>
      <p>
        You were {aRole(view.role)} {FM_ROLES[view.role].emoji} — {won ? "your side won!" : "better luck next full moon."}
      </p>
      {b && (
        <ul className="fm-list fm-breakdown">
          {b.team > 0 && (
            <li>
              Team win <b>+{b.team}</b>
            </li>
          )}
          {b.survived > 0 && (
            <li>
              Survived <b>+{b.survived}</b>
            </li>
          )}
          {b.wolfVotes > 0 && (
            <li>
              Votes for werewolves <b>+{b.wolfVotes}</b>
            </li>
          )}
          {b.visions > 0 && (
            <li>
              Werewolves spotted <b>+{b.visions}</b>
            </li>
          )}
          <li className="is-total">
            Total <b>{b.total.toLocaleString()}</b>
          </li>
        </ul>
      )}
    </PhoneMessage>
  );
}

export default function FullMoonPhone({ view, client, room, playerId }: PhoneGameProps<FmPlayer>) {
  if (!view) return null;
  const me = room.players.find((p) => p.id === playerId);
  const props: Props = { view, room, playerId };
  if (!view.alive && GHOST_PHASES.includes(view.phase)) return <Ghost {...props} />;
  const toggle = <RoleToggle key={view.phase} {...props} />;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Full Moon">
          <p>Your secret role is on its way. Keep your screen to yourself!</p>
        </PhoneMessage>
      );

    case "roles":
      return (
        <>
          <RoleCard {...props} />
          <button type="button" className="btn btn-accent btn-lg btn-block" disabled={view.done} onClick={() => client.input({ type: "ready" })}>
            {view.done ? "Waiting for everyone…" : "Got it"}
          </button>
        </>
      );

    case "night":
      return (
        <>
          <NightPicker {...props} client={client} />
          {toggle}
        </>
      );

    case "dawn":
      return (
        <>
          <Dawn {...props} />
          {toggle}
        </>
      );

    case "discuss":
      return (
        <>
          <Discuss view={view} client={client} />
          {toggle}
        </>
      );

    case "vote":
      return (
        <>
          <Vote {...props} client={client} />
          {toggle}
        </>
      );

    case "verdict":
      return (
        <>
          <Verdict {...props} />
          {toggle}
        </>
      );

    case "finale":
      return <Finale {...props} />;

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
