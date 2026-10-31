// Living style guide for the "Prime Time" design system. Everything on this
// page is the real component, so it never drifts from the app.

import { useState } from "react";
import { CHARACTERS, CHARACTER_IDS, GAME_CATALOG, THEMES, THEME_IDS } from "@party/shared";
import { Backdrop } from "../art/Backdrop";
import { Character } from "../art/Character";
import { MOODS } from "../art/Face";
import { GameArt } from "../art/GameArt";
import { Telly } from "../art/Telly";
import { Segmented, Toggle } from "../ui/controls";
import { RoomCodeInput } from "../ui/RoomCodeInput";

const PALETTE: [string, string][] = [
  ["--ink-900", "Ink"],
  ["--night-800", "Night"],
  ["--cream-50", "Cream"],
  ["--pink-500", "Pop pink"],
  ["--sun-500", "Sun"],
  ["--mint-500", "Mint"],
  ["--sky-500", "Sky"],
  ["--cherry-500", "Cherry"],
  ["--grape-500", "Grape"],
  ["--tangerine-500", "Tangerine"],
];

export function DesignPage() {
  const [code, setCode] = useState("PRTY");
  const [toggle, setToggle] = useState(true);
  const [pace, setPace] = useState<"relaxed" | "normal" | "speedy">("normal");

  return (
    <div className="container stack-lg">
      <div className="page-head">
        <div className="stack-sm">
          <h1 className="page-title">Prime Time design system</h1>
          <p className="section-sub">A late-night game show you play from the couch: chunky ink outlines, hard sticker shadows, saturated colour on deep backdrops, rounded type that reads from across the room.</p>
        </div>
      </div>

      <section className="card stack">
        <h2 className="card-title">Palette</h2>
        <div className="ds-swatches">
          {PALETTE.map(([token, name]) => (
            <div key={token} className="ds-swatch">
              <div className="ds-swatch-color" style={{ background: `var(${token})` }} />
              <div className="ds-swatch-label">
                <span>{name}</span>
                <code className="muted">{token}</code>
              </div>
            </div>
          ))}
        </div>
        <h3>Seat colours (one per character)</h3>
        <div className="ds-swatches">
          {CHARACTER_IDS.map((id) => (
            <div key={id} className="ds-swatch">
              <div className="ds-swatch-color" style={{ background: CHARACTERS[id].color }} />
              <div className="ds-swatch-label">
                <span>{CHARACTERS[id].name}</span>
                <code className="muted">{CHARACTERS[id].color}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2 className="card-title">Type</h2>
        <p className="muted">Display: Lilita One — titles, room codes, buttons. Body: Fredoka — everything else.</p>
        <div className="stack-sm">
          <span className="display" style={{ fontSize: "var(--fs-display)", lineHeight: 1 }}>
            Display
          </span>
          <h1>Heading 1 — Round two!</h1>
          <h2>Heading 2 — Vote for the funniest</h2>
          <h3>Heading 3 — Your prompts</h3>
          <p style={{ fontSize: "var(--fs-lg)" }}>Body large — Everyone answers on their phone, the show happens on the TV.</p>
          <p>Body — Up to eight players. No apps, no controllers.</p>
          <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
            Small / muted — Hosting is unlocked by the admin.
          </p>
        </div>
      </section>

      <section className="card stack">
        <h2 className="card-title">Controls</h2>
        <div className="row wrap">
          <button type="button" className="btn">
            Primary
          </button>
          <button type="button" className="btn btn-accent">
            Accent
          </button>
          <button type="button" className="btn btn-light">
            Light
          </button>
          <button type="button" className="btn btn-success">
            Success
          </button>
          <button type="button" className="btn btn-danger">
            Danger
          </button>
          <button type="button" className="btn" disabled>
            Disabled
          </button>
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-sm">
            Small
          </button>
          <button type="button" className="btn btn-lg">
            Large
          </button>
          <button type="button" className="btn btn-accent btn-xl">
            START!
          </button>
        </div>
        <div className="row wrap">
          <span className="badge badge-live">Play now</span>
          <span className="badge badge-soon">Coming soon</span>
          <span className="badge badge-host">Host</span>
          <span className="badge badge-admin">Admin</span>
          <span className="badge badge-danger">Kicked</span>
          <Toggle checked={toggle} onChange={setToggle} label="Family mode" />
          <Segmented<"relaxed" | "normal" | "speedy"> label="Pace" value={pace} onChange={setPace} options={[{ value: "relaxed", label: "Relaxed" }, { value: "normal", label: "Normal" }, { value: "speedy", label: "Speedy" }]} />
        </div>
        <div style={{ maxWidth: 360 }}>
          <RoomCodeInput value={code} onChange={setCode} />
        </div>
        <input className="input" placeholder="Text input" style={{ maxWidth: 360 }} />
        <div className="bubble" style={{ maxWidth: 360 }}>
          Speech bubble — Telly's tips and players' clues.
        </div>
      </section>

      <section className="card stack">
        <h2 className="card-title">The Party Crew</h2>
        <p className="muted">One character per seat. Unique silhouettes keep players tellable apart even without colour.</p>
        {CHARACTER_IDS.map((id) => (
          <div key={id} className="row wrap" style={{ alignItems: "center", gap: 18 }}>
            <div style={{ width: 150 }}>
              <b className="display" style={{ fontSize: "1.4rem" }}>
                {CHARACTERS[id].name}
              </b>
              <div className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                {CHARACTERS[id].tagline}
              </div>
            </div>
            <div className="ds-moods">
              {MOODS.map((m) => (
                <div key={m} style={{ display: "grid", justifyItems: "center" }}>
                  <Character id={id} mood={m} size={70} motion="none" />
                  <span className="muted" style={{ fontSize: "var(--fs-xs)", fontWeight: 700 }}>
                    {m}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card stack">
        <h2 className="card-title">Telly, your host</h2>
        <div className="row wrap" style={{ gap: 30 }}>
          <Telly pose="wave" mood="happy" size={150} />
          <Telly pose="cheer" mood="win" size={150} />
          <Telly pose="idle" mood="think" size={150} />
          <Telly pose="idle" mood="shock" size={150} />
        </div>
      </section>

      <section className="card stack">
        <h2 className="card-title">Themes & backdrops</h2>
        <p className="muted">The host picks a theme per room; the TV and every phone switch together.</p>
        <div className="ds-theme-grid">
          {THEME_IDS.map((t) => (
            <div key={t} className="ds-theme" data-theme={t}>
              <Backdrop theme={t} fixed={false} />
              <span className="badge badge-host ds-theme-name">{THEMES[t].name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2 className="card-title">Game key art</h2>
        <div className="game-grid">
          {GAME_CATALOG.map((g) => (
            <div key={g.id} className="stack-sm">
              <div style={{ aspectRatio: "16 / 10", borderRadius: "var(--r-md)", overflow: "hidden", border: "var(--ow) solid var(--outline)" }}>
                <GameArt id={g.id} />
              </div>
              <b>{g.name}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
