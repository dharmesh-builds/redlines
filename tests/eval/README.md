# Eval: label format

`npm run eval` runs every labelled document through the real model and scores the report against your labels. It costs money and is never part of `npm test`. It needs `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `.env.local`.

It reads every `*.json` in `tests/fixtures/`. To keep a set outside git, put it in another folder and run `EVAL_FIXTURES_DIR=/path/to/folder npm run eval`.

## One document = two files

- `name.txt`: the agreement as plain text.
- `name.json`: the labels, in the shape below.

The eval reads only the fields shown here. Other fields in the seed files (`explanation`, `figures`, `counterOffer`, `summaryPoints`, ...) feed the scripted test model and can be left out.

```json
{
  "document": "name.txt",
  "provisional": false,
  "clauses": [
    { "id": "auto-renewal", "sentences": ["<exact sentence>"], "expectedSeverity": "high" }
  ],
  "deadlines": [
    {
      "days": 60,
      "relation": "before",
      "referencePoint": "the renewal date",
      "acceptedReferencePoints": ["the end of the term"],
      "sentence": "<exact sentence>"
    }
  ],
  "incorporatedTerms": [
    { "description": "Acceptable Use Policy at https://...", "sentence": "<exact sentence>" }
  ],
  "looksRiskyButIsnt": [
    { "id": "mutual-termination", "sentences": ["<exact sentence>"], "why": "Mutual, with 30 days to cure." }
  ]
}
```

## Rules

- **Copy sentences exactly** from the `.txt` file. The eval refuses to start if a labelled sentence isn't in the document word for word. Line breaks and curly versus straight quotes don't matter; any other difference does.
- **`clauses`**: every risky clause, with severity set by ADR 0003 and ADR 0006:
  - `high`: no cap stated, or a stated cost of at least 12 months of the contract's fees.
  - `medium`: costs money but the document gives no figure, or a stated cost below that line.
  - `low`: one-sided boilerplate with no direct cost: arbitration, class-action waiver, governing law and venue.
  - List every sentence of a clause that runs over several sentences. Give each clause a unique `id`.
- **`deadlines`**: every notice, renewal, cancellation or payment window. `relation` is `before` or `after`; "within 30 days of the invoice date" is `after`. Add `acceptedReferencePoints` for other wordings that mean the same point.
- **`incorporatedTerms`**: every sentence that pulls in outside terms (an MSA, DPA, SLA, policy or URL).
- **`looksRiskyButIsnt`**: clauses a reader might flag that are fine, with a one-line `why`. Can be empty, but must be present.
- **`provisional`**: `true` for agent-written seed labels nobody has checked. Leave it out or set `false` once a person has labelled the document.

## How it scores

- A flag **matches** a labelled clause when one of its quoted sentences contains, or is contained in, one of the clause's sentences, after the same normalization as the verbatim check.
- **T1**: every quote in the report (flags, figures, counter-offers, summary) is re-checked against the document. One failure fails the run.
- **Q1**: a `high` clause counts as found only if a matching flag is High. Target 100%; a miss fails the run.
- **Q2**: a deadline is exact when days, `relation` and reference point all agree and the deadline cites an overlapping sentence. Reference points are compared ignoring case, punctuation and "the/a/an". Anything short of exact fails the run.
- **Q3**: false-alarm rate = flags matching no labelled clause ÷ flags shown. Flags on `looksRiskyButIsnt` items are listed by id. Tracked, never fails the run.
- **Q5**: an incorporated term is found when the summary cites an overlapping sentence. A miss fails the run.
