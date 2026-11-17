# 13: Labelled fixture set

**What to build:** A set of real or realistic SaaS, vendor and B2B subscription agreements. For each one, a person marks:
- every risky clause and its expected **severity**
- every deadline (days + reference point)
- every **incorporated term**
- clauses that look risky but aren't, to measure false alarms.

This is what the eval harness (ticket 12) measures against. Without it, Q1–Q3 can't be measured.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] Agreements are ones that can legally be stored in the repo, or the set lives outside git
- [ ] Includes at least: an auto-renewal with a stated fee, one without, an uncapped indemnity, an incorporated-terms order form, and a genuinely fine contract
- [ ] Labels follow the severity rules in ADR 0003 / ADR 0006
- [ ] Label format agreed with ticket 12
