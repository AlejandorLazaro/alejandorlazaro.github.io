export const BOT_W = 14;
export const BOT_H = 20;
export const GRAVITY = 0.45;
export const WALK_SPEED = 3.2;
export const MAX_FALL_VEL = 12;

export type Direction = "left" | "right";
export type BotStatus = "alive" | "dead" | "exited";
export type EventType = "exit" | "hazard" | "turn" | "bounce" | "button" | "pause" | "error" | "info";
export type GameStatus =
  | "idle"
  | "running"
  | "paused"
  | "compiling"
  | "error"
  | "success"
  | "failure";
export type Speed = 1 | 2 | 4;
export type Tab =
  | "bot-program"
  | "level-config"
  | "shared-state"
  | "objects"
  | "console";

interface GameEnvObject {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ActivatableGameEnvObject extends GameEnvObject {
  requiredActivations?: 0;
}

export interface Platform extends ActivatableGameEnvObject {
  type: "normal" | "bounce";
  bouncePower?: number;
}

export interface Hazard extends GameEnvObject {
  type: "spike";
}

export interface GameButton extends GameEnvObject {
  activated: boolean;
  toggleable?: false;
  requireHold?: boolean;
  targetIds?: string[];
}

export interface ExitDoor extends ActivatableGameEnvObject {
  id: "exit-door";
  required: number;
}

export interface LevelDef {
  width: number;
  height: number;
  title: string;
  timeLimitSec: number;
  maxSpawnCount: number;
  spawns: Array<{ x: number; y: number }>;
  platforms: Platform[];
  hazards: Hazard[];
  buttons: GameButton[];
  exit: ExitDoor;
}

export interface BotState {
  id: number;
  x: number;
  y: number;
  vy: number;
  direction: Direction;
  status: BotStatus;
  grounded: boolean;
  touchingWall: boolean;
  touchingButton: boolean;
  // Purely observational (Inspector/ApiReference panels) — the engine
  // itself recomputes this fresh every tick from touchingButton rather
  // than reading it back.
  justTouchedButton: boolean;
  pauseTimer: number;
  _curPauseTimer: number;
  color: string;
  frame: number;
}

export interface SimEvent {
  id: number;
  tick: number;
  type: EventType;
  message: string;
}

export interface SimState {
  bots: BotState[];
  activeButtonIds: string[];
  botsExited: number;
  botsAlive: number;
  botsDead: number;
  tick: number;
  events: SimEvent[];
  // Set when a bot's own program throws during this tick's update() call.
  // tickSim itself never throws — errors are reported here so the caller
  // (which owns the UI/console) can decide how to surface them, the same
  // way a failed compile is handled.
  runtimeError: string | null;
}

const BOT_COLORS = ["#79c0ff", "#56d364", "#ffa657"];

let _eid = 0;

export function createSimState(level: LevelDef, spawnCount: number): SimState {
  const count = Math.min(Math.max(1, spawnCount), level.maxSpawnCount);
  const bots: BotState[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: level.spawns[i]?.x ?? level.spawns[0].x,
    y: level.spawns[i]?.y ?? level.spawns[0].y,
    vy: 0,
    direction: "right" as Direction,
    status: "alive" as BotStatus,
    grounded: false,
    touchingWall: false,
    touchingButton: false,
    justTouchedButton: false,
    pauseTimer: 0,
    _curPauseTimer: 0,
    color: BOT_COLORS[i % BOT_COLORS.length],
    frame: 0,
  }));

  return {
    bots,
    activeButtonIds: [],
    botsExited: 0,
    botsAlive: count,
    botsDead: 0,
    tick: 0,
    events: [
      {
        id: _eid++,
        tick: 0,
        type: "info",
        message: `${count} bot${count !== 1 ? "s" : ""} spawned. Simulation started at tick 0.`,
      },
    ],
    runtimeError: null,
  };
}

function hOverlap(
  ax: number,
  aw: number,
  bx: number,
  bw: number,
  m = 1
): boolean {
  return ax + aw > bx + m && ax < bx + bw - m;
}

