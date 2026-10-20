"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useMusic } from "../Music/MusicProvider";
import { GAMES } from "@/lib/arcade/registry";
import { ArcadeAudio } from "@/lib/arcade/audio";
import type { ArcadeInput, ArcadeState, GameId } from "@/lib/arcade/types";
import { views } from "./views";
import type { AimControls, GameView, Images, Palette } from "./view";

/** One audio instance lives across remounts; the context unlocks on gesture. */
const audio = new ArcadeAudio();

type Phase = "ready" | "starting" | "playing" | "paused" | "ended";
type Publication = "idle" | "saving" | "saved" | "failed" | "rejected";

/** The tapes: the transcript format is shared with the server's verifier. */
type RunTicket = {
  readonly id: string;
  readonly game: GameId;
  readonly seed: number;
  readonly version: number;
  readonly nickname: string;
  readonly best: number;
};
type LeaderEntry = { readonly rank: number; readonly nickname: string; readonly score: number };

async function requestJson(path: string, body?: object): Promise<unknown> {
  const response = await fetch(`/api/play/${path}`, { method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new ArcadeError(response.status);
  return response.json();
}

class ArcadeError extends Error {
  constructor(readonly status: number) { super(`Arcade request failed: ${status}`); }
}

const PALETTE_KEYS = ["--v2-ink", "--v2-ink-deep", "--v2-lime", "--v2-lime-deep", "--v2-mint", "--v2-mint-bright",
  "--v2-navy", "--v2-teal", "--v2-teal-deep", "--v2-white", "--v2-gold", "--v2-red", "--v2-blue", "--v2-slate"] as const;

function readPalette(element: Element): Palette {
  const styles = getComputedStyle(element);
  const map = Object.fromEntries(PALETTE_KEYS.map((key) => [key, styles.getPropertyValue(key).trim()]));
  return {
    ink: map["--v2-ink"], inkDeep: map["--v2-ink-deep"], lime: map["--v2-lime"], limeDeep: map["--v2-lime-deep"],
    mint: map["--v2-mint"], mintBright: map["--v2-mint-bright"], navy: map["--v2-navy"], teal: map["--v2-teal"],
    tealDeep: map["--v2-teal-deep"], white: map["--v2-white"], gold: map["--v2-gold"], red: map["--v2-red"],
    blue: map["--v2-blue"], slate: map["--v2-slate"],
  };
}

function parseTicket(value: unknown): RunTicket | null {
  if (!value || typeof value !== "object") return null;
  const { id, game, seed, version, nickname, best } = value as Record<string, unknown>;
  if (typeof id !== "string" || typeof game !== "string" || typeof seed !== "number" ||
      typeof version !== "number" || typeof nickname !== "string" || typeof best !== "number") return null;
  if (!(game in GAMES) || GAMES[game as GameId].version !== version) return null;
  return { id, game: game as GameId, seed, version, nickname, best };
}

function parsedScore(value: unknown, expected: number): value is { best: number; nickname: string } {
  return !!value && typeof value === "object" &&
    typeof (value as { score?: unknown }).score === "number" &&
    (value as { score: number }).score === expected &&
    typeof (value as { best?: unknown }).best === "number";
}

function parseLeaderboard(value: unknown): LeaderEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: LeaderEntry[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || typeof (row as { rank?: unknown }).rank !== "number" ||
        typeof (row as { nickname?: unknown }).nickname !== "string" ||
        typeof (row as { score?: unknown }).score !== "number") return null;
    const { rank, nickname, score } = row as { rank: number; nickname: string; score: number };
    entries.push({ rank, nickname, score });
  }
  return entries;
}

/**
 * The shared cabinet: one fixed-timestep loop, transcript recorder, ranked
 * publication flow and per-game leaderboard, reused by every mode. Each
 * mode's sim comes from src/lib/arcade; its view supplies render + input.
 */
