# Redline research summary

Date: 2026-11-17. Synthesized from four agent reports in this folder: `who-has-the-pain.md`, `what-goes-wrong.md`, `what-exists.md` and `who-pays.md`. No new research was done for this summary.

**Read this first: limits of the evidence.**
- Reddit was blocked for every agent, so the communities most likely to show this pain (r/freelance, r/Renters, r/legaladvice, r/smallbusiness) are not represented.
- Many figures come from search-result snippets or vendor marketing, not pages the agents opened. Each source file marks which is which ([P]/[read]/VERIFIED vs [S]/[snippet]/SNIPPET).
- Every quote below was read on the page.

---

## 1. Three sharpest pain points

**1. Auto-renewal and notice windows that were missed.** This is the strongest and most consistent signal. Four separate Trustpilot reviewers describe being locked into an annual renewal of roughly $6k–$21k because a cancellation window was buried or missed.
> "Costar T&C has a buried auto-renew that renews your contract 60 days PRIOR to expiry with no notification"
> — https://www.trustpilot.com/review/costar.com

> "I discovered that I had missed a 90-day cancellation window" ($778/mo, 12 months)
> — https://www.trustpilot.com/review/birdeye.com

The FTC received nearly 70 complaints a day about negative-option and recurring-subscription practices in 2024, up from 42 in 2021. https://www.ftc.gov/news-events/news/press-releases/2024/10/federal-trade-commission-announces-final-click-cancel-rule-making-it-easier-consumers-end-recurring

**2. Deadlines and conditions read wrong.** A startup advisor read a 7-year clause as the option-exercise window. The real window was 60 days, and they lost the options.
> "I misread that as time to execute." … "I don't think there's any recourse at this point."
> — https://news.ycombinator.com/item?id=28310110

**3. Freelancer IP and payment terms.** Two pain points sit here.
- *IP clause:* A freelance developer caught a "pre-existing materials" clause that would have handed his prior code to the client. He walked away from the job. He normally would "get the contract, skim it, sign it, start working."
  — https://dev.to/not_varunkv/the-contract-clause-that-almost-cost-me-my-entire-codebase-j9d
  He now sells a contract-review tool, so he has a stake in the story.
- *Payment:* Nonpayment is the bigger money problem for freelancers. 62% of NY freelancers have lost wages and 53% lost up to $10,000. https://blog.freelancersunion.org/2022/05/12/over-60-of-ny-freelancers-report-not-being-paid-for-work-performed
  But see section 5: that is mostly an enforcement problem, not a reading problem.

**What these cases share.** The harm comes from *deadlines, automatic effects and conditional charges* (notice windows, exercise windows, "if resident vacates prior to one year…"). Dense legal language people couldn't understand plays a smaller role. In the forum cases people mostly *didn't notice* the term; they don't say they *couldn't understand* it.

---

## 2. Clause types that matter most, ranked

The ordering is the agent's judgment, because the sources use different populations, years and metrics.

| Rank | Clause type | Why it ranks here |
|---|---|---|
| 1 | Auto-renewal / cancellation window | Only national complaint series that is recent and rising (FTC). Billion-dollar enforcement. Four first-person cases of $6k–$21k. |
| 2 | Payment terms / nonpayment (freelance) | 62–91% incidence among NY freelancers; losses up to $10k. Mostly an enforcement problem. |
| 3 | Rental late fees and fee stacking | CFPB: average fee $85; ~60% of renters with any late fee had 2+ in 12 months. |
| 4 | Security deposit / lease-break | 60% of surveyed CA tenants reported unfair withholding; data is from 2012–13 and snippet-only. |
| 5 | Non-compete | ~30M US workers bound (FTC). Harm figures are projections; the FTC rule is not in effect. |
| 6 | Arbitration / class-action waiver | ~90% of consumer arbitration clauses bar class actions (CFPB 2015). |
| 7–8 | Liability cap, indemnity | #1–2 most-negotiated for SMEs (WorldCC, snippet). Courts enforce caps. High harm per incident, no frequency data. |
| — | IP assignment, unilateral change/termination, kill fees, fee escalators | **No measured data found.** IP has anecdotes only. |

---

## 3. Where existing tools are weak

