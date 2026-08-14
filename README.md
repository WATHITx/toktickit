# toktickit

A simple full‑stack TypeScript project (Vite + React frontend, Node/Express backend) using Prisma for the database. This repository is organized for development and testing in a student lab environment.

## Quick overview

- **Client:** Vite + React application in `client/`.
- **Server:** TypeScript Node/Express API in `server/` with Prisma ORM in `server/prisma`.
- **Tests:** Vitest-based tests for both client and server under `tests/`.

## Prerequisites

- Node.js (recommended v18+)
- npm (or another Node package manager)
- A database supported by Prisma (set via `DATABASE_URL`) — commonly SQLite or PostgreSQL for labs.

## Setup

1. Install dependencies

	 - Server

		 ```powershell
		 cd server
		 npm install
		 ```

	 - Client

		 ```powershell
		 cd ../client
		 npm install
		 ```

2. Configure the database

	 - Create a `.env` file inside `server/` with at least:

		 ```text
		 DATABASE_URL="<your-database-connection-string>"
		 ```

	 - Run Prisma migrations (creates or updates the database schema) and seed the DB:

		 ```powershell
		 cd server
		 npm run prisma:migrate
		 npm run prisma:seed
		 ```

		 If you prefer to push the schema without migrations during development, use `npx prisma db push`.

## Running the app (development)

- Start the server (auto-reloads via `tsx`):

	```powershell
	cd server
	npm run dev
	```

- Start the client dev server:

	```powershell
	cd client
	npm run dev
	```

Open the client URL printed by Vite (usually http://localhost:5173) and ensure the server API port matches the client's requests.

## Build & Production

- Build the client:

	```powershell
	cd client
	npm run build
	```

- Build the server and run the compiled output:

	```powershell
	cd server
	npm run build
	npm start
	```

## Testing

- Run client tests:

	```powershell
	cd client
	npm run test
	```

- Run server tests:

	```powershell
	cd server
	npm run test
	```

## Project structure

- `client/` — Vite + React source, tests, and build scripts.
- `server/` — Express API, Prisma schema & seed, tests, and server scripts.
- `server/prisma/` — Prisma schema and seed scripts.
- `tests/` & `docs/` — Lab tests and documentation for instructors/students.

## Notes & tips

- The server package.json includes conveniences:
	- `npm run dev` — runs `tsx watch src/index.ts` for development.
	- `npm run prisma:migrate` — runs Prisma migrations.
	- `npm run prisma:seed` — runs the seed script.

- The client package.json includes:
	- `npm run dev` — starts Vite dev server.
	- `npm run build` — builds the production bundle.

## Contributing

Fork, create a branch, and open a PR. Keep changes focused and include tests when appropriate.

## License

This project is provided for educational use. Add a license file if you plan to release it publicly (for example, `MIT`).
