# Redline: product brief (v1)

Date: 2026-11-17. Decisions behind this brief: `docs/adr/0001`–`0005`. Terms are defined in `GLOSSARY.md`. Evidence comes from `research/summary.md` and the four reports next to it.

This version exists to prove that the analysis can be trusted. Wherever a choice traded usefulness against trust, this brief chose trust.

---

## 1. Who this is for

**A small business about to sign a vendor, SaaS or B2B subscription agreement.** The research shows this as a business customer facing a renewal of roughly $6k–$21k a year. The person reading has no lawyer reviewing the contract before signing. That is an inference: the cases describe a lawyer being brought in only *after* the loss.

**What they do today instead:**
- **They don't open it.** "Of about 48,000 visitors to 90 software vendor sites, only one or two per 1,000 accessed the license agreement" (Bakos, Marotta-Wurgler and Trossen, via `research/what-goes-wrong.md` §9; search summary only).
- **They find the term on the invoice.** "The renewal invoice arrived just after the cancellation window closed" (CoStar reviewer, `research/who-has-the-pain.md` §3).
- **They pay a lawyer after the fact.** In one case "a lawyer's demand letter made CoStar drop the renewal and void the invoices" (§2). No source says what that letter cost.
- **What they could already use:** free chatbots that accept uploads, and a dozen free tools that already flag clauses (`research/summary.md` §3). The research found no measured accuracy gap between those tools and what Redline would do.

**Who this is not for: freelancers.** They are the audience people will most expect. Section 6 explains the reason.

## 2. The problem

The harm comes from **terms that act on a deadline or automatically**: renewals, notice windows and price increases. The people affected mostly say they *didn't notice* the term. They don't say they couldn't understand it.

> "Costar T&C has a buried auto-renew that renews your contract 60 days PRIOR to expiry with no notification"
> — https://www.trustpilot.com/review/costar.com (about $21,000, per the reviewer)

> "I discovered that I had missed a 90-day cancellation window"
> — https://www.trustpilot.com/review/birdeye.com ($778/month for 12 months)

> "a link to which was buried within the ultra-fine print of my subscription agreement"
> — https://www.trustpilot.com/review/costar.com (termination terms behind a link; renewal rose from over $6,200 to over $6,500)

