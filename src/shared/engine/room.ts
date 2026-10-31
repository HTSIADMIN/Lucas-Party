// RoomHost — a party room, run by the TV's browser.
//
// Up to 8 seats and at most one game. The host owns the phase clock (with
// pause/resume), host permissions, liveness, and broadcasting. Games are pure
// state machines plugged in via GameDefinition. After any change the host
// flushes once: the TV gets the public view, each phone gets a full snapshot
// of what *it* may see (sent only when it changed). Transport-agnostic — the
// caller supplies `link()` to reach a seat — so it runs in the browser, in
// tests, or anywhere else. The whole room serialises to a snapshot so a TV
// refresh can resume mid-game.

import {
  CHARACTER_IDS,
  MAX_PLAYERS,
  NAME_MAX,
  PACE_SCALE,
  SEAT_TIMEOUT_MS,
  cleanText,
  defaultOptions,
  getGameMeta,
  isCharacterId,
  isGameId,
  isThemeId,
  textKey,
  type CharacterId,
  type ErrorCode,
  type GameId,
  type HostAction,
  type LobbyAction,
  type PlayerPublic,
  type RoomEvent,
  type RoomSettings,
  type RoomStatus,
  type RoomSummary,
  type RoomView,
  type SeatMessage,
  type SeatTicket,
  type ServerMessage,
} from "@party/shared";
import { GAMES } from "./games";
import { pick, randomFloat, randomInt, shuffle } from "./random";
import type { GameContext, GameDefinition, GamePlayer } from "./types";

export interface SeatLink {
  send(message: ServerMessage): void;
}

export interface SeatRecord {
  id: string;
  secret: string;
  userId: string | null;
  name: string;
  character: CharacterId;
  /** False while sitting out a game that started before they joined. */
  inGame: boolean;
  joinedAt: number;
  lastSeenAt: number;
  connected: boolean;
}

export interface GameRecord {
  id: GameId;
  state: unknown;
  over: boolean;
  startedAt: number;
  playerIds: string[];
  options: Record<string, number>;
}

export interface RoomSnapshot {
  v: 1;
  code: string;
  createdAt: number;
  owner: { userId: string; name: string } | null;
  locked: boolean;
  settings: RoomSettings;
  seats: SeatRecord[];
  banned: string[];
  memory: Partial<Record<GameId, Record<string, unknown>>>;
  game: GameRecord | null;
  deadline: number | null;
  paused: boolean;
  pausedAt: number;
  pausedRemaining: number | null;
}

export interface FinishedGame {
  gameId: GameId;
  startedAt: number;
  players: { name: string; character: CharacterId; userId: string | null; score: number }[];
}

export interface RoomHostHooks {
  /** Open (or reuse) the private channel to a seat. */
  link(secret: string): SeatLink;
  /** Close a seat's channel for good. */
  unlink(secret: string): void;
  /** The TV view changed: render it (and mirror it to extra screens). */
  onTvView(view: RoomView): void;
  /** Events for the TV itself: sounds and toasts. */
  onTvEvent(event: RoomEvent): void;
  /** Debounced: persist this so a refresh can resume the room. */
  onSnapshot?(snapshot: RoomSnapshot): void;
  /** Debounced, only when it changes: the room's shape, for the server. */
  onSummary?(summary: RoomSummary): void;
  onGameFinished?(result: FinishedGame): void;
  onClosed?(reason: string): void;
}

interface ActiveGame {
  def: GameDefinition<unknown>;
  ctx: GameContext;
  record: GameRecord;
}

const LIVENESS_EVERY_MS = 2000;
const STALE_SEAT_MS = 60_000;
const MAX_DEADLINE_FIRES_PER_SEC = 40;
const FLUSH_MIN_GAP_MS = 40;
const REJECTION_TTL_MS = 60_000;

function err(code: ErrorCode, message: string) {
  return { error: code, message } as const;
}

export class RoomHost {
  readonly createdAt: number;
  owner: { userId: string; name: string } | null;
  locked = false;
  closed = false;
  settings: RoomSettings = { theme: "showtime", familyMode: true, pace: "normal", gameId: null, gameOptions: {} };

