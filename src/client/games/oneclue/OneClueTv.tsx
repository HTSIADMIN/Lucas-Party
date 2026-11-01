import { OC_CLUE_POINTS, OC_GUESSER_POINTS, type OcClueCard, type OcTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./oneclue.css";

type Room = TvGameProps["room"];

/** The face-down card: the guesser is watching, so the word never shows before the result. */
function MysteryCard() {
  return (
    <div className="oc-mystery slam-in">
      <span className="oc-mystery-mark" aria-hidden="true">
        ?
      </span>
      <span className="oc-mystery-label">Mystery word</span>
    </div>
  );
}

function ClueCards({ cards, room, payout }: { cards: OcClueCard[]; room: Room; payout: boolean }) {
  const map = playerMap(room);
  return (
    <div className="oc-cards">
      {cards.map((card, i) => {
        const author = card.playerId ? map.get(card.playerId) : undefined;
        const text = card.text;
        return (
          <div key={card.playerId ?? `blank-${i}`} className={`oc-card ${card.cancelled ? "is-cancelled" : ""} ${text === null ? "is-blank" : ""}`} style={{ animationDelay: `${i * 110}ms` }}>
            {text === null ? (
              <span className="oc-card-x" aria-hidden="true">
                ✕
              </span>
            ) : (
              <span className={`oc-card-text ${text.length > 11 ? "is-long" : ""}`}>{text}</span>
            )}
            {card.cancelled && <span className="oc-stamp">Cancelled</span>}
            {author && (
              <span className="oc-card-by">
                <Character id={author.character} size="1.9em" motion="none" mood={card.cancelled ? "sad" : payout ? "win" : "happy"} />
                <span className="oc-card-name">{author.name}</span>
              </span>
            )}
            {payout && !card.cancelled && <span className="oc-card-points">+{OC_CLUE_POINTS}</span>}
          </div>
        );
      })}
    </div>
  );
}

function TeamTally({ view }: { view: View }) {
  return (
    <span className="tv-pill oc-tally">
      Team: {view.teamRight} of {view.roundsPlayed} right
    </span>
  );
}

function banner(view: View): string {
  switch (view.outcome) {
    case "correct":
      return view.accepted ? "Close enough!" : "Got it!";
    case "wrong":
      return "Not quite!";
    case "pass":
      return "Passed!";
    case "timeout":
      return "Out of time!";
    case "noClues":
      return view.cards.length ? "All clues cancelled!" : "No clues!";
    default:
      return "";
  }
}

function outcomeLine(view: View, guesser: string): string {
  switch (view.outcome) {
    case "correct":
      return view.accepted ? `${guesser} said “${view.guess}” — the host counts it!` : `${guesser} said “${view.guess}” — +${OC_GUESSER_POINTS}!`;
    case "wrong":
      return `${guesser} guessed “${view.guess}”. Nobody scores.`;
    case "pass":
      return `${guesser} passed. Nobody scores.`;
    case "timeout":
      return `${guesser} ran out of time.`;
    case "noClues":
      return view.cards.length ? `Every clue matched another — ${guesser} had nothing to go on!` : "Nobody wrote a clue in time.";
    default:
      return "";
  }
}

function verdict(right: number, played: number): string {
  const share = played ? right / played : 0;
  if (share === 1) return "Perfect! Are you reading each other's minds?";
  if (share >= 0.75) return "Brilliant teamwork!";
  if (share >= 0.5) return "Not bad at all!";
  if (share > 0) return "Room to grow…";
  return "Well… it's the taking part that counts.";
}

export default function OneClueTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const guesser = view.guesserId ? map.get(view.guesserId) : undefined;
  const guesserName = nameOf(room, view.guesserId);
  const roundLabel = `Round ${view.round} of ${view.totalRounds}`;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">One Clue</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card tv-rules">
            <ol>
              <li>
                One of you is the <b>guesser</b>. Everyone else sees the <b>mystery word</b> on their phone.
              </li>
              <li>
                Write a <b>one-word clue</b>. Matching clues <b>cancel out</b> — be clever, not obvious!
              </li>
              <li>
                The guesser gets one shot: <b>+{OC_GUESSER_POINTS}</b> for them and <b>+{OC_CLUE_POINTS}</b> for every clue that survived.
              </li>
            </ol>
            <p className="muted">Guesser: no peeking at anyone's phone!</p>
          </div>
        </div>
      );

    case "clue":
      return (
        <div className="oc-stage">
          <div className="oc-guesser">
            <span className="tv-pill">{roundLabel}</span>
            {guesser && <Character id={guesser.character} size="10em" mood="think" motion="bob" dim={!guesser.connected} />}
            <h1 className="tv-title oc-title">{guesserName} is guessing</h1>
            <div className="bubble oc-nopeek">No peeking at anyone's phone! 🙈</div>
          </div>
          <div className="oc-side">
            <div className="oc-mystery-row">
              <MysteryCard />
              <Timer client={client} room={room} size="5em" />
            </div>
            <p className="tv-sub">Everyone else: write a one-word clue on your phone. Matching clues cancel out!</p>
            <ProgressRow room={room} ids={view.writerIds} doneIds={view.submittedIds} size={3.2} />
          </div>
        </div>
      );

    case "guess": {
      const cancelled = view.cards.filter((c) => c.cancelled).length;
      return (
        <div className="oc-board">
          <div className="oc-head">
            {guesser && <Character id={guesser.character} size="5.5em" mood="think" motion="bob" dim={!guesser.connected} />}
            <div className="oc-head-text">
              <span className="tv-pill">{roundLabel}</span>
              <h1 className="tv-title oc-title">{guesserName}, what's the word?</h1>
            </div>
            <Timer client={client} room={room} size="5em" />
          </div>
          <ClueCards cards={view.cards} room={room} payout={false} />
          <p className="tv-sub">{cancelled === 0 ? "No clues cancelled — nice and original!" : `${cancelled} clues cancelled each other out!`}</p>
        </div>
      );
    }

    case "result": {
      const good = view.outcome === "correct";
      return (
        <div className="oc-board">
          <div className="oc-result-head">
            <div className={`oc-banner slam-in ${good ? "is-good" : ""}`}>{banner(view)}</div>
            <div className="oc-reveal">
              <span className="tv-sub oc-reveal-label">The word was</span>
              <div className="oc-word pop-in">{view.word}</div>
            </div>
            {guesser && <Character key={view.outcome ?? "none"} id={guesser.character} size="6em" mood={good ? "win" : "sad"} motion="jump" />}
          </div>
          <p className="tv-sub">{outcomeLine(view, guesserName)}</p>
          {view.cards.length > 0 && <ClueCards cards={view.cards} room={room} payout={good} />}
          {view.missingIds.length > 0 && <p className="tv-sub oc-missing">No clue from {view.missingIds.map((id) => nameOf(room, id)).join(", ")}</p>}
          <TeamTally view={view} />
        </div>
      );
    }

    case "standings": {
      const final = view.round >= view.totalRounds;
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={final ? "Final scores" : `After round ${view.round}`} />
          <p className="tv-sub">
            Team: {view.teamRight} of {view.roundsPlayed} right{final ? ` — ${verdict(view.teamRight, view.roundsPlayed)}` : ""}
          </p>
        </div>
      );
    }

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
