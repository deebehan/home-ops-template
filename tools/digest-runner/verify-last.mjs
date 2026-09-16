// tools/digest-runner/verify-last.mjs
// Run the mechanical checks over the most recent digest in runs/ — or a named
// one: `npm run verify:last -- 2026-09-14`. No API key, no network, no cost.
//
// This is the same battery the Sunday run applies to its own draft before
// sending, so it also answers "would this week's digest have passed?" for any
// digest already in the record.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks, failures, blocking } from "./checks.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNS = join(REPO, "stages", "01_weekly-digest", "runs");

const wanted = process.argv[2];
const stamps = readdirSync(RUNS)
  .filter((f) => f.endsWith("-digest.md"))
  .map((f) => f.replace("-digest.md", ""))
  .sort();
const stamp = wanted ?? stamps.at(-1);
if (!stamp || !stamps.includes(stamp)) {
  console.error(`No digest for "${stamp}". Available: ${stamps.join(", ") || "none"}`);
  process.exit(1);
}

const digest = readFileSync(join(RUNS, `${stamp}-digest.md`), "utf8");
const collected = readFileSync(join(RUNS, `${stamp}-collected.md`), "utf8");
const [emailPart, rest = ""] = digest.split("---SMS---");
const email = emailPart.replace(/^Subject:.*\n/, "").trim();
const sms = rest.split("---VERIFY---")[0].trim();

const results = runChecks({
  email, sms, collected,
  household: readFileSync(join(REPO, "_shared", "household.md"), "utf8"),
});

console.log(`\nVerifying ${stamp}\n`);
for (const r of results) {
  const tag = r.ok ? "pass" : r.severity === "blocking" ? "FAIL" : "warn";
  console.log(`  ${tag.padEnd(4)}  ${r.rule.padEnd(20)} ${r.detail}`);
}
const bad = failures(results);
console.log(`\n${bad.length} finding(s), ${blocking(results).length} blocking\n`);
process.exit(blocking(results).length ? 1 : 0);
