import { expect, it } from "vitest";
import { analyze } from "../../lib/analysis";
import { createOpenRouterModel } from "../../lib/model/openrouter";
import { fixtureText } from "../support/scripted-model";

// Real model, real adapter, real verbatim check. Prints what survived.
it("analyses the adhesion fixture with the real model", async () => {
  const document = fixtureText("adhesion-contract");
  const report = await analyze(document, [], createOpenRouterModel());

  const lines = [`Model: ${report.modelId}`, ""];
  report.flags.forEach((flag, i) => {
    lines.push(`${i + 1}. [${flag.severity} severity, ${flag.exposure.kind}] [${flag.clauseType}] ${flag.explanation}`);
    lines.push(`   Exposure: ${flag.exposure.statement}`);
    for (const sentence of flag.sourceSentences) lines.push(`   > ${sentence}`);
    lines.push("");
  });
  lines.push(
    `Candidates: ${report.candidateFlagCount}`,
    `Verified:   ${report.flags.length}`,
    `Dropped:    ${report.droppedFlagCount}`,
  );
  console.log(lines.join("\n"));

  expect(report.flags.length + report.droppedFlagCount).toBe(report.candidateFlagCount);
});
