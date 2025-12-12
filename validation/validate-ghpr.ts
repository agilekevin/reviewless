#!/usr/bin/env tsx
/**
 * Validation script for reviewless scoring against GHPR dataset.
 *
 * GHPR contains manually verified bug-fixing commits from GitHub PRs.
 * Each row has:
 * - SHA_BUG: the commit that introduced the bug (before the fix)
 * - SHA_FIXED: the commit that fixed the bug
 * - DIFF_CODE: the actual diff
 *
 * We score the diffs from bug-introducing commits vs random clean commits
 * to see if our scoring correctly identifies risky code.
 */

import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

// Import our analysis functions
import { calculateLikelihood } from "../src/likelihood.js";
import { calculateSeverity } from "../src/severity.js";
import type { PRFile } from "../src/github.js";

interface GHPRRow {
  projectOwner: string;
  projectName: string;
  language: string;
  shaFixed: string;
  shaBug: string;
  diffCode: string;
  oldPath: string;
  newPath: string;
}

interface ValidationResult {
  project: string;
  sha: string;
  isBuggy: boolean;
  ourScore: number;
  filesAnalyzed: number;
  likelihoodTotal: number;
  severityTotal: number;
}

function getGitHubToken(): string {
  if (process.env["GITHUB_TOKEN"]) {
    return process.env["GITHUB_TOKEN"];
  }
  try {
    return execSync("gh auth token", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error("No GitHub token available");
  }
}

function loadGHPRDataset(csvPath: string, limit: number = 100): GHPRRow[] {
  const content = fs.readFileSync(csvPath, "utf-8");

  // GHPR columns (no header):
  // 0: PROJECT_NAME, 1: PROJECT_OWNER, 2: PROJECT_DESCRIPTION, 3: PROJECT_LABEL
  // 4: PROJECT_LANGUAGE, 5: SHA_FIXED, 6: SHA_BUG, 7: DIFF_CODE
  // 8: COMMIT_DESCRIPTION, 9: COMMIT_TIME, 10: OLD_CONTENT, 11: NEW_CONTENT
  // 12: OLD_PATH, 13: NEW_PATH, 14: PR_TITLE, 15: PR_DESCRIPTION

  const records = parse(content, {
    columns: false,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  const rows: GHPRRow[] = [];
  const seenCommits = new Set<string>();

  for (const fields of records) {
    if (rows.length >= limit * 2) break; // Get enough unique commits
    if (fields.length < 14) continue;

    // Validate that we have valid SHA hashes (40 hex chars)
    const shaFixed = fields[5];
    const shaBug = fields[6];
    if (!/^[a-f0-9]{40}$/i.test(shaFixed) || !/^[a-f0-9]{40}$/i.test(shaBug)) {
      continue;
    }

    const key = `${fields[1]}/${fields[0]}@${shaBug}`; // owner/repo@shaBug
    if (seenCommits.has(key)) continue;
    seenCommits.add(key);

    rows.push({
      projectName: fields[0],
      projectOwner: fields[1],
      language: fields[4],
      shaFixed,
      shaBug,
      diffCode: fields[7],
      oldPath: fields[12],
      newPath: fields[13],
    });
  }

  console.log(`Loaded ${rows.length} unique bug-introducing commits from GHPR`);
  return rows.slice(0, limit);
}

async function fetchCommitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string
): Promise<PRFile[]> {
  try {
    const { data } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return (data.files ?? []).map((f) => ({
      filename: f.filename,
      status: f.status as PRFile["status"],
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
    }));
  } catch {
    return [];
  }
}

async function fetchRandomCleanCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  excludeSha: string
): Promise<{ sha: string; files: PRFile[] } | null> {
  try {
    // Get recent commits
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 30,
    });

    // Find a commit that's not the buggy one
    for (const commit of commits) {
      if (commit.sha !== excludeSha) {
        const files = await fetchCommitFiles(octokit, owner, repo, commit.sha);
        if (files.length > 0) {
          return { sha: commit.sha, files };
        }
      }
    }
  } catch {
    // Repo might not exist or be private
  }
  return null;
}

function analyzeCommit(files: PRFile[]): { score: number; likelihood: number; severity: number } {
  if (files.length === 0) {
    return { score: 0, likelihood: 0, severity: 0 };
  }

  let totalLikelihood = 0;
  let totalSeverity = 0;
  let maxScore = 0;
  let validFiles = 0;

  // Same skip patterns as analyzer.ts - focus on code files only
  const SKIP_PATTERN = /\.lock$|\.json$|\.xml$|\.gradle(\.kts)?$|\.toml$|\.ya?ml$|\.properties$|\.md$|\.rst$|\.txt$|\/docs?\//;

  for (const file of files) {
    if (SKIP_PATTERN.test(file.filename)) {
      continue;
    }

    const likelihood = calculateLikelihood(file);
    const severity = calculateSeverity(file);

    totalLikelihood += likelihood.total;
    totalSeverity += severity.total;
    validFiles++;

    const fileScore = (likelihood.total + severity.total) / 2;
    maxScore = Math.max(maxScore, fileScore);
  }

  return {
    score: maxScore,
    likelihood: validFiles > 0 ? totalLikelihood / validFiles : 0,
    severity: validFiles > 0 ? totalSeverity / validFiles : 0,
  };
}

