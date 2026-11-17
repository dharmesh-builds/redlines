import { ContractDemo } from "./contract-demo";

const TRY_HREF = "/app";
const FORMATS = "PDF with selectable text, Word (.docx), plain text, or paste it in.";

export default function Home() {
  return (
    <>
      <header className="site-head">
        <a href="/" className="wordmark">
          Redline
        </a>
        <a href={TRY_HREF} className="head-link">
          Try it on your contract
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">See the clauses that cost money, before you sign.</h1>
            <p className="lede">
              Redline ranks the risky clauses in your SaaS or vendor agreement by cost and quotes the
              sentence behind each.
            </p>
            <a href={TRY_HREF} className="cta">
              Try it on your contract
            </a>
            <p className="formats formats-hero">{FORMATS}</p>
          </div>
          <ContractDemo />
          <p className="formats formats-after">{FORMATS}</p>
        </section>

        <section className="band" aria-labelledby="verbatim-title">
          <div className="band-copy">
            <h2 id="verbatim-title">If the sentence isn&rsquo;t in your contract, the flag doesn&rsquo;t appear.</h2>
            <p>
              Before Redline shows you anything, it looks for the quoted sentence in your document. Spacing
              and quote marks may differ, but a single changed word fails the check, and the flag is
              dropped.
            </p>
          </div>
          <div className="proof" aria-label="Two quotes checked against the sample agreement">
            <div className="slip">
              <p className="slip-quote">
                &ldquo;This Agreement renews automatically for successive twelve-month terms unless either
                party gives written notice&hellip;&rdquo;
              </p>
              <p className="slip-result pass">Found in section 3. Shown.</p>
            </div>
            <div className="slip">
              <p className="slip-quote struck">
                &ldquo;Provider may end this Agreement at any time without notice.&rdquo;
              </p>
              <p className="slip-result fail">Not in the document. Dropped.</p>
            </div>
          </div>
        </section>

        <section className="band band-fine" aria-labelledby="fine-title">
          <div className="band-copy">
            <h2 id="fine-title">When nothing costs you extra, it says so first.</h2>
            <p>
              When there is nothing at high or medium severity, the report opens
              with one plain line, and the minor clauses sit folded underneath it. If the agreement points
              to other documents, that line names them, so you know what wasn&rsquo;t read.
            </p>
          </div>
          <div className="verdict-sheet">
            <p className="verdict">
              Nothing in this document costs you money beyond what you agreed to. It also refers to
              Provider&rsquo;s Acceptable Use Policy, which Redline hasn&rsquo;t read.
            </p>
            <p className="folded">2 low-severity flags, folded</p>
            <p className="sheet-caption">Sample report for an invented agreement.</p>
          </div>
        </section>

        <section className="band band-limits" aria-labelledby="limits-title">
          <h2 id="limits-title">What Redline doesn&rsquo;t do</h2>
          <ul className="limits">
            <li>
              <strong>It doesn&rsquo;t tell you whether to sign.</strong> It shows what the agreement says and
              what it could cost.
            </li>
            <li>
              <strong>It isn&rsquo;t legal advice.</strong> It answers only from your document. Ask it
              something the document doesn&rsquo;t cover and it says so.
            </li>
            <li>
              <strong>It can&rsquo;t read scans or photos.</strong> Redline needs text it can quote exactly, so
              image-only files get a &ldquo;not supported&rdquo; message.
            </li>
            <li>
              <strong>It&rsquo;s built for SaaS, vendor and subscription agreements.</strong> It doesn&rsquo;t
              cover leases, job offers or freelance contracts.
            </li>
          </ul>
        </section>

        <section className="close" aria-labelledby="close-title">
          <h2 id="close-title">Bring the agreement you&rsquo;re about to sign.</h2>
          <a href={TRY_HREF} className="cta">
            Try it on your contract
          </a>
          <p className="formats">
            {FORMATS} The file is read in your browser; only its text is stored.
          </p>
        </section>
      </main>

      <footer className="site-foot">
        <p>Redline. The agreement and figures on this page are samples written for the demonstration.</p>
      </footer>
    </>
  );
}
