
# Lab 1 — AI Use and Reflection

**LLM/agent used:** GitHub Copilot

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | "Explain why Check System does not show an error" | Used the response to inspect the frontend flow and confirm that the button was logging instead of calling the actual handler. |
| 2 | "Show the Issue 4 acceptance criteria and map them to code" | Compared the backend and frontend requirements against the current implementation to identify missing behavior. |
| 3 | "Write a failing test for GET /api/categories" | Used the failing result to confirm the backend route was not implemented yet. |
| 4 | "Implement the category list API route in Express" | Added the Prisma query with id ordering and safe 500 error handling. |
| 5 | "Implement the front-end checkSystem function" | Added the health + categories fetch sequence so the UI can show a single online/offline state. |
| 6 | "Implement the successful and error UI states" | Added loading, success, and offline alerts with category rendering. |
| 7 | "Fix Vitest jsdom setup for React tests" | Updated the test setup so jest-dom matchers work correctly with Vitest. |
| 8 | "Verify Issue 4 passes with relevant tests" | Ran the server and client tests to confirm the feature works end-to-end. |

## Reflection

The prompts became more effective once I focused them on one concrete question at a time: backend route, frontend state, or test setup. This made the agent output easier to verify and reduced incorrect or partial fixes. One place I had to correct the result was the frontend test setup, because the jsdom environment and jest-dom matchers needed to be configured correctly for Vitest before the UI tests would run.