  private readonly seats = new Map<string, SeatRecord>();
  private readonly bySecret = new Map<string, string>();
  private readonly links = new Map<string, SeatLink>();
  private readonly lastSent = new Map<string, string>();
  private readonly versions = new Map<string, number>();
  private readonly rejected = new Map<string, { code: ErrorCode; message: string; until: number }>();
  private banned = new Set<string>();
  private memory: Partial<Record<GameId, Record<string, unknown>>> = {};

  private game: ActiveGame | null = null;
  private deadline: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private pausedAt = 0;
  private pausedRemaining: number | null = null;
  private fireWindow = { start: 0, count: 0 };

  private events: RoomEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFlush = 0;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private summaryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSummary = "";
  private liveness: ReturnType<typeof setInterval> | null = null;

  constructor(
    readonly code: string,
    private readonly hooks: RoomHostHooks,
    init: { owner?: { userId: string; name: string } | null; snapshot?: RoomSnapshot | null; tvIsOwner?: () => boolean } = {},
  ) {
    this.tvIsOwner = init.tvIsOwner ?? (() => false);
    const snap = init.snapshot;
    if (snap && snap.code === code) {
      this.createdAt = snap.createdAt;
      this.owner = snap.owner;
      this.locked = snap.locked;
      this.settings = snap.settings;
      this.banned = new Set(snap.banned);
      this.memory = snap.memory ?? {};
      for (const seat of snap.seats) {
        // Everyone has to say hello again after a TV refresh.
        this.seats.set(seat.id, { ...seat, connected: false });
        this.bySecret.set(seat.secret, seat.id);
      }
      if (snap.game && GAMES[snap.game.id]) {
        const record = snap.game;
        this.game = { def: GAMES[record.id], ctx: this.makeContext(record.id, record.options), record };
      }
      this.paused = snap.paused;
      this.pausedAt = snap.pausedAt;
      this.pausedRemaining = snap.pausedRemaining;
      if (snap.deadline !== null && !snap.paused) this.setDeadline(Math.max(0, snap.deadline - Date.now()));
    } else {
      this.createdAt = Date.now();
      this.owner = init.owner ?? null;
    }
  }

  private readonly tvIsOwner: () => boolean;

  /** Starts liveness tracking and opens every known seat's channel. Call once. */
  start(): void {
    for (const seat of this.seats.values()) this.ensureLink(seat.secret);
    this.liveness = setInterval(() => this.checkLiveness(), LIVENESS_EVERY_MS);
    this.markDirty();
  }

  // ── Queries ────────────────────────────────────────────────────────────

  get status(): RoomStatus {
    if (this.game) return "playing";
    return this.owner ? "lobby" : "pending";
  }

  get gameId(): GameId | null {
    return this.game?.record.id ?? null;
  }

  summary(): RoomSummary {
    const seats = [...this.seats.values()];
    return {
      status: this.status,
      players: seats.length,
      connected: seats.filter((s) => s.connected).length,
      characters: seats.map((s) => s.character),
      gameId: this.gameId,
      locked: this.locked,
    };
  }

  toSnapshot(): RoomSnapshot {
    return {
      v: 1,
      code: this.code,
      createdAt: this.createdAt,
      owner: this.owner,
      locked: this.locked,
      settings: this.settings,
      seats: [...this.seats.values()],
      banned: [...this.banned],
      memory: this.memory,
      game: this.game ? this.game.record : null,
      deadline: this.paused ? null : this.deadline,
      paused: this.paused,
      pausedAt: this.pausedAt,
      pausedRemaining: this.pausedRemaining,
    };
  }

  private isOwnerSeat(seat: SeatRecord): boolean {
    return Boolean(this.owner && seat.userId && seat.userId === this.owner.userId);
  }

  // ── Seats ──────────────────────────────────────────────────────────────

  private ensureLink(secret: string): SeatLink {
    let link = this.links.get(secret);
    if (!link) {
      link = this.hooks.link(secret);
      this.links.set(secret, link);
    }
    return link;
  }

  private dropLink(secret: string): void {
    this.links.delete(secret);
    this.lastSent.delete(secret);
    this.versions.delete(secret);
    this.hooks.unlink(secret);
  }

  private reject(secret: string, code: ErrorCode, message: string): void {
    this.rejected.set(secret, { code, message, until: Date.now() + REJECTION_TTL_MS });
    this.ensureLink(secret).send({ t: "error", code, message, fatal: true });
  }