// ─── Scripting API ───────────────────────────────────────────────────────
//
// The public surface a level's bot-program.js `update(bot, shared)` sees,
// called once per alive bot per tick. `bot` mixes read-only *sensors*
// (genuinely non-writable — assigning to one throws under strict mode,
// rather than silently doing nothing) with a small set of writable
// *actuators* the script uses to steer the bot.

export interface BotApi {
  readonly id: number;
  direction: Direction;
  readonly isGrounded: boolean;
  readonly isTouchingWall: boolean;
  readonly isTouchingButton: boolean;
  // Edge-triggered: true only on the tick contact *begins*, false again on
  // every subsequent tick the bot stays in contact. Good for one-shot
  // reactions. It is NOT what you want for "hold this down for as long as
  // I'm standing here" — see `pause` below.
  readonly justTouchedButton: boolean;
  readonly isAlive: boolean;
  readonly hasExited: boolean;
  // True while a pause requested via `pause = true` is still counting down.
  readonly isPaused: boolean;
  // Set to true to (re)start a pause of `pauseTimer` ticks, taking effect
  // next tick. This is read fresh every tick, and the engine applies it
  // literally: setting it again while already paused restarts the
  // countdown at the full `pauseTimer` length rather than being ignored.
  // That's deliberate, not a bug to guard against — it's what makes both
  // of these patterns possible:
  //   - gate on `justTouchedButton` for a brief, one-time pause
  //   - gate on `isTouchingButton` for an indefinite "hold" that keeps
  //     re-arming, every tick, for as long as the bot remains in contact
  //     (e.g. one bot sacrificing itself to hold a button down)
  pause: boolean;
  // How many ticks the *next* `pause = true` should last. Persists across
  // ticks the same way `direction` does.
  pauseTimer: number;
}

export interface SharedApi {
  readonly botsAtExit: number;
  readonly requiredExitCount: number;
  readonly timeRemaining: number;
}

export type BotUpdateFn = (bot: BotApi, shared: SharedApi) => void;

export type CompileResult =
  | { ok: true; update: BotUpdateFn; spawnCount: number | undefined }
  | { ok: false; error: string };

function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

// Shadowed to `undefined` inside compiled programs so a typo'd or deliberate
// reach for the outside world resolves to nothing instead of the real
// thing. This is a pragmatic guard against accidents and casual misuse,
// NOT a real security sandbox — a sufficiently determined script can still
// escape it (e.g. via `(function(){}).constructor(...)`, or simply calling
// `eval` — see note below). It's meant for a single trusted author
// debugging their own puzzle solution, not for hosting strangers' code —
// do not repurpose this to run untrusted third-party programs.
//
// Deliberately NOT included: "eval" and "arguments". Under "use strict"
// (which the compiled body runs under) both are restricted identifiers —
// using either as a parameter name, var/let/const binding, or assignment
// target is itself a SyntaxError, not just an ineffective shadow. There's
// no way to rebind them this way; `eval` genuinely remains reachable.
const SANDBOX_GLOBALS = [
  "window", "document", "fetch", "XMLHttpRequest", "localStorage", "sessionStorage",
  "Function", "globalThis", "self", "top", "parent", "location", "history",
  "navigator", "alert", "confirm", "prompt", "WebSocket", "Worker", "importScripts",
];

