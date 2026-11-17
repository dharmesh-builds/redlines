# 05: Verdict line

**What to build:** When a report has no High or Medium **flags**, it leads with a **verdict line** ("nothing here costs you money beyond what you agreed to"), with Low flags folded underneath. When the document refers to **incorporated terms**, the verdict line names each one as unread: "…in this document. It also refers to [X], which Redline hasn't read." (ADR 0005, ADR 0006.)

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] Verdict line is present if and only if there are no High or Medium flags
- [ ] Verdict line names every incorporated-term reference as unread
- [ ] Low flags are folded under the verdict and still reachable
- [ ] Q4: tests cover no flags, Low only, any Medium, any High, and Low only plus incorporated terms
