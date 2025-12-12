#!/usr/bin/env tsx
/**
 * Validation script for reviewless scoring against ApacheJIT dataset.
 *
 * ApacheJIT has commits labeled as buggy/clean. We fetch commit data from
 * GitHub, run our analysis, and check if our scores correlate with actual bugs.
 */

import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Import our analysis functions
import { calculateLikelihood } from "../src/likelihood.js";
import { calculateSeverity } from "../src/severity.js";
import type { PRFile } from "../src/github.js";

interface DatasetRow {
  commit_id: string;
  project: string;
  buggy: string;
  nf: string;  // number of files
  la: string;  // lines added
  ld: string;  // lines deleted
}

interface ValidationResult {
  commit_id: string;
  project: string;
  actual_buggy: boolean;
  our_score: number;
  files_analyzed: number;
  likelihood_total: number;
  severity_total: number;
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
  } catch (error) {
    console.error(`Failed to fetch ${owner}/${repo}@${sha}: ${error}`);
    return [];
  }
}

function analyzeCommit(files: PRFile[]): { score: number; likelihood: number; severity: number } {
  if (files.length === 0) {
    return { score: 0, likelihood: 0, severity: 0 };
  }

  let totalLikelihood = 0;
  let totalSeverity = 0;
  let maxScore = 0;

  for (const file of files) {
    // Skip lock files like our main analyzer does
    if (/\.lock$|package-lock\.json$|yarn\.lock$/.test(file.filename)) {
      continue;
    }

    const likelihood = calculateLikelihood(file);
    const severity = calculateSeverity(file);

    totalLikelihood += likelihood.total;
    totalSeverity += severity.total;

    const fileScore = (likelihood.total + severity.total) / 2;
    maxScore = Math.max(maxScore, fileScore);
  }

  return {
    score: maxScore,  // Use max file score, not average
    likelihood: totalLikelihood / files.length,
    severity: totalSeverity / files.length,
  };
}

function loadDataset(csvPath: string, limit: number = 100): DatasetRow[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  const header = lines[0].split(",");

  const allBuggy: DatasetRow[] = [];
  const allClean: DatasetRow[] = [];

  // Get indices
  const idx = {
    commit_id: header.indexOf("commit_id"),
    project: header.indexOf("project"),
    buggy: header.indexOf("buggy"),
    nf: header.indexOf("nf"),
    la: header.indexOf("la"),
    ld: header.indexOf("ld"),
  };

  // Load ALL rows first, then sample
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {
      commit_id: cols[idx.commit_id],
      project: cols[idx.project],
      buggy: cols[idx.buggy],
      nf: cols[idx.nf],
      la: cols[idx.la],
      ld: cols[idx.ld],
    };

    if (row.buggy === "True") {
      allBuggy.push(row);
    } else {
      allClean.push(row);
    }
  }

  console.log(`Dataset: ${allBuggy.length} buggy, ${allClean.length} clean commits`);

  // Random sample from each
  const shuffledBuggy = allBuggy.sort(() => Math.random() - 0.5).slice(0, limit);
  const shuffledClean = allClean.sort(() => Math.random() - 0.5).slice(0, limit);

  // Combine and shuffle
  return [...shuffledBuggy, ...shuffledClean].sort(() => Math.random() - 0.5);
}

async function main() {
  const csvPath = path.join(__dirname, "apachejit_total.csv");

  if (!fs.existsSync(csvPath)) {
    console.error("Dataset not found. Download from https://zenodo.org/records/5907002");
    process.exit(1);
  }

  const sampleSize = parseInt(process.argv[2] ?? "50", 10);
  console.log(`Loading dataset and sampling ${sampleSize} buggy + ${sampleSize} clean commits...`);

  const samples = loadDataset(csvPath, sampleSize);
  console.log(`Loaded ${samples.length} commits to validate\n`);

  const token = getGitHubToken();
  const octokit = new Octokit({ auth: token });

  const results: ValidationResult[] = [];
  let processed = 0;

  for (const row of samples) {
    const [owner, repo] = row.project.split("/");

    process.stdout.write(`\r[${++processed}/${samples.length}] Fetching ${row.project}@${row.commit_id.slice(0, 8)}...`);

    const files = await fetchCommitFiles(octokit, owner, repo, row.commit_id);
    const analysis = analyzeCommit(files);

    results.push({
      commit_id: row.commit_id,
      project: row.project,
      actual_buggy: row.buggy === "True",
      our_score: analysis.score,
      files_analyzed: files.length,
      likelihood_total: analysis.likelihood,
      severity_total: analysis.severity,
    });

    // Rate limiting: ~5000 requests/hour for authenticated users
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("\n\n=== VALIDATION RESULTS ===\n");

  // Analyze correlation
  const buggyScores = results.filter((r) => r.actual_buggy).map((r) => r.our_score);
  const cleanScores = results.filter((r) => !r.actual_buggy).map((r) => r.our_score);

  const avgBuggy = buggyScores.reduce((a, b) => a + b, 0) / buggyScores.length;
  const avgClean = cleanScores.reduce((a, b) => a + b, 0) / cleanScores.length;

  console.log(`Buggy commits (${buggyScores.length}): avg score = ${avgBuggy.toFixed(2)}`);
  console.log(`Clean commits (${cleanScores.length}): avg score = ${avgClean.toFixed(2)}`);
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

  // Save detailed results
  const outputPath = path.join(__dirname, "validation_results.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to ${outputPath}`);
}

main().catch(console.error);
