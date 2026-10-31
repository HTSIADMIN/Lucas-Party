// Module-level sound bus. The TV is the speaker; phones stay quiet. Each
// logical name plays a small file when we have one, otherwise a WebAudio
// "recipe" synthesised on the fly — so every sound works with zero assets.
// Browsers block audio until a user gesture: call unlockAudio() from a click.

import { KEYS, local } from "./storage";

type Recipe = (ctx: AudioContext, out: AudioNode, t: number) => void;

const FILES: Record<string, { src: string; volume: number }> = {
  "ui.click": { src: "/sfx/ui-click.mp3", volume: 0.5 },
  "ui.select": { src: "/sfx/ui-confirm.ogg", volume: 0.5 },
  "chip.place": { src: "/sfx/chip-lay.ogg", volume: 0.7 },
  "coin.drop": { src: "/sfx/chips-stack.ogg", volume: 0.7 },
  "rocket.boom": { src: "/sfx/ui-bomb.ogg", volume: 0.9 },
};

function tone(ctx: AudioContext, out: AudioNode, t: number, freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; to?: number; delay?: number } = {}) {
  const start = t + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.vol ?? 0.25, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

let noiseBuffer: AudioBuffer | null = null;
function noise(ctx: AudioContext, out: AudioNode, t: number, dur: number, opts: { vol?: number; from?: number; to?: number; type?: BiquadFilterType; delay?: number } = {}) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = t + (opts.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  filter.frequency.setValueAtTime(opts.from ?? 800, start);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.vol ?? 0.2, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(start);
  src.stop(start + dur + 0.05);
}

const arp = (notes: number[], step: number, type: OscillatorType = "triangle", vol = 0.2): Recipe => (ctx, out, t) =>
  notes.forEach((f, i) => tone(ctx, out, t, f, step * 2.2, { type, vol, delay: i * step }));

const RECIPES: Record<string, Recipe> = {
  "ui.click": (c, o, t) => tone(c, o, t, 900, 0.05, { type: "square", vol: 0.08 }),
  "ui.tick": (c, o, t) => tone(c, o, t, 1320, 0.06, { type: "triangle", vol: 0.12 }),
  "ui.pop": (c, o, t) => tone(c, o, t, 420, 0.12, { to: 980, vol: 0.22 }),
  "ui.select": arp([660, 990], 0.06, "triangle", 0.16),
  "ui.whoosh": (c, o, t) => noise(c, o, t, 0.45, { from: 400, to: 3200, vol: 0.16 }),
  "ui.pause": arp([523, 392], 0.09, "sine", 0.18),
  "ui.resume": arp([392, 523], 0.09, "sine", 0.18),
  "player.join": arp([523, 784], 0.07, "triangle", 0.2),
  "player.host": arp([392, 523, 659, 784], 0.08, "triangle", 0.2),
  "round.start": arp([392, 523, 659, 1046], 0.09, "square", 0.09),
  "round.final": (c, o, t) => {
    arp([262, 330, 392, 523, 659, 784], 0.08, "sawtooth", 0.07)(c, o, t);
    noise(c, o, t, 0.9, { from: 2000, to: 6000, vol: 0.06, type: "highpass", delay: 0.4 });
  },
  "reveal.votes": arp([587, 740, 880], 0.07, "triangle", 0.18),
  "reveal.drumroll": (c, o, t) => {
    for (let i = 0; i < 18; i++) noise(c, o, t, 0.06, { from: 180, vol: 0.18, type: "lowpass", delay: i * 0.055 });
    tone(c, o, t, 196, 0.4, { type: "triangle", vol: 0.2, delay: 1.0 });
  },
  "reveal.caught": arp([880, 659, 880, 659], 0.08, "square", 0.08),
  "reveal.escape": arp([392, 466, 554, 659], 0.1, "sawtooth", 0.07),
  "win.zinger": (c, o, t) => {
    arp([523, 659, 784, 1046, 1318], 0.06, "square", 0.08)(c, o, t);
    noise(c, o, t, 0.6, { from: 4000, to: 9000, vol: 0.05, type: "highpass", delay: 0.25 });
  },
  "win.big": (c, o, t) => {
    arp([392, 523, 659, 784, 1046], 0.11, "triangle", 0.2)(c, o, t);
    arp([523, 659, 784, 1046, 1318], 0.11, "sine", 0.12)(c, o, t + 0.05);
  },
  "fail.jinx": arp([494, 466, 440, 415], 0.09, "sawtooth", 0.08),
  "fail.buzz": (c, o, t) => tone(c, o, t, 130, 0.45, { type: "sawtooth", vol: 0.12, to: 110 }),
  "scores.tally": (c, o, t) => {
    for (let i = 0; i < 8; i++) tone(c, o, t, 600 + i * 90, 0.05, { type: "triangle", vol: 0.1, delay: i * 0.05 });
  },
  "chip.place": (c, o, t) => tone(c, o, t, 1600, 0.04, { type: "square", vol: 0.06 }),
  "coin.drop": arp([1318, 1568], 0.05, "triangle", 0.14),
  "rocket.countdown": (c, o, t) => {
    [0, 1, 2].forEach((i) => tone(c, o, t, 660, 0.14, { type: "square", vol: 0.08, delay: i * 1.0 }));
    tone(c, o, t, 1320, 0.3, { type: "square", vol: 0.1, delay: 3.0 });
  },
  "rocket.launch": (c, o, t) => {
    noise(c, o, t, 1.6, { from: 200, to: 2400, vol: 0.22, type: "lowpass" });
    tone(c, o, t, 80, 1.4, { type: "sawtooth", vol: 0.06, to: 220 });
  },
  "rocket.bail": (c, o, t) => {
    tone(c, o, t, 700, 0.12, { to: 1400, vol: 0.2 });
    tone(c, o, t, 1760, 0.2, { type: "triangle", vol: 0.12, delay: 0.08 });
  },
  "rocket.boom": (c, o, t) => {
    noise(c, o, t, 1.4, { from: 900, to: 60, vol: 0.5, type: "lowpass" });
    tone(c, o, t, 70, 0.9, { type: "sine", vol: 0.45, to: 30 });
  },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<string, number>();

interface SoundSettings { muted: boolean; volume: number }

function loadSettings(): SoundSettings {
  try {
    const raw = local.get(KEYS.sound);
    if (raw) return { muted: false, volume: 0.8, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { muted: false, volume: 0.8 };
}

let settings = loadSettings();
const listeners = new Set<() => void>();

export function getSoundSettings(): SoundSettings {
  return settings;
}

export function setSoundSettings(patch: Partial<SoundSettings>): void {
  settings = { ...settings, ...patch };
  local.set(KEYS.sound, JSON.stringify(settings));
  if (master) master.gain.value = settings.muted ? 0 : settings.volume;
  listeners.forEach((fn) => fn());
}

export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function audioUnlocked(): boolean {
  return ctx?.state === "running";
}

/** Must be called from a user gesture (click/tap) at least once per page load. */
export async function unlockAudio(): Promise<boolean> {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = settings.muted ? 0 : settings.volume;
      master.connect(ctx.destination);
    }
    if (ctx.state !== "running") await ctx.resume();
    listeners.forEach((fn) => fn());
    return ctx.state === "running";
  } catch {
    return false;
  }
}

function loadBuffer(name: string): Promise<AudioBuffer | null> {
  const file = FILES[name];
  if (!file || !ctx) return Promise.resolve(null);
  let p = buffers.get(name);
  if (!p) {
    const audio = ctx;
    p = fetch(file.src)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("missing"))))
      .then((data) => audio.decodeAudioData(data))
      .catch(() => null);
    buffers.set(name, p);
  }
  return p;
}

/** Plays a logical sound. Unknown names are ignored; repeat plays are throttled. */
export function play(name: string | undefined): void {
  if (!name || !ctx || !master || ctx.state !== "running" || settings.muted) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? 0) < 60) return;
  lastPlayed.set(name, now);
  const audio = ctx;
  const out = master;
  const recipe = RECIPES[name];
  if (FILES[name]) {
    void loadBuffer(name).then((buffer) => {
      if (!buffer) return recipe?.(audio, out, audio.currentTime);
      const src = audio.createBufferSource();
      const gain = audio.createGain();
      gain.gain.value = FILES[name]!.volume;
      src.buffer = buffer;
      src.connect(gain).connect(out);
      src.start();
    });
    return;
  }
  recipe?.(audio, out, audio.currentTime);
}

export const SOUND_NAMES = Object.keys(RECIPES);
