import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Intentionally has no remote mode or user-supplied Wrangler arguments.
if (process.argv.length !== 2) {
  console.error("Usage: pnpm db:migrate:local (no arguments; local database only)");
  process.exit(1);
}
const root = fileURLToPath(new URL("../", import.meta.url));
const hosting = JSON.parse(readFileSync(join(root, ".openai/hosting.json"), "utf8"));
if (hosting.d1 !== "DB") throw new Error("This application requires the DB binding.");
const configPath = join(root, ".sites-runtime/local-migrations/wrangler.json");
mkdirSync(dirname(configPath), { recursive: true });
writeFileSync(configPath, JSON.stringify({
  name: "mandimitra-local",
  compatibility_date: "2026-05-15",
  d1_databases: [{
    binding: "DB",
    database_name: "site-creator-d1",
    // Must match Vite's local-only placeholder. Never use a production D1 ID.
    database_id: "00000000-0000-4000-8000-000000000000",
    migrations_dir: join(root, "drizzle"),
  }],
}, null, 2) + "\n");

const result = spawnSync(process.execPath, [
  "--import", join(root, "scripts/sites-env.mjs"),
  join(root, "node_modules/wrangler/bin/wrangler.js"),
  "d1", "migrations", "apply", "DB",
  "--local", "--config", configPath,
  "--persist-to", join(root, ".wrangler/state"),
], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CI: "true" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
