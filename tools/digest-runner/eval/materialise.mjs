// tools/digest-runner/eval/materialise.mjs
// Writes every eval case out as the collected file the model will actually be
// handed, so the inputs can be read before anyone spends money on them.
// Costs nothing, calls nothing.   npm run eval:cases

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CASES } from "./cases.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DIR = join(REPO, "outputs", "eval-cases");
mkdirSync(DIR, { recursive: true });

const index = [`# Eval cases (${CASES.length})`, "",
  "Every input the eval will hand the real compose prompt. Read these before",
  "signing off — the number the eval produces is only worth the cases behind it.",
  "", "| case | rule it exists for | week | expectations |", "|---|---|---|---|"];

for (const c of CASES) {
  writeFileSync(join(DIR, `${c.id}.md`),
    `<!-- CASE: ${c.id}\n     RULE: ${c.rule}\n     WHY:  ${c.why}\n` +
    `     WEEK: Monday ${c.monday}\n` +
    (c.expect ?? []).map((e) => `     EXPECT: ${e.name} — ${e.why}`).join("\n") +
    `\n-->\n\n${c.collected}`);
  index.push(`| [${c.id}](${c.id}.md) | ${c.rule} | ${c.monday} | ${(c.expect ?? []).map((e) => e.name).join("; ") || "battery only"} |`);
}

writeFileSync(join(DIR, "README.md"), index.join("\n") + "\n");
console.log(`Wrote ${CASES.length} cases to outputs/eval-cases/`);
for (const c of CASES) console.log(`  ${c.id.padEnd(22)} ${c.rule}`);
