# ADR 0002: v1 serves small-business SaaS buyers, not freelancers

Status: Accepted, 2026-11-17

## Decision
- **Who it's for:** small businesses reviewing vendor, SaaS and B2B subscription agreements they are about to sign.
- **Who it's not for: freelancers.** This is the segment people will most expect a "contract tool for the little guy" to serve. The brief says so explicitly.
- **Deadlines are flagged, not tracked.** Notice and renewal clauses are a top-severity flag class, and the summary states the exact deadline with its source sentence. Redline does not remind anyone later. The 7 in-scope features stay as they are.

## Alternatives
- **Freelancers.** Vivid stories, but the main harm is non-payment, which is an enforcement problem: fewer than 1% use the legal system, and only 28% use written contracts. Many freelancer risks are *missing* clauses (no payment deadline, no kill fee), which ADR 0001 cannot flag.
- **Tenants.** Common pain, but tenants rarely have leverage, which makes counter-offers (feature 4) close to useless.
- **Employees.** Documents are signed rarely and the stakes vary wildly.
- **Add deadline reminders as feature 8.** This is what the evidence points to, but it widens scope before the trust case is proven. Not requested.

## Why
- Strongest and most consistent evidence in `research/summary.md`: four first-person auto-renewal losses of $6k–$21k, and a rising FTC complaint series.
- The highest dollars per mistake, so a $20–$50 check easily pays for itself.
- These buyers can usually negotiate with a vendor, so a drafted counter-offer has someone to go to.

## Consequences
- **What we give up: the harm happens months after signing.** The Costar and Birdeye reviewers lost money when a window closed, not when they signed. Redline catches the clause at signing and then goes quiet. A user who reads the flag and forgets it is not protected. This is a known gap, not an oversight.
- **Freelancer-shaped requests are out of scope.** Examples: payment chasing, IP portfolio protection, kill-fee templates.
- **The flag taxonomy and severity order are tuned for B2B agreements** (renewal, termination, price escalators, liability, indemnity, data), not leases or offers.
- **Leverage is assumed.** Counter-offers are written as if the vendor will negotiate. For click-through SaaS terms they may not, which is still open.