async function main() {
  const csvPath = path.join(__dirname, "ghprdata", "ghprdata.csv");

  if (!fs.existsSync(csvPath)) {
    console.error("GHPR dataset not found. Download from https://github.com/feiwww/GHPR_dataset");
    process.exit(1);
  }

  const sampleSize = parseInt(process.argv[2] ?? "50", 10);
  console.log(`Loading GHPR dataset and sampling ${sampleSize} bug-introducing commits...\n`);

  const buggyCommits = loadGHPRDataset(csvPath, sampleSize);

  const token = getGitHubToken();
  const octokit = new Octokit({ auth: token });

  const results: ValidationResult[] = [];
  let processed = 0;
  let skipped = 0;

  for (const row of buggyCommits) {
    const owner = row.projectOwner;
    const repo = row.projectName;
    const project = `${owner}/${repo}`;

    process.stdout.write(`\r[${++processed}/${buggyCommits.length}] Fetching ${project}@${row.shaBug.slice(0, 8)}...    `);

    // Fetch the bug-introducing commit
    const buggyFiles = await fetchCommitFiles(octokit, owner, repo, row.shaBug);

    if (buggyFiles.length === 0) {
      skipped++;
      continue;
    }

    const buggyAnalysis = analyzeCommit(buggyFiles);
    results.push({
      project,
      sha: row.shaBug,
      isBuggy: true,
      ourScore: buggyAnalysis.score,
      filesAnalyzed: buggyFiles.length,
      likelihoodTotal: buggyAnalysis.likelihood,
      severityTotal: buggyAnalysis.severity,
    });

    // Also fetch a random commit from the same repo for comparison
    const cleanCommit = await fetchRandomCleanCommit(octokit, owner, repo, row.shaBug);
    if (cleanCommit) {
      const cleanAnalysis = analyzeCommit(cleanCommit.files);
      results.push({
        project,
        sha: cleanCommit.sha,
        isBuggy: false,
        ourScore: cleanAnalysis.score,
        filesAnalyzed: cleanCommit.files.length,
        likelihoodTotal: cleanAnalysis.likelihood,
        severityTotal: cleanAnalysis.severity,
      });
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n\n=== GHPR VALIDATION RESULTS ===\n`);
  console.log(`Processed ${processed} commits, skipped ${skipped} (not accessible)\n`);

  // Analyze results
  const buggyScores = results.filter((r) => r.isBuggy).map((r) => r.ourScore);
  const cleanScores = results.filter((r) => !r.isBuggy).map((r) => r.ourScore);

  if (buggyScores.length === 0 || cleanScores.length === 0) {
    console.log("Not enough data to analyze. Try a larger sample or check GitHub access.");
    return;
  }

  const avgBuggy = buggyScores.reduce((a, b) => a + b, 0) / buggyScores.length;
  const avgClean = cleanScores.reduce((a, b) => a + b, 0) / cleanScores.length;

  console.log(`Bug-introducing commits (${buggyScores.length}): avg score = ${avgBuggy.toFixed(2)}`);
  console.log(`Random commits (${cleanScores.length}): avg score = ${avgClean.toFixed(2)}`);
  console.log(`\nDifference: ${(avgBuggy - avgClean).toFixed(2)} (${avgBuggy > avgClean ? "buggy scored higher - GOOD" : "clean scored higher - BAD"})`);

  // Score distribution
  const thresholds = [10, 20, 30, 40, 50];
  console.log("\n--- Score Distribution ---");
  console.log("Threshold | Buggy above | Clean above | Precision");
  for (const t of thresholds) {
    const buggyAbove = buggyScores.filter((s) => s >= t).length;
    const cleanAbove = cleanScores.filter((s) => s >= t).length;
    const precision = buggyAbove + cleanAbove > 0
      ? (buggyAbove / (buggyAbove + cleanAbove) * 100).toFixed(1)
      : "N/A";
    console.log(`    ${t.toString().padStart(2)}    |     ${buggyAbove.toString().padStart(3)}     |     ${cleanAbove.toString().padStart(3)}     |   ${precision}%`);
  }

  // Calculate AUC-ROC approximation using Mann-Whitney U statistic
  let concordant = 0;
  let discordant = 0;
  for (const buggy of buggyScores) {
    for (const clean of cleanScores) {
      if (buggy > clean) concordant++;
      else if (buggy < clean) discordant++;
    }
  }
  const auc = (concordant + 0.5 * (buggyScores.length * cleanScores.length - concordant - discordant)) /
    (buggyScores.length * cleanScores.length);
  console.log(`\nAUC-ROC (approx): ${(auc * 100).toFixed(1)}%`);

  // Save results
  const outputPath = path.join(__dirname, "ghpr_validation_results.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to ${outputPath}`);
}

main().catch(console.error);
