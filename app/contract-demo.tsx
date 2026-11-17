"use client";

import { useId, useState } from "react";

type Severity = "high" | "medium" | "low";

type Flag = {
  id: string;
  severity: Severity;
  confidence: "High" | "Medium" | "Low";
  confidenceReason?: string;
  title: string;
  says: string;
  exposure: string;
  askFor: string;
};

type Clause = {
  number: string;
  heading: string;
  before?: string;
  preamble?: string;
  quote?: string;
  after?: string;
  flag?: Flag;
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High severity",
  medium: "Medium severity",
  low: "Low severity",
};

// Sample agreement written for this page. Every figure is synthetic.
const CLAUSES: Clause[] = [
  {
    number: "1",
    heading: "Services.",
    before:
      "Provider will make the Platform available to Customer as described in the Order Form, for the number of seats listed there.",
  },
  {
    number: "2",
    heading: "Fees.",
    before:
      "Customer will pay $640 per month, invoiced annually in advance.",
  },
  {
    number: "3",
    heading: "Term and renewal.",
    preamble: "The initial term is twelve months from the Start Date. ",
    quote:
      "This Agreement renews automatically for successive twelve-month terms unless either party gives written notice of non-renewal at least ninety days before the end of the then-current term.",
    flag: {
      id: "renewal",
      severity: "high",
      confidence: "High",
      title: "Renews for a year unless you cancel 90 days early",
      says: "Miss the notice date and you owe another twelve months.",
      exposure: "$640 × 12 = $7,680",
      askFor: "Thirty days' notice instead of ninety.",
    },
  },
  {
    number: "4",
    heading: "Support.",
    before:
      "Provider will respond to support requests submitted through the Platform within one business day and will use reasonable efforts to resolve them promptly.",
  },
  {
    number: "5",
    heading: "Customer data.",
    before:
      "Customer owns all data it uploads to the Platform. Provider will process that data only to provide the Services and will delete it within sixty days after this Agreement ends.",
  },
  {
    number: "6",
    heading: "Late payment.",
    quote: "Overdue amounts accrue a late charge as set out in Provider's Billing Policy.",
    after: " Provider may suspend access while any amount is overdue.",
    flag: {
      id: "late",
      severity: "medium",
      confidence: "Low",
      confidenceReason: "it points to a document Redline hasn't read",
      title: "Late charge set somewhere else",
      says: "The amount isn't in this agreement. It's in Provider's Billing Policy, which Redline hasn't read.",
      exposure: "Not stated in this document",
      askFor: "The late charge written into section 6, with a cap.",
    },
  },
  {
    number: "7",
    heading: "Confidentiality.",
    before:
      "Each party will protect the other party's Confidential Information with at least reasonable care and use it only to perform this Agreement.",
  },
  {
    number: "8",
    heading: "Warranty.",
    before:
      "Provider warrants that the Platform will perform materially as described in its documentation. Customer's remedy for a breach of this warranty is correction of the defect.",
  },
  {
    number: "9",
    heading: "Governing law.",
    quote:
      "This Agreement is governed by the laws of the State of Delaware, and the parties submit to the exclusive jurisdiction of its courts.",
    flag: {
      id: "law",
      severity: "low",
      confidence: "High",
      title: "Disputes go to Delaware courts",
      says: "Any court case under this agreement is heard in Delaware.",
      exposure: "No amount in this clause",
      askFor: "Courts in your home state.",
    },
  },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className="check">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ContractDemo() {
  const [open, setOpen] = useState<string>("renewal");
  const base = useId();

  return (
    <figure className="sheet-wrap" aria-label="Sample contract with Redline's flags">
      <div className="sheet">
        <h2 className="sheet-title">Subscription Agreement</h2>
        <p className="sheet-note">A sample with invented parties and figures.<span className="omitted"> Section 1 left out.</span></p>
        {CLAUSES.map((c) => {
          const f = c.flag;
          const isOpen = f ? open === f.id : false;
          const noteId = f ? `${base}-${f.id}` : undefined;
          return (
            <div
              key={c.number}
              className={`clause${f ? " has-flag" : ""}${isOpen ? " is-open" : ""}${c.number === "1" ? " lead-clause" : ""}`}
            >
              <p>
                <span className="clause-no">{c.number}.</span> <strong>{c.heading}</strong>{" "}
                {c.before}
                {c.preamble && <span className="preamble">{c.preamble}</span>}
                {c.quote && <mark className={isOpen ? "on" : undefined}>{c.quote}</mark>}
                {c.after}
              </p>
              {f && (
                <>
                  <button
                    type="button"
                    className={`tab tab-${f.severity}`}
                    aria-expanded={isOpen}
                    aria-controls={noteId}
                    onClick={() => setOpen(isOpen ? "" : f.id)}
                  >
                    {SEVERITY_LABEL[f.severity]}
                  </button>
                  <div id={noteId} className={`note note-${f.severity}`} hidden={!isOpen}>
                    <p className="note-title">{f.title}</p>
                    <p className="note-says">{f.says}</p>
                    <dl className="note-facts">
                      <div>
                        <dt>Exposure</dt>
                        <dd className="num">{f.exposure}</dd>
                      </div>
                      <div>
                        <dt>Confidence</dt>
                        <dd>
                          {f.confidence} confidence
                          {f.confidenceReason && <span className="reason">: {f.confidenceReason}</span>}
                        </dd>
                      </div>
                      <div>
                        <dt>Ask for</dt>
                        <dd>{f.askFor}</dd>
                      </div>
                    </dl>
                    <p className="note-verified">
                      <CheckIcon /> Quoted word for word from section {c.number}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
        <p className="folio">Page 1 of 4</p>
      </div>
    </figure>
  );
}
