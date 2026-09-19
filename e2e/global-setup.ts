import { execSync } from "node:child_process";
import path from "node:path";

// E2E specs log in as the seeded dev users. Manual testing and first-login.spec.ts change those
// passwords, so restore the seed (upsert only) and remove users left behind by earlier E2E runs.
export default function globalSetup() {
  const cwd = path.resolve(__dirname, "../server");
  execSync("npx tsx prisma/seed.ts", { cwd, stdio: "pipe" });
  execSync("npx tsx prisma/cleanupE2E.ts", { cwd, stdio: "pipe" });
}
