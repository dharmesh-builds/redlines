---
name: Redline
description: A contract on a desk, with a sticky index tab at every risky sentence; tab length is severity.
colors:
  desk: "#2d2f33"
  desk-ink: "#f1efe8"
  desk-ink-soft: "#c9c6bd"
  desk-rule: "#4a4d53"
  paper: "#fbfbf8"
  paper-edge: "#e6e4dc"
  ink: "#1a1a1a"
  ink-soft: "#4a4844"
  tab-high: "#ff6b3d"
  tab-medium: "#ffd23f"
  tab-low: "#8fd3ff"
  note-high: "#ffe3d8"
  note-medium: "#fff3c4"
  note-low: "#ddf2ff"
  highlighter: "#fff27a"
  verified-green: "#24553a"
  dropped-rust: "#8a2a12"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 4vw, 3.875rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 100"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  wordmark:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
  doc-title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  doc-body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: "0px"
  focus: "2px"
  tab: "4px"
  cta: "6px"
spacing:
  space-1: "8px"
  space-2: "16px"
  space-3: "24px"
  space-4: "40px"
  space-5: "72px"
  space-6: "120px"
  sheet-pad: "44px"
  sheet-pad-phone: "20px"
components:
  button-primary:
    backgroundColor: "{colors.tab-high}"
    textColor: "{colors.ink}"
    rounded: "{rounded.cta}"
    padding: "18px 28px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.doc-body}"
    rounded: "{rounded.none}"
    padding: "48px 44px 56px"
    width: "480px"
  tab-high:
    backgroundColor: "{colors.tab-high}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "0 10px 0 20px"
    height: "34px"
    width: "232px"
  tab-high-open:
    width: "244px"
    padding: "0 22px 0 20px"
  tab-medium:
    backgroundColor: "{colors.tab-medium}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "0 10px 0 20px"
    height: "34px"
    width: "164px"
  tab-medium-open:
    width: "176px"
    padding: "0 22px 0 20px"
  tab-low:
    backgroundColor: "{colors.tab-low}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "0 10px 0 20px"
    height: "34px"
    width: "110px"
  tab-low-open:
    width: "122px"
    padding: "0 22px 0 20px"
  note-high:
    backgroundColor: "{colors.note-high}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "18px 20px 16px"
    width: "330px"
  note-medium:
    backgroundColor: "{colors.note-medium}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "18px 20px 16px"
    width: "330px"
  note-low:
    backgroundColor: "{colors.note-low}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "18px 20px 16px"
    width: "330px"
  slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "22px 26px"
  folded-label:
    backgroundColor: "{colors.tab-low}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "6px 14px"
---

# Design System: Redline

## Overview

**Creative North Star: "The Tabbed Contract"**

The document is the hero and the interface. A bond-white sheet, set in a document serif, lies on a charcoal desk. Every risky sentence gets a sticky index tab on the sheet's right edge. The tab's length shows severity and its label names it. Pulling a tab sweeps a highlighter across its sentence and opens a flat tinted note beside the paper. Anything Redline says can be checked against the page because it sits next to the sentence it came from.

The world has three materials: desk, paper and the inks on them (tab ink, highlighter, printed type). Depth comes from paper lying on the desk, never from interface chrome. Density is that of a real document read at a desk: generous measure on the desk, tight measure on the sheet. Motion is physical and happens once: tabs slide out from under the paper in severity order, and the highlighter draws across its sentence.

The world rejects the category's split hero with a dashboard screenshot and the row of feature cards below it. On signed-in Operate surfaces (the app shell, brief only and not yet built) the same world applies with less scale and motion. The document stays in the centre of the screen, flags remain tabs on its edge, and pulling a tab still highlights the sentence and opens the flag. Display type steps down to headline or title scale, and the load-time tab slide is dropped in favour of the pull interaction alone. These surfaces use the tokens below as they are; add new tokens only when that build needs them.

**Key Characteristics:**
- A charcoal desk ground with bond-white paper on it; no other surfaces.
- Severity encoded by tab length (232 / 164 / 110px) plus a word label, never by colour alone.
- Grotesque (Archivo) for everything Redline says; serif (Source Serif 4) for everything the contract says.
- One highlighter stroke per open flag, blended with multiply so the printed type stays crisp.
- Figures in tabular numerals.
- Motion is one-shot and physical, and it is fully removed under reduced motion.

## Colors

A desaturated charcoal-and-bond base carries three saturated sticky-tab inks and one highlighter yellow. The inks only appear where they mean something.

### Primary
- **Signal Orange** (tab-high): the High severity tab, and the primary action, which is a tab the reader pulls. Also the underline on the header link and the text caret.

### Secondary
- **Index Yellow** (tab-medium): the Medium severity tab only.
- **Sky Index** (tab-low): the Low severity tab, the "folded" low-severity label, and the keyboard focus ring (3px outline, 3px offset). Sky reads clearly on both desk and paper.

