import type { PRFile } from "./github.js";

export interface LikelihoodScore {
  complexity: number;
  testRisk: number;
  total: number;
  factors: string[];
}

// Estimate cyclomatic complexity from patch content
// Counts decision points: if, else, for, while, switch, case, catch, &&, ||, ?:
function estimateComplexityFromPatch(patch: string): number {
  if (!patch) return 0;

  const addedLines = patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));

  const decisionPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]+\s*:/g, // ternary
    /&&/g,
    /\|\|/g,
  ];

  let complexity = 1; // base complexity
  for (const line of addedLines) {
    for (const pattern of decisionPatterns) {
      const matches = line.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
  }

  return complexity;
}

// Categorize test changes based on the document's framework
// - Unchanged tests: lowest risk
// - New tests: medium risk
// - Modified tests: highest risk (danger of "changing tests to fit code")
// - Deleted tests: critical risk (removing safety nets)
type TestChangeType = "unchanged" | "new" | "modified" | "deleted";

function categorizeTestChange(file: PRFile): TestChangeType {
  if (file.status === "added") return "new";
  if (file.status === "removed") return "deleted";
  if (file.status === "modified") return "modified";
  return "unchanged";
}

function isTestFile(filename: string): boolean {
  const testPatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /_test\.[jt]sx?$/,
    /_spec\.[jt]sx?$/,
    /\/test\/.*\.[jt]sx?$/,
    /\/tests\/.*\.[jt]sx?$/,
    /\/__tests__\/.*\.[jt]sx?$/,
    /\.test\.(py|rb|go|rs|java|kt|scala)$/,
    /_test\.(py|rb|go|rs|java|kt|scala)$/,
    /test_.*\.(py|rb|go|rs|java|kt|scala)$/,
  ];

  return testPatterns.some((pattern) => pattern.test(filename));
}

export function calculateLikelihood(file: PRFile): LikelihoodScore {
  const factors: string[] = [];
  let complexityScore = 0;
  let testRiskScore = 0;

  // Complexity scoring (0-40 points)
  const complexity = estimateComplexityFromPatch(file.patch ?? "");
  if (complexity > 10) {
    complexityScore = 40;
    factors.push(`High complexity (${complexity} decision points)`);
  } else if (complexity > 5) {
    complexityScore = 25;
    factors.push(`Medium complexity (${complexity} decision points)`);
  } else if (complexity > 1) {
    complexityScore = 10;
    factors.push(`Low complexity (${complexity} decision points)`);
  }

  // Test risk scoring (0-50 points) based on document's framework
  if (isTestFile(file.filename)) {
    const testChangeType = categorizeTestChange(file);

    switch (testChangeType) {
      case "deleted":
        // Critical risk: removing safety nets
        testRiskScore = 50;
        factors.push("Deleted test file (critical risk)");
        break;
      case "modified":
        // Highest risk: "changing tests to fit code" danger
        testRiskScore = 40;
        factors.push("Modified existing test (highest risk)");
        break;
      case "new":
        // Medium risk: may indicate novel functionality
        testRiskScore = 20;
        factors.push("New test file (medium risk)");
        break;
      case "unchanged":
        testRiskScore = 0;
        break;
    }
  }

  // Size factor (0-20 points)
  let sizeScore = 0;
  if (file.changes > 500) {
    sizeScore = 20;
    factors.push(`Large change (${file.changes} lines)`);
  } else if (file.changes > 100) {
    sizeScore = 10;
    factors.push(`Medium change (${file.changes} lines)`);
  } else if (file.changes > 30) {
    sizeScore = 5;
    factors.push(`Small change (${file.changes} lines)`);
  }

  const total = Math.min(100, complexityScore + testRiskScore + sizeScore);

  return {
    complexity: complexityScore,
    testRisk: testRiskScore,
    total,
    factors,
  };
}