The FTC received nearly 70 complaints a day about negative-option and recurring-subscription practices in 2024, up from 42 in 2021 (https://www.ftc.gov/news-events/news/press-releases/2024/10/federal-trade-commission-announces-final-click-cancel-rule-making-it-easier-consumers-end-recurring). Those complaints are mostly about cancellation flows, not contract text. Better reading does not fix them.

**The harm lands months after signing, not at signing.** Redline acts only at signing (see section 6).

## 3. What v1 does

1. **Upload and parse in the browser, or paste the text** (paste approved 2026-11-18).
   - Only the extracted text is stored, never the file.
   - A scanned or image-only file gets a clear "not supported" message. No OCR.
2. **Plain-English summary.**
   - It states every deadline flag's deadline, with its source sentence.
   - It lists every **incorporated term**: outside documents the contract pulls in, such as online terms, an MSA, a DPA or an SLA. Each is cited and marked as not read by Redline.
3. **Flags, ranked by severity.**
   - Each flag shows its verified source sentence, its exposure figures, a confidence label (High / Medium / Low) and a plain explanation.
   - When there are no High or Medium flags, the report leads with a **verdict line**, with Low flags folded underneath. If the document refers to outside terms, the verdict line names them as unread (ADR 0006).
4. **A drafted counter-offer for each flag.** Two parts: the rewritten clause, and a short email-ready request to the vendor. Every flag gets one; the user decides whether to send it. Some will be unsendable for click-through terms (see section 8).
5. **Question box.**
   - Answers come only from the document, and each answer cites its source sentence.
   - If the document doesn't answer, it says so. No general legal knowledge.
6. **Editable red-line list.**
   - The user's red lines can add flags or raise severity.
   - They can never lower or hide a flag.
7. **Saved library** of the user's past documents. It is per user, with Supabase row-level security on.

Nothing else is in v1.

## 4. What good looks like

Every item below is a test that passes or fails. Most need a **labelled fixture set**, which doesn't exist yet: real or realistic SaaS agreements where a person has marked each risky clause, its severity, the deadlines and any incorporated terms. Building that set is the first piece of work. Without it, none of the quality tests can run.

**Trust (any failure is a bug):**
- **T1. Verbatim citations.** Every flag's source sentence appears verbatim in the stored text, after whitespace, quote-mark and hyphenation normalization only. A single exception fails the build.
- **T2. Fabrication rejected.** A flag that quotes text not in the document is dropped and never shown.
- **T3. Figures traceable.** Every number in an exposure figure appears in a source sentence, or is shown arithmetic on quoted numbers ("$778 × 12").
- **T4. Questions outside the document get a refusal.** For example, "Is this enforceable in California?" or "Is this a normal price?" when the document doesn't say. Every such question gets "the document doesn't say", never an answer.
- **T5. Red lines only add or raise.** Adding any red line never removes a flag and never lowers a severity.

**Analysis quality (on the fixture set):**
- **Q1. No missed High flags.** Every clause hand-labelled High is flagged. The bias is toward false alarms, so this target is 100%, and misses count against it more than false alarms do.
- **Q2. Deadlines exact.** For every labelled notice, renewal or cancellation window, the summary states the same number of days and the same reference point as the label ("90 days before the renewal date").
- **Q3. False alarms counted, not capped.** Record the false-alarm rate for each document. It is tolerated, but tracked so the trend is visible.
- **Q4. Verdict line correct.** A fixture with no High or Medium labels shows the verdict line. A fixture with any High flag never shows it. A fixture with incorporated terms names every one of them in the verdict line.
- **Q5. Incorporated terms found.** Every labelled reference to outside terms appears in the summary with its source sentence.
- **Q6. Counter-offers on target.** Each counter-offer quotes the clause it replaces, changes only that clause, and includes a request to the vendor that asks only for that change.

**Not yet testable:**
- **Q7. Confidence labels follow the rules.** Each label matches the deterministic rules in section 5. The same input always gives the same label, whichever model `OPENROUTER_MODEL` names.

## 5. Red lines: what gets flagged, and how severely

**Severity is worst-case money exposure, using only figures in the document** (ADR 0003).

| Severity | Rule |
|---|---|
| **High** | Exposure is **unbounded** (no cap stated). Or the stated exposure is **at least 12 months of the contract's fees**. |
| **Medium** | Exposure is **unquantified**: the clause costs money, but the document gives no figure. Or the stated exposure is below the High line. Within Medium, unquantified ranks first. |
| **Low** | Boilerplate: one-sided clauses with no direct money exposure. Always shown. |

The user's own red lines can push any clause up to High.

| Clause | Usual severity | Why it matters | Evidence |
|---|---|---|---|
| **Auto-renewal and notice / cancellation window** (a deadline flag) | High when the renewal fee is stated and is ≥ 12 months of fees; otherwise Medium (unquantified) | This is where every first-person loss in the research came from. | Strong: four Trustpilot cases at $6k–$21k, plus the FTC complaint trend. |
| **Price increase on renewal / escalator** | High if uncapped; otherwise by the stated percentage × fees | Birdeye renewed with a 5% increase and no advance notice of the amount. CoStar rose from over $6,200 to over $6,500. | Two anecdotes. No frequency data. |
| **Vendor can change terms on its own** | High (unbounded: the user can't know what they'll be bound by) | It makes every other flag provisional. | No measured data. Inferred from the CoStar "link in the fine print" case. |
| **Indemnity owed by the buyer** | High if uncapped | The largest worst-case loss in a SaaS contract. | Ranked #2 most-negotiated for SMEs (WorldCC, **snippet only, unverified**). No harm or frequency data. |
| **Limitation of liability (vendor caps its own)** | Medium; the cap amount sets it | Courts enforce caps whether or not the reader noticed. Reading early is the only remedy. | Ranked #1 most-negotiated for SMEs (WorldCC, **snippet only**). No harm data. |
| **Minimum commitment / early-termination fee** | By the stated amount; High if ≥ 12 months of fees | It turns "we'll cancel if it's not a fit" into a full-term bill. | Birdeye §4: the reviewer decided the product was not a fit only after the window had passed (the research paraphrases this; it is not a quote). One case. |
| **Arbitration, class-action waiver, governing law and venue** | Low, always | They limit what the buyer can do *after* a dispute. Shown for completeness, never leading. | The ~90% figure is for **consumer** contracts (CFPB 2015). Nothing in the research covers B2B. |

**Confidence label (ADR 0006):** set by rules, never by the model's own rating.
- **Low** if the clause depends on a term the document doesn't define, refers to outside terms, or spans several clauses.
- **Medium** if the exposure is unquantified.
- **High** otherwise.

**Not flagged, by design (ADR 0001):** risk that comes from something *missing*, such as no termination right or no cap on price increases. There is no sentence to cite. Designing a treatment for these needs approval.

## 6. The calls, and what they cost

| # | Choice | Chosen against | Who is worse off |
|---|---|---|---|
| 1 | **Serve small-business SaaS buyers** | Freelancers, tenants, employees | **Freelancers.** Their worst harm is non-payment, which is enforcement, not reading: fewer than 1% use the legal system. Many of their risks are missing clauses, which can't be cited. |
| 2 | **Flag deadlines, don't track them** | Adding deadline reminders | **The buyer who reads the flag and forgets it.** The CoStar and Birdeye losses landed when the window closed, months after signing. Redline would have flagged those clauses and then said nothing more. |
| 3 | **Severity = money exposure** | High = "hurts you automatically unless you act" | **The buyer whose auto-renewal states no fee.** That clause ranks Medium (unquantified) and can sit below an uncapped indemnity that may never trigger. The segment was chosen *because of* auto-renewals, and this ranking doesn't guarantee they come first. |
| 4 | **Red lines raise, never suppress** | Letting users mute or lower flags | **The experienced buyer** who knows a clause is fine for them and still sees it every time. |
| 5 | **Boilerplate always shown at Low** | Silent unless it's on a red line | **Every reader.** Almost no SaaS contract will show zero flags. The "always finds problems" impression is held back only by the verdict line. |
| 6 | **More false alarms than misses** | Showing only flags that are certainly worth reading | **The reader's time, and Redline's credibility per flag.** Each flag cites a sentence, so dismissing one takes a minute. |
| 7 | **Confidence labels on each flag** | Plain statements that name the specific gap instead of hedging | **The user who learns that "Low confidence" means skip it.** Call 6 adds mostly uncertain flags, so the labels can quietly undo call 6. Labels are set by checkable rules, not by the model (ADR 0006). This trades away subtle ambiguity the rules don't catch. |
| 8 | **Verdict line when nothing is High or Medium** | A flat list with no verdict | **The user who reads only the top line.** |
| 9 | **Incorporated terms are a summary note, not a flag** | Flagging each reference as High | **The buyer whose dangerous terms live at the vendor's URL.** That is the CoStar §3 case exactly: "a link to which was buried within the ultra-fine print". With calls 8 and 9 together, an order form can get "nothing here costs you money" while its auto-renewal sits in terms Redline never read. **Resolved (ADR 0006):** the verdict line names the unread documents, so it no longer overclaims. The reference is still not a flag. |
| 10 | **Every flag cites its exact sentence** (ADR 0001) | Paraphrase, section references, uncited flags | **Anyone whose risk is something missing from the contract,** and real risks the model quotes imperfectly. Both are dropped. |

## 7. What we are not building

| Not building | Why |
|---|---|
| Payments and billing | Doesn't make the analysis more trustworthy, which is what v1 must prove. |
| OCR for scanned files | A citation is worthless if the text it points at was misread. |
| Sharing between users | Every table stays per user, with RLS. |
| Deadline tracking and reminders | Call 2. It is the fix the evidence points to most directly, so it's the first candidate after v1. It needs approval. |
| Analyzing an order form + MSA + DPA together | Call 9. Not requested. A scope change. |
| Fetching linked terms from URLs | Fetched text could change after analysis. Not requested. |
| Flags for missing clauses | ADR 0001: no sentence to cite. Needs its own design and approval. |
| "Off-market" or "unusual compared to other contracts" judgments | It needs knowledge outside the document, which breaks "state only what the document says". |
| Freelancer, tenant or employee features | Call 1. |

## 8. What the research could not tell us

- **Whether anyone would pay.** No direct evidence was found anywhere. The idea that SMB buyers would pay $20–$50 is an inference from the size of their losses.
- **Whether trust decides which tool people pick.** Redline is built on citations and document-only answers. No evidence shows that buyers choose tools for this, and **nobody checked whether competitors already do it.**
- **Whether these buyers would open Redline before signing.** Only 1–2 in 1,000 open a license agreement at all. A tool they have to choose to use faces the same behaviour.
- **Whether vendors negotiate with small buyers.** Feature 4 assumes they do. For click-through SaaS terms they may not. No data.
- **What lawyer review of a SaaS contract costs.** The research has prices for freelance contracts, leases and offers, but none for B2B subscriptions.
- **Harm or frequency data for indemnity, liability caps, unilateral changes and early-termination fees.** Their place in section 5 rests on negotiation rankings (unverified snippet) or on inference.
- **How often contracts point to outside terms.** Call 9 matters in proportion to this, and it is unmeasured.
- **Reddit.** It was blocked for every agent, so the forums most likely to show this pain are missing.
- **How often SMBs sign these agreements,** and therefore whether this is a per-document or subscription product.
