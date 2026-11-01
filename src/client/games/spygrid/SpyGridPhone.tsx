import { useState, type ReactNode } from "react";
import { SPY_CLUE_MAX, SPY_COUNT_MAX, SPY_END_TURN, SPY_TEAM_NAME, spyClueProblem, type SpyPlayer } from "@party/shared";
import { Timer } from "../../ui/Timer";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import { boardResultText, turnNoteText } from "./copy";
import { SpyCardTile, voteColours } from "./SpyCard";
import "./spygrid.css";

type Props = PhoneGameProps<SpyPlayer>;

const COUNTS = Array.from({ length: SPY_COUNT_MAX }, (_, i) => i + 1);

function RoleBar({ view }: { view: SpyPlayer }) {
  return (
    <div className={`spy-role is-${view.team}`}>
      <span className="spy-role-team">{SPY_TEAM_NAME[view.team]} team</span>
      <span className="spy-role-tag">{view.isSpymaster ? "🔑 Spymaster" : "Operative"}</span>
    </div>
  );
}

function Legend() {
  return (
    <div className="spy-legend" aria-hidden="true">
      <span>
        <span className="spy-swatch is-red" /> Red
      </span>
      <span>
        <span className="spy-swatch is-blue" /> Blue
      </span>
      <span>
        <span className="spy-swatch is-bystander" /> Bystander
      </span>
      <span>
        <span className="spy-swatch is-assassin" /> Assassin
      </span>
    </div>
  );
}

/** The 5×5 grid. Spymasters get the coloured key; operatives on their turn get tappable cards. */
function Grid({ view, room, picked = null, onPick }: { view: SpyPlayer; room: Props["room"]; picked?: number | null; onPick?(index: number): void }) {
  const dots = voteColours(view.votes, room);
  return (
    <div className={`spy-phone-board ${view.isSpymaster ? "is-key" : ""}`}>
      {view.cards.map((card, i) => (
        <SpyCardTile
          key={`${view.board}-${i}`}
          card={card}
          dots={dots.get(i)}
          last={view.lastFlip?.index === i}
          selected={picked === i}
          mine={view.myVote === i}
          onPick={onPick && !card.flipped ? () => onPick(i) : undefined}
        />
      ))}
    </div>
  );
}

function BoardCard({ view, room, title }: { view: SpyPlayer; room: Props["room"]; title?: string }) {
  return (
    <div className="phone-card spy-board-card">
      {title && <span className="label">{title}</span>}
      <Grid view={view} room={room} />
      {view.isSpymaster && <Legend />}
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <div className="phone-card spy-status">{children}</div>;
}

function ClueCard({ view, label }: { view: SpyPlayer; label: string }) {
  const clue = view.clue;
  if (!clue) return null;
  return (
    <div className={`phone-card spy-clue-card is-${clue.team}`}>
      <span className="label">{label}</span>
      <div className={`spy-clue-line ${clue.word.length > 10 ? "is-long" : ""}`}>
        <span className="spy-clue-word">{clue.word}</span>
        <span className="spy-clue-count">{clue.count}</span>
      </div>
      <span className="spy-clue-meta">
        {view.guessesLeft} {view.guessesLeft === 1 ? "guess" : "guesses"} left
      </span>
    </div>
  );
}

function ClueForm({ view, room, client }: Pick<Props, "room" | "client"> & { view: SpyPlayer }) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const trimmed = word.trim();
  const problem = trimmed ? spyClueProblem(trimmed, view.cards.filter((c) => !c.flipped).map((c) => c.word)) : null;
  const mine = view.teams.find((t) => t.team === view.team);
  const left = mine ? mine.agents - mine.found : 0;
  const ready = trimmed !== "" && problem === null && count !== null;
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) client.input({ type: "clue", word: trimmed, count });
      }}
    >
      <div className="spy-form-head">
        <h2 className="phone-card-title">Your clue</h2>
        <Timer client={client} room={room} size={52} />
      </div>
      <p className="muted spy-copy">
        One word that links some of your {left} {SPY_TEAM_NAME[view.team]} {left === 1 ? "agent" : "agents"}. Steer clear of the assassin!
      </p>
      <input
        className="input"
        value={word}
        maxLength={SPY_CLUE_MAX}
        placeholder="One word"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
        aria-label="Clue word"
        onChange={(e) => setWord(e.target.value)}
      />
      {problem && <p className="form-error">{problem}</p>}
      <span className="label">How many of your words does it fit?</span>
      <div className="spy-count">
        {COUNTS.map((n) => (
          <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)}>
            {n}
          </button>
        ))}
      </div>
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!ready}>
        {count === null ? "Pick a number" : `Send “${trimmed || "…"}” · ${count}`}
      </button>
    </form>
  );
}

