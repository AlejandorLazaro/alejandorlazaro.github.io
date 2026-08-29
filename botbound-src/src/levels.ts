import type { LevelDef } from "./game";

const LEVELS_BASE = "/assets/botbound_levels/";

export interface LevelManifestEntry {
  id: string;
  title: string;
  unlocked: boolean;
  cleared: boolean;
}

export async function fetchLevelManifest(): Promise<LevelManifestEntry[]> {
  const res = await fetch(`${LEVELS_BASE}index.json`);
  if (!res.ok) throw new Error(`Failed to load level manifest (${res.status})`);
  return res.json();
}

export async function fetchLevel(id: string): Promise<LevelDef> {
  const res = await fetch(`${LEVELS_BASE}${id}.json`);
  if (!res.ok) throw new Error(`Failed to load level "${id}" (${res.status})`);
  return validateLevelDef(await res.json(), id);
}

// JSON isn't type-checked at compile time, so validate the shape at the boundary.
// This is also where per-field *defaults* actually get applied — declaring a
// field optional in the TS interface only widens what's legal to omit, it
// doesn't supply a value. That has to happen here, at runtime, before the
// data is handed back as a trusted LevelDef.
function validateLevelDef(data: any, id: string): LevelDef {
  const required = [
    "width", "height", "title", "timeLimitSec", "maxSpawnCount",
    "spawns", "platforms", "hazards", "buttons", "exit",
  ];
  for (const key of required) {
    if (!(key in data)) throw new Error(`Level "${id}" is missing "${key}"`);
  }

  // Exit door: requiredActivations defaults to 0 ("always open, no button
  // needed") unless the level JSON overrides it. id is not level-authored
  // data at all — it's always the literal "exit-door" — so it's forced
  // last rather than left for the JSON to (mis)supply.
  const exit = {
    requiredActivations: 0,
    ...data.exit,
    id: "exit-door" as const,
  };

  // Buttons: requireHold defaults to false ("stays active once pressed")
  // unless a given button overrides it.
  const buttons = (data.buttons ?? []).map((b: any) => ({
    requireHold: false,
    ...b,
  }));

  return { ...data, exit, buttons } as LevelDef;
}

// ── Derive the read-only editor tabs from the same data the engine uses ──

export function generateLevelConfigCode(level: LevelDef): string {
  return `// ${level.title}
// ⚠ Read-only: level configuration

const LEVEL = {
  name: ${JSON.stringify(level.title)},
  exitRequired: ${level.exit.required},
  timeLimit: ${level.timeLimitSec},
  spawnPoint: { x: ${level.spawns[0].x}, y: ${level.spawns[0].y} },
};`;
}

export function generateSharedStateCode(level: LevelDef): string {
  return `// Shared state — visible to all bots
// ⚠ Read-only in this context

const shared = {
  botsAtExit: 0,
  requiredExitCount: ${level.exit.required},
  timeRemaining: ${level.timeLimitSec.toFixed(1)},
  activeButtonIds: [],
};`;
}

export function generateObjectsCode(level: LevelDef): string {
  const platforms = level.platforms
    .map((p) =>
      p.type === "bounce"
        ? `    { id: ${JSON.stringify(p.id)}, type: "bounce", power: ${p.bouncePower ?? 0} }, // 🔒 Locked`
        : `    { id: ${JSON.stringify(p.id)}, type: "solid" },`
    )
    .join("\n");
  const hazards = level.hazards
    .map((h) => `{ id: ${JSON.stringify(h.id)}, type: "hazard" }`)
    .join(", ");
  const buttons = level.buttons
    .map((b) => `{ id: ${JSON.stringify(b.id)}, activated: false }`)
    .join(", ");

  return `// Game object registry
// ⚠ Read-only engine data

const objects = {
  platforms: [
${platforms}
  ],
  hazards:  [${hazards}],
  buttons:  [${buttons}],
  exit:     { required: ${level.exit.required}, count: 0 },
};`;
}