// Compiles bot-program.js source into a callable `update` function, once,
// at "Compile & Run" time — not re-parsed every tick. Note: there is no
// protection here against an infinite loop inside `update()` itself (e.g.
// `while (true) {}`) — that will hang the tab. Catching that reliably needs
// either a Web Worker with a hard termination timeout, or a static rewrite
// that injects an iteration-count guard into every loop body; neither is
// implemented here. This is a known, real gap, not an oversight.
export function compileBotProgram(code: string): CompileResult {
  let factory: (...args: unknown[]) => unknown;
  try {
    factory = new Function(
      ...SANDBOX_GLOBALS,
      `"use strict";\n${code}\n` +
        `if (typeof update !== "function") { throw new Error("Program must define a function named update(bot, shared)."); }\n` +
        `return { update: update, spawnCount: typeof BOT_SPAWN_COUNT !== "undefined" ? BOT_SPAWN_COUNT : undefined };`
    ) as (...args: unknown[]) => unknown;
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }

  let result: unknown;
  try {
    result = factory(...SANDBOX_GLOBALS.map(() => undefined));
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }

  const { update, spawnCount } = (result ?? {}) as { update?: unknown; spawnCount?: unknown };
  if (typeof update !== "function") {
    return { ok: false, error: "Program must define a function named update(bot, shared)." };
  }

  return {
    ok: true,
    update: update as BotUpdateFn,
    spawnCount: typeof spawnCount === "number" ? spawnCount : undefined,
  };
}

function buildBotApi(
  bot: BotState,
  direction: Direction,
  grounded: boolean,
  touchingWall: boolean,
  touchingAnyBtn: boolean,
  justTouchedButton: boolean,
  curPauseTimer: number
): BotApi {
  const api = {} as BotApi;
  Object.defineProperties(api, {
    id:                { value: bot.id,           writable: false, enumerable: true },
    isGrounded:        { value: grounded,          writable: false, enumerable: true },
    isTouchingWall:    { value: touchingWall,      writable: false, enumerable: true },
    isTouchingButton:  { value: touchingAnyBtn,    writable: false, enumerable: true },
    justTouchedButton: { value: justTouchedButton, writable: false, enumerable: true },
    isAlive:           { value: true,              writable: false, enumerable: true },
    hasExited:         { value: false,             writable: false, enumerable: true },
    isPaused:          { value: curPauseTimer > 0, writable: false, enumerable: true },
  });
  api.direction = direction;
  api.pause = false;
  api.pauseTimer = bot.pauseTimer;
  return api;
}

function buildSharedApi(state: SimState, level: LevelDef, timeRemaining: number): SharedApi {
  const shared = {} as SharedApi;
  Object.defineProperties(shared, {
    botsAtExit:        { value: state.botsExited,    writable: false, enumerable: true },
    requiredExitCount: { value: level.exit.required, writable: false, enumerable: true },
    timeRemaining:     { value: timeRemaining,       writable: false, enumerable: true },
  });
  return shared;
}