  /** A phone joined through the server; the ticket says who it is. */
  admit(ticket: SeatTicket): void {
    if (this.closed || !ticket?.secret || this.bySecret.has(ticket.secret)) return;
    const userId = ticket.userId;
    if (this.banned.has(`secret:${ticket.secret}`) || (userId && this.banned.has(`user:${userId}`))) {
      return this.reject(ticket.secret, "not_allowed", "The host removed you from this room.");
    }

    // Same account, or a guest re-typing their name, takes their old seat back.
    const all = [...this.seats.values()];
    let seat = userId
      ? all.find((s) => s.userId === userId)
      : all.find((s) => !s.userId && !s.connected && textKey(s.name) === textKey(cleanText(ticket.name, NAME_MAX)));
    let isNew = false;

    if (seat) {
      if (seat.secret !== ticket.secret) {
        const oldSecret = seat.secret;
        this.links.get(oldSecret)?.send({ t: "closed", reason: "You opened this seat on another tab or device." });
        this.bySecret.delete(oldSecret);
        this.dropLink(oldSecret);
        seat.secret = ticket.secret;
        this.bySecret.set(seat.secret, seat.id);
      }
    } else {
      const created = this.createSeat(ticket);
      if ("error" in created) return this.reject(ticket.secret, created.error, created.message);
      seat = created;
      isNew = true;
    }

    if (ticket.owner && userId && (!this.owner || this.owner.userId === userId)) this.setOwner({ userId, name: seat.name });
    this.ensureLink(seat.secret);
    if (isNew) this.queueEvent({ kind: "joined", sfx: "player.join", playerId: seat.id, text: `${seat.name} joined the party` });
    this.markDirty();
  }

  private createSeat(ticket: SeatTicket): SeatRecord | ReturnType<typeof err> {
    if (this.locked) return err("room_locked", "The host locked this room.");
    if (this.seats.size >= MAX_PLAYERS && !this.evictStaleSeat()) return err("room_full", `This party is full (${MAX_PLAYERS} players).`);

    let name = cleanText(ticket.name, NAME_MAX);
    if (!name) return err("name_required", "Pick a name first.");
    const clash = (n: string) => [...this.seats.values()].some((s) => textKey(s.name) === textKey(n));
    if (clash(name)) {
      if (!ticket.userId) return err("name_taken", "Someone here already has that name.");
      const base = cleanText(ticket.name, NAME_MAX - 2);
      for (let i = 2; clash(name); i++) name = `${base} ${i}`;
    }

    const taken = new Set([...this.seats.values()].map((s) => s.character));
    const wanted = isCharacterId(ticket.character) && !taken.has(ticket.character) ? ticket.character : null;
    const character = wanted ?? CHARACTER_IDS.find((c) => !taken.has(c)) ?? "blip";
    const now = Date.now();
    const seat: SeatRecord = {
      id: ticket.seatId,
      secret: ticket.secret,
      userId: ticket.userId,
      name,
      character,
      inGame: !this.game,
      joinedAt: now,
      lastSeenAt: now,
      connected: false,
    };
    this.seats.set(seat.id, seat);
    this.bySecret.set(seat.secret, seat.id);
    return seat;
  }

  /** Frees a seat held by someone who left a while ago (never mid-game). */
  private evictStaleSeat(): boolean {
    const now = Date.now();
    for (const seat of this.seats.values()) {
      const inActiveGame = this.game && !this.game.record.over && seat.inGame;
      if (!seat.connected && !inActiveGame && now - seat.lastSeenAt > STALE_SEAT_MS) {
        this.removeSeat(seat);
        return true;
      }
    }
    return false;
  }

  private removeSeat(seat: SeatRecord): void {
    this.seats.delete(seat.id);
    this.bySecret.delete(seat.secret);
    this.dropLink(seat.secret);
  }

  private setOwner(owner: { userId: string; name: string }): void {
    const isNew = !this.owner || this.owner.userId !== owner.userId;
    this.owner = owner;
    if (isNew) this.queueEvent({ kind: "hostArrived", sfx: "player.host", text: `${owner.name} is hosting tonight!` });
  }

  private checkLiveness(): void {
    const now = Date.now();
    for (const [secret, info] of this.rejected) {
      if (info.until < now) {
        this.rejected.delete(secret);
        this.dropLink(secret);
      }
    }
    for (const seat of this.seats.values()) {
      if (seat.connected && now - seat.lastSeenAt > SEAT_TIMEOUT_MS) this.setConnected(seat, false);
    }
  }

