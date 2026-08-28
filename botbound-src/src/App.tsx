import { useState, useEffect, useRef, useCallback } from "react";
import {
  createSimState,
  tickSim,
  checkSyntax,
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
} from "./game";
import {
  fetchLevel,
  fetchLevelManifest,
  generateLevelConfigCode,
  generateSharedStateCode,
  generateObjectsCode,
} from "./levels";
import type { LevelManifestEntry } from "./levels";

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

const EVENT_ICONS: Record<EventType, string> = {
  exit: "→",
  hazard: "✕",
  turn: "↩",
  bounce: "↑",
  button: "◉",
  info: "·",
};

const EVENT_COLORS: Record<EventType, string> = {
  exit: "#3fb950",
  hazard: "#f85149",
  turn: "#8b949e",
  bounce: "#bc8cff",
  button: "#d29922",
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

type InspectorProp = { name: string; value: string; locked?: boolean; readOnly?: boolean };
type InspectorTarget = { label: string; props: InspectorProp[] } | null;

function botInspector(bot: BotState): InspectorTarget {
  return {
    label: `Bot ${bot.id + 1}`,
    props: [
      { name: "status",      value: bot.status,                readOnly: true },
      { name: "direction",   value: bot.direction,             readOnly: true },
      { name: "grounded",    value: bot.grounded ? "yes" : "no", readOnly: true },
      { name: "touchingWall",value: bot.touchingWall ? "yes" : "no", readOnly: true },
      { name: "touchingBtn", value: bot.touchingButton ? "yes" : "no", readOnly: true },
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

function BotSprite({ bot, onSelect }: { bot: BotState; onSelect: (t: InspectorTarget) => void }) {
  const handleClick = useCallback(() => onSelect(botInspector(bot)), [bot, onSelect]);

  if (bot.status === "dead") {
    return (
      <g opacity={0.35} onClick={handleClick} style={{ cursor: "pointer" }}>
        <rect x={bot.x} y={bot.y} width={BOT_W} height={BOT_H} fill={bot.color} rx={2} />
        <line x1={bot.x + 2} y1={bot.y + 2} x2={bot.x + BOT_W - 2} y2={bot.y + BOT_H - 2} stroke="#f85149" strokeWidth={1.5} />
        <line x1={bot.x + BOT_W - 2} y1={bot.y + 2} x2={bot.x + 2} y2={bot.y + BOT_H - 2} stroke="#f85149" strokeWidth={1.5} />
      </g>
    );
  }
  if (bot.status === "exited") return null;

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
      <text x={bot.x + BOT_W / 2} y={bot.y - 3} textAnchor="middle" fill={bot.color} fontSize={7} fontFamily="JetBrains Mono">{bot.id + 1}</text>
    </g>
  );
}

function GameCanvas({
  simState,
  level,
  gameStatus,
  onSelectObject,
}: {
  simState: SimState;
  level: LevelDef;
  gameStatus: GameStatus;
  onSelectObject: (t: InspectorTarget) => void;
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
            onClick={() => onSelectObject(platformInspector(plat.id))}
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
          <g key={h.id}>
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

      <g
        onClick={() => onSelectObject(buttonInspector(simState.buttonActivated))}
        style={{ cursor: "pointer" }}
      >
        <rect
          x={level.button.x}
          y={level.button.y}
          width={level.button.w}
          height={level.button.h}
          fill={simState.buttonActivated ? "#0d3320" : "#2d200a"}
          rx={3}
        />
        <circle
          cx={level.button.x + level.button.w / 2}
          cy={level.button.y + 4}
          r={5}
          fill={simState.buttonActivated ? "#3fb950" : "#d29922"}
        />
        <text
          x={level.button.x + level.button.w / 2}
          y={level.button.y - 5}
          textAnchor="middle"
          fill={simState.buttonActivated ? "#3fb950" : "#d29922"}
          fontSize={7}
          fontFamily="JetBrains Mono"
        >
          BTN
        </text>
      </g>

      <g
        onClick={() => onSelectObject(exitInspector(level.exit.required, simState.botsExited))}
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
          fill="#3fb950"
          fontSize={14}
          fontFamily="JetBrains Mono"
          fontWeight="bold"
        >
          ×{level.exit.required}
        </text>
      </g>

      {simState.bots.map((bot) => (
        <BotSprite key={bot.id} bot={bot} onSelect={onSelectObject} />
      ))}

      {isPaused && (
        <g>
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
      <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-widest mb-1">Objective</div>

      <StatRow label="Required at Exit" value={`${simState.botsExited} / ${level.exit.required}`} color="#3fb950" />
      <StatRow label="Bots Alive" value={String(simState.botsAlive)} color="#79c0ff" />
      <StatRow label="Bots Exited" value={String(simState.botsExited)} color="#56d364" />
      <StatRow label="Bots Lost" value={String(simState.botsDead)} color="#f85149" />

      <div className="mt-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-mono text-[#484f58]">Time Remaining</span>
          <span className="text-[11px] font-mono" style={{ color: timeColor }}>
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
        <span className="text-[10px] font-mono text-[#484f58]">Tick</span>
        <span className="text-[11px] font-mono text-[#8b949e]">#{simState.tick}</span>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-[#8b949e]">{label}</span>
      <span className="text-[11px] font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

function EventLog({ events }: { events: SimEvent[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [events.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-widest px-3 pt-3 pb-1 shrink-0">
        Event Log
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-start gap-2 py-0.5">
            <span
              className="text-[11px] font-mono w-3 shrink-0 mt-0.5"
              style={{ color: EVENT_COLORS[ev.type] }}
            >
              {EVENT_ICONS[ev.type]}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono text-[#8b949e] mr-1.5">t={ev.tick}</span>
              <span className="text-[10px] font-mono text-[#c9d1d9] break-all">{ev.message}</span>
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
        <span className="text-[11px] font-mono text-[#e6edf3] font-medium">{target.label}</span>
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
            <span className="text-[10px] font-mono text-[#8b949e]">{p.name}</span>
            <div className="flex items-center gap-1">
              {p.locked ? (
                <span className="text-[10px] font-mono text-[#484f58] flex items-center gap-1">
                  <span className="text-[9px]">🔒</span>
                  <span>locked</span>
                </span>
              ) : (
                <>
                  <span className="text-[10px] font-mono text-[#e6edf3]">{p.value}</span>
                  {p.readOnly && (
                    <span className="text-[9px] font-mono text-[#484f58] ml-1">r/o</span>
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
}: {
  tab: Tab;
  code: string;
  locked: boolean;
  editable: boolean;
  hasError: boolean;
  onChange: (v: string) => void;
}) {
  const lines = code.split("\n");

  if (tab === "console") {
    return (
      <div className="flex-1 overflow-auto p-4 font-mono text-[12px] text-[#8b949e] bg-[#0d1117]">
        <div className="text-[#58a6ff] mb-2">// Console output</div>
        {code ? code.split("\n").map((l, i) => (
          <div key={i} className={l.startsWith("✗") ? "text-[#f85149]" : l.startsWith("✓") ? "text-[#3fb950]" : "text-[#8b949e]"}>{l}</div>
        )) : <div className="text-[#484f58]">No output yet.</div>}
      </div>
    );
  }

  return (
    <div className={`flex flex-1 overflow-hidden relative text-[12px] font-mono ${hasError ? "ring-1 ring-[#f85149] ring-inset" : ""}`}>
      <div className="select-none text-right text-[#484f58] bg-[#0d1117] px-3 pt-4 leading-6 shrink-0 min-w-[44px]">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      <div className="relative flex-1 overflow-auto">
        <pre className="absolute inset-0 p-4 leading-6 pointer-events-none whitespace-pre overflow-visible text-[12px] font-mono">
          <HighlightedCode code={code} />
        </pre>

        {(locked || !editable) && (
          <div className="absolute inset-0" />
        )}

        {!locked && editable && (
          <textarea
            className="code-textarea absolute inset-0 w-full h-full p-4 leading-6 text-[12px] font-mono"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        )}

        {locked && (
          <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-[#21262d] px-2 py-1 rounded text-[9px] font-mono text-[#484f58]">
            <span>🔒</span> Read-only
          </div>
        )}
      </div>
    </div>
  );
}

function ApiReference({ simState, level }: { simState: SimState; level: LevelDef }) {
  const bot = simState.bots[0];
  const props = [
    { name: "bot.direction",     type: "string",  value: `"${bot?.direction ?? "right"}"`,            editable: true },
    { name: "bot.isGrounded",    type: "boolean", value: String(bot?.grounded ?? false),               readOnly: true },
    { name: "bot.isTouchingWall",type: "boolean", value: String(bot?.touchingWall ?? false),           readOnly: true },
    { name: "bot.isTouchingButton", type: "boolean", value: String(bot?.touchingButton ?? false),      readOnly: true },
    { name: "bot.isAlive",       type: "boolean", value: String(bot?.status === "alive"),              readOnly: true },
    { name: "bot.hasExited",     type: "boolean", value: String(bot?.status === "exited"),             readOnly: true },
    { name: "shared.botsAtExit", type: "number",  value: String(simState.botsExited),                 readOnly: true },
    { name: "shared.requiredExitCount", type: "number", value: String(level.exit.required),           readOnly: true },
    { name: "shared.timeRemaining",     type: "number", value: "—",                                   readOnly: true },
    { name: "bot.jumpPower",     type: "number",  value: "—",                                         locked: true },
    { name: "objects.bounce.power", type: "number", value: "—",                                       locked: true },
  ];

  return (
    <div className="border-t border-[#30363d] bg-[#0d1117]">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#484f58] uppercase tracking-widest">API Reference</span>
        <span className="text-[9px] font-mono text-[#484f58]">live values</span>
      </div>
      <div className="overflow-y-auto max-h-44 pb-2">
        {props.map((p) => (
          <div key={p.name} className="flex items-center gap-2 px-3 py-0.5 hover:bg-[#161b22] group">
            <span className="text-[11px] font-mono text-[#d2a8ff] min-w-0 flex-1 truncate">{p.name}</span>
            <span className="text-[9px] font-mono text-[#484f58] shrink-0">{p.type}</span>
            {p.locked ? (
              <span className="text-[9px] font-mono text-[#484f58] shrink-0">🔒</span>
            ) : (
              <span className={`text-[10px] font-mono shrink-0 ${p.editable ? "text-[#a5d6ff]" : "text-[#8b949e]"}`}>{p.value}</span>
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
}: {
  simState: SimState;
  timeLeft: number;
  level: LevelDef;
  onReplay: () => void;
  onEditProgram: () => void;
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
        <button className="w-full mt-2 py-2 text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors">
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

function FailureScreen({
  simState,
  level,
  onEditProgram,
  onRestart,
}: {
  simState: SimState;
  level: LevelDef;
  onEditProgram: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,14,24,0.88)] z-30">
      <div className="w-80 bg-[#161b22] border border-[#f85149] rounded-xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-2xl mb-1">✕</div>
          <div className="text-lg font-bold text-[#f85149] font-mono mb-1">Time Expired</div>
          <div className="text-xs text-[#8b949e] font-mono">The exit requirement was not reached.</div>
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
  onSelect,
  onClose,
}: {
  manifest: LevelManifestEntry[];
  currentLevelId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
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
        <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
          {manifest.length === 0 && (
            <div className="text-center text-xs font-mono text-[#484f58] py-8">Loading levels…</div>
          )}
          {manifest.map((lv, i) => {
            const num = String(i + 1).padStart(2, "0");
            const isCurrent = lv.id === currentLevelId;
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

export default function App() {
  const [levelId, setLevelId] = useState(DEFAULT_LEVEL_ID);
  const [level, setLevel] = useState<LevelDef | null>(null);
  const [manifest, setManifest] = useState<LevelManifestEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

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

  if (loadError) {
    return <LoadErrorScreen message={loadError} onRetry={() => setRetryToken((n) => n + 1)} />;
  }
  if (!level) {
    return <LoadingScreen />;
  }

  // Keying by levelId forces a clean remount of all game state
  // (sim, code editor, timers) whenever the player switches levels.
  return (
    <GameShell
      key={levelId}
      level={level}
      levelId={levelId}
      manifest={manifest}
      onSelectLevel={setLevelId}
    />
  );
}

// ─── Game shell: everything that used to live directly in App() ─────────────

function GameShell({
  level,
  levelId,
  manifest,
  onSelectLevel,
}: {
  level: LevelDef;
  levelId: string;
  manifest: LevelManifestEntry[];
  onSelectLevel: (id: string) => void;
}) {
  const [gameStatus, setGameStatus] = useState<GameStatus>("paused");
  const [simState, setSimState] = useState<SimState>(() => createSimState(level, 1));
  const [speed, setSpeed] = useState<Speed>(1);
  const [activeTab, setActiveTab] = useState<Tab>("bot-program");
  const [codeContents, setCodeContents] = useState<Record<Tab, string>>(() => buildFileContents(level));
  const [unsaved, setUnsaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSec);
  const [inspector, setInspector] = useState<InspectorTarget>(null);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const simRef = useRef(simState);
  const timeRef = useRef(timeLeft);
  const statusRef = useRef(gameStatus);
  simRef.current = simState;
  timeRef.current = timeLeft;
  statusRef.current = gameStatus;

  useEffect(() => {
    if (gameStatus !== "running") return;
    const tickMs = TICK_MS / speed;
    const id = setInterval(() => {
      if (statusRef.current !== "running") return;
      const next = tickSim(simRef.current, level);
      const nextTime = Math.max(0, timeRef.current - tickMs / 1000);

      if (next.botsExited >= level.exit.required) {
        setSimState(next);
        setTimeLeft(nextTime);
        setGameStatus("success");
        return;
      }
      if (nextTime <= 0 || (next.botsAlive === 0 && next.botsExited < level.exit.required)) {
        setSimState(next);
        setTimeLeft(0);
        setGameStatus("failure");
        return;
      }
      setSimState(next);
      setTimeLeft(nextTime);
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
    const match = codeContents["bot-program"].match(/BOT_SPAWN_COUNT\s*=\s*(\d+)/);
    const count = match ? parseInt(match[1]) : 1;
    setSimState(createSimState(level, count));
    setTimeLeft(level.timeLimitSec);
    setGameStatus("paused");
    setInspector(null);
  };

  const handleStepTick = () => {
    if (gameStatus === "paused") {
      setSimState((prev) => tickSim(prev, level));
    }
  };

  const handleCompile = () => {
    const code = codeContents["bot-program"];
    setGameStatus("compiling");
    setActiveTab("console");

    setTimeout(() => {
      const err = checkSyntax(code);
      if (err) {
        setGameStatus("error");
        setCodeContents((prev) => ({
          ...prev,
          console: `✗ ${err}\nReturn to editor and fix the issue.`,
        }));
        setActiveTab("console");
        return;
      }
      const match = code.match(/BOT_SPAWN_COUNT\s*=\s*(\d+)/);
      const count = Math.min(match ? parseInt(match[1]) : 1, level.maxSpawnCount);
      const newSim = createSimState(level, count);
      setSimState(newSim);
      setTimeLeft(level.timeLimitSec);
      setUnsaved(false);
      setInspector(null);
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
              className={`px-1.5 py-1 text-[10px] font-mono rounded transition-colors ${
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

        <button className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors" title="Submit Solution">
          ✓ Submit
        </button>

        <div className="w-px h-6 bg-[#30363d] mx-1" />

        <button className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors">?</button>
        <button className="px-2.5 py-1.5 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors">⚙</button>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left: Game Panel ── */}
        <div className="flex flex-col w-[56%] border-r border-[#30363d] relative overflow-hidden">

          {unsaved && isPaused && (
            <div className="shrink-0 bg-[#2d1f0a] border-b border-[#d29922]/40 px-4 py-1.5 flex items-center justify-between">
              <span className="text-xs font-mono text-[#d29922]">● Unsaved changes — compile to apply</span>
              <span className="text-[10px] font-mono text-[#8b949e]">Resume disabled until compiled</span>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            <GameCanvas
              simState={simState}
              level={level}
              gameStatus={gameStatus}
              onSelectObject={setInspector}
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
              />
            )}
            {gameStatus === "failure" && (
              <FailureScreen
                simState={simState}
                level={level}
                onEditProgram={() => {
                  handleReset();
                  setActiveTab("bot-program");
                }}
                onRestart={handleReset}
              />
            )}
          </div>

          <div className="shrink-0 h-44 flex border-t border-[#30363d] overflow-hidden">
            <div className="w-44 shrink-0 border-r border-[#30363d] overflow-y-auto">
              <StatsPanel simState={simState} timeLeft={timeLeft} level={level} />
            </div>

            <div className="flex-1 relative overflow-hidden">
              <EventLog events={simState.events} />
              {inspector && (
                <Inspector target={inspector} onClose={() => setInspector(null)} />
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Code Panel ── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          <div className="shrink-0 flex bg-[#161b22] border-b border-[#30363d] overflow-x-auto">
            {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
              const isLocked = LOCKED_TABS.includes(tab);
              const isActive = activeTab === tab;
              const isDirty = tab === "bot-program" && unsaved;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                    isActive
                      ? "border-[#58a6ff] text-[#e6edf3] bg-[#0d1117]"
                      : "border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#1c2128]"
                  }`}
                >
                  {isLocked && <span className="text-[9px] text-[#484f58]">🔒</span>}
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
            />
          </div>

          <ApiReference simState={simState} level={level} />

          <div className="shrink-0 h-7 flex items-center justify-between px-4 bg-[#161b22] border-t border-[#30363d]">
            <span className="text-[10px] font-mono text-[#484f58]">
              One program runs for every active bot.
            </span>
            <div className="flex items-center gap-3">
              {unsaved && (
                <span className="text-[10px] font-mono text-[#d29922]">● unsaved</span>
              )}
              <span className="text-[10px] font-mono text-[#484f58]">
                {activeTab === "bot-program" ? "JavaScript" : "Read-only"}
              </span>
            </div>
          </div>
        </div>

        {showLevelSelect && (
          <LevelSelect
            manifest={manifest}
            currentLevelId={levelId}
            onSelect={(id) => {
              onSelectLevel(id);
              setShowLevelSelect(false);
            }}
            onClose={() => setShowLevelSelect(false)}
          />
        )}
      </div>
    </div>
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
      className={`px-2.5 py-1.5 text-[11px] font-mono rounded-lg transition-colors ${
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