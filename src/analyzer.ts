import type { PRFile, PRDetails } from "./github.js";
import { calculateLikelihood, type LikelihoodScore } from "./likelihood.js";
import { calculateSeverity, type SeverityScore } from "./severity.js";
import { analyzeCoverage, type CoverageAnalysis } from "./coverage.js";

export interface FileAnalysis {
  filename: string;
  status: PRFile["status"];
  changes: number;
  likelihood: LikelihoodScore;
  severity: SeverityScore;
  coverage: CoverageAnalysis | null;
  priorityScore: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
}

export interface PRAnalysis {
  pr: {
    owner: string;
    repo: string;
    number: number;
    title: string;
  };
  files: FileAnalysis[];
  summary: {
    totalFiles: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    averageScore: number;
  };
}

// Priority score formula based on document:
// "The framework suggests combining likelihood and severity scores"
// We use a weighted combination with modified tests as primary signal
function calculatePriorityScore(
  likelihood: LikelihoodScore,
  severity: SeverityScore,
  coverage: CoverageAnalysis | null
): number {
  // Base score: average of likelihood and severity
  const baseScore = (likelihood.total + severity.total) / 2;

  // Boost for modified tests (primary risk signal per document)
  const testBoost = likelihood.testRisk > 30 ? 15 : 0;

  // Boost for security issues
  const securityBoost = severity.security > 20 ? 10 : 0;

  // Coverage risk from test file relationship
  const coverageRisk = coverage?.coverageRisk ?? 0;

  return Math.min(100, Math.round(baseScore + testBoost + securityBoost + coverageRisk));
}

function getPriorityLevel(score: number): FileAnalysis["priorityLevel"] {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// Generated/lock files that don't need code review
const SKIP_PATTERNS = [
  /\.lock$/,                    // uv.lock, Cargo.lock, etc.
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /Gemfile\.lock$/,
  /poetry\.lock$/,
  /composer\.lock$/,
  /\.min\.(js|css)$/,          // Minified files
  /\.generated\./,             // Explicitly generated files
  /\/vendor\//,                // Vendored dependencies
  /\/node_modules\//,          // Should never be in PRs, but just in case
];

function shouldSkipFile(filename: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filename));
}

export function analyzeFile(
  file: PRFile,
  coverageMap: Map<string, CoverageAnalysis>
): FileAnalysis {
  const likelihood = calculateLikelihood(file);
  const severity = calculateSeverity(file);
  const coverage = coverageMap.get(file.filename) ?? null;
  const priorityScore = calculatePriorityScore(likelihood, severity, coverage);

  return {
    filename: file.filename,
    status: file.status,
    changes: file.changes,
    likelihood,
    severity,
    coverage,
    priorityScore,
    priorityLevel: getPriorityLevel(priorityScore),
  };
}

export function analyzePR(pr: PRDetails): PRAnalysis {
  // Filter out generated/lock files
  const reviewableFiles = pr.files.filter((f) => !shouldSkipFile(f.filename));

  // Analyze coverage relationships between source and test files
  const coverageAnalyses = analyzeCoverage(reviewableFiles);
  const coverageMap = new Map<string, CoverageAnalysis>();
  for (const analysis of coverageAnalyses) {
    coverageMap.set(analysis.sourceFile, analysis);
  }

  const files = reviewableFiles.map((file) => analyzeFile(file, coverageMap));

  // Sort by priority score (highest first)
  files.sort((a, b) => b.priorityScore - a.priorityScore);

  const criticalCount = files.filter((f) => f.priorityLevel === "critical").length;
  const highCount = files.filter((f) => f.priorityLevel === "high").length;
  const mediumCount = files.filter((f) => f.priorityLevel === "medium").length;
  const lowCount = files.filter((f) => f.priorityLevel === "low").length;

  const averageScore = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.priorityScore, 0) / files.length)
    : 0;

  return {
    pr: {
      owner: pr.owner,
      repo: pr.repo,
      number: pr.number,
      title: pr.title,
    },
    files,
    summary: {
      totalFiles: files.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      averageScore,
    },
  };
}
