import { useState, useEffect, useRef, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ChangeEvent as ReactChangeEvent } from "react";
import {
  createSimState,
  tickSim,
  compileBotProgram,
  BOT_W,
  BOT_H,
} from "./game";
import type {
  SimState,
  GameStatus,
  BotState,
  LevelDef,
  Speed,
  Tab,
  SimEvent,
  EventType,
  BotUpdateFn,
} from "./game";
import {
  fetchLevel,
  fetchLevelManifest,
  generateLevelConfigCode,
  generateSharedStateCode,
  generateObjectsCode,
  parseLevelJson,
} from "./levels";
import type { LevelManifestEntry, LevelParseResult } from "./levels";

// ─── Constants ───────────────────────────────────────────────────────────────

const TICK_MS = 50;
const DEFAULT_LEVEL_ID = "level-01";

// This is the starter user program, not level data — it stays hardcoded
// because it's meant to be edited by the player, unlike level-config /
// shared-state / objects, which are derived from the fetched LevelDef.
const DEFAULT_BOT_PROGRAM = `const BOT_SPAWN_COUNT = 1;
let buttonsToHold = 0;
let exitsRequired = 2;

function update(bot, shared) {
  bot.direction = "right";

  if (bot.isTouchingWall) {
    bot.direction = "left";
  }
}`;

function buildFileContents(level: LevelDef): Record<Tab, string> {
  return {
    "bot-program": DEFAULT_BOT_PROGRAM,
    "level-config": generateLevelConfigCode(level),
    "shared-state": generateSharedStateCode(level),
    objects: generateObjectsCode(level),
    console: "",
  };
}

const LOCKED_TABS: Tab[] = ["level-config", "shared-state", "objects"];

const TAB_LABELS: Record<Tab, string> = {
  "bot-program": "bot-program.js",
  "level-config": "level-config.js",
  "shared-state": "shared-state.js",
  objects: "objects.js",
  console: "console",
};

const TAB_ORDER: Tab[] = Object.keys(TAB_LABELS) as Tab[];

const EVENT_ICONS: Record<EventType, string> = {
  exit: "→",
  hazard: "✕",
  turn: "↩",
  bounce: "↑",
  button: "◉",
  pause: "⏸",
  error: "⚠",
  info: "·",
};

const EVENT_COLORS: Record<EventType, string> = {
  exit: "#3fb950",
  hazard: "#f85149",
  turn: "#8b949e",
  bounce: "#bc8cff",
  button: "#d29922",
  pause: "#79c0ff",
  error: "#f85149",
  info: "#58a6ff",
};

// ─── Syntax Highlighter ──────────────────────────────────────────────────────

