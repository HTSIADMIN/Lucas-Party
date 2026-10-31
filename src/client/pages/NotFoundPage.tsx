import { Link } from "../lib/router";
import { Telly } from "../art/Telly";

export function NotFoundPage() {
  return (
    <div className="container auth-wrap">
      <div className="card auth-card" style={{ justifyItems: "center", textAlign: "center" }}>
        <Telly size={120} pose="idle" mood="shock" />
        <h1 style={{ fontSize: "var(--fs-h2)" }}>No signal!</h1>
        <p className="muted" style={{ fontWeight: 600 }}>
          This channel doesn't exist. Let's get you back to the party.
        </p>
        <Link to="/" className="btn btn-accent">
          Back home
        </Link>
      </div>
    </div>
  );
}
