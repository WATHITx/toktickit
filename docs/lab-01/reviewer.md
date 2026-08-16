# Lab 1 — Peer Review Record

**Author:** <"Wathit Tritsananawakit"> — <student id : 67070503495> — GitHub: @<WATHITx>  
**Peer reviewer:** <partner name : Wichitchai Suwanno> — <student id : 67070503439> — GitHub: @<SinghLemonH>

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| 1 | feature/1-project-foundation | Approved |
| 2 | feature/2-health-check | Approved |
| 3 | feature/3-category-seed | Approved |
| 4 | feature/4-category-list | Approved |
---------------------------------------------------------------------------------------------------------------------------------------
| 1 | feature/1-project-foundation
Reviewer comment I received: The README is still just # TokTickIT Issue 1 requires setup instructions to be present. Could you add please.  
    Went through the branch and also ran it locally to check things server and client actually work, not just eyeballing the code.
Really solid on the basics .gitignore is set up properly so no .env or node_modules snuck into the repo, which is honestly the thing I'd worry about most and you nailed it. Bootstrap's already wired up on the client side too, and the folder structure matches what the labsheet asks for exactly

How I responded: fix that and pull new request.

Reviewer comment I received : Nice, just pulled the latest changes and both are sorted now README actually walks through setup properly, and the backend boots fine with the placeholder model in place. Ran it locally again just to be sure and everything comes up clean.
---------------------------------------------------------------------------------------------------------------------------------------
| 2 | feature/2-health-check

Reviewer comment I received : Ahh.. I Think Two things to fix before merging:

Remove committed build artifacts: client/tests/lab-01/App.test.js and client/tests/setup.js look like compiled output accidentally committed alongside the .ts/.tsx source files. Please remove them they can cause duplicate test runs.
Error message isn't specific enough: "The system is currently offline." doesn't tell the user what went wrong. Per the labsheet spec, please use a message like "Unable to connect to TokTickIT API" so it's actually useful for debugging.
Everything else looks good so health check returns 200 correctly and the Online/Offline states render as expected.

Approving, good to merge :D

How I responded : I change branch to #8 can you review that and don't merge this one.

Reviewer comment I received : Now I think Everything already fine now it's looks good so health check returns 200 correctly and the Online/Offline states render as expected.it's ready I will merge it

How I responded : I like the messages he send me. :)
---------------------------------------------------------------------------------------------------------------------------------------
| 3 | feature/3-category-seed

Reviewer comment I received : After I Reviewed for this issue

Category model matches spec (id, unique name, createdAt)
Migration applied, table exists in PostgreSQL
Seed inserts the 4 required categories using upsert
Ran seed twice no duplicates, confirmed idempotent
Checked data in Prisma Studio 4 correct rows
npm test still passes, no .env/credentials committed
Than that all look good Pass! ! !
---------------------------------------------------------------------------------------------------------------------------------------
| 4 | feature/4-category-list
Reviewer comment I received : Reviewed and tested locally so... all good :D

/api/categories returns categories from DB, ordered by id
Supertest confirms the endpoint response
Frontend fetches real data, no hard-coded categories
Loading and error states work correctly
npm test passes on both server and client
Great job ma boy.
---------------------------------------------------------------------------------------------------------------------------------------
## Pull Requests I reviewed for my partner

My comment: The feature was implemented in a clear progression, and the route + UI flow matched the issue requirements. The tests also covered the expected success and offline states.  
Partner's response: Agreed. The implementation was easy to follow and the testing made validation straightforward.