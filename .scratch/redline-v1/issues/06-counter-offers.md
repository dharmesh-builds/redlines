# 06: Counter-offers

**What to build:** Every **flag** gets a counter-offer in two parts: a rewritten version of the cited clause, and a short email-ready request to the vendor asking for that change (ADR 0006). The user copies either part in one action. Redline doesn't guess whether the vendor will negotiate.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Model output carries a counter-offer (rewritten clause + request) per candidate flag
- [ ] Each counter-offer quotes the clause it replaces and changes only that clause
- [ ] The request asks only for that change
- [ ] One-click copy for each part
- [ ] Q6: tests assert every displayed flag has a counter-offer that quotes its clause and contains a request