  private setConnected(seat: SeatRecord, connected: boolean): void {
    if (seat.connected === connected) return;
    seat.connected = connected;
    if (!connected) this.lastSent.delete(seat.secret);
    if (this.game && seat.inGame) {
      const id = seat.id;
      this.runGame((g) => g.def.onConnectionChange?.(g.record.state, g.ctx, id, connected));
    }
    this.markDirty();
  }

  // ── Messages from phones ───────────────────────────────────────────────

  handleSeatMessage(secret: string, msg: SeatMessage): void {
    if (this.closed || !msg || typeof msg !== "object") return;
    const rejection = this.rejected.get(secret);
    if (rejection) {
      if (msg.t === "hello") this.ensureLink(secret).send({ t: "error", code: rejection.code, message: rejection.message, fatal: true });
      return;
    }
    const id = this.bySecret.get(secret);
    const seat = id ? this.seats.get(id) : undefined;
    if (!seat) return;
    seat.lastSeenAt = Date.now();
    const link = this.ensureLink(secret);

    switch (msg.t) {
      case "hello":
        link.send({ t: "welcome", role: "player", playerId: seat.id, token: null, serverNow: Date.now() });
        this.lastSent.delete(secret);
        this.setConnected(seat, true);
        this.markDirty();
        return;
      case "ping": {
        this.setConnected(seat, true);
        const version = this.versions.get(secret) ?? 0;
        link.send({ t: "pong", at: Number(msg.at) || 0, serverNow: Date.now(), v: version });
        if (Number(msg.v) < version) this.resend(seat);
        return;
      }
      case "sync":
        this.setConnected(seat, true);
        this.resend(seat);
        return;
      case "bye":
        this.setConnected(seat, false);
        return;
      case "lobby":
        this.setConnected(seat, true);
        return this.lobbyAction(seat, msg.action);
      case "host":
        this.setConnected(seat, true);
        return this.hostAction(seat, msg.action);
      case "input":
        this.setConnected(seat, true);
        return this.gameInput(seat, msg.data);
    }
  }

  private resend(seat: SeatRecord): void {
    this.lastSent.delete(seat.secret);
    this.markDirty();
  }

  private sendError(seat: SeatRecord, code: ErrorCode, message: string): void {
    this.links.get(seat.secret)?.send({ t: "error", code, message });
  }

  private lobbyAction(seat: SeatRecord, action: LobbyAction): void {
    if (!action || action.type !== "setCharacter" || !isCharacterId(action.character)) return;
    if (this.game && !this.game.record.over) return this.sendError(seat, "not_allowed", "You can change characters between games.");
    const takenBy = [...this.seats.values()].find((s) => s.character === action.character && s !== seat);
    if (takenBy) return this.sendError(seat, "not_allowed", `${takenBy.name} already picked that one.`);
    seat.character = action.character;
    this.markDirty();
  }

  private gameInput(seat: SeatRecord, data: unknown): void {
    const game = this.game;
    if (!game || game.record.over || this.paused || !seat.inGame || !game.record.playerIds.includes(seat.id)) return;
    const id = seat.id;
    this.runGame((g) => g.def.onInput(g.record.state, g.ctx, id, data));
  }

