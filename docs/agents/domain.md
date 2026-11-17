# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: the decision records that touch the area you're about to work in.

If either doesn't exist yet, **proceed silently**. Don't flag its absence or suggest creating it upfront. `/domain-modeling` creates them as terms and decisions get resolved.

## Layout (single-context)

```
/
├── GLOSSARY.md
└── docs/adr/
    └── 0001-every-flag-cites-its-source.md
```

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a proposal, a test name), use the term as `GLOSSARY.md` defines it. Don't drift to synonyms the glossary avoids. If a concept you need isn't there, either you're inventing language (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, say so explicitly rather than silently overriding it:

> _Contradicts ADR-0001 (every flag cites its source), but worth reopening because…_