function highlightLine(line: string) {
  const PATTERNS: Array<[RegExp, string]> = [
    [/^\/\/.*/, "text-[#8b949e] italic"],
    [/^"[^"]*"|'[^']*'/, "text-[#a5d6ff]"],
    [/^\d+\.?\d*/, "text-[#79c0ff]"],
    [/^(const|let|var|function|if|else|return|true|false|null|new|typeof)\b/, "text-[#ff7b72]"],
    [/^(bot|shared)\b/, "text-[#d2a8ff]"],
    [/^[a-zA-Z_$][a-zA-Z0-9_$]*/, "text-[#e6edf3]"],
    [/^[{}()\[\]]/, "text-[#ffa657]"],
    [/^[=<>!&|+\-*/%.,;:]/, "text-[#e6edf3]"],
    [/^\s+/, ""],
    [/^./, "text-[#8b949e]"],
  ];

  const tokens: Array<[string, string]> = [];
  let rest = line;
  while (rest.length > 0) {
    let matched = false;
    for (const [pat, cls] of PATTERNS) {
      const m = rest.match(pat);
      if (m) {
        tokens.push([m[0], cls]);
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) { tokens.push([rest[0], ""]); rest = rest.slice(1); }
  }

  return tokens.map(([text, cls], i) =>
    cls ? <span key={i} className={cls}>{text}</span> : <span key={i}>{text}</span>
  );
}

function HighlightedCode({ code }: { code: string }) {
  return (
    <>
      {code.split("\n").map((line, i) => (
        <div key={i} className="leading-6">{highlightLine(line)}{" "}</div>
      ))}
    </>
  );
}

// ─── Inspector helpers ───────────────────────────────────────────────────────

type InspectorProp = { name: string; value: string; locked?: boolean; readOnly?: boolean; editable?: boolean };
type InspectorTarget = { label: string; props: InspectorProp[] } | null;

// A stable, serializable reference to "what's selected" — independent of
// any snapshot of its data — so it can be diffed, cycled through with the
// keyboard, and re-resolved against live state on every render instead of
// going stale the moment something click-selected changes underneath it.
type SelectableKind = "platform" | "hazard" | "button" | "exit" | "bot";
type SelectionKey = { kind: SelectableKind; id: string | number } | null;

function sameSelection(a: SelectionKey, b: SelectionKey): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.id === b.id;
}

function botInspector(bot: BotState): InspectorTarget {
  const stateTag = getBotStateTag(bot);
  return {
    label: `Bot ${bot.id + 1}`,
    props: [
      { name: "status",      value: bot.status,                readOnly: true },
      { name: "state",       value: stateTag.text,             readOnly: true },
      { name: "direction",   value: bot.direction,             editable: true },
      { name: "grounded",    value: bot.grounded ? "yes" : "no", readOnly: true },
      { name: "touchingWall",value: bot.touchingWall ? "yes" : "no", readOnly: true },
      { name: "touchingBtn", value: bot.touchingButton ? "yes" : "no", readOnly: true },
      { name: "justTouchedBtn", value: bot.justTouchedButton ? "yes" : "no", readOnly: true },
      { name: "pauseTimer",  value: String(bot.pauseTimer),    editable: true },
      { name: "solid",       value: "yes",                     readOnly: true },
      { name: "jumpPower",   value: "—",                       locked: true },
    ],
  };
}

function exitInspector(required: number, exited: number): InspectorTarget {
  return {
    label: "Exit Door",
    props: [
      { name: "required",    value: String(required), readOnly: true },
      { name: "currentCount",value: String(exited),   readOnly: true },
      { name: "remaining",   value: String(Math.max(0, required - exited)), readOnly: true },
    ],
  };
}

function buttonInspector(activated: boolean): InspectorTarget {
  return {
    label: "Button",
    props: [
      { name: "activated", value: activated ? "yes" : "no", readOnly: true },
      { name: "triggerOn", value: "bot contact",            readOnly: true },
      { name: "effect",    value: "—",                      locked: true },
    ],
  };
}

function platformInspector(id: string): InspectorTarget {
  const isDecorative = id === "deco-plat";
  return {
    label: id === "upper-ground" ? "Upper Ground" :
           id === "mid-plat" ? "Mid Platform" :
           id === "lower-ground" ? "Lower Ground" : "Platform",
    props: [
      { name: "type",       value: "solid",  readOnly: true },
      { name: "collision",  value: "solid",  readOnly: true },
      { name: "bouncePower",value: isDecorative ? "0" : "0", locked: !isDecorative },
    ],
  };
}

function hazardInspector(): InspectorTarget {
  return {
    label: "Hazard",
    props: [
      { name: "type",   value: "spike", readOnly: true },
      { name: "lethal", value: "yes",   readOnly: true },
    ],
  };
}

// The canonical, stable ordering used both for keyboard Tab-cycling and to
// validate that a given SelectionKey still points at something real.
function getSelectableObjects(level: LevelDef, simState: SimState): SelectionKey[] {
  const list: SelectionKey[] = [];
  level.platforms.forEach((p) => list.push({ kind: "platform", id: p.id }));
  level.hazards.forEach((h) => list.push({ kind: "hazard", id: h.id }));
  level.buttons.forEach((b) => list.push({ kind: "button", id: b.id }));
  list.push({ kind: "exit", id: level.exit.id });
  // Exited bots are removed from play (BotSprite renders nothing for them),
  // so they drop out of the cycle the moment they leave.
  simState.bots.forEach((b) => {
    if (b.status !== "exited") list.push({ kind: "bot", id: b.id });
  });
  return list;
}

// Resolves a SelectionKey against *live* level/simState data every render,
// so the Inspector panel reflects current values instead of a stale
// snapshot captured at click time.
function buildInspectorTarget(key: SelectionKey, level: LevelDef, simState: SimState): InspectorTarget {
  if (!key) return null;
  switch (key.kind) {
    case "platform": {
      const p = level.platforms.find((p) => p.id === key.id);
      return p ? platformInspector(p.id) : null;
    }
    case "hazard": {
      const h = level.hazards.find((h) => h.id === key.id);
      return h ? hazardInspector() : null;
    }
    case "button": {
      const b = level.buttons.find((b) => b.id === key.id);
      return b ? buttonInspector(simState.activeButtonIds.includes(b.id)) : null;
    }
    case "exit":
      return exitInspector(level.exit.required, simState.botsExited);
    case "bot": {
      const bot = simState.bots.find((b) => b.id === key.id);
      return bot ? botInspector(bot) : null;
    }
  }
}

// Bounding box for the selected object, used to draw the keyboard-focus
// outline on the canvas.
function getSelectionRect(
  key: SelectionKey,
  level: LevelDef,
  simState: SimState
): { x: number; y: number; w: number; h: number } | null {
  if (!key) return null;
  switch (key.kind) {
    case "platform": {
      const p = level.platforms.find((p) => p.id === key.id);
      return p ? { x: p.x, y: p.y, w: p.w, h: p.h } : null;
    }
    case "hazard": {
      const h = level.hazards.find((h) => h.id === key.id);
      return h ? { x: h.x, y: h.y, w: h.w, h: h.h } : null;
    }
    case "button": {
      const b = level.buttons.find((b) => b.id === key.id);
      return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null;
    }
    case "exit":
      return { x: level.exit.x, y: level.exit.y, w: level.exit.w, h: level.exit.h };
    case "bot": {
      const bot = simState.bots.find((b) => b.id === key.id);
      return bot && bot.status !== "exited" ? { x: bot.x, y: bot.y, w: BOT_W, h: BOT_H } : null;
    }
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GameStatus }) {
  const conf: Record<GameStatus, { label: string; bg: string; dot: string }> = {
    idle:      { label: "Idle",      bg: "bg-[#21262d]", dot: "bg-[#484f58]" },
    running:   { label: "Running",   bg: "bg-[#0d2208]", dot: "bg-[#3fb950]" },
    paused:    { label: "Paused",    bg: "bg-[#2d200a]", dot: "bg-[#d29922]" },
    compiling: { label: "Compiling", bg: "bg-[#0c1e3a]", dot: "bg-[#58a6ff]" },
    error:     { label: "Error",     bg: "bg-[#2d0a0a]", dot: "bg-[#f85149]" },
    success:   { label: "Success",   bg: "bg-[#0d2208]", dot: "bg-[#3fb950]" },
    failure:   { label: "Failure",   bg: "bg-[#2d0a0a]", dot: "bg-[#f85149]" },
  };
  const c = conf[status];
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "running" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

// Single source of truth for "what is this bot currently doing" — used by
// both the on-canvas overhead label and the Inspector panel, so the wording
// never drifts between the two. Only "paused" has a meaningful countdown;
// everything else is a fixed label with no timer.
function getBotStateTag(bot: BotState): { text: string; color: string } {
  if (bot.status === "dead") return { text: "dead", color: "#f85149" };
  if (bot.status === "exited") return { text: "exited", color: "#3fb950" };
  if (bot._curPauseTimer > 0) return { text: `paused ${bot._curPauseTimer}`, color: "#79c0ff" };
  return { text: "walking", color: "#8b949e" };
}

function BotSprite({ bot, onSelect }: { bot: BotState; onSelect: (key: SelectionKey) => void }) {
  const handleClick = useCallback(() => onSelect({ kind: "bot", id: bot.id }), [bot.id, onSelect]);

  if (bot.status === "exited") return null;

  const stateTag = getBotStateTag(bot);
  // Two-line overhead label: state (+ countdown when paused) above the ID
  // number, both rendered as siblings outside any dimming group so they
  // stay legible even on a faded dead bot.
  const overheadLabel = (
    <>
      <text
        x={bot.x + BOT_W / 2}
        y={bot.y - 12}
        textAnchor="middle"
        fill={stateTag.color}
        fontSize={6}
        fontFamily="JetBrains Mono"
      >
        {stateTag.text}
      </text>
      <text
        x={bot.x + BOT_W / 2}
        y={bot.y - 3}
        textAnchor="middle"
        fill={bot.color}
        fontSize={7}
        fontFamily="JetBrains Mono"
        fontWeight="bold"
      >
        {bot.id + 1}
      </text>
    </>
  );

  if (bot.status === "dead") {
    return (
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        <g opacity={0.35}>
          <rect x={bot.x} y={bot.y} width={BOT_W} height={BOT_H} fill={bot.color} rx={2} />
          <line x1={bot.x + 2} y1={bot.y + 2} x2={bot.x + BOT_W - 2} y2={bot.y + BOT_H - 2} stroke="#f85149" strokeWidth={1.5} />
          <line x1={bot.x + BOT_W - 2} y1={bot.y + 2} x2={bot.x + 2} y2={bot.y + BOT_H - 2} stroke="#f85149" strokeWidth={1.5} />
        </g>
        {overheadLabel}
      </g>
    );
  }

  const eyeX = bot.direction === "right" ? bot.x + 9 : bot.x + 4;
  const leg1H = bot.frame < 4 ? 5 : 2;
  const leg2H = bot.frame >= 4 ? 5 : 2;

  return (
    <g onClick={handleClick} style={{ cursor: "pointer" }}>
      <rect x={bot.x} y={bot.y} width={BOT_W} height={BOT_H} fill={bot.color} rx={2} />
      <rect x={bot.x + 1} y={bot.y + 1} width={BOT_W - 2} height={6} fill="rgba(255,255,255,0.18)" rx={1} />
      <circle cx={eyeX} cy={bot.y + 7} r={2.5} fill="white" />
      <circle cx={eyeX + (bot.direction === "right" ? 0.6 : -0.6)} cy={bot.y + 7.3} r={1.2} fill="#0d1117" />
      <rect x={bot.x + 2} y={bot.y + BOT_H} width={4} height={leg1H} fill={bot.color} rx={1} opacity={0.8} />
      <rect x={bot.x + 8} y={bot.y + BOT_H} width={4} height={leg2H} fill={bot.color} rx={1} opacity={0.8} />
      {overheadLabel}
    </g>
  );
}

function GameCanvas({
  simState,
  level,
  gameStatus,
  selection,
  onSelectObject,
}: {
  simState: SimState;
  level: LevelDef;
  gameStatus: GameStatus;
  selection: SelectionKey;
  onSelectObject: (key: SelectionKey) => void;
}) {
  const isPaused = gameStatus === "paused";
  return (
    <svg
      viewBox={`0 0 ${level.width} ${level.height}`}
      className="w-full h-full"
      style={{ display: "block" }}
    >
      <rect width={level.width} height={level.height} fill="#090e18" />

      <defs>
        <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f1a2e" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={level.width} height={level.height} fill="url(#grid)" />

      {level.platforms.map((plat) => {
        const isBounce = plat.type === "bounce";
        return (
          <g
            key={plat.id}
            onClick={() => onSelectObject({ kind: "platform", id: plat.id })}
            style={{ cursor: "pointer" }}
          >
            <rect x={plat.x} y={plat.y} width={plat.w} height={plat.h} fill={isBounce ? "#1a0e2e" : "#1a2030"} />
            <rect x={plat.x} y={plat.y} width={plat.w} height={3} fill={isBounce ? "#bc8cff" : "#2d3748"} rx={1} />
            <rect x={plat.x + 1} y={plat.y + 3} width={plat.w - 2} height={1} fill="rgba(255,255,255,0.04)" />
          </g>
        );
      })}

      {level.hazards.map((h) => {
        const count = Math.floor(h.w / 12);
        return (
          <g
            key={h.id}
            onClick={() => onSelectObject({ kind: "hazard", id: h.id })}
            style={{ cursor: "pointer" }}
          >
            <rect x={h.x} y={h.y} width={h.w} height={h.h} fill="#1a0508" />
            {Array.from({ length: count }, (_, i) => (
              <polygon
                key={i}
                points={`${h.x + i * 12},${h.y + h.h} ${h.x + i * 12 + 6},${h.y + 4} ${h.x + i * 12 + 12},${h.y + h.h}`}
                fill="#f85149"
                opacity={0.85}
              />
            ))}
          </g>
        );
      })}

      {level.buttons.map((btn) => {
        const isActivated = simState.activeButtonIds.includes(btn.id);
        return (
          <g
            key={btn.id}
            onClick={() => onSelectObject({ kind: "button", id: btn.id })}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={btn.x}
              y={btn.y}
              width={btn.w}
              height={btn.h}
              fill={isActivated ? "#0d3320" : "#2d200a"}
              stroke={isActivated ? "#10b981" : "#d97706"}
              strokeWidth="1.5"
              rx={3}
            />
            <circle
              cx={btn.x + btn.w / 2}
              cy={btn.y + btn.h / 2}
              r={Math.min(btn.w, btn.h) / 4}
              fill={isActivated ? "#10b981" : "#d97706"}
            />
          </g>
        );
      })}

      <g
        onClick={() => onSelectObject({ kind: "exit", id: level.exit.id })}
        style={{ cursor: "pointer" }}
      >
        <rect
          x={level.exit.x}
          y={level.exit.y}
          width={level.exit.w}
          height={level.exit.h}
          fill="#0a2410"
          stroke="#3fb950"
          strokeWidth={1.5}
          rx={3}
        />
        <rect
          x={level.exit.x + 5}
          y={level.exit.y + 5}
          width={level.exit.w - 10}
          height={level.exit.h - 5}
          fill="#061408"
          rx={2}
        />
        <rect
          x={level.exit.x}
          y={level.exit.y}
          width={level.exit.w}
          height={level.exit.h}
          fill="none"
          stroke="#3fb950"
          strokeWidth={6}
          rx={3}
          opacity={0.12}
        />
        <text
          x={level.exit.x + level.exit.w / 2}
          y={level.exit.y + 20}
          textAnchor="middle"
          fill="#3fb950"
          fontSize={9}
          fontFamily="JetBrains Mono"
          fontWeight="bold"
        >
          EXIT
        </text>
        <text
          x={level.exit.x + level.exit.w / 2}
          y={level.exit.y + 36}
          textAnchor="middle"
          fill={simState.botsExited >= level.exit.required ? "#3fb950" : "#8fd99f"}
          fontSize={14}
          fontFamily="JetBrains Mono"
          fontWeight="bold"
        >
          {simState.botsExited}/{level.exit.required}
        </text>
      </g>

      {simState.bots.map((bot) => (
        <BotSprite key={bot.id} bot={bot} onSelect={onSelectObject} />
      ))}

      {(() => {
        const rect = getSelectionRect(selection, level, simState);
        if (!rect) return null;
        return (
          <rect
            x={rect.x - 3}
            y={rect.y - 3}
            width={rect.w + 6}
            height={rect.h + 6}
            rx={4}
            fill="none"
            stroke="#58a6ff"
            strokeWidth={2}
            strokeDasharray="4 3"
            pointerEvents="none"
          >
            <animate attributeName="stroke-dashoffset" from="7" to="0" dur="0.5s" repeatCount="indefinite" />
          </rect>
        );
      })()}

      {isPaused && (
        <g pointerEvents="none">
          <rect width={level.width} height={level.height} fill="rgba(9,14,24,0.55)" />
          <rect
            x={level.width / 2 - 110}
            y={level.height / 2 - 30}
            width={220}
            height={62}
            rx={6}
            fill="#161b22"
            stroke="#30363d"
            strokeWidth={1}
          />
          <text
            x={level.width / 2}
            y={level.height / 2 - 5}
            textAnchor="middle"
            fill="#e6edf3"
            fontSize={20}
            fontFamily="JetBrains Mono"
            fontWeight="bold"
            letterSpacing={4}
          >
            PAUSED
          </text>
          <text
            x={level.width / 2}
            y={level.height / 2 + 18}
            textAnchor="middle"
            fill="#8b949e"
            fontSize={9}
            fontFamily="JetBrains Mono"
          >
            Edit code, then Compile &amp; Run to restart.
          </text>
        </g>
      )}
    </svg>
  );
}

function StatsPanel({
  simState,
  timeLeft,
  level,
}: {
  simState: SimState;
  timeLeft: number;
  level: LevelDef;
}) {
  const pct = (timeLeft / level.timeLimitSec) * 100;
  const timeColor = pct > 50 ? "#3fb950" : pct > 25 ? "#d29922" : "#f85149";

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-base font-mono text-[#484f58] uppercase tracking-widest mb-1">Objective</div>

      <StatRow label="Required at Exit" value={`${simState.botsExited} / ${level.exit.required}`} color="#3fb950" />
      <StatRow label="Bots Alive" value={String(simState.botsAlive)} color="#79c0ff" />
      <StatRow label="Bots Exited" value={String(simState.botsExited)} color="#56d364" />
      <StatRow label="Bots Lost" value={String(simState.botsDead)} color="#f85149" />

      <div className="mt-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-base font-mono text-[#484f58]">Time Remaining</span>
          <span className="text-base font-mono" style={{ color: timeColor }}>
            {timeLeft.toFixed(1)}s
          </span>
        </div>
        <div className="h-1 rounded-full bg-[#21262d] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${pct}%`, backgroundColor: timeColor }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-1">
        <span className="text-base font-mono text-[#484f58]">Tick</span>
        <span className="text-base font-mono text-[#8b949e]">#{simState.tick}</span>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-base font-mono text-[#8b949e]">{label}</span>
      <span className="text-base font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

function EventLog({ events }: { events: SimEvent[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [events.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="text-base font-mono text-[#484f58] uppercase tracking-widest px-3 pt-3 pb-1 shrink-0">
        Event Log
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-start gap-2 py-0.5">
            <span
              className="text-base font-mono w-3 shrink-0 mt-0.5"
              style={{ color: EVENT_COLORS[ev.type] }}
            >
              {EVENT_ICONS[ev.type]}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-base font-mono text-[#8b949e] mr-1.5">t={ev.tick}</span>
              <span className="text-base font-mono text-[#c9d1d9] break-all">{ev.message}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function Inspector({
  target,
  onClose,
}: {
  target: InspectorTarget;
  onClose: () => void;
}) {
  if (!target) return null;
  return (
    <div className="absolute inset-0 bg-[#161b22] z-10 flex flex-col">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[#30363d] shrink-0">
        <span className="text-base font-mono text-[#e6edf3] font-medium">{target.label}</span>
        <button
          onClick={onClose}
          className="text-[#8b949e] hover:text-[#e6edf3] text-xs font-mono transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {target.props.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-2">
            <span className="text-base font-mono text-[#8b949e]">{p.name}</span>
            <div className="flex items-center gap-1">
              {p.locked ? (
                <span className="text-base font-mono text-[#484f58] flex items-center gap-1">
                  <span className="text-sm">🔒</span>
                  <span>locked</span>
                </span>
              ) : (
                <>
                  <span className="text-base font-mono text-[#e6edf3]">{p.value}</span>
                  {p.readOnly && (
                    <span className="text-sm font-mono text-[#484f58] ml-1">r/o</span>
                  )}
                  {p.editable && (
                    <span className="text-sm font-mono text-[#3fb950] ml-1">✎ editable</span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeEditor({
  tab,
  code,
  locked,
  editable,
  hasError,
  onChange,
  onRequestEdit,
  onSwitchTab,
}: {
  tab: Tab;
  code: string;
  locked: boolean;
  editable: boolean;
  hasError: boolean;
  onChange: (v: string) => void;
  onRequestEdit: () => void;
  onSwitchTab: (direction: 1 | -1) => void;
}) {
  const lines = code.split("\n");
  // Armed by Ctrl/Cmd+X; consumed by the very next Left/Right arrow to hop
  // tabs, echoing Emacs' C-x <left>/<right> (next-buffer/previous-buffer).
  // We never preventDefault the X itself, so a genuine cut still works —
  // this only rides along on top of it.
  const bufferSwitchArmedRef = useRef(false);

  const handleTextareaKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
      bufferSwitchArmedRef.current = true;
      return;
    }
    if (bufferSwitchArmedRef.current) {
      bufferSwitchArmedRef.current = false;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        onSwitchTab(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
    }

    if (e.key === "Tab") {
      // Keep Tab local to the textarea (indent) instead of letting the
      // browser move focus to the next element.
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const indent = "  ";
      onChange(code.slice(0, start) + indent + code.slice(end));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + indent.length;
      });
    }
  };

  if (tab === "console") {
    return (
      <div className="flex-1 overflow-auto p-4 font-mono text-base text-[#8b949e] bg-[#0d1117]">
        <div className="text-[#58a6ff] mb-2">// Console output</div>
        {code ? code.split("\n").map((l, i) => (
          <div key={i} className={l.startsWith("✗") ? "text-[#f85149]" : l.startsWith("✓") ? "text-[#3fb950]" : "text-[#8b949e]"}>{l}</div>
        )) : <div className="text-[#484f58]">No output yet.</div>}
      </div>
    );
  }

  return (
    <div className={`flex flex-1 overflow-hidden relative text-base font-mono ${hasError ? "ring-1 ring-[#f85149] ring-inset" : ""}`}>
      <div className="select-none text-right text-[#484f58] bg-[#0d1117] px-3 pt-4 leading-6 shrink-0 min-w-[44px]">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      <div className="relative flex-1 overflow-auto">
        <pre className="absolute inset-0 p-4 leading-6 pointer-events-none whitespace-pre overflow-visible text-base font-mono">
          <HighlightedCode code={code} />
        </pre>

        {(locked || !editable) && (
          <div
            className={`absolute inset-0 ${!locked ? "cursor-pointer group" : ""}`}
            onClick={!locked ? onRequestEdit : undefined}
            title={!locked ? "Click to pause and edit" : undefined}
          >
            {!locked && (
              <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-[#21262d] px-2 py-1 rounded text-sm font-mono text-[#8b949e] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>❚❚</span> Click to pause &amp; edit
              </div>
            )}
          </div>
        )}

        {!locked && editable && (
          <textarea
            className="code-textarea absolute inset-0 w-full h-full p-4 leading-6 text-base font-mono"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
        )}

        {locked && (
          <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-[#21262d] px-2 py-1 rounded text-sm font-mono text-[#484f58]">
            <span>🔒</span> Read-only
          </div>
        )}
      </div>
    </div>
  );
}

function ApiReference({
  simState,
  level,
  timeLeft,
  selection,
}: {
  simState: SimState;
  level: LevelDef;
  timeLeft: number;
  selection: SelectionKey;
}) {
  const selectedBot = selection?.kind === "bot" ? simState.bots.find((b) => b.id === selection.id) : undefined;
  const bot = selectedBot ?? simState.bots[0];
  const botLabel = bot ? `Bot ${bot.id + 1}` : "no bots";

  const props = [
    { name: "bot.direction",     type: "string",  value: `"${bot?.direction ?? "right"}"`,            editable: true,
      desc: "Which way the bot walks: \"left\" or \"right\". Set it to steer." },
    { name: "bot.pause",         type: "boolean", value: "—",                                          editable: true,
      desc: "Set true to (re)start a pause of pauseTimer ticks, next tick onward. One-shot — always false when your update() starts, and reset again after every tick, so this never shows a \"live\" value." },
    { name: "bot.pauseTimer",    type: "number",  value: String(bot?.pauseTimer ?? 0),                editable: true,
      desc: "How many ticks the next pause=true will last. Persists until you change it." },
    { name: "bot.isPaused",      type: "boolean", value: String((bot?._curPauseTimer ?? 0) > 0),      readOnly: true,
      desc: "True while a pause you started is still counting down." },
    { name: "bot.isGrounded",    type: "boolean", value: String(bot?.grounded ?? false),               readOnly: true,
      desc: "True while standing on a platform." },
    { name: "bot.isTouchingWall",type: "boolean", value: String(bot?.touchingWall ?? false),           readOnly: true,
      desc: "True while pressed against a wall or the level edge." },
    { name: "bot.isTouchingButton", type: "boolean", value: String(bot?.touchingButton ?? false),      readOnly: true,
      desc: "True every tick the bot is on a button — stays true for as long as it's standing there." },
    { name: "bot.justTouchedButton", type: "boolean", value: String(bot?.justTouchedButton ?? false),  readOnly: true,
      desc: "True only on the tick contact begins. Good for a one-shot reaction; use isTouchingButton instead for \"hold this down for as long as I'm here\"." },
    { name: "bot.isAlive",       type: "boolean", value: String(bot?.status === "alive"),              readOnly: true,
      desc: "False once the bot has died (e.g. hit a hazard)." },
    { name: "bot.hasExited",     type: "boolean", value: String(bot?.status === "exited"),             readOnly: true,
      desc: "True once the bot has reached the exit and left the level." },
    { name: "shared.botsAtExit", type: "number",  value: String(simState.botsExited),                 readOnly: true,
      desc: "How many bots have already reached the exit this run." },
    { name: "shared.requiredExitCount", type: "number", value: String(level.exit.required),           readOnly: true,
      desc: "How many bots need to reach the exit to win." },
    { name: "shared.timeRemaining",     type: "number", value: timeLeft.toFixed(1),                   readOnly: true,
      desc: "Seconds left on the level's timer." },
    { name: "bot.jumpPower",     type: "number",  value: "—",                                         locked: true,
      desc: "Not implemented yet." },
    { name: "objects.bounce.power", type: "number", value: "—",                                       locked: true,
      desc: "Not implemented yet." },
  ];

  return (
    <div className="border-t border-[#30363d] bg-[#0d1117]">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-base font-mono text-[#484f58] uppercase tracking-widest">API Reference</span>
        <span className="text-sm font-mono text-[#484f58]">{botLabel} · live values</span>
      </div>
      <div className="overflow-y-auto max-h-44 pb-2">
        {props.map((p) => (
          <div
            key={p.name}
            title={p.desc}
            className="flex items-center gap-2 px-3 py-0.5 hover:bg-[#161b22] group cursor-help"
          >
            <span className="text-base font-mono text-[#d2a8ff] min-w-0 flex-1 truncate">{p.name}</span>
            <span className="text-sm font-mono text-[#484f58] shrink-0">{p.type}</span>
            {p.locked ? (
              <span className="text-sm font-mono text-[#484f58] shrink-0">🔒</span>
            ) : (
              <span className={`text-base font-mono shrink-0 ${p.editable ? "text-[#a5d6ff]" : "text-[#8b949e]"}`}>{p.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessScreen({
  simState,
  timeLeft,
  level,
  onReplay,
  onEditProgram,
  onNextLevel,
}: {
  simState: SimState;
  timeLeft: number;
  level: LevelDef;
  onReplay: () => void;
  onEditProgram: () => void;
  onNextLevel: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,14,24,0.88)] z-30">
      <div className="w-80 bg-[#161b22] border border-[#3fb950] rounded-xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-2xl mb-1">✓</div>
          <div className="text-lg font-bold text-[#3fb950] font-mono mb-1">Level Cleared!</div>
          <div className="text-xs text-[#8b949e] font-mono">{level.title}</div>
        </div>

        <div className="space-y-2 mb-5">
          <ResultRow label="Bots at exit" value={`${simState.botsExited}`} color="#3fb950" />
          <ResultRow label="Bots still active" value={`${simState.botsAlive}`} color="#79c0ff" />
          <ResultRow label="Bots lost" value={`${simState.botsDead}`} color={simState.botsDead > 0 ? "#f85149" : "#8b949e"} />
          <ResultRow label="Time remaining" value={`${timeLeft.toFixed(1)}s`} color="#d29922" />
          <ResultRow label="Final tick" value={`#${simState.tick}`} color="#8b949e" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onReplay}
            className="flex-1 py-2 text-xs font-mono font-medium bg-[#21262d] hover:bg-[#2d333b] text-[#e6edf3] rounded-lg transition-colors border border-[#30363d]"
          >
            Replay
          </button>
          <button
            onClick={onEditProgram}
            className="flex-1 py-2 text-xs font-mono font-medium bg-[#3fb950] hover:bg-[#4ac95e] text-[#0d1117] rounded-lg transition-colors font-bold"
          >
            Edit Program
          </button>
        </div>
        <button
          onClick={onNextLevel}
          className="w-full mt-2 py-2 text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
        >
          Next Level →
        </button>
      </div>
    </div>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#21262d]">
      <span className="text-xs font-mono text-[#8b949e]">{label}</span>
      <span className="text-xs font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

type FailureReason = "time" | "no-bots";

const FAILURE_COPY: Record<FailureReason, { heading: string; description: string }> = {
  time: {
    heading: "Time Expired",
    description: "The exit requirement was not reached.",
  },
  "no-bots": {
    heading: "No More Bots",
    description: "Every bot exited or was lost before reaching the exit requirement.",
  },
};

function FailureScreen({
  simState,
  level,
  reason,
  onEditProgram,
  onRestart,
}: {
  simState: SimState;
  level: LevelDef;
  reason: FailureReason;
  onEditProgram: () => void;
  onRestart: () => void;
}) {
  const copy = FAILURE_COPY[reason];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,14,24,0.88)] z-30">
      <div className="w-80 bg-[#161b22] border border-[#f85149] rounded-xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-2xl mb-1">✕</div>
          <div className="text-lg font-bold text-[#f85149] font-mono mb-1">{copy.heading}</div>
          <div className="text-xs text-[#8b949e] font-mono">{copy.description}</div>
        </div>

        <div className="space-y-2 mb-5">
          <ResultRow label="Bots exited" value={`${simState.botsExited} / ${level.exit.required}`} color="#f85149" />
          <ResultRow label="Bots remaining" value={`${simState.botsAlive}`} color="#79c0ff" />
          <ResultRow label="Bots lost" value={`${simState.botsDead}`} color="#8b949e" />
          <ResultRow label="Final tick" value={`#${simState.tick}`} color="#8b949e" />
        </div>

        <div className="bg-[#21262d] rounded-lg p-3 mb-4 text-xs font-mono text-[#8b949e]">
          Hint: Increase <span className="text-[#a5d6ff]">BOT_SPAWN_COUNT</span> to send more bots.
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRestart}
            className="flex-1 py-2 text-xs font-mono bg-[#21262d] hover:bg-[#2d333b] text-[#e6edf3] rounded-lg transition-colors border border-[#30363d]"
          >
            Restart
          </button>
          <button
            onClick={onEditProgram}
            className="flex-1 py-2 text-xs font-mono font-bold bg-[#f85149] hover:bg-[#ff6b6b] text-white rounded-lg transition-colors"
          >
            Edit Program
          </button>
        </div>
      </div>
    </div>
  );
}

function LevelSelect({
  manifest,
  currentLevelId,
  currentLevel,
  customLevels,
  activeCustomKey,
  onSelect,
  onSelectCustom,
  onImport,
  onRemoveCustom,
  onClose,
}: {
  manifest: LevelManifestEntry[];
  currentLevelId: string;
  currentLevel: LevelDef;
  customLevels: CustomLevelEntry[];
  activeCustomKey: string | null;
  onSelect: (id: string) => void;
  onSelectCustom: (key: string) => void;
  onImport: (level: LevelDef, label: string) => void;
  onRemoveCustom: (key: string) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteLabel, setPasteLabel] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileSelected = (e: ReactChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting the same file re-fires onChange
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const result: LevelParseResult = parseLevelJson(text, file.name);
      if (result.ok === false) {
        setImportError(result.error);
        return;
      }
      setImportError(null);
      onImport(result.level, file.name.replace(/\.json$/i, ""));
    };
    reader.onerror = () => setImportError(`Could not read "${file.name}".`);
    reader.readAsText(file);
  };

  const handleLoadPasted = () => {
    const label = pasteLabel.trim() || `Pasted level ${customLevels.length + 1}`;
    const result: LevelParseResult = parseLevelJson(pasteText, label);
    if (result.ok === false) {
      setImportError(result.error);
      return;
    }
    setImportError(null);
    onImport(result.level, label);
    setPasteText("");
    setPasteLabel("");
    setShowPastePanel(false);
  };

  const handleExportCurrent = () => {
    const blob = new Blob([JSON.stringify(currentLevel, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentLevelId || "level"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 bg-[#0d1117] z-40 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
        <div>
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-0.5">Botbound</div>
          <div className="text-lg font-bold text-[#e6edf3] font-mono">Select Level</div>
        </div>
        <button
          onClick={onClose}
          className="text-[#8b949e] hover:text-[#e6edf3] text-sm font-mono transition-colors px-3 py-1.5 border border-[#30363d] rounded-lg"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto space-y-8">
          <div>
            {customLevels.length > 0 && (
              <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-2">Catalog</div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {manifest.length === 0 && (
                <div className="text-center text-xs font-mono text-[#484f58] py-8">Loading levels…</div>
              )}
              {manifest.map((lv, i) => {
                const num = String(i + 1).padStart(2, "0");
                const isCurrent = !activeCustomKey && lv.id === currentLevelId;
                return (
                  <div
                    key={lv.id}
                    onClick={() => lv.unlocked && onSelect(lv.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      lv.unlocked
                        ? "border-[#30363d] bg-[#161b22] hover:border-[#58a6ff] hover:bg-[#1c2533] cursor-pointer"
                        : "border-[#21262d] bg-[#0f1419] cursor-not-allowed opacity-50"
                    } ${isCurrent ? "ring-1 ring-[#58a6ff]" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-bold shrink-0 ${
                      lv.cleared
                        ? "bg-[#0d2208] text-[#3fb950]"
                        : lv.unlocked
                        ? "bg-[#161b22] text-[#58a6ff] border border-[#30363d]"
                        : "bg-[#161b22] text-[#484f58]"
                    }`}>
                      {lv.cleared ? "✓" : num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-[#e6edf3] truncate">
                        {lv.unlocked ? lv.title : `Level ${num}`}
                      </div>
                      <div className="text-xs font-mono text-[#484f58] mt-0.5">
                        {isCurrent ? "Current" : lv.cleared ? "Cleared" : lv.unlocked ? "Available" : "🔒 Locked"}
                      </div>
                    </div>
                    {lv.unlocked && (
                      <div className="shrink-0 text-[#484f58] font-mono text-xs">→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest">Custom / Imported</div>
              <button
                onClick={handleExportCurrent}
                className="text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
                title="Download the currently loaded level as JSON"
              >
                ⬇ Export current
              </button>
            </div>

            {customLevels.length > 0 && (
              <div className="grid grid-cols-1 gap-3 mb-3">
                {customLevels.map((c) => {
                  const isCurrent = c.key === activeCustomKey;
                  return (
                    <div
                      key={c.key}
                      onClick={() => onSelectCustom(c.key)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? "ring-1 ring-[#58a6ff] border-[#30363d] bg-[#161b22]"
                          : "border-[#30363d] bg-[#161b22] hover:border-[#58a6ff] hover:bg-[#1c2533]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm shrink-0 bg-[#161b22] text-[#bc8cff] border border-[#30363d]">
                        📁
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono text-[#e6edf3] truncate">{c.label}</div>
                        <div className="text-xs font-mono text-[#484f58] mt-0.5">{isCurrent ? "Current" : "Imported"}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveCustom(c.key); }}
                        className="shrink-0 text-[#8b949e] hover:text-[#f85149] font-mono text-xs px-2 py-1 transition-colors"
                        title="Remove from this list"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] bg-[#161b22] hover:bg-[#1c2533] border border-[#30363d] rounded-lg transition-colors"
              >
                📁 Import from file…
              </button>
              <button
                onClick={() => setShowPastePanel((v) => !v)}
                className="flex-1 px-3 py-2 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] bg-[#161b22] hover:bg-[#1c2533] border border-[#30363d] rounded-lg transition-colors"
              >
                {showPastePanel ? "▾" : "▸"} Paste JSON…
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelected}
            />

            {showPastePanel && (
              <div className="mt-3 p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
                <input
                  type="text"
                  value={pasteLabel}
                  onChange={(e) => setPasteLabel(e.target.value)}
                  placeholder="Level name (optional)"
                  className="w-full px-2 py-1.5 text-xs font-mono bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#58a6ff]"
                />
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='{ "width": 640, "height": 375, "title": "My Level", ... }'
                  rows={8}
                  spellCheck={false}
                  className="w-full px-2 py-1.5 text-xs font-mono bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#58a6ff] resize-y"
                />
                <button
                  onClick={handleLoadPasted}
                  disabled={!pasteText.trim()}
                  className="px-3 py-1.5 text-xs font-mono bg-[#0d2208] text-[#3fb950] border border-[#238636] rounded-lg hover:bg-[#0f2a0a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Load level
                </button>
              </div>
            )}

            {importError && (
              <div className="mt-2 px-3 py-2 text-xs font-mono text-[#f85149] bg-[#2d0a0a] border border-[#f85149] rounded-lg whitespace-pre-wrap">
                {importError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompileOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,14,24,0.75)] z-20">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-8 py-6 text-center shadow-2xl">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono text-[#58a6ff]">Compiling shared bot program…</span>
        </div>
        <div className="text-xs font-mono text-[#484f58]">Parsing bot-program.js</div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0d1117] text-[#8b949e] font-mono text-sm">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
        Loading level…
      </div>
    </div>
  );
}

function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center bg-[#0d1117] text-[#e6edf3] font-mono text-sm px-6">
      <div className="text-center max-w-sm">
        <div className="text-2xl mb-2 text-[#f85149]">✕</div>
        <div className="text-[#f85149] mb-1">Failed to load level</div>
        <div className="text-xs text-[#8b949e] mb-4">{message}</div>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs bg-[#21262d] hover:bg-[#2d333b] border border-[#30363d] rounded-lg"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── Top-level: loads the level, then hands off to the game shell ───────────

// A user-imported level (file upload or pasted JSON). Persisted to
// localStorage (see below) so it survives a page refresh, not just kept
// in memory for the session.
interface CustomLevelEntry {
  key: string;
  label: string;
  level: LevelDef;
}

// ── Persistence: which level was active, and the custom levels themselves ──
//
// Reloading the page used to always restart at DEFAULT_LEVEL_ID. Custom
// levels can't be re-fetched (they didn't come from a file path), so they're
// stored as raw JSON text and re-validated through parseLevelJson on load —
// the same path any import goes through — rather than trusted blindly, in
// case storage is stale, hand-edited, or left over from an older version.

const STORAGE_KEY_CUSTOM_LEVELS = "botbound:customLevels";
const STORAGE_KEY_ACTIVE_SOURCE = "botbound:activeSource";

type ActiveSource = { type: "catalog"; levelId: string } | { type: "custom"; key: string };

function loadPersistedCustomLevels(): CustomLevelEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_LEVELS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const restored: CustomLevelEntry[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry.key !== "string" || typeof entry.label !== "string" || typeof entry.json !== "string") continue;
      const result = parseLevelJson(entry.json, entry.label);
      if (result.ok) restored.push({ key: entry.key, label: entry.label, level: result.level });
    }
    return restored;
  } catch {
    return [];
  }
}

function persistCustomLevels(levels: CustomLevelEntry[]) {
  try {
    const serializable = levels.map((c) => ({ key: c.key, label: c.label, json: JSON.stringify(c.level) }));
    localStorage.setItem(STORAGE_KEY_CUSTOM_LEVELS, JSON.stringify(serializable));
  } catch {
    // Storage full, disabled (private browsing), or unavailable — not
    // fatal, custom levels just won't survive a refresh this time.
  }
}

function loadPersistedActiveSource(): ActiveSource | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SOURCE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.type === "catalog" && typeof parsed.levelId === "string") return parsed;
    if (parsed?.type === "custom" && typeof parsed.key === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function persistActiveSource(source: ActiveSource) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_SOURCE, JSON.stringify(source));
  } catch {
    // ignore
  }
}

export default function App() {
  const [customLevels, setCustomLevels] = useState<CustomLevelEntry[]>(() => loadPersistedCustomLevels());
  const [initialSource] = useState(() => loadPersistedActiveSource());
  const [levelId, setLevelId] = useState(
    initialSource?.type === "catalog" ? initialSource.levelId : DEFAULT_LEVEL_ID
  );
  const [level, setLevel] = useState<LevelDef | null>(null);
  const [manifest, setManifest] = useState<LevelManifestEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [activeCustomKey, setActiveCustomKey] = useState<string | null>(
    initialSource?.type === "custom" ? initialSource.key : null
  );

  const activeCustom = customLevels.find((c) => c.key === activeCustomKey) ?? null;

  // Manifest failure isn't fatal — the level list overlay just stays empty.
  useEffect(() => {
    fetchLevelManifest().then(setManifest).catch(() => {});
  }, [retryToken]);

  useEffect(() => {
    let cancelled = false;
    setLevel(null);
    setLoadError(null);
    fetchLevel(levelId)
      .then((lvl) => { if (!cancelled) setLevel(lvl); })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [levelId, retryToken]);

  useEffect(() => {
    persistCustomLevels(customLevels);
  }, [customLevels]);

  useEffect(() => {
    persistActiveSource(
      activeCustomKey ? { type: "custom", key: activeCustomKey } : { type: "catalog", levelId }
    );
  }, [levelId, activeCustomKey]);

  const handleSelectCatalogLevel = (id: string) => {
    setActiveCustomKey(null);
    setLevelId(id);
  };

  const handleSelectCustomLevel = (key: string) => {
    setActiveCustomKey(key);
  };

  const handleImportLevel = (lvl: LevelDef, label: string) => {
    const key = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomLevels((prev) => [...prev, { key, label, level: lvl }]);
    setActiveCustomKey(key);
  };

  const handleRemoveCustomLevel = (key: string) => {
    setCustomLevels((prev) => prev.filter((c) => c.key !== key));
    setActiveCustomKey((prev) => (prev === key ? null : prev));
  };

  // A custom level is fully in-memory already — no fetch, no loading/error
  // states to wait through, unlike the catalog path below.
  if (!activeCustom) {
    if (loadError) {
      return (
        <div className="h-full flex flex-col bg-[#0d1117]">
          <div className="shrink-0 h-12 bg-[#161b22] border-b border-[#30363d] flex items-center px-3" />
          <LoadErrorScreen message={loadError} onRetry={() => setRetryToken((n) => n + 1)} />
        </div>
      );
    }
    if (!level) {
      return (
        <div className="h-full flex flex-col bg-[#0d1117]">
          <div className="shrink-0 h-12 bg-[#161b22] border-b border-[#30363d] flex items-center px-3" />
          <LoadingScreen />
        </div>
      );
    }
  }

  const effectiveLevel = activeCustom ? activeCustom.level : (level as LevelDef);
  const effectiveLevelId = activeCustom ? activeCustom.key : levelId;

  // Keying by the effective level id forces a clean remount of all game
  // state (sim, code editor, timers) whenever the player switches levels —
  // including switching between catalog and custom levels.
  return (
    <GameShell
      key={effectiveLevelId}
      level={effectiveLevel}
      levelId={effectiveLevelId}
      manifest={manifest}
      customLevels={customLevels}
      activeCustomKey={activeCustomKey}
      onSelectLevel={handleSelectCatalogLevel}
      onSelectCustomLevel={handleSelectCustomLevel}
      onImportLevel={handleImportLevel}
      onRemoveCustomLevel={handleRemoveCustomLevel}
    />
  );
}

function ToolbarBtn({
  label,
  title,
  disabled,
  active,
  onClick,
}: {
  label: string;
  title: string;
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2.5 py-1.5 text-base font-mono rounded-lg transition-colors ${
        disabled
          ? "text-[#484f58] cursor-not-allowed"
          : active
          ? "text-[#f85149] bg-[#2d0a0a] hover:bg-[#3d1010]"
          : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Game shell: everything that used to live directly in App() ─────────────

function GameShell({
  level,
  levelId,
  manifest,
  customLevels,
  activeCustomKey,
  onSelectLevel,
  onSelectCustomLevel,
  onImportLevel,
  onRemoveCustomLevel,
}: {
  level: LevelDef;
  levelId: string;
  manifest: LevelManifestEntry[];
  customLevels: CustomLevelEntry[];
  activeCustomKey: string | null;
  onSelectLevel: (id: string) => void;
  onSelectCustomLevel: (key: string) => void;
  onImportLevel: (level: LevelDef, label: string) => void;
  onRemoveCustomLevel: (key: string) => void;
}) {
  const [gameStatus, setGameStatus] = useState<GameStatus>("paused");
  const [simState, setSimState] = useState<SimState>(() => createSimState(level, 1));
  const [speed, setSpeed] = useState<Speed>(1);
  const [activeTab, setActiveTab] = useState<Tab>("bot-program");
  const [codeContents, setCodeContents] = useState<Record<Tab, string>>(() => buildFileContents(level));
  const [unsaved, setUnsaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSec);
  const [selection, setSelection] = useState<SelectionKey>(null);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<FailureReason>("time");

  const simRef = useRef(simState);
  const timeRef = useRef(timeLeft);
  const statusRef = useRef(gameStatus);
  const unsavedRef = useRef(unsaved);
  const selectionRef = useRef(selection);
  const showLevelSelectRef = useRef(showLevelSelect);
  const codePaneRef = useRef<HTMLDivElement>(null);
  // Holds the last successfully compiled program: the real update(bot,
  // shared) callback plus the BOT_SPAWN_COUNT it actually resolved to at
  // compile time. Set once per successful "Compile & Run", read every
  // tick — never re-parsed. Starts as a harmless no-op so the sim can
  // still be stepped/ticked (using each bot's spawn defaults) before the
  // player has compiled anything.
  const compiledProgramRef = useRef<{ update: BotUpdateFn; spawnCount: number }>({
    update: () => {},
    spawnCount: 1,
  });
  simRef.current = simState;
  timeRef.current = timeLeft;
  statusRef.current = gameStatus;
  unsavedRef.current = unsaved;
  selectionRef.current = selection;
  showLevelSelectRef.current = showLevelSelect;

  // Applies the state transitions that follow any tick — success, failure,
  // or a runtime error thrown by the bot's own program — shared by the
  // automatic tick loop, the manual Step button, and the 'f' keyboard
  // shortcut, so all three behave consistently. Only closes over `level`
  // (stable for this component's lifetime — see the keyboard effect below)
  // and stable state setters, so it's safe to call from either.
  const applyTickResult = (next: SimState, nextTime: number) => {
    if (next.runtimeError) {
      setSimState(next);
      setTimeLeft(nextTime);
      setGameStatus("error");
      setCodeContents((prev) => ({
        ...prev,
        console: `✗ ${next.runtimeError}\nReturn to editor and fix the issue.`,
      }));
      setActiveTab("console");
      return;
    }
    if (next.botsExited >= level.exit.required) {
      setSimState(next);
      setTimeLeft(nextTime);
      setGameStatus("success");
      return;
    }
    if (nextTime <= 0 || (next.botsAlive === 0 && next.botsExited < level.exit.required)) {
      // Ran out of bots before ran out of time takes priority as the more
      // specific/informative reason, even if both happen to hit on the
      // same tick. Keep the actual remaining time either way — it should
      // only ever read exactly 0 when time itself was the cause.
      const outOfBots = next.botsAlive === 0 && next.botsExited < level.exit.required;
      setSimState(next);
      setTimeLeft(nextTime);
      setFailureReason(outOfBots ? "no-bots" : "time");
      setGameStatus("failure");
      return;
    }
    setSimState(next);
    setTimeLeft(nextTime);
  };

  useEffect(() => {
    if (gameStatus !== "running") return;
    const tickMs = TICK_MS / speed;
    const id = setInterval(() => {
      if (statusRef.current !== "running") return;
      const next = tickSim(simRef.current, level, compiledProgramRef.current.update, timeRef.current);
      const nextTime = Math.max(0, timeRef.current - tickMs / 1000);
      applyTickResult(next, nextTime);
    }, tickMs);
    return () => clearInterval(id);
  }, [gameStatus, speed, level]);

  useEffect(() => {
    if (!flashMsg) return;
    const t = setTimeout(() => setFlashMsg(null), 3000);
    return () => clearTimeout(t);
  }, [flashMsg]);

  const handlePause = () => {
    if (gameStatus === "running") setGameStatus("paused");
  };

  const handleResume = () => {
    if (gameStatus === "paused" && !unsaved) setGameStatus("running");
  };

  const handleReset = () => {
    setSimState(createSimState(level, compiledProgramRef.current.spawnCount));
    setTimeLeft(level.timeLimitSec);
    setGameStatus("paused");
    setSelection(null);
    setFailureReason("time");
  };

  const handleStepTick = () => {
    if (gameStatus === "paused") {
      const next = tickSim(simRef.current, level, compiledProgramRef.current.update, timeRef.current);
      // Manual stepping doesn't consume the time budget — only the
      // automatic run loop does.
      applyTickResult(next, timeRef.current);
    }
  };

  const handleCompile = () => {
    const code = codeContents["bot-program"];
    setGameStatus("compiling");
    setActiveTab("console");

    setTimeout(() => {
      const result = compileBotProgram(code);
      if (result.ok === false) {
        const errorMessage = result.error;
        setGameStatus("error");
        setCodeContents((prev) => ({
          ...prev,
          console: `✗ ${errorMessage}\nReturn to editor and fix the issue.`,
        }));
        setActiveTab("console");
        return;
      }
      const count = Math.min(
        Math.max(1, Math.floor(Number(result.spawnCount) || 1)),
        level.maxSpawnCount
      );
      compiledProgramRef.current = { update: result.update, spawnCount: count };
      const newSim = createSimState(level, count);
      setSimState(newSim);
      setTimeLeft(level.timeLimitSec);
      setUnsaved(false);
      setSelection(null);
      setFailureReason("time");
      setGameStatus("running");
      setActiveTab("bot-program");
      setFlashMsg(`Level reset. Running new program. (${count} bot${count !== 1 ? "s" : ""} spawned)`);
      setCodeContents((prev) => ({
        ...prev,
        console: `✓ Compilation successful.\n${count} bot${count !== 1 ? "s" : ""} spawned.\nSimulation started at tick 0.`,
      }));
    }, 1200);
  };

  const handleCodeChange = (tab: Tab, value: string) => {
    setCodeContents((prev) => ({ ...prev, [tab]: value }));
    setUnsaved(true);
    if (gameStatus === "error") setGameStatus("paused");
  };

  const handleNextLevel = () => {
    const currentIndex = manifest.findIndex((m) => m.id === levelId);
    if (currentIndex >= 0 && currentIndex < manifest.length - 1) {
      onSelectLevel(manifest[currentIndex + 1].id);
    }
  };

  const handleSwitchTab = (direction: 1 | -1) => {
    const idx = TAB_ORDER.indexOf(activeTab);
    const next = TAB_ORDER[(idx + direction + TAB_ORDER.length) % TAB_ORDER.length];
    setActiveTab(next);
  };

  // handleCompile closes over codeContents/level and gets redefined every
  // render, so the keyboard-shortcut effect below (subscribed once) reads
  // it through this ref rather than capturing a stale copy directly.
  const handleCompileRef = useRef(handleCompile);
  handleCompileRef.current = handleCompile;

  // ─── Keyboard-driven mode ───────────────────────────────────────────────
  // Subscribed once; reads everything through refs (mirrored above) so it
  // never needs to re-subscribe on every re-render, including the frequent
  // ones that happen every tick while the sim is running.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inCodeEditor = !!codePaneRef.current?.contains(document.activeElement);

      // Cmd/Ctrl+S — compile & run, but only while focus is in the code panel.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        if (inCodeEditor) {
          e.preventDefault();
          handleCompileRef.current();
        }
        return;
      }

      // Everything below is "game window" territory — skip it while the
      // code editor has focus, or while the level-select overlay is open.
      if (inCodeEditor || showLevelSelectRef.current) return;

      const status = statusRef.current;

      // Space — toggle play/pause.
      if (e.code === "Space") {
        if (status === "running" || status === "paused") {
          e.preventDefault();
          if (status === "running") setGameStatus("paused");
          else if (!unsavedRef.current) setGameStatus("running");
        }
        return;
      }

      // f — single step tick, while paused.
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (status === "paused") {
          e.preventDefault();
          const next = tickSim(simRef.current, level, compiledProgramRef.current.update, timeRef.current);
          applyTickResult(next, timeRef.current);
        }
        return;
      }

      // e — jump into the editor (the only file that's ever editable is
      // bot-program), cursor at the top, while paused.
      if (e.key.toLowerCase() === "e" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (status === "paused") {
          e.preventDefault();
          setActiveTab("bot-program");
          requestAnimationFrame(() => {
            const ta = codePaneRef.current?.querySelector("textarea");
            if (ta) {
              ta.focus();
              ta.setSelectionRange(0, 0);
              ta.scrollTop = 0;
            }
          });
        }
        return;
      }

      // Tab / Shift+Tab — cycle Inspector selection over scene objects,
      // while paused.
      if (e.key === "Tab") {
        if (status === "paused") {
          e.preventDefault();
          const list = getSelectableObjects(level, simRef.current);
          if (list.length > 0) {
            const idx = list.findIndex((k) => sameSelection(k, selectionRef.current));
            const dir = e.shiftKey ? -1 : 1;
            const next = list[(((idx + dir) % list.length) + list.length) % list.length];
            setSelection(next);
          }
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // level is stable for the lifetime of this component (GameShell is
    // remounted via `key={levelId}` on level change), so it's safe to close
    // over directly here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = gameStatus === "running";
  const isPaused = gameStatus === "paused" || gameStatus === "error";
  const isCompiling = gameStatus === "compiling";
  const isLocked = LOCKED_TABS.includes(activeTab) || isRunning || isCompiling;
  const canResume = isPaused && !unsaved;
  const canCompile = isPaused && !isCompiling;

  const currentCode = activeTab === "console"
    ? codeContents["console"]
    : codeContents[activeTab];

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] font-sans select-none overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 h-12 bg-[#161b22] border-b border-[#30363d] flex items-center gap-1 px-3">
        <button
          onClick={() => setShowLevelSelect(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#21262d] transition-colors group"
        >
          <div className="text-xs font-mono font-semibold text-[#e6edf3]">
            {level.title}
          </div>
          <span className="text-[#484f58] text-xs group-hover:text-[#8b949e] transition-colors">▾</span>
        </button>

        <div className="w-px h-6 bg-[#30363d] mx-1" />

        <StatusBadge status={gameStatus} />

        {flashMsg && (
          <div className="text-xs font-mono text-[#3fb950] bg-[#0d2208] px-2.5 py-1 rounded-md max-w-xs truncate">
            {flashMsg}
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <ToolbarBtn
            label="❚❚"
            title="Pause"
            disabled={!isRunning}
            active={isRunning}
            onClick={handlePause}
          />
          <ToolbarBtn
            label="▶"
            title="Resume"
            disabled={!canResume}
            onClick={handleResume}
          />
          <ToolbarBtn
            label="▶|"
            title="Step One Tick"
            disabled={!isPaused || isCompiling}
            onClick={handleStepTick}
          />
        </div>

        <div className="w-px h-6 bg-[#30363d] mx-1" />

        <div className="flex items-center gap-0.5">
          {([1, 2, 4, 8] as Speed[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-1 text-base font-mono rounded transition-colors ${
                speed === s
                  ? "bg-[#58a6ff] text-[#0d1117] font-bold"
                  : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-[#30363d] mx-1" />

        <button
          onClick={handleCompile}
          disabled={!canCompile}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
            canCompile && unsaved
              ? "bg-[#58a6ff] hover:bg-[#79c0ff] text-[#0d1117] shadow-lg shadow-[#58a6ff]/20"
              : canCompile
              ? "bg-[#21262d] hover:bg-[#2d333b] text-[#e6edf3] border border-[#30363d]"
              : "bg-[#161b22] text-[#484f58] cursor-not-allowed"
          }`}
        >
          <span>{isCompiling ? "●" : "⬥"}</span>
          Compile &amp; Run
        </button>

        <button
          onClick={handleReset}
          className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors"
          title="Reset Level"
        >
          ↺
        </button>

        {/* <button className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors" title="Submit Solution">
          ✓ Submit
        </button>

        <div className="w-px h-6 bg-[#30363d] mx-1" />

        <button className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors">?</button>
        <button className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors">⚙</button> */}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left: Game Panel ── */}
        <div className="flex flex-col w-[65%] border-r border-[#30363d] relative overflow-hidden">

          {unsaved && isPaused && (
            <div className="shrink-0 bg-[#2d1f0a] border-b border-[#d29922]/40 px-4 py-1.5 flex items-center justify-between">
              <span className="text-xs font-mono text-[#d29922]">● Unsaved changes — compile to apply</span>
              <span className="text-base font-mono text-[#8b949e]">Resume disabled until compiled</span>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            <GameCanvas
              simState={simState}
              level={level}
              gameStatus={gameStatus}
              selection={selection}
              onSelectObject={setSelection}
            />
            {isCompiling && <CompileOverlay />}
            {gameStatus === "success" && (
              <SuccessScreen
                simState={simState}
                timeLeft={timeLeft}
                level={level}
                onReplay={handleReset}
                onEditProgram={() => {
                  handleReset();
                  setActiveTab("bot-program");
                }}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameStatus === "failure" && (
              <FailureScreen
                simState={simState}
                level={level}
                reason={failureReason}
                onEditProgram={() => {
                  handleReset();
                  setActiveTab("bot-program");
                }}
                onRestart={handleReset}
              />
            )}
          </div>

          <div className="shrink-0 h-64 flex border-t border-[#30363d] overflow-hidden">
            <div className="w-44 shrink-0 border-r border-[#30363d] overflow-y-auto">
              <StatsPanel simState={simState} timeLeft={timeLeft} level={level} />
            </div>

            <div className="flex-1 relative overflow-hidden">
              <EventLog events={simState.events} />
              {(() => {
                const inspectorTarget = buildInspectorTarget(selection, level, simState);
                return inspectorTarget && (
                  <Inspector target={inspectorTarget} onClose={() => setSelection(null)} />
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Right: Code Panel ── */}
        <div className="flex flex-col flex-1 overflow-hidden" ref={codePaneRef}>

          <div className="shrink-0 flex bg-[#161b22] border-b border-[#30363d] overflow-x-auto">
            {TAB_ORDER.map((tab) => {
              const isLocked = LOCKED_TABS.includes(tab);
              const isActive = activeTab === tab;
              const isDirty = tab === "bot-program" && unsaved;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-base font-mono whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                    isActive
                      ? "border-[#58a6ff] text-[#e6edf3] bg-[#0d1117]"
                      : "border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#1c2128]"
                  }`}
                >
                  {isLocked && <span className="text-sm text-[#484f58]">🔒</span>}
                  {TAB_LABELS[tab]}
                  {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#d29922] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 overflow-hidden bg-[#0d1117]">
            {gameStatus === "error" && activeTab === "bot-program" && (
              <div className="absolute left-0 right-0 z-10 mx-4 mt-2 bg-[#2d0a0a] border border-[#f85149]/60 rounded-lg px-3 py-2 text-xs font-mono text-[#f85149] flex items-center gap-2">
                <span>✕</span>
                <span>Syntax error — check your braces. Return to editor and fix.</span>
              </div>
            )}
            <CodeEditor
              tab={activeTab}
              code={activeTab === "console" ? codeContents["console"] : codeContents[activeTab]}
              locked={LOCKED_TABS.includes(activeTab)}
              editable={isPaused && !LOCKED_TABS.includes(activeTab) && activeTab !== "console"}
              hasError={gameStatus === "error" && activeTab === "bot-program"}
              onChange={(v) => handleCodeChange(activeTab, v)}
              onRequestEdit={handlePause}
              onSwitchTab={handleSwitchTab}
            />
          </div>

          <ApiReference simState={simState} level={level} timeLeft={timeLeft} selection={selection} />

          <div className="shrink-0 h-7 flex items-center justify-between px-4 bg-[#161b22] border-t border-[#30363d]">
            <span className="text-base font-mono text-[#484f58]">
              One program runs for every active bot.
            </span>
            <div className="flex items-center gap-3">
              {unsaved && (
                <span className="text-base font-mono text-[#d29922]">● unsaved</span>
              )}
              <span className="text-base font-mono text-[#484f58]">
                {activeTab === "bot-program" ? "JavaScript" : "Read-only"}
              </span>
            </div>
          </div>
        </div>

        {showLevelSelect && (
          <LevelSelect
            manifest={manifest}
            currentLevelId={levelId}
            currentLevel={level}
            customLevels={customLevels}
            activeCustomKey={activeCustomKey}
            onSelect={(id) => {
              onSelectLevel(id);
              setShowLevelSelect(false);
            }}
            onSelectCustom={(key) => {
              onSelectCustomLevel(key);
              setShowLevelSelect(false);
            }}
            onImport={(lvl, label) => {
              onImportLevel(lvl, label);
              setShowLevelSelect(false);
            }}
            onRemoveCustom={onRemoveCustomLevel}
            onClose={() => setShowLevelSelect(false)}
          />
        )}
      </div>
    </div>
  );
}