import { execSync } from "node:child_process";

// API tests log in as the seeded dev users (password "DevPass!123"). Manual testing in the browser
// (forced password change, admin reset, etc.) changes those credentials and makes every login 401,
// so restore them before the suite runs. The seed only upserts, it never deletes data.
export default function setup() {
  execSync("npx tsx prisma/seed.ts", { stdio: "pipe" });
}
