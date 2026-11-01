import type { FibTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./fibfactory.css";

/** "My most useless talent is ___" → "Lucas's most useless talent is ___" */
function aboutThem(question: string, name: string): string {
  return question.replace(/^My /, `${name}'s `).replace(/^If I /, `If ${name} `).replace(/^The (.*?) I /, `The $1 ${name} `);
}

export default function FibFactoryTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const subject = view.subjectId ? map.get(view.subjectId) : undefined;
  const question = view.question && subject ? aboutThem(view.question, subject.name) : view.question;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Fib Factory</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Each round one of you is in the <b>spotlight</b> and secretly answers a question about themselves. Everyone else writes a <b>lie</b> that sounds just like them. Then find the truth — and fool your friends with your fib.
          </div>
        </div>
      );

    case "write":
    case "pick":
      return (
        <div className="fib-stage">
          <div className="fib-spotlight">
            <span className="tv-pill">
              Round {view.round} of {view.totalRounds}
            </span>
            {subject && <Character id={subject.character} size="8em" mood={view.phase === "write" ? "think" : "cheeky"} motion="bob" />}
            <span className="token-name">{subject?.name} is in the spotlight</span>
          </div>
          <div className="fib-side">
            <div className="card fib-question slam-in">{question}</div>
            <Timer client={client} room={room} size="5em" />
            {view.phase === "write" ? (
              <p className="tv-sub">
                {subject?.name}: tell the truth. Everyone else: lie like {subject?.name} would.
              </p>
            ) : (
              <div className="fib-options">
                {view.options.map((o, i) => (
                  <div key={o.key} className="fib-option rise-in" style={{ animationDelay: `${i * 90}ms` }}>
                    {o.text}
                  </div>
                ))}
              </div>
            )}
            <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.8} />
          </div>
        </div>
      );

    case "reveal":
      if (view.skipped) {
        return (
          <div className="tv-center">
            <h1 className="tv-title">No truth, no round!</h1>
            <p className="tv-sub">{nameOf(room, view.subjectId)} never answered.</p>
          </div>
        );
      }
      return (
        <div className="tv-center fib-reveal">
          <div className="card fib-question is-small">{question}</div>
          <div className="fib-options is-wide">
            {[...view.reveal]
              .sort((a, b) => Number(a.truth) - Number(b.truth) || b.pickerIds.length - a.pickerIds.length)
              .map((o, i) => (
                <div key={o.key} className={`fib-option is-revealed rise-in ${o.truth ? "is-truth" : ""}`} style={{ animationDelay: `${i * 350}ms` }}>
                  <div className="fib-option-text">{o.text}</div>
                  <div className="fib-option-meta">
                    {o.truth ? <b>THE TRUTH</b> : <span>Lie by {o.authorIds.map((id) => nameOf(room, id)).join(" & ")}</span>}
                    <span className="fib-pickers">
                      {o.pickerIds.map((id) => {
                        const p = map.get(id);
                        return p ? <Character key={id} id={p.character} size="1.7em" motion="none" mood={o.truth ? "happy" : "shock"} /> : null;
                      })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After round ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