- **Price cliff.** Free tools cap out at 1–3 analyses. Rocket Lawyer is $149/yr, as a subscription with a trial that converts to paid. Superlegal starts at $999/mo. No pay-per-document option for individuals turned up, though that may simply be a gap in what the agent read.
- **Trust and accuracy.** This is the recurring complaint category. Spellbook reviewers report inaccurate citations (snippet). The FTC issued a $193k order against DoNotPay for unverified "robot lawyer" claims. Redline's exact-source-sentence and document-only Q&A design targets this weakness. However, no evidence shows users choose tools on this basis, and no one checked whether competitors already do it.
- **Billing and subscription friction.** This is the main complaint for consumer brands (DoNotPay is 1.7/5 on Trustpilot from 384 reviews).
- **Lawyer-oriented tools** (Spellbook, Juro, Robin) need Word or a sales demo and are not built for a lay reader.
- **Not a weakness:** the core features themselves. A Rocket Lawyer plan already includes red-flag review, a dozen free Product Hunt tools already flag clauses, explain them and suggest rewrites, and free ChatGPT accepts uploads.

---

## 4. Who would pay, and roughly what

- **What lawyers charge, per document:** freelance contract ~$360–$400, lease ~$500–$1,000, employment offer $175–$1,500, creator brand deal $300–$500 (mostly from marketplace or vendor pages).
- **What competing tools charge:** free tiers, ~$3 per contract, $10–$30/mo, Law Insider from $29/mo, Rocket Lawyer $149/yr. **This is the price range Redline would actually compete in**, not the lawyer range.
- **Where people stop paying:** sources advise doing it yourself for contracts under ~$5k or under ~10 pages. One forum user paid $300–$400 to review a contract for a $100–$200 gig and implied it wasn't worth it.
- **Segments ranked by evidence:**
  - Small-business buyers of SaaS and B2B subscriptions have the strongest pain evidence: auto-renewals of $6k–$21k, where a $20–$50 check would easily pay for itself. That is an inference from the cases above, not measured willingness to pay.
  - Freelancers have high pain but mostly an enforcement problem, and only 28% regularly use written contracts.
  - Tenants, employees and creators: pain is plausible, but no data on willingness to pay was found.
- **No direct evidence that anyone would pay for AI contract review was found anywhere.**

---

## 5. What contradicts the hypothesis

Plainly: **the evidence supports the pain, not the product as currently specified.**

1. **The features are already commodities.** Summary, risk flags, rewrites and Q&A over a document are available free or cheap from at least a dozen tools and from general chatbots. The sources claiming chatbots aren't good enough are mostly competitors with an interest in saying so. No measured accuracy gap was found.
2. **Much of the harm isn't a comprehension problem.**
   - Nonpayment is enforcement: fewer than 1% of freelancers use the legal system.
   - Deposit loss is a remedy gap: tenants win over 70% of cases that reach judgment, yet landlords are penalized in only 3.5%.
   - Liability caps are enforced regardless of whether the reader noticed them.
   - Auto-renewal complaints to the FTC are mostly about cancellation flows, not contract text.

   Reading the contract better doesn't fix these.
3. **Knowing isn't leverage.** A tenant or small freelancer often can't negotiate. A drafted counteroffer is only useful if the other side will negotiate, and the IP-clause case ended with the freelancer walking away.
4. **People don't open contracts.** Only 1–2 in 1,000 software buyers opened the license agreement. A tool the user has to choose to open before signing faces the same behavior.
5. **Low frequency, low willingness to pay.** Leases, offers and brand deals are signed rarely, and people do it themselves below ~$5k stakes. That points to occasional per-document use, not a subscription. Clio's own data says cost isn't the main reason people skip lawyers.
6. **Regulatory risk.** The FTC acted against DoNotPay over "AI lawyer" claims.

**Where the evidence does point.** The single sharpest, best-supported, highest-dollar pain is **small businesses missing renewal and notice deadlines in B2B/SaaS contracts**. The fix that evidence suggests is *finding and tracking those deadlines*, more than explaining them in plain English. That is a narrower and different product from the current Redline concept. It is offered as a reading of the evidence, not a recommendation to pivot.

**Before writing a PRD, close these gaps:**
- Reddit-sourced pain, which no agent could reach.
- Any direct evidence of willingness to pay.
- Whether competitors already offer grounded Q&A and per-clause counteroffers.
- Usage-frequency data.
