import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "../lib/router";
import { GAME_CATALOG, canHost } from "@party/shared";
import { Telly } from "../art/Telly";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useJoinBase } from "../lib/device";
import { RoomCodeInput } from "../ui/RoomCodeInput";
import { useToast } from "../ui/Toasts";

interface MyRoom { code: string; status: string; players: number; connected: number; screens: number; gameId: string | null }

export function HostPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const joinBase = useJoinBase();
  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState<MyRoom[]>([]);

  const loadRooms = useCallback(() => {
    void api<{ rooms: MyRoom[] }>("/api/rooms/mine").then((r) => setRooms(r.rooms)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (user) loadRooms();
  }, [user, loadRooms]);

  if (loading) return null;
  if (!user) return <Navigate to="/login?next=/host" replace />;

  if (!canHost(user.role)) {
    return (
      <div className="container auth-wrap">
        <div className="card auth-card" style={{ textAlign: "center", justifyItems: "center" }}>
          <Telly size={110} pose="idle" mood="think" />
          <h1 style={{ fontSize: "var(--fs-h2)" }}>Hosting is locked</h1>
          <p className="muted" style={{ fontWeight: 600 }}>
            Hosting runs a game room on the server, so the admin unlocks it for friends. Send them your username: <b>@{user.username}</b>
          </p>
          <p className="muted">You can still join any party with a room code.</p>
          <Link to="/" className="btn">
            Join a party
          </Link>
        </div>
      </div>
    );
  }

  async function closeRoom(roomCode: string) {
    try {
      await api(`/api/rooms/${roomCode}`, { method: "DELETE" });
      toast(`Closed ${roomCode}`);
      loadRooms();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div className="stack-sm">
          <h1 className="page-title">Host a party</h1>
          <p className="section-sub">You'll run the show from your phone: pick games, start rounds, pause, skip and kick.</p>
        </div>
      </div>

      <div className="game-grid is-featured">
        <div className="card stack">
          <h2 className="card-title">📺 This screen is the TV</h2>
          <p className="muted" style={{ fontWeight: 600 }}>
            Using a laptop plugged into the TV, or the TV's own browser? Start the room here, then join from your phone to get the host controls.
          </p>
          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => navigate("/tv")}>
            Start a room here
          </button>
        </div>
        <div className="card stack">
          <h2 className="card-title">📱 Use a different TV</h2>
          <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20, fontWeight: 600 }}>
            <li>
              On the TV, open <b>{joinBase.display}/tv</b>
            </li>
            <li>Type the code it shows here. You'll join as the host.</li>
          </ol>
          <RoomCodeInput value={code} onChange={setCode} onComplete={(c) => navigate(`/play/${c}`)} />
          <button type="button" className="btn btn-lg btn-block" disabled={code.length !== 4} onClick={() => navigate(`/play/${code}`)}>
            Take over that TV
          </button>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="card stack" style={{ marginTop: 22 }}>
          <h2 className="card-title">Your open rooms</h2>
          {rooms.map((r) => (
            <div key={r.code} className="row between wrap" style={{ padding: "8px 0", borderBottom: "2px solid var(--surface-2)" }}>
              <div className="row">
                <span className="display" style={{ fontSize: "1.8rem" }}>
                  {r.code}
                </span>
                <span className="muted" style={{ fontWeight: 600 }}>
                  {r.connected}/{r.players} players · {r.screens} screen{r.screens === 1 ? "" : "s"}
                  {r.gameId ? ` · ${GAME_CATALOG.find((g) => g.id === r.gameId)?.name}` : ""}
                </span>
              </div>
              <div className="row-sm wrap">
                <Link className="btn btn-sm" to={`/play/${r.code}`}>
                  Host controls
                </Link>
                <Link className="btn btn-light btn-sm" to={`/tv/${r.code}`}>
                  Open TV
                </Link>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => void closeRoom(r.code)}>
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
