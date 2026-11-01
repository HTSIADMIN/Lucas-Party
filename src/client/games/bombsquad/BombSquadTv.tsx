import { BS_MAX_STRIKES, BS_MODULES, type BsModule, type BsTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import type { TvGameProps } from "../registry";
import { Podium, Scoreboard, nameOf, playerMap } from "../shared";
import { Countdown } from "./Countdown";
import "./bombsquad.css";

const MODULE_NAME: Record<BsModule, string> = { wires: "Wires", keypad: "Keypad", words: "Sound-alikes" };

export default function BombSquadTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const defuser = view.defuserId ? map.get(view.defuserId) : undefined;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Bomb Squad</h1>
          <Telly size={160} pose="cheer" mood="shock" />
          <div className="card" style={{ fontSize: "1.25em", maxWidth: "38em", textAlign: "left" }}>
            One of you gets the bomb on their phone — <b>nobody else can see it</b>. Everyone else holds pieces of the <b>defusal manual</b>. Describe what you see, read out the rules, and disarm all three modules before time runs out. Three strikes and… well.
          </div>
        </div>
      );

    case "brief":
      return (
        <div className="tv-center">
          <span className="tv-pill">
            Bomb {view.round} of {view.totalRounds}
          </span>
          {defuser && <Character id={defuser.character} size="8em" mood="shock" motion="shake" />}
          <h1 className="tv-title" style={{ fontSize: "3em" }}>
            {defuser?.name} is on the bomb!
          </h1>
          <p className="tv-sub">Experts: open your manuals. Defuser: don't show anyone your screen!</p>
        </div>
      );

    case "defuse":
      return (
        <div className="tv-center bs-stage">
          <div className="bs-bomb-face">
            {view.explodesAt !== null && <Countdown client={client} explodesAt={view.explodesAt} />}
            <div className="bs-strikes">
              {Array.from({ length: BS_MAX_STRIKES }, (_, i) => (
                <span key={i} className={`bs-strike ${i < view.strikes ? "is-on" : ""}`}>
                  ✖
                </span>
              ))}
            </div>
          </div>
          <div className="bs-lights">
            {BS_MODULES.map((m) => (
              <div key={m} className={`bs-light ${view.solved[m] ? "is-solved" : ""}`}>
                <span className="bs-light-dot" />
                {MODULE_NAME[m]}
              </div>
            ))}
          </div>
          <p className="tv-sub">
            {defuser?.name}: describe the bomb. Everyone else: read your manual!
          </p>
        </div>
      );

    case "result":
      return (
        <div className="tv-center">
          <div className={`bs-outcome slam-in ${view.outcome === "defused" ? "is-defused" : "is-boom"}`}>{view.outcome === "defused" ? "DEFUSED!" : "BOOM!"}</div>
          {defuser && <Character id={defuser.character} size="8em" mood={view.outcome === "defused" ? "win" : "sad"} motion="jump" />}
          <p className="tv-sub">
            {view.outcome === "defused" ? `${nameOf(room, view.defuserId)} and the experts did it with ${view.secondsLeft}s to spare!` : view.strikes >= BS_MAX_STRIKES ? "Three strikes. Sweep up the confetti." : "Time ran out!"}
          </p>
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After bomb ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
