---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Surface: landing page

## Scope and mode
- **Route:** the public root page. **Mode:** Persuade.
- **One job:** demonstrate a contract turning into ranked flags, each showing the exact sentence it came from.
- **One action:** try it on your own document.

## Audience and action
- **Reader:** the PRD's reader, a small business about to sign a SaaS, vendor or B2B subscription agreement. They usually can negotiate.
- **Counter-offers** appear as something the reader can ask for, never as a promise the vendor will agree.
- **Primary action:** "Try it on your contract". It leads to the signed-in app (upload or paste), which ticket 01 builds.

## Proof and content
- **The demonstration is a sample agreement written for this page** and labelled as a sample wherever it appears. Its figures are synthetic.
- **No invented prices, customers, testimonials, quotes or benchmarks.**

## Constraints
- **No claim the spec excludes:**
  - no verdict on whether to sign
  - no legal advice, and no "AI lawyer" framing
  - no scanned or photographed documents
  - no document types beyond SaaS, vendor and B2B subscription agreements.
- **Formats stated:** PDF with selectable text, DOCX, TXT, pasted text.
- **Voice:** plain, flat, numbers first. Copy goes through the humanizer before commit.
- **Accessibility:** WCAG 2.2 AA. Severity is shown as tab length plus a word label, never by colour alone.

## Unresolved
- The primary action points at the app route, which doesn't exist until ticket 01 lands.
- **Ceiling notes from the finish review** (2026-11-18, not blocking; the verdict was ship):
  - The highlighter is a flat rectangle with no marker character, such as ragged ends.
  - Below the hero, the bands fall back to "copy left, white box right". The proof slips could instead be excerpts cut from the same sheet.
  - The closing section leaves the paper world.
  - On phones the tab slide-out is the only motion.

## Direction contract
THESIS: The contract itself is the hero. A sample agreement printed at near-real scale, with a sticky index tab at every risky sentence; tab length is severity. It refuses the category's split hero with a dashboard screenshot and the row of feature cards beneath it.
OWN-WORLD:
- **Ground:** a charcoal desk (#2d2f33).
- **The sheet:** bond-white (#fbfbf8), set in a document serif.
- **Tabs:** translucent sticky-tab inks, each with a label set in a grotesque.
  - orange #ff6b3d for High
  - yellow #ffd23f for Medium
  - sky #8fd3ff for Low.
- **Cited sentence:** a highlighter stroke (#fff27a) across it.
- **Figures:** tabular numerals.
- **Excluded:** cards, gradients, rounded app chrome. Paper, tabs and ink are the only surfaces.

STORY:
- **Recognition:** the reader sees their kind of contract.
- **The mechanism:** every flag is pinned to one sentence of it, and the figures are worked out in the open.
- **Belief:** anything Redline says can be checked against the page.
- **Action:** they try it on their own agreement.

FIRST VIEWPORT:
- **Left, about 40%, on the desk:**
  - the headline "See the clauses that cost money, before you sign." at display scale in white
  - one sentence of subcopy
  - the orange primary action "Try it on your contract"
  - the accepted formats beneath it.
- **Right, about 55%:**
  - one sample contract page at near-letter scale, labelled as a sample
  - three tabs projecting into the right margin, longest for High
  - the High tab open by default: its sentence highlighted and its flag shown beside the sheet's edge.

FORM: Tabbed Contract, position 1 of the grounded list, shown as IMPECCABLE'S PICK and chosen by the user over the assigned Green-bar Printout. seed:b6abf84f3ea35674.
- **Signature interaction:** pulling a tab (click, tap or keyboard) sweeps the highlighter across its sentence and opens its flag.
- **Motion grammar:** the tabs slide out once on load in severity order, with an exponential ease-out. Content is visible by default, and reduced motion gets no movement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
