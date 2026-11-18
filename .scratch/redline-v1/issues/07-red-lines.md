# 07: Red lines

**What to build:** The user keeps an editable list of their own **red lines** in plain language. An analysis checks the document against them:
- a matching clause is raised to High
- a red line can create a flag that wouldn't exist otherwise
- each red-line flag shows which red line it matched.

Red lines never lower or hide a flag (ADR 0003). Each report records the red lines it ran with. The user can re-run a past document against their current list; editing red lines doesn't re-run reports automatically.

**Blocked by:** 02

**Status:** done

- [x] Red lines table with row-level security; user can add, edit and delete
- [x] `analyze` receives the user's red lines; a match must cite a verified source sentence
- [x] Final severity = the higher of built-in and red-line severity
- [x] Report stores and shows its red-lines snapshot; a re-run action produces a new report
- [x] T5: over several scripted outputs, adding any red line never removes a flag or lowers a severity
