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
  const text = await res.text();
  const result = parseLevelJson(text, id);
  if (result.ok === false) throw new Error(result.error);
  return result.level;
}

export type LevelParseResult =
  | { ok: true; level: LevelDef }
  | { ok: false; error: string };

// The single entry point for turning raw JSON text into a trusted LevelDef —
// used both for the built-in catalog (via fetchLevel above) and for
// user-imported levels (file upload / pasted JSON in the Level Select
// overlay). Catalog files are presumably already correct; imported ones are
// arbitrary user input and much more likely to have real mistakes, so the
// checks here are deliberately more thorough than "do the required keys
// exist" — wrong types and empty arrays are exactly the kind of thing a
// hand-edited level file gets wrong, and a specific error message (which
// field, what was found) is what actually makes debugging one easy.
export function parseLevelJson(jsonText: string, sourceLabel: string): LevelParseResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, error: `Invalid JSON in "${sourceLabel}": ${e instanceof Error ? e.message : String(e)}` };
  }

  try {
    const level = validateLevelDef(data, sourceLabel);
    return { ok: true, level };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// JSON isn't type-checked at compile time, so validate the shape at the
// boundary. This is also where per-field *defaults* actually get applied —
// declaring a field optional in the TS interface only widens what's legal
// to omit, it doesn't supply a value. That has to happen here, at runtime,
// before the data is handed back as a trusted LevelDef.
function validateLevelDef(data: unknown, sourceLabel: string): LevelDef {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`Level "${sourceLabel}" must be a JSON object.`);
  }
  const d = data as Record<string, unknown>;

  const requiredKeys = [
    "width", "height", "title", "timeLimitSec", "maxSpawnCount",
    "spawns", "platforms", "hazards", "buttons", "exit",
  ];
  for (const key of requiredKeys) {
    if (!(key in d)) throw new Error(`Level "${sourceLabel}" is missing "${key}".`);
  }

  const positiveNumberFields = ["width", "height", "timeLimitSec", "maxSpawnCount"] as const;
  for (const field of positiveNumberFields) {
    const value = d[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(`Level "${sourceLabel}": "${field}" must be a positive number (got ${JSON.stringify(value)}).`);
    }
  }

  const arrayFields = ["spawns", "platforms", "hazards", "buttons"] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(d[field])) {
      throw new Error(`Level "${sourceLabel}": "${field}" must be an array (got ${typeof d[field]}).`);
    }
  }
  const spawns = d.spawns as unknown[];
  if (spawns.length === 0) {
    throw new Error(`Level "${sourceLabel}": "spawns" needs at least one spawn point.`);
  }
  spawns.forEach((s, i) => {
    if (typeof s !== "object" || s === null || typeof (s as any).x !== "number" || typeof (s as any).y !== "number") {
      throw new Error(`Level "${sourceLabel}": spawns[${i}] needs numeric x and y.`);
    }
  });

  const exit = d.exit;
  if (typeof exit !== "object" || exit === null || Array.isArray(exit)) {
    throw new Error(`Level "${sourceLabel}": "exit" must be an object.`);
  }
  const e = exit as Record<string, unknown>;
  for (const field of ["x", "y", "w", "h"] as const) {
    if (typeof e[field] !== "number") {
      throw new Error(`Level "${sourceLabel}": "exit.${field}" must be a number.`);
    }
  }
  if (typeof e.required !== "number" || e.required <= 0) {
    throw new Error(`Level "${sourceLabel}": "exit.required" must be a positive number.`);
  }

  // Exit door: requiredActivations defaults to 0 ("always open, no button
  // needed") unless the level JSON overrides it. id is not level-authored
  // data at all — it's always the literal "exit-door" — so it's forced
  // last rather than left for the JSON to (mis)supply.
  const normalizedExit = {
    requiredActivations: 0,
    ...e,
    id: "exit-door" as const,
  };

  // Buttons: requireHold defaults to false ("stays active once pressed")
  // unless a given button overrides it.
  const buttons = (d.buttons as unknown[]).map((b, i) => {
    if (typeof b !== "object" || b === null) {
      throw new Error(`Level "${sourceLabel}": buttons[${i}] must be an object.`);
    }
    return { requireHold: false, ...(b as Record<string, unknown>) };
  });

  return { ...d, exit: normalizedExit, buttons } as unknown as LevelDef;
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