/** Operatives on their turn: tap a word, then confirm, so a stray tap never flips the assassin. */
function VoteScreen({ view, room, client, playerId }: Pick<Props, "room" | "client" | "playerId"> & { view: SpyPlayer }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const sel = picked !== null && view.cards[picked] && !view.cards[picked].flipped ? picked : null;
  // Would my vote be the one that decides it?
  const decides = (index: number) => view.votes.filter((v) => v.index === index && v.playerId !== playerId).length + 1 >= view.votesNeeded;
  const endCount = view.votes.filter((v) => v.index === SPY_END_TURN).length;
  const votedEnd = view.myVote === SPY_END_TURN;
  const myWord = view.myVote !== null && view.myVote >= 0 ? view.cards[view.myVote]?.word : undefined;
  const send = (index: number) => {
    client.input({ type: "vote", index });
    setPicked(null);
    setConfirmEnd(false);
  };
  const unvote = () => {
    client.input({ type: "unvote" });
    setConfirmEnd(false);
  };

  let endLabel = `Vote to end turn${endCount > 0 ? ` (${endCount}/${view.votesNeeded})` : ""}`;
  let onEnd = () => send(SPY_END_TURN);
  if (votedEnd) {
    endLabel = `Undo end-turn vote (${endCount}/${view.votesNeeded})`;
    onEnd = unvote;
  } else if (decides(SPY_END_TURN)) {
    endLabel = confirmEnd ? "Tap again to end your turn" : "End turn";
    onEnd = confirmEnd
      ? () => send(SPY_END_TURN)
      : () => {
          setPicked(null);
          setConfirmEnd(true);
        };
  }

  return (
    <>
      <ClueCard view={view} label="Your spymaster's clue" />
      <div className="phone-card spy-board-card">
        <Grid
          view={view}
          room={room}
          picked={sel}
          onPick={(i) => {
            setConfirmEnd(false);
            // Tapping the selected card (or the one you already voted for) just clears the selection.
            setPicked(sel === i || view.myVote === i ? null : i);
          }}
        />
        <p className="spy-board-foot">{view.votesNeeded > 1 ? `${view.votesNeeded} matching votes flip a word.` : "Tap a word, then confirm to flip it."}</p>
      </div>
      <div className="phone-sticky spy-vote-bar">
        {sel !== null ? (
          <button type="button" className="btn btn-accent btn-lg btn-block pop-in" onClick={() => send(sel)}>
            {decides(sel) ? `Flip “${view.cards[sel]?.word}”` : `Vote for “${view.cards[sel]?.word}”`}
          </button>
        ) : myWord ? (
          <div className="spy-vote-status">
            <span>
              You picked <b>“{myWord}”</b> — waiting for your team.
            </span>
            <button type="button" className="btn btn-light btn-sm" onClick={unvote}>
              Take back
            </button>
          </div>
        ) : null}
        <button type="button" className={`btn btn-block ${votedEnd || confirmEnd ? "btn-danger" : "btn-light"}`} onClick={onEnd}>
          {endLabel}
        </button>
      </div>
    </>
  );
}

export default function SpyGridPhone({ view, client, room, playerId }: Props) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const teamName = SPY_TEAM_NAME[view.team];
  const holders = view.teams.find((t) => t.team === view.team)?.spymasterIds ?? [];
  const giver = holders.find((id) => room.players.some((p) => p.id === id && p.connected)) ?? holders[0];
  const activeName = view.activeTeam ? SPY_TEAM_NAME[view.activeTeam] : "";
  const myTurn = view.activeTeam === view.team;

  let body: ReactNode;
  switch (view.phase) {
    case "intro":
      body = (
        <PhoneMessage character={me?.character} mood="cheeky" title="Spy Grid">
          <p>
            You're on the <span className="spy-team-word">{teamName}</span> team!
          </p>
          <p>Find your teammates on the TV.</p>
        </PhoneMessage>
      );
      break;

    case "teams":
      body = view.isSpymaster ? (
        <>
          <RoleBar view={view} />
          <div className="phone-card pop-in">
            <h2 className="phone-card-title">You're the spymaster!</h2>
            <p className="muted spy-copy">Only you can see the key. Start hunting for clues that link your {teamName} agents — and keep well away from the assassin.</p>
          </div>
          <BoardCard view={view} room={room} title="The secret key" />
        </>
      ) : (
        <>
          <RoleBar view={view} />
          <PhoneMessage character={me?.character} mood="happy" title={`Team ${teamName}!`}>
            <p>{nameOf(room, giver)} is your spymaster. Listen for the clue, then vote with your team.</p>
          </PhoneMessage>
        </>
      );
      break;

    case "clue":
      body = (
        <>
          <RoleBar view={view} />
          {view.canClue ? (
            <ClueForm key={view.history.length} view={view} room={room} client={client} />
          ) : (
            <Status>
              {view.turnEnd && <span className="spy-status-note">{turnNoteText(view, view.turnEnd)}</span>}
              <b>{myTurn ? `${nameOf(room, giver)} is thinking of a clue for you…` : `${activeName} team's spymaster is thinking…`}</b>
            </Status>
          )}
          <BoardCard view={view} room={room} title={view.isSpymaster ? "The secret key" : undefined} />
        </>
      );
      break;

    case "guess":
      body = view.canVote ? (
        <>
          <RoleBar view={view} />
          <VoteScreen key={view.history.length} view={view} room={room} client={client} playerId={playerId} />
        </>
      ) : (
        <>
          <RoleBar view={view} />
          <ClueCard view={view} label={myTurn ? "Your clue" : `${activeName}'s clue`} />
          <Status>
            <b>{myTurn ? "Your team is guessing — no hints! 🤐" : `${activeName} team is guessing…`}</b>
          </Status>
          <BoardCard view={view} room={room} title={view.isSpymaster ? "The secret key" : undefined} />
        </>
      );
      break;

    case "boardEnd": {
      const won = view.winner === view.team;
      body = (
        <>
          <RoleBar view={view} />
          <PhoneMessage
            character={me?.character}
            mood={won ? "win" : view.winner ? "sad" : "idle"}
            title={view.winner ? (won ? "Your team wins!" : `${SPY_TEAM_NAME[view.winner]} wins`) : "Board called off"}
          >
            {view.gained > 0 && <p className="phone-gain">+{view.gained} this board</p>}
            <p>{boardResultText(view)}</p>
          </PhoneMessage>
          <BoardCard view={view} room={room} title="The whole key" />
        </>
      );
      break;
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }

  return <div className={`spy spy-phone is-${view.team}`}>{body}</div>;
}
