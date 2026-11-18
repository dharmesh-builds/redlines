# Questions waiting on you

## 1. Approve `happy-dom` as a dev dependency? (from ticket 06, 2026-11-18)
- **Why:** the copy buttons on counter-offers are tested by calling the copy function directly, and the markup is checked to make sure each button points at the right text. A real simulated click needs a browser-like test environment, and `happy-dom` is the usual small one for Vitest.
- **What happened:** during the unattended build the subagent's install attempt hit a permission prompt and was blocked. Nothing was installed.
- **If yes:** `npm i -D happy-dom`, then add a real click test in `tests/routes/report-counter-offers.test.tsx`.
- **If no:** nothing changes. The current tests stay.
