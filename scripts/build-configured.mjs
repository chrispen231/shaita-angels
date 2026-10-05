/**
 * Build with Supabase treated as configured.
 *
 * Why this exists: `npm run build` on a machine with no credentials takes the
 * unconfigured branch of every data reader, so the code that only runs when
 * Supabase IS configured is never compiled. A client/server boundary violation
 * living on that branch therefore passes the local build and fails in production.
 *
 * That is not hypothetical. Moving `pad()` into src/lib/content.ts broke every
 * player profile in production while `npm run build` stayed green here, because
 * src/lib/content.ts imports ./supabase/server, which imports next/headers, and
 * SquadGrid is a client component.
 *
 * The values below are syntactically valid placeholders. No network call happens
 * during a build, so nothing is contacted and no credential is involved.
 */

import { spawnSync } from "node:child_process";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "sb_publishable_build_time_placeholder_only";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

const result = spawnSync(npm, ["run", "build"], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || PLACEHOLDER_KEY,
  },
});

if (result.error) {
  console.error("Configured build could not start:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
