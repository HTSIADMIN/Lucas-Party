import { useState } from "react";
import { Link } from "../lib/router";
import { CHARACTERS, CHARACTER_IDS, GAME_CATALOG, canHost, type GameMeta } from "@party/shared";
import { Character } from "../art/Character";
import type { Mood } from "../art/Face";
import { Telly } from "../art/Telly";
import { useAuth } from "../lib/auth";
import { GameModal } from "../site/GameModal";
import { JoinCard } from "../site/JoinCard";
import { GameCard } from "../ui/GameCard";

const PARADE_MOODS: Mood[] = ["happy", "cheeky", "win", "idle", "think", "happy", "cheeky", "idle"];

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 80 120" width="70" height="105" aria-hidden="true">
      <rect x="6" y="4" width="68" height="112" rx="14" fill="#fff" stroke="#1B1033" strokeWidth="5" />
      <rect x="14" y="16" width="52" height="70" rx="6" fill="#FFC93C" stroke="#1B1033" strokeWidth="3" />
      <text x="40" y="58" textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize="20" fill="#1B1033">BXQT</text>
      <circle cx="40" cy="100" r="6" fill="none" stroke="#1B1033" strokeWidth="3" />
    </svg>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const [open, setOpen] = useState<GameMeta | null>(null);
  const live = GAME_CATALOG.filter((g) => g.status === "live");
  const soon = GAME_CATALOG.filter((g) => g.status === "soon");
  const isHost = user && canHost(user.role);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="badge badge-host hero-kicker">📺 TV + 📱 phones · up to 8 players</span>
            <h1 className="hero-title">
              Party night,
              <br />
              <span className="pop">on the</span> <span className="pop-2">big screen.</span>
            </h1>
            <p className="hero-sub">Open Lucas Games on your TV. Everyone joins from their phone with a room code — no apps, no controllers, no waiting.</p>
            <div className="hero-actions">
              {isHost ? (
                <Link to="/host" className="btn btn-accent btn-lg">
                  Host a party
                </Link>
              ) : (
                <Link to={user ? "/profile" : "/signup"} className="btn btn-accent btn-lg">
                  {user ? "Your profile" : "Make an account"}
                </Link>
              )}
              <a href="#games" className="btn btn-ghost btn-lg">
                See the games
              </a>
            </div>
          </div>
          <div className="hero-join">
            <JoinCard />
          </div>
        </div>
        <div className="container crew-parade" aria-label="The Party Crew">
          {CHARACTER_IDS.map((id, i) => (
            <div className="crew-member" key={id}>
              <Character id={id} size={78} mood={PARADE_MOODS[i]} />
              <span className="crew-name">{CHARACTERS[id].name}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="games" className="section">
        <div className="container">
          <div className="section-head">
            <div className="stack-sm">
              <h2 className="section-title">Tonight's lineup</h2>
              <p className="section-sub">Three games ready to play right now — with a whole roadmap on the way.</p>
            </div>
            <Link to="/games" className="btn btn-light">
              All games →
            </Link>
          </div>
          <div className="game-grid is-featured">
            {live.map((g) => (
              <GameCard key={g.id} game={g} featured onOpen={setOpen} />
            ))}
          </div>
          <div className="section-head" style={{ marginTop: 44 }}>
            <h3 className="section-title" style={{ fontSize: "var(--fs-h2)" }}>
              Coming soon
            </h3>
          </div>
          <div className="game-grid">
            {soon.slice(0, 8).map((g) => (
              <GameCard key={g.id} game={g} onOpen={setOpen} />
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">How it works</h2>
          </div>
          <div className="how-grid">
            <div className="card how-step card-tilt-l">
              <div className="how-num">1</div>
              <div className="how-art">
                <Telly size={96} pose="wave" />
              </div>
              <h3>Put it on the TV</h3>
              <p className="muted">The host opens Lucas Games on a TV, a laptop plugged into one, or anything with a browser — and starts a room.</p>
            </div>
            <div className="card how-step">
              <div className="how-num">2</div>
              <div className="how-art">
                <PhoneGlyph />
              </div>
              <h3>Join on your phone</h3>
              <p className="muted">Everyone types the 4-letter code (or scans the QR on the TV), picks a name and a character. That's it.</p>
            </div>
            <div className="card how-step card-tilt-r">
              <div className="how-num">3</div>
              <div className="how-art row-sm">
                <Character id="sunny" size={70} mood="win" />
                <Character id="wisp" size={70} mood="cheeky" />
              </div>
              <h3>Play together</h3>
              <p className="muted">Your phone is your controller and your secret hand. The show — answers, votes, rockets — plays out on the big screen.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card host-band">
            <Telly size={110} pose="cheer" mood="win" />
            <div className="stack-sm">
              <h3>{isHost ? "You're a host!" : "Want to host?"}</h3>
              <p className="muted" style={{ fontWeight: 600 }}>
                {isHost
                  ? "Open a room on your TV, invite up to 8 friends, and run the show from your phone."
                  : "Hosting runs a game room on the server, so it's invite-only. Make an account, then ask the admin to unlock hosting for you."}
              </p>
            </div>
            <Link to={isHost ? "/host" : user ? "/profile" : "/signup"} className="btn btn-lg">
              {isHost ? "Start a room" : user ? "View profile" : "Sign up"}
            </Link>
          </div>
        </div>
      </section>

      <GameModal game={open} onClose={() => setOpen(null)} />
    </>
  );
}
