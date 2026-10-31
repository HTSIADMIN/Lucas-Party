import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate } from "../lib/router";
import { GAME_CATALOG, PASSWORD_MIN, ROLES, ROLE_LABEL, type CharacterId, type Role } from "@party/shared";
import { Character } from "../art/Character";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Toggle } from "../ui/controls";
import { Modal } from "../ui/Overlay";
import { useToast } from "../ui/Toasts";

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  character: CharacterId;
  disabled: boolean;
  createdAt: number;
  lastLoginAt: number | null;
}

interface RoomRow {
  code: string;
  status: string;
  hostName: string | null;
  players: number;
  connected: number;
  screens: number;
  gameId: string | null;
  createdAt: number;
  lastActivityAt: number;
}

interface Stats {
  users: Record<Role, number>;
  rooms: { active: number; pending: number };
  connections: number;
  gamesToday: number;
  limits: { maxActiveRooms: number; maxRoomsPerHost: number };
  recentGames: { id: string; roomCode: string; gameId: string; endedAt: number; players: { name: string; character: CharacterId; score: number }[] }[];
}

type Tab = "users" | "rooms" | "settings" | "games";

function ago(ts: number | null): string {
  if (!ts) return "never";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const gameName = (id: string | null) => (id ? GAME_CATALOG.find((g) => g.id === id)?.name ?? id : "—");

function UsersTab({ meId, onChange }: { meId: string; onChange(): void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`);
      setUsers(res.users);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }, [q, toast]);

  useEffect(() => {
    const t = window.setTimeout(load, 200);
    return () => window.clearTimeout(t);
  }, [load]);

  async function patch(user: AdminUser, body: Partial<Pick<AdminUser, "role" | "disabled">>) {
    try {
      const res = await api<{ user: AdminUser }>(`/api/admin/users/${user.id}`, { method: "PATCH", body });
      setUsers((list) => list.map((u) => (u.id === user.id ? res.user : u)));
      toast(body.role ? `${user.displayName} is now ${ROLE_LABEL[body.role]}` : body.disabled ? `${user.displayName} disabled` : `${user.displayName} enabled`);
      onChange();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetFor) return;
    try {
      await api(`/api/admin/users/${resetFor.id}/password`, { body: { password: newPw } });
      toast(`New password set for ${resetFor.displayName}`);
      setResetFor(null);
      setNewPw("");
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }

  async function remove() {
    if (!deleteFor) return;
    try {
      await api(`/api/admin/users/${deleteFor.id}`, { method: "DELETE" });
      setUsers((list) => list.filter((u) => u.id !== deleteFor.id));
      toast(`Deleted ${deleteFor.displayName}`);
      setDeleteFor(null);
      onChange();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }

  return (
    <div className="card stack">
      <div className="row between wrap">
        <h2 className="card-title" style={{ margin: 0 }}>
          Players & hosts
        </h2>
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="muted" style={{ fontWeight: 600 }}>
        <b>Host</b> lets someone open rooms and run games. <b>Admin</b> adds this page. Changes apply instantly.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last login</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.disabled ? 0.55 : 1 }}>
                <td>
                  <div className="admin-user-cell">
                    <Character id={u.character} size={40} motion="none" />
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {u.displayName} {u.id === meId && <span className="badge badge-info">You</span>}
                      </div>
                      <div className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                        @{u.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <select className="input" style={{ minHeight: 40, width: 130 }} value={u.role} disabled={u.id === meId} onChange={(e) => void patch(u, { role: e.target.value as Role })} aria-label={`Role for ${u.username}`}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Toggle checked={!u.disabled} disabled={u.id === meId} onChange={(on) => void patch(u, { disabled: !on })} label={u.disabled ? "Disabled" : "Active"} />
                </td>
                <td className="nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="nowrap">{ago(u.lastLoginAt)}</td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="btn btn-light btn-sm" onClick={() => setResetFor(u)}>
                      Reset password
                    </button>
                    {u.id !== meId && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteFor(u)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(resetFor)} onClose={() => setResetFor(null)} label="Reset password">
        <form className="stack" onSubmit={resetPassword}>
          <h2>Reset password</h2>
          <p className="muted">
            Set a new password for <b>{resetFor?.displayName}</b>, then pass it along. They'll be signed out everywhere.
          </p>
          <input className="input" type="text" autoComplete="off" minLength={PASSWORD_MIN} placeholder={`At least ${PASSWORD_MIN} characters`} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          <button type="submit" className="btn">
            Set password
          </button>
        </form>
      </Modal>

      <Modal open={Boolean(deleteFor)} onClose={() => setDeleteFor(null)} label="Delete user">
        <div className="stack">
          <h2>Delete {deleteFor?.displayName}?</h2>
          <p className="muted">This permanently removes @{deleteFor?.username} and signs them out. Their past game results stay in the history.</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={() => void remove()}>
              Delete user
            </button>
            <button type="button" className="btn btn-light" onClick={() => setDeleteFor(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RoomsTab({ onChange }: { onChange(): void }) {
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [closing, setClosing] = useState<RoomRow | null>(null);
  const load = useCallback(async () => {
    try {
      setRooms((await api<{ rooms: RoomRow[] }>("/api/admin/rooms")).rooms);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }, [toast]);
  useEffect(() => {
    void load();
    const id = window.setInterval(() => document.visibilityState === "visible" && void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  async function close() {
    if (!closing) return;
    try {
      await api(`/api/admin/rooms/${closing.code}`, { method: "DELETE" });
      toast(`Closed room ${closing.code}`);
      setClosing(null);
      void load();
      onChange();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }

  return (
    <div className="card stack">
      <h2 className="card-title" style={{ margin: 0 }}>
        Live rooms
      </h2>
      <p className="muted" style={{ fontWeight: 600 }}>
        Every open room uses a little server memory. Pending rooms are TVs waiting for a host and expire on their own.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Status</th>
              <th>Host</th>
              <th>Players</th>
              <th>Game</th>
              <th>Opened</th>
              <th>Last activity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.code}>
                <td className="display" style={{ fontSize: "1.3rem" }}>
                  {r.code}
                </td>
                <td>
                  <span className={`badge ${r.status === "playing" ? "badge-live" : r.status === "lobby" ? "badge-info" : "badge-soon"}`}>{r.status}</span>
                </td>
                <td>{r.hostName ?? "—"}</td>
                <td className="tabular">
                  {r.connected}/{r.players} · 📺 {r.screens}
                </td>
                <td>{gameName(r.gameId)}</td>
                <td className="nowrap">{ago(r.createdAt)}</td>
                <td className="nowrap">{ago(r.lastActivityAt)}</td>
                <td>
                  <div className="admin-actions">
                    <a className="btn btn-light btn-sm" href={`/tv/${r.code}`} target="_blank" rel="noreferrer">
                      Watch
                    </a>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setClosing(r)}>
                      Close
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No rooms open right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal open={Boolean(closing)} onClose={() => setClosing(null)} label="Close room">
        <div className="stack">
          <h2>Close room {closing?.code}?</h2>
          <p className="muted">Everyone in it will see "An admin closed this room."</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={() => void close()}>
              Close room
            </button>
            <button type="button" className="btn btn-light" onClick={() => setClosing(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SettingsTab({ stats }: { stats: Stats | null }) {
  const toast = useToast();
  const [settings, setSettings] = useState<{ signupsOpen: boolean; guestsAllowed: boolean } | null>(null);
  useEffect(() => {
    void api<{ settings: { signupsOpen: boolean; guestsAllowed: boolean } }>("/api/admin/settings").then((r) => setSettings(r.settings));
  }, []);
  async function save(patch: Partial<{ signupsOpen: boolean; guestsAllowed: boolean }>) {
    try {
      const res = await api<{ settings: { signupsOpen: boolean; guestsAllowed: boolean } }>("/api/admin/settings", { method: "PATCH", body: patch });
      setSettings(res.settings);
      toast("Saved");
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  }
  if (!settings) return null;
  return (
    <div className="card stack-lg">
      <h2 className="card-title" style={{ margin: 0 }}>
        Site settings
      </h2>
      <div className="stack">
        <Toggle checked={settings.signupsOpen} onChange={(v) => void save({ signupsOpen: v })} label="Allow new sign-ups" />
        <p className="muted">Turn off to stop new accounts being created. Your BOOTSTRAP_ADMIN username can always sign up.</p>
      </div>
      <div className="stack">
        <Toggle checked={settings.guestsAllowed} onChange={(v) => void save({ guestsAllowed: v })} label="Let guests join parties without an account" />
        <p className="muted">Guests can only join rooms a host opened — they can never start one.</p>
      </div>
      {stats && (
        <div className="stack-sm">
          <b>Compute limits</b>
          <p className="muted">
            Up to {stats.limits.maxActiveRooms} active rooms at once, {stats.limits.maxRoomsPerHost} per host (admins are exempt). Change these with MAX_ACTIVE_ROOMS and MAX_ROOMS_PER_HOST in the server's .env.
          </p>
        </div>
      )}
    </div>
  );
}

function GamesTab({ stats }: { stats: Stats | null }) {
  return (
    <div className="card stack">
      <h2 className="card-title" style={{ margin: 0 }}>
        Recent games
      </h2>
      {!stats?.recentGames.length && <p className="muted">No finished games yet.</p>}
      {stats?.recentGames.map((g) => {
        const sorted = [...g.players].sort((a, b) => b.score - a.score);
        return (
          <div key={g.id} className="row between wrap" style={{ padding: "10px 0", borderBottom: "2px solid var(--surface-2)" }}>
            <div>
              <b>{gameName(g.gameId)}</b> <span className="muted">· room {g.roomCode} · {ago(g.endedAt)}</span>
            </div>
            <div className="row-sm wrap">
              {sorted.map((p, i) => (
                <span key={`${p.name}${i}`} className="chip">
                  <Character id={p.character} size={26} motion="none" mood={i === 0 ? "win" : "idle"} />
                  {i === 0 ? "🏆 " : ""}
                  {p.name} · {p.score.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [stats, setStats] = useState<Stats | null>(null);
  const loadStats = useCallback(() => {
    void api<Stats>("/api/admin/stats").then(setStats).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (user?.role === "admin") loadStats();
  }, [user, loadStats, tab]);

  if (loading) return null;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="container">
      <div className="page-head">
        <h1 className="page-title">Admin</h1>
      </div>
      <div className="admin-stats" style={{ marginBottom: 20 }}>
        {[
          ["Players", stats?.users.player],
          ["Hosts", stats ? stats.users.host + stats.users.admin : undefined],
          ["Active rooms", stats?.rooms.active],
          ["Waiting TVs", stats?.rooms.pending],
          ["Connected", stats?.connections],
          ["Games today", stats?.gamesToday],
        ].map(([label, value]) => (
          <div key={label as string} className="card card-sm stat">
            <span className="stat-value tabular">{value ?? "–"}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>
        {(
          [
            ["users", "Users"],
            ["rooms", "Rooms"],
            ["games", "Recent games"],
            ["settings", "Settings"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersTab meId={user.id} onChange={loadStats} />}
      {tab === "rooms" && <RoomsTab onChange={loadStats} />}
      {tab === "games" && <GamesTab stats={stats} />}
      {tab === "settings" && <SettingsTab stats={stats} />}
    </div>
  );
}