  private hostAction(seat: SeatRecord, action: HostAction): void {
    if (!this.isOwnerSeat(seat)) return this.sendError(seat, "not_host", "Only the host can do that.");
    if (!action || typeof action !== "object") return;
    switch (action.type) {
      case "selectGame":
        if (!isGameId(action.gameId) || (this.game && !this.game.record.over)) return;
        this.settings = { ...this.settings, gameId: action.gameId };
        this.queueEvent({ kind: "gameSelected", sfx: "ui.select" });
        break;
      case "setSettings": {
        const next = { ...this.settings };
        if (isThemeId(action.theme)) next.theme = action.theme;
        if (typeof action.familyMode === "boolean") next.familyMode = action.familyMode;
        if (action.pace === "relaxed" || action.pace === "normal" || action.pace === "speedy") next.pace = action.pace;
        this.settings = next;
        break;
      }
      case "setGameOption": {
        if (!isGameId(action.gameId)) return;
        const opt = getGameMeta(action.gameId)?.options?.find((o) => o.key === action.key);
        if (!opt || !opt.choices.some((c) => c.value === action.value)) return;
        this.settings = {
          ...this.settings,
          gameOptions: { ...this.settings.gameOptions, [action.gameId]: { ...this.settings.gameOptions[action.gameId], [opt.key]: action.value } },
        };
        break;
      }
      case "start":
        return this.startGame(seat);
      case "playAgain":
        if (!this.game?.record.over) return;
        this.settings = { ...this.settings, gameId: this.game.record.id };
        return this.startGame(seat);
      case "pause":
        this.pause();
        break;
      case "resume":
        this.resume();
        break;
      case "skip":
        if (this.game && !this.game.record.over && !this.paused) {
          this.runGame((g) => (g.def.onSkip ? g.def.onSkip(g.record.state, g.ctx) : g.def.onDeadline(g.record.state, g.ctx)));
        }
        break;
      case "extend":
        if (this.deadline !== null && !this.paused) {
          const ms = Math.max(5000, Math.min(60_000, Number(action.ms) || 15_000));
          this.setDeadline(this.deadline - Date.now() + ms);
        }
        break;
      case "endGame":
        this.endGame();
        break;
      case "kick":
        this.kick(action.playerId);
        break;
      case "lock":
        this.locked = Boolean(action.locked);
        break;
      case "closeRoom":
        return this.close("The host closed the room.");
    }
    this.markDirty();
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────

  private startGame(seat: SeatRecord): void {
    if (this.status === "pending") return this.sendError(seat, "not_allowed", "Waiting for a host.");
    const gameId = this.settings.gameId;
    if (!gameId) return this.sendError(seat, "bad_request", "Pick a game first.");
    if (this.game && !this.game.record.over) return this.sendError(seat, "not_allowed", "A game is already running.");
    const meta = getGameMeta(gameId)!;
    const roster = [...this.seats.values()].filter((s) => s.connected);
    const [min, max] = meta.players;
    if (roster.length < min) return this.sendError(seat, "not_allowed", `${meta.name} needs at least ${min} players.`);
    if (roster.length > max) return this.sendError(seat, "not_allowed", `${meta.name} fits at most ${max} players.`);

    for (const s of this.seats.values()) s.inGame = roster.includes(s);
    this.clearTimer();
    this.deadline = null;
    this.paused = false;
    this.pausedRemaining = null;

    const options = { ...defaultOptions(meta), ...this.settings.gameOptions[gameId] };
    const players: GamePlayer[] = roster.map((s) => ({ id: s.id, name: s.name, character: s.character }));
    const record: GameRecord = { id: gameId, state: null, over: false, startedAt: Date.now(), playerIds: players.map((p) => p.id), options };
    const game: ActiveGame = { def: GAMES[gameId], ctx: this.makeContext(gameId, options), record };
    this.game = game;
    try {
      record.state = game.def.create(game.ctx, players);
    } catch (error) {
      console.error(`[room ${this.code}] ${gameId} failed to start`, error);
      this.endGame();
      return this.sendError(seat, "game_error", "That game hit a snag starting up. Try again?");
    }
    this.queueEvent({ kind: "gameStart", sfx: "round.start", text: meta.name });
    this.markDirty();
  }

  private makeContext(gameId: GameId, options: Record<string, number>): GameContext {
    const room = this;
    const memory = (this.memory[gameId] ??= {});
    const live = () => room.game?.ctx === ctx;
    const ctx: GameContext = {
      gameId,
      options,
      get settings() {
        return room.settings;
      },
      memory,
      now: () => Date.now(),
      random: randomFloat,
      randomInt,
      pick,
      shuffle,
      timer: (ms) => Math.round(ms * PACE_SCALE[room.settings.pace]),
      setDeadline: (ms) => {
        if (live()) room.setDeadline(ms);
      },
      get deadline() {
        if (!live()) return null;
        return room.paused ? (room.pausedRemaining === null ? null : Date.now() + room.pausedRemaining) : room.deadline;
      },
      isConnected: (id) => Boolean(room.seats.get(id)?.connected),
      emit: (event) => {
        if (live()) room.queueEvent(event);
      },
      finish: () => {
        if (live()) room.finishGame();
      },
    };
    return ctx;
  }

  private runGame(fn: (game: ActiveGame) => void): void {
    const game = this.game;
    if (!game || game.record.state === null) return;
    try {
      fn(game);
    } catch (error) {
      console.error(`[room ${this.code}] ${game.record.id} error`, error);
      this.queueEvent({ kind: "error", text: "Oops — the game tripped over itself. The host can skip ahead." });
    }
    this.markDirty();
  }

  private finishGame(): void {
    const game = this.game;
    if (!game || game.record.over) return;
    game.record.over = true;
    let scores: Record<string, number> = {};
    try {
      scores = game.def.scores(game.record.state);
    } catch {
      // Results are best-effort.
    }
    const players = game.record.playerIds.map((id) => {
      const seat = this.seats.get(id);
      return { name: seat?.name ?? "Someone", character: seat?.character ?? ("blip" as CharacterId), userId: seat?.userId ?? null, score: scores[id] ?? 0 };
    });
    this.hooks.onGameFinished?.({ gameId: game.record.id, startedAt: game.record.startedAt, players });
  }

  private endGame(): void {
    this.clearTimer();
    this.deadline = null;
    this.paused = false;
    this.pausedRemaining = null;
    this.game = null;
    for (const seat of this.seats.values()) seat.inGame = true;
    this.markDirty();
  }

  private kick(playerId: string): void {
    const seat = this.seats.get(playerId);
    if (!seat || this.isOwnerSeat(seat)) return;
    this.banned.add(`secret:${seat.secret}`);
    if (seat.userId) this.banned.add(`user:${seat.userId}`);
    this.links.get(seat.secret)?.send({ t: "closed", reason: "The host removed you from the party." });
    this.removeSeat(seat);
    if (this.game && seat.inGame) this.runGame((g) => g.def.onConnectionChange?.(g.record.state, g.ctx, playerId, false));
    this.queueEvent({ kind: "kicked", text: `${seat.name} left the party` });
  }

  // ── Clock ──────────────────────────────────────────────────────────────

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private setDeadline(ms: number | null): void {
    this.clearTimer();
    if (ms === null) {
      this.deadline = null;
      this.pausedRemaining = null;
      return;
    }
    const delay = Math.max(0, Math.round(ms));
    if (this.paused) {
      this.pausedRemaining = delay;
      this.deadline = null;
      return;
    }
    this.deadline = Date.now() + delay;
    this.timer = setTimeout(() => this.fireDeadline(), delay);
  }

  private fireDeadline(): void {
    this.timer = null;
    this.deadline = null;
    const now = Date.now();
    if (now - this.fireWindow.start > 1000) this.fireWindow = { start: now, count: 0 };
    if (++this.fireWindow.count > MAX_DEADLINE_FIRES_PER_SEC) {
      console.error(`[room ${this.code}] deadline loop detected; pausing game`);
      this.paused = true;
      this.pausedAt = now;
      this.pausedRemaining = 1000;
      this.markDirty();
      return;
    }
    this.runGame((g) => g.def.onDeadline(g.record.state, g.ctx));
  }

  private pause(): void {
    if (!this.game || this.game.record.over || this.paused) return;
    this.paused = true;
    this.pausedAt = Date.now();
    this.pausedRemaining = this.deadline === null ? null : Math.max(0, this.deadline - Date.now());
    this.clearTimer();
    this.deadline = null;
    this.queueEvent({ kind: "paused", sfx: "ui.pause", text: "Paused by the host" });
  }

  private resume(): void {
    if (!this.paused) return;
    const pausedFor = Date.now() - this.pausedAt;
    const remaining = this.pausedRemaining;
    this.paused = false;
    this.pausedRemaining = null;
    this.runGame((g) => g.def.onResume?.(g.record.state, g.ctx, pausedFor));
    if (remaining !== null && this.deadline === null) this.setDeadline(remaining);
    this.queueEvent({ kind: "resumed", sfx: "ui.resume" });
  }

  // ── Broadcasting ───────────────────────────────────────────────────────

  queueEvent(event: RoomEvent): void {
    this.events.push(event);
    this.markDirty();
  }

  markDirty(): void {
    if (this.flushTimer || this.closed) return;
    const wait = Math.max(0, FLUSH_MIN_GAP_MS - (Date.now() - this.lastFlush));
    this.flushTimer = setTimeout(() => this.flush(), wait);
  }

  private baseView(): Omit<RoomView, "game"> {
    const game = this.game;
    let scores: Record<string, number> | null = null;
    if (game && game.record.state !== null) {
      try {
        scores = game.def.scores(game.record.state);
      } catch {
        scores = {};
      }
    }
    const ownerId = this.owner?.userId;
    const players: PlayerPublic[] = [...this.seats.values()].map((seat) => ({
      id: seat.id,
      name: seat.name,
      character: seat.character,
      connected: seat.connected,
      isHost: Boolean(ownerId && seat.userId === ownerId),
      isGuest: !seat.userId,
      inGame: seat.inGame,
      score: scores ? scores[seat.id] ?? null : null,
    }));
    const hostOnline = Boolean(ownerId && (this.tvIsOwner() || [...this.seats.values()].some((s) => s.connected && s.userId === ownerId)));
    return {
      code: this.code,
      status: this.status,
      hostName: this.owner?.name ?? null,
      hostOnline,
      players,
      maxPlayers: MAX_PLAYERS,
      locked: this.locked,
      settings: this.settings,
      paused: this.paused,
      deadline: this.paused ? null : this.deadline,
      pausedRemainingMs: this.paused ? this.pausedRemaining : null,
      screens: 1,
    };
  }

  private safeView(fn: () => unknown): unknown {
    try {
      return fn();
    } catch (error) {
      console.error(`[room ${this.code}] view error`, error);
      return null;
    }
  }

  private flush(): void {
    this.flushTimer = null;
    this.lastFlush = Date.now();
    if (this.closed) return;
    const serverNow = Date.now();
    const base = this.baseView();
    const game = this.game && this.game.record.state !== null ? this.game : null;
    const envelope = (view: unknown) => (game ? { id: game.record.id, over: game.record.over, view } : null);

    this.hooks.onTvView({ ...base, game: envelope(game ? this.safeView(() => game.def.tvView(game.record.state, game.ctx)) : null) });

    for (const seat of this.seats.values()) {
      if (!seat.connected) continue;
      const link = this.links.get(seat.secret);
      if (!link) continue;
      const playing = game && seat.inGame && game.record.playerIds.includes(seat.id);
      const view = playing ? this.safeView(() => game.def.playerView(game.record.state, game.ctx, seat.id)) : null;
      const room = { ...base, game: envelope(view) };
      const json = JSON.stringify(room);
      if (json === this.lastSent.get(seat.secret)) continue;
      this.lastSent.set(seat.secret, json);
      const version = (this.versions.get(seat.secret) ?? 0) + 1;
      this.versions.set(seat.secret, version);
      link.send({ t: "room", serverNow, room, v: version });
    }

    const events = this.events;
    this.events = [];
    for (const event of events) {
      if (event.tv !== false) this.hooks.onTvEvent(event);
      for (const seat of this.seats.values()) {
        if (seat.connected && (!event.to || event.to.includes(seat.id))) this.links.get(seat.secret)?.send({ t: "event", event });
      }
    }

    this.scheduleSnapshot();
    this.scheduleSummary();
  }

  private scheduleSnapshot(): void {
    if (!this.hooks.onSnapshot || this.snapshotTimer) return;
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      if (!this.closed) this.hooks.onSnapshot?.(this.toSnapshot());
    }, 400);
  }

  private scheduleSummary(): void {
    if (!this.hooks.onSummary || this.summaryTimer) return;
    this.summaryTimer = setTimeout(() => {
      this.summaryTimer = null;
      const summary = this.summary();
      const json = JSON.stringify(summary);
      if (json !== this.lastSummary && !this.closed) {
        this.lastSummary = json;
        this.hooks.onSummary?.(summary);
      }
    }, 1500);
  }

  close(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.clearTimer();
    for (const t of [this.flushTimer, this.snapshotTimer, this.summaryTimer]) if (t) clearTimeout(t);
    if (this.liveness) clearInterval(this.liveness);
    for (const seat of this.seats.values()) this.links.get(seat.secret)?.send({ t: "closed", reason });
    this.hooks.onClosed?.(reason);
  }

  /** Stops timers without telling anyone (page unload; the snapshot lets a refresh resume). */
  dispose(): void {
    this.clearTimer();
    for (const t of [this.flushTimer, this.snapshotTimer, this.summaryTimer]) if (t) clearTimeout(t);
    if (this.liveness) clearInterval(this.liveness);
  }
}
