// Exports the console mock's demo seed to internal/seed/seed.json (run: make seed-export).

import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const consoleDir = resolve(here, "../../console");
const require = createRequire(join(consoleDir, "node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/package.json"));
const esbuild = require("esbuild");

export const SEED_EPOCH = "2026-01-01T12:00:00.000Z";

const out = join(mkdtempSync(join(tmpdir(), "wsn-seed-")), "seed.mjs");
await esbuild.build({
  entryPoints: [join(consoleDir, "workspaces/libs/mock-server/src/seed.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  logLevel: "silent",
});
const { createSeedState } = await import(pathToFileURL(out).href);
const state = createSeedState(new Date(SEED_EPOCH));

// Runtime history and storage bookkeeping are not seed data.
for (const key of ["schemaVersion", "sequence", "agentRuns", "executions", "approvals", "events", "audit"]) delete state[key];

const target = resolve(here, "../internal/seed/seed.json");
writeFileSync(target, JSON.stringify({ epoch: SEED_EPOCH, ...state }, null, 2) + "\n");
console.log(`wrote ${target}: ${Object.entries(state).map(([k, v]) => `${k}=${Array.isArray(v) ? v.length : typeof v}`).join(" ")}`);
