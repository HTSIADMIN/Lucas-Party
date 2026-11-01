import { SPY_END_TURN, SPY_TEAM_NAME, type SpyTeam, type SpyTeamInfo, type SpyTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, Scoreboard, nameOf, playerMap } from "../shared";
import { boardResultText, turnNoteText } from "./copy";
import { SpyCardTile, VoteDots, voteColours } from "./SpyCard";
import "./spygrid.css";

type Room = TvGameProps["room"];

function TeamWord({ team }: { team: SpyTeam }) {
  return <span className={`spy-team-word is-${team}`}>{SPY_TEAM_NAME[team]}</span>;
}

/** One pip per agent, filled as they're found. Diamonds for Red, circles for Blue. */
function Pips({ total, found }: { total: number; found: number }) {
  return (
    <div className="spy-pips" aria-label={`${found} of ${total} agents found`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`spy-pip ${i < found ? "is-found" : ""}`} />
      ))}
    </div>
  );
}

function TeamPanel({ info, view, room }: { info: SpyTeamInfo; view: View; room: Room }) {
  const map = playerMap(room);
  const active = view.activeTeam === info.team;
  const won = view.winner === info.team;
  const lost = view.winner !== null && !won;
  const left = info.agents - info.found;
  const clues = view.history.filter((c) => c.team === info.team).slice(-4);
  const classes = ["spy-team", `is-${info.team}`, active && "is-active", view.activeTeam && !active && "is-waiting", won && "is-winner"].filter(Boolean).join(" ");
  return (
    <section className={classes}>
      <header className="spy-team-head">
        <span className="spy-team-name">{SPY_TEAM_NAME[info.team]}</span>
        {view.startingTeam === info.team && view.phase === "teams" && <span className="spy-team-first">Goes first</span>}
      </header>
      {info.agents > 0 && (
        <>
          <div className="spy-team-count">
            <span className="spy-team-left tabular">{left}</span>
            <span className="spy-team-left-label">{left === 1 ? "agent" : "agents"} to find</span>
          </div>
          <Pips total={info.agents} found={info.found} />
        </>
      )}
      <ul className="spy-members">
        {info.memberIds.map((id) => {
          const p = map.get(id);
          const holdsKey = info.spymasterIds.includes(id);
          const thinking = active && holdsKey && view.phase === "clue";
          const mood = won ? "win" : lost ? "sad" : thinking ? "think" : active ? "happy" : "idle";
          return (
            <li key={id} className={`spy-member ${p && !p.connected ? "is-away" : ""}`}>
              {p && <Character id={p.character} size="2.5em" mood={mood} motion={won ? "jump" : thinking ? "bob" : "none"} dim={!p.connected} />}
              <span className="spy-member-text">
                <span className="spy-member-name">{p?.name ?? "Someone"}</span>
                {holdsKey && <span className="spy-badge">🔑 Spymaster</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {clues.length > 0 && (
        <div className="spy-history">
          {clues.map((c, i) => (
            <span key={i} className="spy-history-chip">
              {c.word} <b>{c.count}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Head({ view, room, client }: { view: View; room: Room; client: TvGameProps["client"] }) {
  switch (view.phase) {
    case "teams":
      return (
        <div className="spy-head-text">
          <span className="tv-pill">
            Board {view.board} of {view.totalBoards}
          </span>
          <h1 className="tv-title spy-head-title slam-in">
            <TeamWord team={view.startingTeam ?? "red"} /> goes first!
          </h1>
          <p className="tv-sub">Spymasters — check your phones for the secret key.</p>
        </div>
      );

    case "clue": {
      const team = view.activeTeam ?? "red";
      const holders = view.teams.find((t) => t.team === team)?.spymasterIds ?? [];
      const giver = holders.find((id) => room.players.some((p) => p.id === id && p.connected)) ?? holders[0];
      return (
        <>
          <div className="spy-head-text">
            {view.turnEnd && (
              <span key={`${view.history.length}-${view.turnEnd.reason}`} className="spy-note pop-in">
                {turnNoteText(view, view.turnEnd)}
              </span>
            )}
            <h1 className="tv-title spy-head-title">
              <TeamWord team={team} />’s turn
            </h1>
            <p className="tv-sub">{nameOf(room, giver)} is thinking of a clue…</p>
          </div>
          <Timer client={client} room={room} size="4.6em" />
        </>
      );
    }

    case "guess": {
      const clue = view.clue;
      if (!clue) return null;
      const endVotes = voteColours(view.votes, room).get(SPY_END_TURN) ?? [];
      return (
        <>
          <div className="spy-head-text">
            <span className={`spy-head-label is-${clue.team}`}>{SPY_TEAM_NAME[clue.team]}’s clue</span>
            <div key={view.history.length} className={`spy-clue is-${clue.team} ${clue.word.length > 10 ? "is-long" : ""} slam-in`}>
              <span className="spy-clue-word">{clue.word}</span>
              <span className="spy-clue-count">{clue.count}</span>
            </div>
          </div>
          <div className="spy-head-side">
            <span className="spy-guesses">
              <b className="tabular">{view.guessesLeft}</b> {view.guessesLeft === 1 ? "guess" : "guesses"} left
            </span>
            <span className="spy-needed">{view.votesNeeded > 1 ? `${view.votesNeeded} votes flip a word` : "One vote flips a word"}</span>
            {endVotes.length > 0 && (
              <span className="spy-end-votes">
                End turn <VoteDots colours={endVotes} />
              </span>
            )}
          </div>
          <Timer client={client} room={room} size="4.6em" />
        </>
      );
    }

    case "boardEnd":
      return (
        <div className="spy-head-text">
          <div className={`spy-result slam-in ${view.winner ? `is-${view.winner}` : ""}`}>{view.winner ? `${SPY_TEAM_NAME[view.winner]} wins!` : "Called off!"}</div>
          <p className="tv-sub">{boardResultText(view)}</p>
        </div>
      );

    default:
      return null;
  }
}

function Board({ view, room }: { view: View; room: Room }) {
  const dots = voteColours(view.votes, room);
  return (
    <div className="spy-tv-board">
      {view.cards.map((card, i) => (
        <SpyCardTile key={`${view.board}-${i}`} card={card} dots={dots.get(i)} last={view.lastFlip?.index === i} />
      ))}
    </div>
  );
}

export default function SpyGridTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const [red, blue] = view.teams;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Spy Grid</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card tv-rules">
            <ol>
              <li>
                Two teams, 25 words. Each team's <b>spymaster</b> secretly sees which words are their <b>agents</b>.
              </li>
              <li>
                Spymasters give a <b>one-word clue</b> and a number — like “Ocean, 2”.
              </li>
              <li>Teammates vote on their phones to flip words. Keep going while you're right!</li>
              <li>
                Find all your agents first — but flip the <b>assassin</b> and you lose the board.
              </li>
            </ol>
          </div>
        </div>
      );

    case "standings":
      return (
        <div className="spy tv-center">
          <p className="tv-sub">
            {view.winner ? (
              <>
                <TeamWord team={view.winner} /> won board {view.board}!
              </>
            ) : (
              `Board ${view.board} was called off.`
            )}
          </p>
          <Scoreboard room={room} rows={view.scores} title={view.board >= view.totalBoards ? "Final scores" : `After board ${view.board}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;

    default:
      return (
        <div className={`spy spy-stage is-${view.phase}`}>
          {red && <TeamPanel info={red} view={view} room={room} />}
          <div className="spy-center">
            <div className="spy-head">
              <Head view={view} room={room} client={client} />
            </div>
            <Board view={view} room={room} />
          </div>
          {blue && <TeamPanel info={blue} view={view} room={room} />}
        </div>
      );
  }
}
