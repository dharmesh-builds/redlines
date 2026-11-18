// The verdict line (ticket 05, ADR 0005, ADR 0006). Computed by code from the
// verified, ranked flags; the model never supplies it. It is present only when
// no flag is High or Medium, so a reassuring line never sits above a real
// risk. When the document refers to outside terms, it names each one as
// unread, so "nothing in this document" never overclaims for terms that live
// elsewhere.

import type { Severity } from "./exposure";
import type { IncorporatedTermShown } from "./summary";

export const VERDICT_COPY = {
  clean: "Nothing in this document costs you money beyond what you agreed to.",
  unreadOne: (name: string) => `It also refers to ${name}, which Redline hasn't read.`,
  unreadMany: (names: string) => `It also refers to ${names}. Redline hasn't read them.`,
} as const;

export type Verdict =
  | { present: false }
  | {
      present: true;
      // The descriptions of every verified incorporated-term reference, in
      // document order. Each is backed by a sentence that passed the verbatim check.
      unreadTerms: string[];
      text: string;
    };

/** "A", "A and B", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function computeVerdict(
  flags: readonly { severity: Severity }[],
  incorporatedTerms: readonly IncorporatedTermShown[],
): Verdict {
  if (flags.some((f) => f.severity === "high" || f.severity === "medium")) return { present: false };
  const unreadTerms = incorporatedTerms.map((t) => t.description.trim());
  let text: string = VERDICT_COPY.clean;
  if (unreadTerms.length === 1) text += ` ${VERDICT_COPY.unreadOne(unreadTerms[0])}`;
  else if (unreadTerms.length > 1) text += ` ${VERDICT_COPY.unreadMany(joinNames(unreadTerms))}`;
  return { present: true, unreadTerms, text };
}
