export const BOT_W = 14;
export const BOT_H = 20;
export const GRAVITY = 0.45;
export const WALK_SPEED = 1.6;
export const MAX_FALL_VEL = 12;

export type Direction = "left" | "right";
export type BotStatus = "alive" | "dead" | "exited";
export type EventType = "exit" | "hazard" | "turn" | "bounce" | "button" | "info";
export type GameStatus =
  | "idle"
  | "running"
  | "paused"
  | "compiling"
  | "error"
  | "success"
  | "failure";
export type Speed = 1 | 2 | 4 | 8;
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
  requiredActivations?: number;
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
  requireHold?: false;
  targetIds?: string[];
}

export interface ExitDoor extends ActivatableGameEnvObject {
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

export function tickSim(state: SimState, level: LevelDef): SimState {
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
  const exitActivated = isTargetActivated(level.exit.id, level.exit.requiredActivations ?? 1);

  // 2. Process Bots and Physics
  const newBots = state.bots.map((bot) => {
    if (bot.status !== "alive") return bot;

    let vx = bot.direction === "right" ? WALK_SPEED : -WALK_SPEED;
    if (bot._curPauseTimer > 0) {
        bot._curPauseTimer--;
        vx = 0;
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
      frame,
      _curPauseTimer: bot._curPauseTimer
    };
  });

  // 3. Determine which buttons are pressed on THIS tick
  const newActiveButtonIds: string[] = [];
  for (const btn of level.buttons) {
    // If requireHold is false, it stays active once pressed
    let isPressed = btn.requireHold === false ? state.activeButtonIds.includes(btn.id) : false;

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
  };
}

export function checkSyntax(code: string): string | null {
  let depth = 0;
  for (const ch of code) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) return 'SyntaxError: Unexpected token "}"';
  }
  if (depth > 0) return "SyntaxError: Unexpected end of input";
  return null;
}