# Lab 4 AI Use

**LLM used:** Claude (Anthropic) through Claude Code — used as the
specification agent (drafting and checking the Sprint 4 contract) and as the
coding agent (implementation and tests).

## Key Prompts

Record 6–10 prompts that shaped the sprint. For each, note what you kept,
changed, or rejected from the output.

| # | Purpose | Prompt (summary or exact text) | What I kept / changed |
|---|---|---|---|
| 1 | Sprint plan | "Plan the Lab 4 workflow as one Issue per PR, choosing Issues that need few PRs but make the system easy to use, based on the Lab 4 handout." | Six Issues (contract → Actions backend → Actions UI → workflow → dashboards → hardening). The agent flagged that the handout's field list omits an assignee/action status that Part 6 grades; we added both. |
| 2 | Specification | "Do Issue 1 following the plan, but don't add/commit/merge." | specification, api-spec, ui-spec, tests, reviewer and ai-use drafts with numbered FR/BR/AC and AC→test traceability. |
| 3 | Actions Taken backend | "Next, Issue 2 following the plan." | Additive migration with a pre-migration `pg_dump`, idempotent seed, test-first validation (BR-06..08) and API tests. |
| 4 | Actions Taken UI | "Next, Issue 3 following the plan." | Inline create/edit panel; the new E2E test exposed a real bug (`datetime-local` drops seconds, so a same-minute action was rejected) which was fixed on both client and server. |
| 5 | Ticket workflow | "Next, Issue 4 following the plan." | Single status-change service (matrix → gate → version → write + history), Requester reopen, staged status changes with Confirm. |
| 6 | Dashboards | "Next, Issue 5 following the plan." | Every metric compared against hand-written SQL; the agent changed the "Recently Resolved" drill-down so the list count matches the card. |
| 7 | Hardening | "Issue 6 following the plan — last run froze my computer, don't do that again." | Playwright limited to 1 worker and Vitest to 2; suites run one at a time. Found console 401s, lost comment text on failure, and a test that polluted a demo account. |
| 8 | PR descriptions | "Write the PR comment in English with the tests." | Used as the description of each PR. |

## My Reflection

<!-- Write at the end of the sprint:
- How the specification agent helped (or misled) — e.g. decisions it raised,
  inconsistencies it caught, things you had to correct.
- How the coding agent helped — e.g. tests it wrote first, bugs it found,
  places where you had to step in.
- What you would do differently next time. -->
