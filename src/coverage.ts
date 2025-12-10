import type { PRFile } from "./github.js";

export interface CoverageAnalysis {
  sourceFile: string;
  likelyTestFile: string | null;
  testFileStatus: "unchanged" | "modified" | "added" | "deleted" | "missing";
  coverageRisk: number;
  factors: string[];
}

// Common test file naming conventions
const TEST_PATTERNS = [
  // JavaScript/TypeScript
  { ext: /\.[jt]sx?$/, patterns: [
    (base: string, ext: string) => `${base}.test${ext}`,
    (base: string, ext: string) => `${base}.spec${ext}`,
    (base: string, ext: string) => `${base}_test${ext}`,
  ]},
  // Python
  { ext: /\.py$/, patterns: [
    (base: string) => `test_${base}.py`,
    (base: string) => `${base}_test.py`,
  ]},
  // Go
  { ext: /\.go$/, patterns: [
    (base: string) => `${base}_test.go`,
  ]},
  // Ruby
  { ext: /\.rb$/, patterns: [
    (base: string) => `${base}_test.rb`,
    (base: string) => `${base}_spec.rb`,
  ]},
  // Rust
  { ext: /\.rs$/, patterns: [
    (base: string) => `${base}_test.rs`,
  ]},
  // Java/Kotlin
  { ext: /\.(java|kt)$/, patterns: [
    (base: string, ext: string) => `${base}Test${ext}`,
  ]},
];

/**
 * Given a source file path, generate possible test file paths
 */
export function getPossibleTestFiles(sourceFile: string): string[] {
  const possibleTests: string[] = [];

  // Skip if already a test file
  if (isTestFile(sourceFile)) return [];

  // Extract directory, basename, and extension
  const lastSlash = sourceFile.lastIndexOf("/");
  const dir = lastSlash >= 0 ? sourceFile.slice(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? sourceFile.slice(lastSlash + 1) : sourceFile;

  const lastDot = filename.lastIndexOf(".");
  const base = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot >= 0 ? filename.slice(lastDot) : "";

  // Find matching patterns for this file extension
  for (const { ext: extPattern, patterns } of TEST_PATTERNS) {
    if (extPattern.test(filename)) {
      for (const pattern of patterns) {
        const testFilename = pattern(base, ext);

        // Same directory
        possibleTests.push(dir ? `${dir}/${testFilename}` : testFilename);

        // tests/ subdirectory
        possibleTests.push(dir ? `${dir}/tests/${testFilename}` : `tests/${testFilename}`);

        // test/ subdirectory
        possibleTests.push(dir ? `${dir}/test/${testFilename}` : `test/${testFilename}`);

        // __tests__/ subdirectory (JS/TS convention)
        if (/\.[jt]sx?$/.test(filename)) {
          possibleTests.push(dir ? `${dir}/__tests__/${testFilename}` : `__tests__/${testFilename}`);
        }

        // Parent tests/ directory (common in Python: src/foo.py -> tests/test_foo.py)
        if (dir) {
          const parentDir = dir.replace(/\/[^/]+$/, "");
          possibleTests.push(parentDir ? `${parentDir}/tests/${testFilename}` : `tests/${testFilename}`);
        }
      }
    }
  }

  return [...new Set(possibleTests)]; // dedupe
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

/**
 * Analyze coverage relationship between source files and test files in a PR
 */
export function analyzeCoverage(files: PRFile[]): CoverageAnalysis[] {
  const results: CoverageAnalysis[] = [];

  // Build a map of all files in the PR by their paths
  const prFileMap = new Map<string, PRFile>();
  for (const file of files) {
    prFileMap.set(file.filename, file);
  }

  // For each non-test file, find its likely test file
  for (const file of files) {
    if (isTestFile(file.filename)) continue;

    const possibleTests = getPossibleTestFiles(file.filename);
    let matchedTest: PRFile | null = null;
    let matchedTestPath: string | null = null;

    // Check if any possible test file is in the PR
    for (const testPath of possibleTests) {
      if (prFileMap.has(testPath)) {
        matchedTest = prFileMap.get(testPath)!;
        matchedTestPath = testPath;
        break;
      }
    }

    const analysis: CoverageAnalysis = {
      sourceFile: file.filename,
      likelyTestFile: matchedTestPath ?? possibleTests[0] ?? null,
      testFileStatus: "missing",
      coverageRisk: 0,
      factors: [],
    };

    if (matchedTest) {
      // Test file is in the PR - check its status
      switch (matchedTest.status) {
        case "added":
          analysis.testFileStatus = "added";
          analysis.coverageRisk = 5;
          analysis.factors.push("New test added with source change");
          break;
        case "modified":
          analysis.testFileStatus = "modified";
          analysis.coverageRisk = 15;
          analysis.factors.push("Test modified along with source (verify test intent)");
          break;
        case "removed":
          analysis.testFileStatus = "deleted";
          analysis.coverageRisk = 30;
          analysis.factors.push("Test deleted while source changed (coverage gap)");
          break;
        default:
          analysis.testFileStatus = "unchanged";
          analysis.coverageRisk = 0;
          analysis.factors.push("Unchanged test covers this change");
      }
    } else {
      // Test file not in PR - could be unchanged (good) or missing (unknown)
      analysis.testFileStatus = "unchanged";
      analysis.coverageRisk = 0;
      analysis.factors.push("Test file not modified (likely covered by existing tests)");
    }

    results.push(analysis);
  }

  return results;
}
