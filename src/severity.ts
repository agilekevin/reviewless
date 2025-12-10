import type { PRFile } from "./github.js";

export interface SeverityScore {
  security: number;
  performance: number;
  criticality: number;
  total: number;
  factors: string[];
}

// Security risk patterns from the document
const SECURITY_PATTERNS = [
  { pattern: /password/i, risk: "password handling" },
  { pattern: /secret/i, risk: "secret handling" },
  { pattern: /token/i, risk: "token handling" },
  { pattern: /auth/i, risk: "authentication code" },
  { pattern: /crypt/i, risk: "cryptography code" },
  { pattern: /sql/i, risk: "SQL/database code" },
  { pattern: /query/i, risk: "query code" },
  { pattern: /exec\s*\(/i, risk: "command execution" },
  { pattern: /eval\s*\(/i, risk: "dynamic evaluation" },
  { pattern: /\.innerHTML/i, risk: "DOM manipulation (XSS risk)" },
  { pattern: /dangerouslySetInnerHTML/i, risk: "React HTML injection" },
  { pattern: /serialize|deserialize/i, risk: "serialization code" },
  { pattern: /cors/i, risk: "CORS configuration" },
  { pattern: /cookie/i, risk: "cookie handling" },
  { pattern: /session/i, risk: "session management" },
  { pattern: /permission|role|access/i, risk: "access control" },
  { pattern: /http[s]?:\/\//i, risk: "URL handling" },
  { pattern: /file.*path|path.*file/i, risk: "file path handling" },
  { pattern: /upload/i, risk: "file upload" },
  { pattern: /download/i, risk: "file download" },
];

// High-criticality file patterns (business impact)
const CRITICAL_FILE_PATTERNS = [
  { pattern: /^src\/(index|main|app)\.[jt]sx?$/, weight: 30, reason: "Application entry point" },
  { pattern: /config.*\.[jt]s$/, weight: 25, reason: "Configuration file" },
  { pattern: /middleware/i, weight: 25, reason: "Middleware" },
  { pattern: /router|routes/i, weight: 20, reason: "Routing code" },
  { pattern: /api\//i, weight: 25, reason: "API code" },
  { pattern: /controller/i, weight: 20, reason: "Controller" },
  { pattern: /service/i, weight: 20, reason: "Service layer" },
  { pattern: /model/i, weight: 15, reason: "Data model" },
  { pattern: /database|db\//i, weight: 30, reason: "Database code" },
  { pattern: /migration/i, weight: 35, reason: "Database migration" },
  { pattern: /schema/i, weight: 25, reason: "Schema definition" },
  { pattern: /payment|billing|checkout/i, weight: 40, reason: "Payment/billing code" },
  { pattern: /\.env/, weight: 40, reason: "Environment file" },
];

// Performance-sensitive file patterns
const PERFORMANCE_PATTERNS = [
  { pattern: /cache/i, reason: "Cache code" },
  { pattern: /index/i, reason: "Index/lookup code" },
  { pattern: /queue/i, reason: "Queue handling" },
  { pattern: /worker/i, reason: "Worker code" },
  { pattern: /batch/i, reason: "Batch processing" },
  { pattern: /stream/i, reason: "Streaming code" },
  { pattern: /loop|iteration/i, reason: "Loop-heavy code" },
];

function checkSecurityPatterns(patch: string): { score: number; risks: string[] } {
  if (!patch) return { score: 0, risks: [] };

  const risks: string[] = [];
  let score = 0;

  const addedLines = patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .join("\n");

  for (const { pattern, risk } of SECURITY_PATTERNS) {
    if (pattern.test(addedLines)) {
      risks.push(risk);
      score += 10;
    }
  }

  return { score: Math.min(40, score), risks };
}

function checkFileCriticality(filename: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let maxScore = 0;

  for (const { pattern, weight, reason } of CRITICAL_FILE_PATTERNS) {
    if (pattern.test(filename)) {
      reasons.push(reason);
      maxScore = Math.max(maxScore, weight);
    }
  }

  return { score: maxScore, reasons };
}

function checkPerformanceRisk(filename: string, patch: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Check filename patterns
  for (const { pattern, reason } of PERFORMANCE_PATTERNS) {
    if (pattern.test(filename)) {
      reasons.push(reason);
      score += 10;
    }
  }

  // Check for performance-sensitive code patterns in patch
  if (patch) {
    const addedLines = patch
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .join("\n");

    // Nested loops
    if (/for\s*\([^)]+\)[\s\S]*for\s*\(/i.test(addedLines)) {
      reasons.push("Nested loops detected");
      score += 15;
    }

    // Large array operations
    if (/\.(map|filter|reduce|forEach|find)\s*\(/g.test(addedLines)) {
      const matches = addedLines.match(/\.(map|filter|reduce|forEach|find)\s*\(/g);
      if (matches && matches.length > 3) {
        reasons.push(`Multiple array operations (${matches.length})`);
        score += 10;
      }
    }

    // Database queries
    if (/SELECT|INSERT|UPDATE|DELETE|JOIN/i.test(addedLines)) {
      reasons.push("Database query");
      score += 15;
    }
  }

  return { score: Math.min(30, score), reasons };
}

export function calculateSeverity(file: PRFile): SeverityScore {
  const factors: string[] = [];

  // Security analysis
  const security = checkSecurityPatterns(file.patch ?? "");
  if (security.risks.length > 0) {
    factors.push(`Security: ${security.risks.join(", ")}`);
  }

  // Criticality analysis
  const criticality = checkFileCriticality(file.filename);
  if (criticality.reasons.length > 0) {
    factors.push(`Critical: ${criticality.reasons.join(", ")}`);
  }

  // Performance analysis
  const performance = checkPerformanceRisk(file.filename, file.patch ?? "");
  if (performance.reasons.length > 0) {
    factors.push(`Performance: ${performance.reasons.join(", ")}`);
  }

  const total = Math.min(100, security.score + criticality.score + performance.score);

  return {
    security: security.score,
    performance: performance.score,
    criticality: criticality.score,
    total,
    factors,
  };
}