### Tertiary
- **Highlighter** (highlighter): the stroke across a cited sentence, and text selection everywhere. It always sits under ink-coloured text.
- **Note tints** (note-high, note-medium, note-low): pale paper in each tab's hue that holds the opened flag. A note always takes its tab's hue.
- **Verified Green** (verified-green) and **Dropped Rust** (dropped-rust): text colours for verification outcomes ("Quoted word for word", "Found ... Shown." / "Not in the document. Dropped."). Each always comes with words that state the outcome.

### Neutral
- **Charcoal Desk** (desk): the page ground for all Redline-voice content.
- **Desk Ink** (desk-ink) and **Desk Ink Soft** (desk-ink-soft): headlines and body on the desk; ledes, captions and footer on the desk.
- **Desk Rule** (desk-rule): 1px rules between items on the desk (limits list, footer).
- **Bond Paper** (paper) with **Paper Edge** (paper-edge): the sheet and paper slips; the edge colour is a 1px under-line that gives the sheet a thickness.
- **Ink** (ink) and **Ink Soft** (ink-soft): printed text on paper, notes and tabs; ink-soft for captions, fact labels and secondary reasons.

### Named Rules
**The Two Surfaces Rule.** Content sits either on the desk or on paper. Notes are paper in a tab's tint. Do not add a third surface (no cards, panels or glass).

**The Ink Means Severity Rule.** Orange, yellow and sky mean High, Medium and Low wherever they appear. Do not use them for decoration. The primary action shares orange because it is itself a tab to pull.

**The Colour Is Never Alone Rule.** Every severity or confidence colour has a word label beside it ("High severity", "Low confidence"), and severity also has tab length. A bare "Low" never appears.

## Typography

**UI Font:** Archivo, a variable grotesque with a width axis (fallback system-ui, sans-serif), loaded as `--font-ui`
**Document Font:** Source Serif 4 (fallback Georgia, serif), loaded as `--font-doc`

**Character:** Archivo at heavy weights and tight tracking is Redline's voice: blunt, numbers-first, flat. Source Serif 4 is the contract's voice. The split tells the reader who is speaking at any moment.

### Hierarchy
- **Display** (800, clamp(2.5rem, 4vw, 3.875rem), 1.04, -0.03em): the single hero headline on the desk; 2.125rem on phones. Balanced wrapping.
- **Headline** (800, clamp(1.875rem, 3vw, 2.75rem), 1.04): section statements on the desk. The closing headline runs slightly larger (clamp(2rem, 3.6vw, 3.25rem), max 18ch).
- **Wordmark** (800, 1.375rem, width 112%): the only place the width axis widens.
- **Title** (800, 1.0625rem, 1.25): the flag's plain-English title inside a note.
- **Body** (400, 1.0625rem, 1.55): desk copy, kept to 34–44ch. **Lede** (1.1875rem) for the sentence under the display line.
- **Label** (700, 0.8125rem): tab labels and verification lines.
- **Doc title** (Source Serif 4, 600, 1.375rem): the agreement's title on the sheet.
- **Doc body** (Source Serif 4, 400, 0.9375rem, 1.6): contract text, quoted slips (1.0625rem), italic captions (0.875rem).

### Named Rules
**The Two Voices Rule.** Serif is only for the document's own words, and the grotesque is only for Redline's. Never set Redline's analysis in the serif, and never set a contract quotation in the grotesque.

**The Tabular Figures Rule.** Clause numbers, exposure figures and page folios use tabular numerals. Exposure is shown worked out ("$640 × 12 = $7,680") in bold.

## Layout

Wide desk, narrow sheet. Page sections cap at 1440px with a fluid gutter (clamp(16px, 3.4vw, 48px)). Spacing follows an expanding scale (8, 16, 24, 40, 72, 120px), and sections are separated by the 120px step.

- **Desktop (above 1180px):** the hero is a two-column grid, with copy (max 32rem) on the desk and the sheet (480px, 44px inner pad) beside it. A 340px desk margin to the right of the sheet holds tabs and notes. Tabs are absolutely positioned at their clause's top and project from the sheet's edge into that margin. The open note sits 44px below its tab, 330px wide. Lower bands use a copy column (minmax(280px, 30rem)) next to the evidence.
- **Up to 1180px:** everything stacks. The sheet takes the column (max 680px). Each flagged clause becomes a column: its tab sits right-aligned under the clause and still projects past the paper edge into a 28px desk gutter, and the note goes full width beneath it with no shadow.
- **Up to 640px:** sheet padding drops to 20px. The tab moves above its clause to mark where the clause starts, fact rows in the note go to one column, and lists go to one column. The sample sheet is shortened (with a note saying so) so a flag reaches the first screen.

**The Margin Is For Tabs Rule.** The space past the paper's right edge belongs to tabs and their notes. Do not put other content there.

## Elevation & Depth

