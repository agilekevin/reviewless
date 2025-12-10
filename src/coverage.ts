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
 * Extract imports from a test file patch to find which source modules it tests.
 * Returns a list of module paths that this test file imports.
 */
export function extractImportsFromPatch(patch: string, testFilePath: string): string[] {
  if (!patch) return [];

  const imports: string[] = [];
  const lines = patch.split("\n");

  // Get the directory of the test file for resolving relative imports
  const lastSlash = testFilePath.lastIndexOf("/");
  const testDir = lastSlash >= 0 ? testFilePath.slice(0, lastSlash) : "";

  for (const line of lines) {
    // Only look at added or context lines (not removed)
    if (line.startsWith("-") && !line.startsWith("---")) continue;
    const content = line.startsWith("+") ? line.slice(1) : line;

    // Python imports: from foo.bar import X or import foo.bar
    const pythonFromMatch = content.match(/^\s*from\s+([\w.]+)\s+import/);
    if (pythonFromMatch?.[1]) {
      imports.push(pythonFromMatch[1]);
    }

    const pythonImportMatch = content.match(/^\s*import\s+([\w.]+)/);
    if (pythonImportMatch?.[1]) {
      imports.push(pythonImportMatch[1]);
    }

    // JavaScript/TypeScript imports: import X from "path" or require("path")
    const jsImportMatch = content.match(/(?:import|from)\s+["']([^"']+)["']/);
    if (jsImportMatch?.[1]) {
      imports.push(jsImportMatch[1]);
    }

    const requireMatch = content.match(/require\s*\(\s*["']([^"']+)["']\s*\)/);
    if (requireMatch?.[1]) {
      imports.push(requireMatch[1]);
    }

    // Go imports: import "path" or "path"
    const goImportMatch = content.match(/^\s*(?:import\s+)?"([^"]+)"/);
    if (goImportMatch?.[1]) {
      imports.push(goImportMatch[1]);
    }
  }

  return [...new Set(imports)];
}

/**
 * Check if a source file path matches any of the imports from a test file.
 * Handles both absolute module paths and relative imports.
 */
export function sourceMatchesImport(sourceFile: string, imports: string[]): boolean {
  // Extract module name from source file
  // e.g., "libs/langgraph/langgraph/graph/state.py" -> "langgraph.graph.state"
  const lastSlash = sourceFile.lastIndexOf("/");
  const filename = lastSlash >= 0 ? sourceFile.slice(lastSlash + 1) : sourceFile;
  const lastDot = filename.lastIndexOf(".");
  const baseName = lastDot >= 0 ? filename.slice(0, lastDot) : filename;

  // Build possible module paths from the source file
  const modulePaths: string[] = [];

  // Full path as module (Python style): libs/foo/bar.py -> libs.foo.bar or foo.bar
  const withoutExt = sourceFile.replace(/\.[^.]+$/, "");
  modulePaths.push(withoutExt.replace(/\//g, "."));

  // Try progressively shorter paths
  const parts = withoutExt.split("/");
  for (let i = 0; i < parts.length; i++) {
    modulePaths.push(parts.slice(i).join("."));
  }

  // Just the base filename
  modulePaths.push(baseName);

  // Check if any import matches any module path
  for (const imp of imports) {
    const normalizedImport = imp.replace(/\//g, ".");

    for (const modPath of modulePaths) {
      // Exact match
      if (normalizedImport === modPath) return true;

      // Import is a prefix (e.g., "langgraph.graph" matches "langgraph.graph.state")
      if (modPath.startsWith(normalizedImport + ".")) return true;

      // Module path is a suffix of import (e.g., "graph.state" matches "langgraph.graph.state")
      if (normalizedImport.endsWith("." + modPath)) return true;

      // Base name match (e.g., import mentions "state" and file is "state.py")
      if (normalizedImport.endsWith("." + baseName) || normalizedImport === baseName) return true;
    }
  }

  return false;
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

  // Extract imports from all test files in the PR (for import-based matching)
  const testFileImports = new Map<string, string[]>();
  for (const file of files) {
    if (isTestFile(file.filename) && file.patch) {
      const imports = extractImportsFromPatch(file.patch, file.filename);
      testFileImports.set(file.filename, imports);
    }
  }

  // For each non-test file, find its likely test file
  for (const file of files) {
    if (isTestFile(file.filename)) continue;

    const possibleTests = getPossibleTestFiles(file.filename);
    let matchedTest: PRFile | null = null;
    let matchedTestPath: string | null = null;
    let matchedViaImport = false;

    // Strategy 1: Check if any possible test file (by naming convention) is in the PR
    for (const testPath of possibleTests) {
      if (prFileMap.has(testPath)) {
        matchedTest = prFileMap.get(testPath)!;
        matchedTestPath = testPath;
        break;
      }
    }

    // Strategy 2: If no naming match, check if any test file imports this source
    if (!matchedTest) {
      for (const [testPath, imports] of testFileImports) {
        if (sourceMatchesImport(file.filename, imports)) {
          matchedTest = prFileMap.get(testPath)!;
          matchedTestPath = testPath;
          matchedViaImport = true;
          break;
        }
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
      const importNote = matchedViaImport ? " (detected via import)" : "";

      switch (matchedTest.status) {
        case "added":
          analysis.testFileStatus = "added";
          analysis.coverageRisk = 5;
          analysis.factors.push(`New test added with source change${importNote}`);
          break;
        case "modified":
          analysis.testFileStatus = "modified";
          analysis.coverageRisk = 15;
          analysis.factors.push(`Test modified along with source${importNote} (verify test intent)`);
          break;
        case "removed":
          analysis.testFileStatus = "deleted";
          analysis.coverageRisk = 30;
          analysis.factors.push(`Test deleted while source changed${importNote} (coverage gap)`);
          break;
        default:
          analysis.testFileStatus = "unchanged";
          analysis.coverageRisk = 0;
          analysis.factors.push(`Unchanged test covers this change${importNote}`);
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
