#!/usr/bin/env node

import { program } from "commander";
import Table from "cli-table3";
import { execSync } from "child_process";
import { GitHubClient, parsePRUrl } from "./github.js";
import { analyzePR, type PRAnalysis, type FileAnalysis } from "./analyzer.js";

function getGitHubToken(): string | null {
  // Try environment variable first
  if (process.env["GITHUB_TOKEN"]) {
    return process.env["GITHUB_TOKEN"];
  }

  // Try gh auth token
  try {
    const token = execSync("gh auth token", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    if (token) return token;
  } catch {
    // gh cli not available or not logged in
  }

  return null;
}

const PRIORITY_COLORS: Record<FileAnalysis["priorityLevel"], string> = {
  critical: "\x1b[31m", // red
  high: "\x1b[33m",     // yellow
  medium: "\x1b[36m",   // cyan
  low: "\x1b[32m",      // green
};
const RESET = "\x1b[0m";

function colorize(text: string, level: FileAnalysis["priorityLevel"]): string {
  return `${PRIORITY_COLORS[level]}${text}${RESET}`;
}

function formatTable(analysis: PRAnalysis, verbose: boolean): string {
  const output: string[] = [];

  // Header
  output.push("");
  output.push(`PR #${analysis.pr.number}: ${analysis.pr.title}`);
  output.push(`${analysis.pr.owner}/${analysis.pr.repo}`);
  output.push("─".repeat(60));

  // Summary
  output.push("");
  output.push("Summary:");
  output.push(`  Total files: ${analysis.summary.totalFiles}`);
  output.push(`  Average score: ${analysis.summary.averageScore}`);
  output.push(`  ${colorize(`Critical: ${analysis.summary.criticalCount}`, "critical")}  ${colorize(`High: ${analysis.summary.highCount}`, "high")}  ${colorize(`Medium: ${analysis.summary.mediumCount}`, "medium")}  ${colorize(`Low: ${analysis.summary.lowCount}`, "low")}`);
  output.push("");

  // Files table
  const table = new Table({
    head: ["Priority", "Score", "File", "Changes", verbose ? "Factors" : ""].filter(Boolean),
    colWidths: verbose ? [10, 7, 40, 9, 50] : [10, 7, 50, 9],
    wordWrap: true,
  });

  for (const file of analysis.files) {
    const factors = [...file.likelihood.factors, ...file.severity.factors];
    const row = [
      colorize(file.priorityLevel.toUpperCase(), file.priorityLevel),
      file.priorityScore.toString(),
      file.filename.length > 48 ? "..." + file.filename.slice(-45) : file.filename,
      `+${file.changes}`,
    ];

    if (verbose) {
      row.push(factors.slice(0, 3).join("; ") || "-");
    }

    table.push(row);
  }

  output.push(table.toString());

  return output.join("\n");
}

async function main() {
  program
    .name("reviewless")
    .description("PR analyzer that outputs review priority scores for each file")
    .version("1.0.0");

  program
    .argument("<pr>", "GitHub PR URL or owner/repo#number")
    .option("-t, --token <token>", "GitHub token (or uses gh auth token / GITHUB_TOKEN)")
    .option("-v, --verbose", "Show detailed factors for each file")
    .action(async (prArg: string, options: { token?: string; verbose?: boolean }) => {
      const token = options.token ?? getGitHubToken();

      if (!token) {
        console.error("Error: GitHub token required. Use --token, set GITHUB_TOKEN, or login with 'gh auth login'.");
        process.exit(1);
      }

      // Parse PR argument
      let owner: string;
      let repo: string;
      let prNumber: number;

      if (prArg.includes("github.com")) {
        const parsed = parsePRUrl(prArg);
        if (!parsed) {
          console.error("Error: Invalid GitHub PR URL");
          process.exit(1);
        }
        ({ owner, repo, number: prNumber } = parsed);
      } else {
        // Format: owner/repo#number
        const match = prArg.match(/^([^/]+)\/([^#]+)#(\d+)$/);
        if (!match) {
          console.error("Error: Invalid PR format. Use URL or owner/repo#number");
          process.exit(1);
        }
        const [, ownerMatch, repoMatch, numberStr] = match;
        if (!ownerMatch || !repoMatch || !numberStr) {
          console.error("Error: Invalid PR format");
          process.exit(1);
        }
        owner = ownerMatch;
        repo = repoMatch;
        prNumber = parseInt(numberStr, 10);
      }

      try {
        const client = new GitHubClient(token);

        console.log(`Fetching PR ${owner}/${repo}#${prNumber}...`);
        const prDetails = await client.getPRDetails(owner, repo, prNumber);

        console.log(`Analyzing ${prDetails.files.length} files...`);
        const analysis = analyzePR(prDetails);

        console.log(formatTable(analysis, options.verbose ?? false));
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        } else {
          console.error("An unexpected error occurred");
        }
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch(console.error);
