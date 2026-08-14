# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok |{
  "status": "ok",
  "service": "TokTickIT API"
} |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | |
| 4 | Vitest | Success state shows Online + category list | |
| 5 | Vitest | Error state shows Offline + message | |

Paste your passing terminal output / screenshot below.

 RUN  v2.1.9 D:/CPE334/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ↓ shows Online and the seeded categories on success [skipped]
     ↓ shows an Offline error message when the API is unavailable [skipped]

 Test Files  1 passed (1)
      Tests  1 passed | 2 todo (3)
   Start at  14:45:03
   Duration  1.59s (transform 45ms, setup 138ms, collect 161ms, tests 21ms, environment 806ms, prepare 174ms)


 RUN  v2.1.9 D:/CPE334/toktickit/server

 ↓ tests/lab-01/categories.test.ts (1) [skipped]
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  1 passed | 1 skipped (2)
      Tests  1 passed | 1 todo (2)
   Start at  14:47:15
   Duration  801ms (transform 70ms, setup 0ms, collect 668ms, tests 20ms, environment 0ms, prepare 297ms)