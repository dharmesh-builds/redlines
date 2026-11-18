import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { analyze } from "../../lib/analysis";
import { createOpenRouterModel } from "../../lib/model/openrouter";
import { loadLabelledFixtures } from "./labels";
import { formatEvalReport, scoreDocument, totalScores, type DocumentError, type DocumentScore } from "./metrics";

// `npm run eval`: the REAL OpenRouter adapter through the REAL analyze(), over
// every labelled fixture. It costs money, so it is never part of `npm test`.
// Fixtures come from tests/fixtures/, or from EVAL_FIXTURES_DIR when the
// labelled set lives outside the repo (ticket 13).

const DEFAULT_DIR = fileURLToPath(new URL("../fixtures/", import.meta.url));

it("scores every labelled fixture with the real model", async () => {
  const fixtures = loadLabelledFixtures(process.env.EVAL_FIXTURES_DIR || DEFAULT_DIR);
  const model = createOpenRouterModel();

  const scores: DocumentScore[] = [];
  const errors: DocumentError[] = [];
  for (const fixture of fixtures) {
    try {
      const report = await analyze(fixture.documentText, [], model);
      scores.push(scoreDocument(fixture.name, fixture.documentText, fixture.labels, report));
    } catch (err) {
      errors.push({ document: fixture.name, error: (err as Error).message });
    }
  }

  const totals = totalScores(scores, errors);
  console.log(formatEvalReport(process.env.OPENROUTER_MODEL ?? "(unset)", scores, errors, totals));
  expect(totals.passed, "The eval failed; see the report above.").toBe(true);
});