export function tickSim(
  state: SimState,
  level: LevelDef,
  update: BotUpdateFn,
  timeRemaining: number
): SimState {
  const newEvents: SimEvent[] = [];

  // 1. Evaluate current target activations based on the previous tick's active buttons
  const targetActivations = new Map<string, number>();
  for (const btnId of state.activeButtonIds) {
    const btn = level.buttons.find(b => b.id === btnId);
    btn?.targetIds?.forEach(tId => {
      targetActivations.set(tId, (targetActivations.get(tId) || 0) + 1);
    });
  }

  const isTargetActivated = (targetId: string, required: number = 1) => {
    return (targetActivations.get(targetId) || 0) >= required;
  };

  // Verify exit requirement
  // Use ?? (not ||) so a level whose exit is configured with
  // requiredActivations: 0 (i.e. "always open, no buttons needed")
  // isn't accidentally coerced into requiring 1 activation.
  const exitActivated = isTargetActivated(level.exit.id, level.exit.requiredActivations ?? 1);

  let runtimeError: string | null = null;
  const sharedApi = buildSharedApi(state, level, timeRemaining);

  // 2. Process Bots and Physics
  const newBots = state.bots.map((bot) => {
    if (bot.status !== "alive") return bot;

    let curPauseTimer = bot._curPauseTimer;
    const wasPaused = curPauseTimer > 0;
    let vx = bot.direction === "right" ? WALK_SPEED : -WALK_SPEED;
    if (curPauseTimer > 0) {
      curPauseTimer--;
      vx = 0;
    }
    if (wasPaused && curPauseTimer === 0) {
      newEvents.push({
        id: _eid++,
        tick: state.tick,
        type: "pause",
        message: `Bot ${bot.id + 1} resumed walking`,
      });
    }

    let vy = Math.min(bot.vy + GRAVITY, MAX_FALL_VEL);
    let nx = bot.x + vx;
    let ny = bot.y + vy;
    let grounded = false;
    let touchingWall = false;
    let newDir = bot.direction;
    const frame = (bot.frame + 1) % 8;

    for (const plat of level.platforms) {
      if (!hOverlap(nx, BOT_W, plat.x, plat.w)) continue;
      const prevBottom = bot.y + BOT_H;
      const newBottom = ny + BOT_H;
      if (prevBottom <= plat.y + 3 && newBottom >= plat.y) {
        ny = plat.y - BOT_H;
        if (plat.type === "bounce") {
          vy = -(plat.bouncePower ?? 9);
          newEvents.push({
            id: _eid++,
            tick: state.tick,
            type: "bounce",
            message: `Bot ${bot.id + 1} launched by bounce pad`,
          });
        } else {
          vy = 0;
          grounded = true;
        }
      }
    }

    for (const plat of level.platforms) {
      if (ny + BOT_H <= plat.y + 2 || ny >= plat.y + plat.h - 2) continue;
      if (bot.x + BOT_W <= plat.x + 2 && nx + BOT_W > plat.x) {
        nx = plat.x - BOT_W;
        newDir = "left";
        touchingWall = true;
      } else if (bot.x >= plat.x + plat.w - 2 && nx < plat.x + plat.w) {
        nx = plat.x + plat.w;
        newDir = "right";
        touchingWall = true;
      }
    }

    if (nx < 0) {
      nx = 0;
      newDir = "right";
      touchingWall = true;
    }
    if (nx + BOT_W > level.width) {
      nx = level.width - BOT_W;
      newDir = "left";
      touchingWall = true;
    }

    if (touchingWall && !bot.touchingWall) {
      newEvents.push({
        id: _eid++,
        tick: state.tick,
        type: "turn",
        message: `Bot ${bot.id + 1} turned around`,
      });
    }

    for (const h of level.hazards) {
      if (nx + BOT_W > h.x && nx < h.x + h.w && ny + BOT_H > h.y) {
        newEvents.push({
          id: _eid++,
          tick: state.tick,
          type: "hazard",
          message: `Bot ${bot.id + 1} fell into hazard`,
        });
        return {
          ...bot,
          x: nx,
          y: h.y - BOT_H / 2,
          vy: 0,
          status: "dead" as BotStatus,
        };
      }
    }

    // Determine if bot is touching any button for their personal state
    let touchingAnyBtn = false;
    for (const btn of level.buttons) {
      if (grounded && nx + BOT_W > btn.x && nx < btn.x + btn.w && ny + BOT_H >= btn.y && ny < btn.y + btn.h + 8) {
        touchingAnyBtn = true;
        break;
      }
    }
    const justTouchedButton = touchingAnyBtn && !bot.touchingButton;

    // Run the bot's own program. It sees this tick's sensors (including the
    // wall-bounce that may have already happened above) and can steer
    // `direction` or request a `pause` before physics finishes resolving.
    // A thrown error here stops running *further bots'* programs for this
    // tick (their physics still resolves normally, using prior state) and
    // is surfaced to the caller via the returned SimState.runtimeError.
    let pauseTimerConfig = bot.pauseTimer;
    if (!runtimeError) {
      const api = buildBotApi(bot, newDir, grounded, touchingWall, touchingAnyBtn, justTouchedButton, curPauseTimer);
      try {
        update(api, sharedApi);

        if (api.direction === "left" || api.direction === "right") {
          newDir = api.direction;
        }

        const rawPauseTimer = Number(api.pauseTimer);
        pauseTimerConfig = Number.isFinite(rawPauseTimer)
          ? Math.max(0, Math.floor(rawPauseTimer))
          : bot.pauseTimer;

        if (api.pause === true) {
          const wasAlreadyPaused = curPauseTimer > 0;
          curPauseTimer = pauseTimerConfig;
          if (!wasAlreadyPaused && curPauseTimer > 0) {
            newEvents.push({
              id: _eid++,
              tick: state.tick,
              type: "pause",
              message: `Bot ${bot.id + 1} paused for ${curPauseTimer} ticks`,
            });
          }
        }
      } catch (e) {
        runtimeError = `Bot ${bot.id + 1}'s update() threw: ${describeError(e)}`;
      }
    }

    const ex = level.exit;
    if (
      exitActivated &&
      nx + BOT_W > ex.x &&
      nx < ex.x + ex.w &&
      ny + BOT_H > ex.y &&
      ny < ex.y + ex.h
    ) {
      newEvents.push({
        id: _eid++,
        tick: state.tick,
        type: "exit",
        message: `Bot ${bot.id + 1} reached the exit`,
      });
      return {
        ...bot,
        x: ex.x + 4,
        y: ex.y + ex.h - BOT_H,
        vy: 0,
        status: "exited" as BotStatus,
      };
    }

    if (ny > level.height + 60) {
      return { ...bot, status: "dead" as BotStatus };
    }

    return {
      ...bot,
      x: nx,
      y: ny,
      vy,
      direction: newDir,
      grounded,
      touchingWall,
      touchingButton: touchingAnyBtn,
      justTouchedButton,
      frame,
      pauseTimer: pauseTimerConfig,
      _curPauseTimer: curPauseTimer,
    };
  });

  if (runtimeError) {
    newEvents.push({ id: _eid++, tick: state.tick, type: "error", message: runtimeError });
  }

  // 3. Determine which buttons are pressed on THIS tick
  const newActiveButtonIds: string[] = [];
  for (const btn of level.buttons) {
    // requireHold is false by default (i.e. undefined also counts as "false"),
    // in which case a button stays active once pressed. Only an explicit
    // requireHold: true makes it re-evaluate contact every tick.
    let isPressed = btn.requireHold !== true ? state.activeButtonIds.includes(btn.id) : false;

    if (!isPressed) {
      isPressed = newBots.some(b =>
        b.status === "alive" && b.grounded && b.x + BOT_W > btn.x && b.x < btn.x + btn.w &&
        b.y + BOT_H >= btn.y && b.y < btn.y + btn.h + 8
      );
    }

    if (isPressed) {
      newActiveButtonIds.push(btn.id);
      if (!state.activeButtonIds.includes(btn.id)) {
        newEvents.push({ id: _eid++, tick: state.tick, type: "button", message: `Button ${btn.id} pressed` });
      }
    }
  }

  // 4. Target activation check for logging events
  const newTargetActivations = new Map<string, number>();
  for (const btnId of newActiveButtonIds) {
    const btn = level.buttons.find(b => b.id === btnId);
    btn?.targetIds?.forEach(tId => newTargetActivations.set(tId, (newTargetActivations.get(tId) || 0) + 1));
  }

  for (const [targetId, count] of newTargetActivations.entries()) {
    const oldActiveCount = targetActivations.get(targetId) || 0;

    let threshold = 1;
    if (level.exit.id === targetId) {
      threshold = level.exit.requiredActivations ?? 1;
    } else {
      const p = level.platforms.find(p => p.id === targetId);
      if (p && p.requiredActivations) threshold = p.requiredActivations;
    }

    if (oldActiveCount < threshold && count >= threshold) {
      newEvents.push({
        id: _eid++, tick: state.tick, type: "info",
        message: `Target ${targetId} fully activated!`
      });
    }
  }

  const botsExited = newBots.filter((b) => b.status === "exited").length;
  const botsDead = newBots.filter((b) => b.status === "dead").length;
  const botsAlive = newBots.filter((b) => b.status === "alive").length;

  return {
    bots: newBots,
    activeButtonIds: newActiveButtonIds,
    botsExited,
    botsAlive,
    botsDead,
    tick: state.tick + 1,
    events: [...state.events, ...newEvents].slice(-60),
    runtimeError,
  };
}