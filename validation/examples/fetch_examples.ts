#!/usr/bin/env tsx
/**
 * Fetch example commits for manual review of validation results.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface Example {
  name: string;
  category: string;
  project: string;
  sha: string;
  score: number;
  description: string;
}

const examples: Example[] = [
  // True Positives - high score, actually buggy
  {
    name: "true_positive_1_dubbo",
    category: "TRUE POSITIVE",
    project: "apache/incubator-dubbo",
    sha: "95ebfe8b5a93942d3c3928ad5e9cd4709c76886a",
    score: 72.5,
    description: "High score (72.5), confirmed bug-introducing commit",
  },
  {
    name: "true_positive_2_gocd",
    category: "TRUE POSITIVE",
    project: "gocd/gocd",
    sha: "d1b056af5b5177ac1fa8c2e49ce39cf8a9786083",
    score: 45,
    description: "High score (45), confirmed bug-introducing commit",
  },
  {
    name: "true_positive_3_zaproxy",
    category: "TRUE POSITIVE",
    project: "zaproxy/zaproxy",
    sha: "6d68f2b657fccca3c226a99e92a2969dcbe7f356",
    score: 45,
    description: "High score (45), confirmed bug-introducing commit",
  },

  // False Negatives - low score, but actually buggy
  {
    name: "false_negative_1_datepicker",
    category: "FALSE NEGATIVE",
    project: "wdullaer/MaterialDateTimePicker",
    sha: "288f0a9c4b01ffcedf9fec41dd7c0373ee55f277",
    score: 0,
    description: "Score 0, but this commit introduced a bug",
  },
  {
    name: "false_negative_2_cas",
    category: "FALSE NEGATIVE",
    project: "apereo/cas",
    sha: "d0024e28889e597c03a059296f35a4360c5b11e6",
    score: 5,
    description: "Score 5, but this commit introduced a bug",
  },

  // False Positives - high score, but clean (random commit, not known buggy)
  {
    name: "false_positive_1_jsonpath",
    category: "FALSE POSITIVE",
    project: "json-path/JsonPath",
    sha: "b6c60b3deef74a83eaa92c8dca7d0bc097e957cd",
    score: 45,
    description: "Score 45, but this is a random commit (not known to be buggy)",
  },
  {
    name: "false_positive_2_flyway",
    category: "FALSE POSITIVE",
    project: "flyway/flyway",
    sha: "81bd9f856f6769e276dab518cea5a592b83f43ae",
    score: 37.5,
    description: "Score 37.5, but this is a random commit (not known to be buggy)",
  },

  // True Negatives - low score, actually clean
  {
    name: "true_negative_1_datepicker",
    category: "TRUE NEGATIVE",
    project: "wdullaer/MaterialDateTimePicker",
    sha: "f849a5c2704c974ba182fe4e2e205fa7f4fd395d",
    score: 0,
    description: "Score 0, random commit (not known to be buggy)",
  },
  {
    name: "true_negative_2_gocd",
    category: "TRUE NEGATIVE",
    project: "gocd/gocd",
    sha: "c5e64baaef81ad3fb8f154505f298c25b72c215d",
    score: 0,
    description: "Score 0, random commit (not known to be buggy)",
  },
];

async function fetchCommit(project: string, sha: string): Promise<string> {
  try {
    const result = execSync(
      `gh api repos/${project}/commits/${sha} --jq '.message as $msg | .files[] | "--- \\(.filename) (\\(.status)) ---\\nadditions: \\(.additions), deletions: \\(.deletions), changes: \\(.changes)\\n\\(.patch // "no patch available")\\n"'`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );

    // Also get commit message
    const msg = execSync(
      `gh api repos/${project}/commits/${sha} --jq '.commit.message'`,
      { encoding: "utf-8" }
    ).trim();

    return `Commit message: ${msg}\n\n${result}`;
  } catch (error) {
    return `Error fetching commit: ${error}`;
  }
}

async function main() {
  const outDir = path.dirname(new URL(import.meta.url).pathname);

  for (const ex of examples) {
    console.log(`Fetching ${ex.name}...`);

    const content = await fetchCommit(ex.project, ex.sha);

    const header = `# ${ex.category}: ${ex.project}
# SHA: ${ex.sha}
# Our Score: ${ex.score}
# ${ex.description}
# GitHub: https://github.com/${ex.project}/commit/${ex.sha}

`;

    const filePath = path.join(outDir, `${ex.name}.txt`);
    fs.writeFileSync(filePath, header + content);
    console.log(`  Saved to ${ex.name}.txt`);
  }

  // Create summary
  const summary = examples.map(ex =>
    `- [${ex.category}] ${ex.name}.txt - Score ${ex.score} - ${ex.project}`
  ).join("\n");

  fs.writeFileSync(path.join(outDir, "README.md"), `# Validation Examples

These files contain actual commit diffs from our validation run against the GHPR dataset.

## Categories

- **TRUE POSITIVE**: High score AND actually introduced a bug (we correctly flagged it)
- **FALSE NEGATIVE**: Low score BUT actually introduced a bug (we missed it)
- **FALSE POSITIVE**: High score BUT not known to be buggy (we may have over-flagged)
- **TRUE NEGATIVE**: Low score AND not known to be buggy (correctly ignored)

## Files

${summary}

## Notes

The "clean" commits are random commits from the same repositories. They may or may not
contain bugs - we just don't have labels for them. So "false positives" here may actually
be true positives that weren't in the labeled dataset.
`);

  console.log("\nDone! Created README.md with summary.");
}

main();