Depth is physical: paper lies on a desk and tabs are stuck to the paper. There is no tonal surface stack and no layered UI elevation. Shadows are soft and dark, cast downward onto the desk, and come in only a few strengths.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 0 #e6e4dc, 0 24px 48px -16px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.25)`): the main document; the 1px paper-edge line gives it thickness.
- **Slip** (`box-shadow: 0 16px 32px -14px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.2)`): smaller paper pieces on the desk (quote slips, verdict sheet).
- **Note** (`box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 18px 32px -14px rgba(0,0,0,0.6)`): an opened flag lying beside the sheet on desktop. Removed when the note is inline (1180px and down).
- **Tab** (`box-shadow: 0 3px 8px -2px rgba(0,0,0,0.45)`): a tab lifting slightly off the desk.
- **Primary action** (`box-shadow: 0 2px 0 rgba(0,0,0,0.18), 0 10px 24px -8px rgba(0,0,0,0.5)`; hover deepens to `0 14px 28px -8px rgba(0,0,0,0.55)`).

### Named Rules
**The Stuck Tab Rule.** A tab's first 18px lies on the paper in its ink at 70% opacity, so the paper shows through. Past the paper edge, over the desk, the ink is solid. The change is a hard stop, not a fade.

## Shapes

Paper has square corners: the sheet, slips, verdict sheet and notes use 0 radius. Rounding appears only on the free end of a tab, the end that sticks out (0 4px 4px 0), so tabs read as attached to something. The primary action is a heavier tab with the same asymmetry (2px 6px 6px 2px). The focus ring has a 2px radius. Borders are rare: 1px desk rules between list items and the footer, and a 15%-ink hairline above a note's verification line.

## Components

### Buttons
Tactile and literal: the primary action is a tab you pull.
- **Shape:** stuck-end corners small, free-end corners slightly rounded (2px 6px 6px 2px).
- **Primary:** signal orange with ink text, 700 at 1.1875rem, 18px 28px padding, primary-action shadow.
- **Hover:** slides 4px to the right and its shadow deepens (220ms, ease-out). **Focus:** the global sky ring.
- **Text link:** inherits colour, 600, underlined in signal orange at 2px. Used for the repeated action in the header.

### Severity Tab (signature)
- **Construction:** a real `button` with `aria-expanded` and `aria-controls`, 34px tall, label 0.8125rem/700 in ink, padding 0 10px 0 20px. Its root tucks 18px onto the paper (see The Stuck Tab Rule).
- **Length is severity:** High 232px, Medium 164px, Low 110px. When pulled or hovered, each grows 12px and its right padding goes to 22px (260ms ease-out).
- **Label:** always the full words "High severity", "Medium severity", "Low severity".
- **Entrance:** slides out from under the paper (from translateX(-70%)), 900ms ease-out, staggered 150 / 300 / 450ms by severity. This happens once, on load.

### Flag Note
- **Style:** flat paper in the tab's tint (note-high / note-medium / note-low), no border, square corners, 18px 20px 16px padding, Archivo 0.9375rem/1.45 in ink.
- **Contents in order:** the title (Title role), one plain sentence, a fact list (Exposure / Confidence / Ask for; labels 600 in ink-soft, 6.5rem label column), then a verification line in verified-green with a 16px inline SVG check: "Quoted word for word from section N".
- **Confidence** is always "High / Medium / Low confidence", followed by a reason in ink-soft when the confidence isn't High.

### Highlighter
- A cited sentence is wrapped in a mark. A highlighter-yellow fill sweeps left to right (background-size 0% to 100%, 700ms ease-out) when its tab opens. It uses multiply blending and clones across line breaks. Only the open flag's sentence is highlighted.

### Paper Slip
- Small paper on the desk that holds one quoted sentence in the serif (1.0625rem) and its result in bold grotesque. A dropped quote is struck through (2px ink line, text in ink-soft) and its result is in dropped-rust. Stacked slips step 40px to the right on desktop.

### Folded Label
- A sky tab-shaped label (0 4px 4px 0, 6px 14px, 700 at 0.875rem) for a count of folded low-severity flags. It always names severity in words.

### Navigation
- Header only: the wordmark on the left and the action link on the right, on the desk, 24px vertical padding. App navigation is unresolved in the app-shell brief and is not specified here.

## Do's and Don'ts

### Do:
- **Do** put the document at the centre of every surface that shows analysis, with flags as tabs on its right edge.
- **Do** encode severity as tab length (232 / 164 / 110px) plus the full word label, every time.
- **Do** quote the source sentence in the document serif and highlight it with the highlighter in multiply.
- **Do** keep tab ink at 70% over the paper and solid over the desk, with a hard stop at 18px.
- **Do** use the sky focus ring (3px, 3px offset) on every interactive element on desk and paper.
- **Do** strip all animation and transition under `prefers-reduced-motion: reduce`. Content is visible by default.
- **Do** step scale and motion down on Operate surfaces while keeping the sheet, tabs and pull-to-highlight.

### Don't:
- **Don't** use orange, yellow or sky for anything that isn't severity (the primary action is the one exception, because it is a tab).
- **Don't** show a bare "Low", "Medium" or "High". Say severity or confidence.
- **Don't** add cards, panels, glass, or blended or decorative gradients. The only gradient allowed is the tab's hard-stop two-zone fill.
- **Don't** round paper. Radius belongs only to the free end of a tab and to the primary action.
- **Don't** set Redline's own words in the serif or contract text in the grotesque.
- **Don't** open the page with a split hero showing a dashboard screenshot over a row of feature cards.
