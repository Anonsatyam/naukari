import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/**
 * Loads .env.local into process.env, if the file exists.
 *
 * Next.js auto-loads .env.local for `next dev`/`next start`, but this
 * bot script runs standalone via `tsx`, which doesn't do that on its
 * own. In CI (GitHub Actions), env vars are already set via repo
 * secrets, so there's no .env.local file and this is a harmless no-op.
 */
export function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}