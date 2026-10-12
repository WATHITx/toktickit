# TokTickIT

TokTickIT is a small IT service-desk application built across CPE 334 Labs 1–4: Requesters raise
Tickets, IT Staff work them (owner, IT Priority, status workflow, Public Comments, Internal Notes,
Actions Taken), Administrators manage user accounts, and every role starts from a dashboard.

- **Client:** Vite + React + TypeScript + Bootstrap (Zen Green theme) in `client/`
- **Server:** Node.js + Express + TypeScript API in `server/`, Prisma ORM on PostgreSQL
- **Tests:** Vitest (server unit/API, client components) and Playwright (end-to-end + screenshots)
- **Docs:** per-lab specification, API, UI and test plans in `docs/lab-0X/`

## Prerequisites

- Node.js 18 or newer and npm
- PostgreSQL 14 or newer running locally

## Setup

1. Install dependencies (repository root for Playwright, then server and client):

   ```powershell
   npm install
   npx playwright install chromium
   cd server; npm install
   cd ../client; npm install
   ```

2. Copy `server/.env.example` to `server/.env` and fill in your values (never commit `.env`):

   ```text
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/toktickit?schema=public"
   JWT_SECRET="<any long random string>"
   ```

3. Apply the migrations and load the seed data (from `server/`):

   ```powershell
   npx prisma migrate deploy
   npm run prisma:seed
   ```

   The seed is idempotent — run it again at any time. It restores the demo accounts' passwords and
   adds the Lab 4 demo tickets (`SEED-L4-01` … `SEED-L4-09`) only if they are missing.

   Before migrating a database that already holds data, take a backup so it can be restored:

   ```powershell
   pg_dump "<DATABASE_URL without ?schema=public>" -f backup.sql
   ```

## Running the app

```powershell
cd server; npm run dev      # API on http://localhost:3000
cd client; npm run dev      # UI on http://localhost:5173 (proxies /api to the server)
```

### Demo accounts

All seeded accounts use the dev-only password **`DevPass!123`**.

| Account | Role | Notes |
|---|---|---|
| `jennifer.a@toktickit.test` | Requester | main Requester demo |
| `sarah.j@toktickit.test`, `david.l@toktickit.test` | Requester | own the Lab 4 demo tickets |
| `michael.b@toktickit.test` | Requester | must change password at first login |
| `nina.p@toktickit.test` | Requester | no tickets — empty dashboard |
| `kevin.p@toktickit.test` | IT Staff | main IT Staff demo |
| `emily.d@toktickit.test`, `robert.w@toktickit.test` | IT Staff | must change password at first login |
| `liam.c@toktickit.test` | IT Staff | no assigned work — empty dashboard |
| `admin@toktickit.test` | Administrator | user management + admin dashboard |
| `inactive.req@…`, `inactive.staff@…` | — | inactive, cannot sign in |

### Demonstration walkthrough

1. **Requester** (`jennifer.a`): Dashboard → click a metric card → filtered My Tickets → Create
   Ticket → Ticket Detail (attachments, Public Comments, "Work Performed by IT", Status History).
2. **IT Staff** (`kevin.p`): Dashboard → Unassigned → open a ticket → Claim for me → set IT Priority
   → change status (staged, then Confirm) → add an Action Taken, complete it → Resolved → Closed.
   Try Resolved before completing an action to see the resolution gate.
3. **Requester again**: open the closed ticket → Reopen Ticket.
4. **Administrator** (`admin`): Dashboard user counts → User Management (create, edit, reset
   password; self-deactivation and last-admin protection).
5. Open a staff URL as a Requester to see the Forbidden screen.

## Testing

Run the suites one at a time (each one is memory-hungry):

```powershell
cd server; npm run test          # unit + API + Labs 1–4 regression (re-seeds dev users first)
cd client; npm run test          # React component tests
npx playwright test              # E2E + responsive screenshots, from the repository root
```

- Playwright starts both dev servers if they are not running and re-seeds the database before the run.
- It runs **one worker by default**; more workers each start their own Chromium and can exhaust memory.
  Use `$env:PW_WORKERS=2; npx playwright test` on a machine with spare RAM.
- Screenshots are written to `artifacts/lab-0X/screenshots/`.

### Cleaning up test-generated data

The automated tests create tickets in the development database. Before a demo or before capturing
final screenshots, remove them (seeded demo tickets are kept):

```powershell
cd server
npx tsx prisma/cleanupTestData.ts           # dry run: shows what would be deleted
npx tsx prisma/cleanupTestData.ts --apply   # deletes it (take a pg_dump first)
```

## Project structure

```
client/            React app (pages/, components/, api/, utils/) and component tests (tests/lab-0X/)
server/            Express API (routes/, services/, validation/, middleware/)
server/prisma/     schema, migrations, seed and cleanup scripts
server/tests/      API and regression tests per lab
e2e/               Playwright specs per lab
docs/lab-0X/       specification, api-spec, ui-spec, tests, reviewer and AI-use notes
artifacts/         screenshots produced by the Playwright visual specs
```

## License

Provided for educational use in CPE 334.