export default function Cabinet({ game, onExit }: { game: GameId; onExit: () => void }) {
  const t = useTranslations("V2.play");
  const gt = useTranslations(`V2.play.games.${game}`);
  const music = useMusic();
  const canvas = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ArcadeState | null>(null);
  const controls = useRef<AimControls>({ aim: null, direction: 0 });
  const lastTuple = useRef<string>("");
  const pending = useRef<ArcadeInput | null>(null);
  const inputs = useRef<[tick: number, ...rest: number[]][]>([]);
  const ticket = useRef<RunTicket | null>(null);
  const viewRef = useRef<GameView | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const generation = useRef(0);
  const practiceRef = useRef(false);
  const mounted = useRef(true);
  const reduceMotion = useRef(false);
  const [engine, setEngine] = useState<{ view: GameView; palette: Palette; images: Images } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [stats, setStats] = useState<Array<[string, string]>>([]);
  const [nickname, setNickname] = useState("");
  const [best, setBest] = useState(0);
  const [startFailed, setStartFailed] = useState(false);
  const [publication, setPublication] = useState<Publication>("idle");
  const [leaders, setLeaders] = useState<LeaderEntry[] | null>(null);
  const [leaderFailed, setLeaderFailed] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [finalScore, setFinalScore] = useState(0);

  const sim = GAMES[game];

  const transition = useCallback((next: Phase) => {
    phaseRef.current = next;
    controls.current = { aim: null, direction: 0 };
    pending.current = null;
    setPhase(next);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    setLeaderFailed(false);
    try {
      const rows = parseLeaderboard(await requestJson(`leaderboard?game=${game}`));
      if (!rows) throw new TypeError("Invalid leaderboard response");
      if (mounted.current) setLeaders(rows);
    } catch {
      if (mounted.current) setLeaderFailed(true);
    }
  }, [game]);

  const publish = useCallback(async () => {
    const run = ticket.current;
    const runState = stateRef.current;
    if (!run || practiceRef.current || !runState) return;
    const currentGeneration = generation.current;
    const transcript = { inputs: inputs.current, finalTick: runState.tick };
    setPublication("saving");
    try {
      const result = await requestJson(`runs/${run.id}/finish`, transcript);
      if (!parsedScore(result, runState.score)) throw new ArcadeError(422);
      if (!mounted.current || currentGeneration !== generation.current) return;
      setBest(result.best);
      setPublication("saved");
      void refreshLeaderboard();
    } catch (error) {
      if (!mounted.current || currentGeneration !== generation.current) return;
      const retry = error instanceof ArcadeError && [422, 401, 404, 409, 410, 413].includes(error.status);
      setPublication(retry ? "rejected" : "failed");
    }
  }, [refreshLeaderboard]);

  // Assets + per-mode view mount.
  useEffect(() => {
    mounted.current = true;
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    audio.enabled = window.localStorage.getItem("cusec-arcade-sfx") !== "off";
    setSfxEnabled(audio.enabled);
    void refreshLeaderboard();
    const view = views[game]();
    viewRef.current = view;
    let alive = true;
    const element = canvas.current;
    const palette = element ? readPalette(element) : null;
    const loaded: Images = {};
    void Promise.all(view.assets.map((src) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => { loaded[src] = image; resolve(); };
      image.onerror = () => resolve();
      image.src = src;
    }))).then(() => {
      if (!alive || !palette) return;
      setEngine({ view, palette, images: loaded });
    });
    return () => { alive = false; mounted.current = false; generation.current += 1; };
  }, [game, refreshLeaderboard]);

  // The one loop: run the sim on the tick grid, record the transcript, draw.
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !engine) return;
    const { view, palette, images } = engine;
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    let shakeUntil = 0;
    const stepMs = 1000 / sim.tps;
    const loop = (now: number) => {
      const runState = stateRef.current;
      if (phaseRef.current === "playing" && runState) {
        accumulator += Math.min(100, now - previous);
        while (accumulator >= stepMs && !runState.ended) {
          const tuple = pending.current ?? (view.mode === "aim" ? view.input!(controls.current) : sim.defaultInput);
          pending.current = null;
          const key = tuple.join(",");
          if (lastTuple.current !== key) {
            lastTuple.current = key;
            inputs.current.push([runState.tick, ...tuple] as [number, ...number[]]);
          }
          const before = runState.score;
          sim.step(runState, tuple);
          if (runState.sfx.length > 0) audio.play(game, runState.sfx);
          if (runState.sfx.includes("concede") || runState.sfx.includes("lose")) shakeUntil = now + 240;
          if (runState.score !== before || runState.tick % 30 === 0) setStats(view.stats(runState));
          accumulator -= stepMs;
        }
        if (runState.ended) {
          setFinalScore(runState.score);
          transition("ended");
          void publish();
        }
      } else accumulator = 0;
      previous = now;
      context.save();
      if (!reduceMotion.current && performance.now() < shakeUntil) {
        context.translate((Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 5);
      }
      if (stateRef.current) view.render(context, stateRef.current, images, palette);
      context.restore();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, sim, game, publish, transition]);

  // Auto-pause when focus or the tab go away — a ranked run must not idle on.
  useEffect(() => {
    const pause = () => { if (phaseRef.current === "playing") transition("paused"); };
    const onVisibility = () => { if (document.hidden) pause(); };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", onVisibility); };
  }, [transition]);

  const start = async (practice = false) => {
    const currentGeneration = ++generation.current;
    transition("starting");
    setStartFailed(false);
    setPublication("idle");
    let run: RunTicket | null = null;
    if (!practice) {
      try {
        run = parseTicket(await requestJson("runs", { game }));
      } catch { run = null; }
      if (!run) {
        if (mounted.current && currentGeneration === generation.current) { setStartFailed(true); transition("ready"); }
        return;
      }
    }
    if (!mounted.current || currentGeneration !== generation.current) return;
    practiceRef.current = practice;
    ticket.current = run;
    if (run) { setBest(run.best); setNickname(run.nickname); }
    else setNickname("");
    const seed = run?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    stateRef.current = sim.create(seed);
    inputs.current = [];
    lastTuple.current = "zzz"; // forces the first event push
    pending.current = null;
    setStats(viewRef.current ? viewRef.current.stats(stateRef.current as never) : []);
    transition("playing");
    canvas.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    if (event.key === "Escape") { event.preventDefault(); transition("paused"); return; }
    if (viewRef.current?.mode === "aim") {
      if (["ArrowLeft", "a", "A", "ArrowRight", "d", "D"].includes(event.key)) {
        event.preventDefault();
        controls.current.direction = ["ArrowLeft", "a", "A"].includes(event.key) ? -1 : 1;
      }
      return;
    }
    const tuple = viewRef.current?.key?.(event.nativeEvent);
    if (tuple) { event.preventDefault(); pending.current = tuple; }
  };

  const stagePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    audio.unlock();
    event.currentTarget.focus();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 480;
    const y = (event.clientY - rect.top) / rect.height * 640;
    if (viewRef.current?.mode === "aim") {
      event.currentTarget.setPointerCapture(event.pointerId);
      controls.current.aim = Math.round(x);
      return;
    }
    const tuple = viewRef.current?.tap?.(x, y);
    if (tuple) pending.current = tuple;
  };

  const stagePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing" || viewRef.current?.mode !== "aim" ||
        !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    controls.current.aim = Math.round(Math.max(0, Math.min(480,
      (event.clientX - rect.left) / rect.width * 480)));
  };

  const active = phase === "playing" || phase === "paused";
  const mode = viewRef.current?.mode ?? "aim";
  const message = startFailed ? t("start-failed") : phase === "starting" ? t("starting")
    : phase === "paused" ? t("paused")
      : phase === "ended" ? gt("result", { score: finalScore })
        : phase === "ready" ? gt("ready") : "";

  return (
    <div className="v2-rally__layout">
      <section className="v2-rally__cabinet v2-glass" aria-label={gt("how-title")} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && phaseRef.current === "playing") transition("paused");
      }}>
        <div className="v2-rally__stats">
          {stats.map(([key, value]) => (
            <div key={key}>
              <span>{t(`stats.${key}` as Parameters<typeof t>[0])}</span>
              <strong className="v2-pixel">{value}</strong>
            </div>
          ))}
          <div><span>{t("best")}</span><strong className="v2-pixel">{best}</strong></div>
          <button className="v2-rally__text-button" type="button" onClick={onExit}>{t("back")}</button>
          <button className="v2-rally__music" type="button" onClick={music.toggle} aria-pressed={music.playing}>
            <Music2 size={18} aria-hidden="true" />{music.playing ? t("music-off") : t("music-on")}
          </button>
          <button className="v2-rally__music" type="button" onClick={() => {
            const next = !sfxEnabled;
            audio.enabled = next;
            setSfxEnabled(next);
            if (typeof window !== "undefined") window.localStorage.setItem("cusec-arcade-sfx", next ? "on" : "off");
            if (next) audio.unlock();
          }} aria-pressed={sfxEnabled}>
            {sfxEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}{sfxEnabled ? t("sfx-off") : t("sfx-on")}
          </button>
        </div>
        <div className="v2-rally__stage" onKeyDown={onKeyDown}>
          <canvas ref={canvas} width={960} height={1280} tabIndex={0} aria-label={gt("arena")}
            aria-describedby="rally-instructions" onPointerDown={stagePointerDown} onPointerMove={stagePointerMove}>
            {t("canvas-fallback")}
          </canvas>
          {phase !== "playing" && engine && <div className="v2-rally__overlay">
            <p className="v2-pixel" role="status">{message}</p>
            {phase === "paused" ? <button type="button" className="v2-btn v2-btn--primary" onClick={() => { transition("playing"); canvas.current?.focus(); }}>
              <Play size={18} />{t("resume")}</button>
              : <button type="button" className="v2-btn v2-btn--primary" disabled={publication === "saving"} onClick={() => void start()}>
                <Play size={18} />{phase === "ended" ? t("again") : t("start")}
              </button>}
            {startFailed && <button type="button" className="v2-btn v2-btn--outline" onClick={() => void start(true)}>{t("practice")}</button>}
          </div>}
        </div>
        <div className="v2-rally__controls">
          {mode === "aim" ? ([-1, 1] as const).map((value) => (
            <button key={value} type="button" className="v2-rally__direction" disabled={phase !== "playing"}
              aria-label={value < 0 ? t("left") : t("right")}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); controls.current.direction = value; }}
              onPointerUp={() => { controls.current.direction = 0; const runState = stateRef.current as unknown as { playerX: number } | null; if (runState) controls.current.aim = Math.round(runState.playerX); }}
              onPointerCancel={() => { controls.current.direction = 0; const runState = stateRef.current as unknown as { playerX: number } | null; if (runState) controls.current.aim = Math.round(runState.playerX); }}>
              {value < 0 ? <ArrowLeft aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            </button>
          )) : <span className="v2-rally__tap-hint">{gt("tap-hint")}</span>}
          <button type="button" className="v2-rally__pause" disabled={!active} onClick={() => {
            const paused = phase === "paused";
            transition(paused ? "playing" : "paused");
            if (paused) canvas.current?.focus();
            else audio.unlock();
          }}>{phase === "paused" ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}{phase === "paused" ? t("resume") : t("pause")}</button>
        </div>
        <p className="v2-rally__identity">{nickname || (phase !== "ready" && phase !== "starting" ? t("practice-label") : "")}</p>
        <div className="v2-rally__publication" aria-live="polite">
          {publication !== "idle" && <p>{t(`publication-${publication}` as Parameters<typeof t>[0])}</p>}
          {publication === "failed" && <button type="button" className="v2-rally__text-button" onClick={() => void publish()}>{t("retry-score")}</button>}
        </div>
      </section>
      <aside className="v2-rally__sidebar">
        <section className="v2-rally__instructions v2-glass">
          <p className="v2-rally__eyebrow">{gt("how-eyebrow")}</p>
          <h2 className="v2-pixel">{gt("how-title")}</h2>
          <p id="rally-instructions">{gt("instructions")}</p>
          <p>{gt("rules")}</p>
          <p className="v2-rally__notice">{t("public-notice")}</p>
        </section>
        <section className="v2-rally__leaderboard v2-glass" aria-labelledby="rally-leaderboard">
          <p className="v2-rally__eyebrow">{t("leader-label")}</p>
          <h2 id="rally-leaderboard" className="v2-pixel">{t("leader-title")}</h2>
          {leaderFailed ? <p role="status">{t("leader-failed")}</p> : leaders === null ? <p>{t("loading")}</p> : leaders.length === 0 ? <p>{t("leader-empty")}</p>
            : <ol role="list">{leaders.map((row, index) => (
              <li key={`${row.nickname}-${index}`} className={row.nickname === nickname ? "is-you" : ""}>
                <span className="v2-rally__rank">{row.rank.toString().padStart(2, "0")}</span><span>{row.nickname}</span><strong>{row.score}</strong>
              </li>
            ))}</ol>}
          <button type="button" className="v2-rally__text-button" onClick={() => void refreshLeaderboard()}>{t("refresh")}</button>
        </section>
      </aside>
    </div>
  );
}
