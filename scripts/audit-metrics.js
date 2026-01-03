#!/usr/bin/env node
/**
 * Audit Metrics Collection Script
 *
 * Collects automated code quality metrics for the OBS Live Suite project.
 * Outputs structured JSON for trending analysis.
 *
 * Usage: node scripts/audit-metrics.js [--output <path>]
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "docs", "audit-reports");

// Patterns to detect
const PATTERNS = {
  unsafeJsonParse: {
    // JSON.parse not wrapped in try-catch (simplified detection)
    regex: /JSON\.parse\s*\(/g,
    exclude: ["safeJsonParse.ts", "node_modules", ".test.ts"],
    description: "JSON.parse without try-catch wrapper",
  },
  exposedErrors: {
    // String(error) outside of Logger calls
    regex: /String\s*\(\s*error\s*\)|\.toString\s*\(\s*\)/g,
    exclude: ["node_modules", "Logger.ts", ".test.ts"],
    description: "Error converted to string (potential stack trace exposure)",
  },
  asAnyCasts: {
    regex: /as\s+any(?!\w)/g,
    exclude: ["node_modules", ".test.ts", ".d.ts"],
    description: "Type cast to 'any' (type safety bypass)",
  },
  nonNullAssertions: {
    regex: /!\s*[;,)\]}]/g,
    exclude: ["node_modules", ".test.ts"],
    description: "Non-null assertion operator usage",
  },
};

// Directories to scan
const SCAN_DIRS = {
  services: "lib/services",
  repositories: "lib/repositories",
  utils: "lib/utils",
  serverApi: "server/api",
  appApi: "app/api",
  adapters: "lib/adapters",
};

// Files that should use Constants.ts
const MAGIC_NUMBER_FILES = [
  "lib/services/QuizManager.ts",
  "lib/services/WebSocketHub.ts",
  "lib/services/ChannelManager.ts",
  "lib/services/DatabaseService.ts",
  "server/api/quiz-bot.ts",
];

/**
 * Get current git commit hash
 */
function getGitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT_DIR })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get current git branch
 */
function getGitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT_DIR })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

/**
 * Recursively get all TypeScript files in a directory
 */
function getTypeScriptFiles(dir, files = []) {
  const fullPath = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(fullPath)) return files;

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        getTypeScriptFiles(entryPath, files);
      }
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Count lines in a file
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(path.join(ROOT_DIR, filePath), "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

/**
 * Search for pattern matches in files
 */
function findPatternMatches(files, pattern) {
  const matches = [];

  for (const file of files) {
    // Check exclusions
    if (pattern.exclude.some((exc) => file.includes(exc))) continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const lineMatches = line.match(pattern.regex);
        if (lineMatches) {
          matches.push({
            file,
            line: index + 1,
            match: lineMatches[0],
            context: line.trim().substring(0, 100),
          });
        }
      });
    } catch {
      // Skip unreadable files
    }
  }

  return matches;
}

/**
 * Check if JSON.parse is wrapped in try-catch
 * More sophisticated detection
 */
function findUnsafeJsonParse(files) {
  const matches = [];
  const safePatterns = [
    /safeJsonParse/,
    /safeJsonParseOptional/,
    /try\s*{[^}]*JSON\.parse/,
  ];

  for (const file of files) {
    if (
      file.includes("node_modules") ||
      file.includes("safeJsonParse") ||
      file.includes(".test.")
    )
      continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (line.includes("JSON.parse")) {
          // Check if it's using safe wrapper
          const isSafe = safePatterns.some((p) => p.test(line));

          // Check if within a try block (simplified - checks previous 5 lines)
          const context = lines.slice(Math.max(0, index - 5), index + 1).join("\n");
          const inTryCatch = /try\s*{/.test(context);

          if (!isSafe && !inTryCatch) {
            matches.push({
              file,
              line: index + 1,
              context: line.trim().substring(0, 100),
            });
          }
        }
      });
    } catch {
      // Skip
    }
  }

  return matches;
}

/**
 * Detect magic numbers (hardcoded numeric values)
 */
function findMagicNumbers(files) {
  const matches = [];
  // Look for standalone numbers that aren't 0, 1, common indices, or in imports
  const magicNumberRegex = /(?<![.\w])([2-9]\d{2,}|[1-9]\d{3,})(?![.\w])/g;
  const excludePatterns = [
    /import/,
    /export/,
    /const.*=/,
    /let.*=/,
    /\.length/,
    /index/,
    /port/,
    /1920|1080/, // Resolution
    /status.*:/,
    /version/,
  ];

  for (const file of files) {
    if (!MAGIC_NUMBER_FILES.some((f) => file.includes(f))) continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;

        const lineMatches = [...line.matchAll(magicNumberRegex)];
        if (lineMatches.length > 0) {
          // Check if line matches any exclusion pattern
          const excluded = excludePatterns.some((p) => p.test(line));
          if (!excluded) {
            matches.push({
              file,
              line: index + 1,
              values: lineMatches.map((m) => m[1]),
              context: line.trim().substring(0, 80),
            });
          }
        }
      });
    } catch {
      // Skip
    }
  }

  return matches;
}

/**
 * Get file sizes for service files
 */
function getServiceFileSizes() {
  const sizes = [];
  const serviceDirs = ["lib/services", "lib/repositories"];

  for (const dir of serviceDirs) {
    const files = getTypeScriptFiles(dir);
    for (const file of files) {
      if (file.endsWith(".test.ts")) continue;
      const lines = countLines(file);
      if (lines > 50) {
        // Only track significant files
        sizes.push({ file, lines });
      }
    }
  }

  return sizes.sort((a, b) => b.lines - a.lines);
}

/**
 * Count test files
 */
function countTestFiles() {
  const testDir = "__tests__";
  const files = getTypeScriptFiles(testDir);
  return files.filter((f) => f.includes(".test.")).length;
}

/**
 * Get Jest coverage if available
 */
function getJestCoverage() {
  const coveragePath = path.join(
    ROOT_DIR,
    "coverage",
    "coverage-summary.json"
  );
  try {
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf-8"));
      const total = coverage.total;
      return {
        lines: total.lines.pct,
        statements: total.statements.pct,
        functions: total.functions.pct,
        branches: total.branches.pct,
      };
    }
  } catch {
    // Coverage not available
  }
  return null;
}

/**
 * Count API routes using ProxyHelper vs raw fetch
 */
function countProxyHelperUsage() {
  const apiDir = "app/api";
  const files = getTypeScriptFiles(apiDir);

  let usingProxyHelper = 0;
  let usingRawFetch = 0;

  for (const file of files) {
    if (!file.endsWith("route.ts")) continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      if (
        content.includes("proxyToBackend") ||
        content.includes("createGetProxy") ||
        content.includes("createPostProxy")
      ) {
        usingProxyHelper++;
      } else if (content.includes("fetch(") && content.includes("BACKEND_URL")) {
        usingRawFetch++;
      }
    } catch {
      // Skip
    }
  }

  return { usingProxyHelper, usingRawFetch };
}

/**
 * Count repositories extracted from DatabaseService
 */
function countRepositories() {
  const repoDir = path.join(ROOT_DIR, "lib", "repositories");
  if (!fs.existsSync(repoDir)) return { extracted: 0, files: [] };

  const files = fs
    .readdirSync(repoDir)
    .filter((f) => f.endsWith("Repository.ts"));
  return {
    extracted: files.length,
    files: files,
  };
}

/**
 * Calculate scores based on metrics
 */
function calculateScores(metrics) {
  // Quality score (0-10)
  // Penalize: unsafe JSON.parse, exposed errors, as any casts
  const qualityDeductions =
    metrics.quality.unsafeJsonParse.count * 0.3 +
    metrics.quality.exposedErrors.count * 0.2 +
    metrics.quality.asAnyCasts.count * 0.1;
  const qualityScore = Math.max(0, Math.min(10, 10 - qualityDeductions));

  // Maintainability score (0-10)
  // Based on largest file sizes and repository extraction
  const largestFile = metrics.maintainability.fileSizes[0]?.lines || 0;
  const repoProgress = metrics.maintainability.repositories.extracted / 8; // Target: 8 repos
  const maintainabilityScore = Math.max(
    0,
    Math.min(
      10,
      10 - largestFile / 300 + repoProgress * 3
    )
  );

  // DRY score (0-10)
  // Based on proxy helper adoption
  const proxyTotal =
    metrics.dry.proxyHelper.usingProxyHelper +
    metrics.dry.proxyHelper.usingRawFetch;
  const proxyAdoption =
    proxyTotal > 0 ? metrics.dry.proxyHelper.usingProxyHelper / proxyTotal : 1;
  const dryScore = Math.max(0, Math.min(10, proxyAdoption * 10));

  // Test score (0-10)
  // Based on coverage and test file count
  const coverage = metrics.tests.coverage?.lines || 0;
  const testScore = Math.max(0, Math.min(10, coverage / 10));

  return {
    quality: Math.round(qualityScore * 10) / 10,
    maintainability: Math.round(maintainabilityScore * 10) / 10,
    dry: Math.round(dryScore * 10) / 10,
    tests: Math.round(testScore * 10) / 10,
    overall:
      Math.round(
        ((qualityScore + maintainabilityScore + dryScore + testScore) / 4) * 10
      ) / 10,
  };
}

/**
 * Main collection function
 */
function collectMetrics() {
  console.log("Collecting audit metrics...\n");

  // Get all TypeScript files
  const allFiles = [];
  Object.values(SCAN_DIRS).forEach((dir) => {
    allFiles.push(...getTypeScriptFiles(dir));
  });

  console.log(`Found ${allFiles.length} TypeScript files to analyze\n`);

  // Collect metrics
  const unsafeJsonParse = findUnsafeJsonParse(allFiles);
  console.log(`- Unsafe JSON.parse: ${unsafeJsonParse.length}`);

  const exposedErrors = findPatternMatches(allFiles, PATTERNS.exposedErrors);
  console.log(`- Exposed errors: ${exposedErrors.length}`);

  const asAnyCasts = findPatternMatches(allFiles, PATTERNS.asAnyCasts);
  console.log(`- 'as any' casts: ${asAnyCasts.length}`);

  const magicNumbers = findMagicNumbers(allFiles);
  console.log(`- Magic numbers: ${magicNumbers.length}`);

  const fileSizes = getServiceFileSizes();
  console.log(`- Large service files: ${fileSizes.length}`);

  const testFileCount = countTestFiles();
  console.log(`- Test files: ${testFileCount}`);

  const coverage = getJestCoverage();
  console.log(`- Coverage available: ${coverage ? "Yes" : "No"}`);

  const proxyHelper = countProxyHelperUsage();
  console.log(
    `- ProxyHelper usage: ${proxyHelper.usingProxyHelper}/${proxyHelper.usingProxyHelper + proxyHelper.usingRawFetch}`
  );

  const repositories = countRepositories();
  console.log(`- Repositories extracted: ${repositories.extracted}`);

  // Build metrics object
  const metrics = {
    quality: {
      unsafeJsonParse: {
        count: unsafeJsonParse.length,
        locations: unsafeJsonParse.slice(0, 10), // Top 10
      },
      exposedErrors: {
        count: exposedErrors.length,
        locations: exposedErrors.slice(0, 10),
      },
      asAnyCasts: {
        count: asAnyCasts.length,
        locations: asAnyCasts.slice(0, 10),
      },
      magicNumbers: {
        count: magicNumbers.length,
        locations: magicNumbers.slice(0, 10),
      },
    },
    maintainability: {
      fileSizes: fileSizes.slice(0, 10), // Top 10 largest
      avgServiceLines:
        fileSizes.length > 0
          ? Math.round(
              fileSizes.reduce((sum, f) => sum + f.lines, 0) / fileSizes.length
            )
          : 0,
      repositories,
    },
    dry: {
      proxyHelper,
      estimatedDuplicateLines:
        proxyHelper.usingRawFetch * 40, // Estimate ~40 lines per unrefactored route
    },
    tests: {
      testFileCount,
      coverage,
    },
  };

  // Calculate scores
  const scores = calculateScores(metrics);

  // Build output
  const output = {
    timestamp: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getGitBranch(),
    scores,
    metrics,
  };

  return output;
}

/**
 * Write output to file
 */
function writeOutput(data, outputPath) {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nMetrics written to: ${outputPath}`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  let outputPath;

  // Parse arguments
  const outputIndex = args.indexOf("--output");
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputPath = args[outputIndex + 1];
  } else {
    const timestamp = new Date().toISOString().split("T")[0];
    outputPath = path.join(OUTPUT_DIR, `metrics-${timestamp}.json`);
  }

  // Collect and output
  const metrics = collectMetrics();

  console.log("\n--- Scores ---");
  console.log(`Quality:        ${metrics.scores.quality}/10`);
  console.log(`Maintainability: ${metrics.scores.maintainability}/10`);
  console.log(`DRY:            ${metrics.scores.dry}/10`);
  console.log(`Tests:          ${metrics.scores.tests}/10`);
  console.log(`Overall:        ${metrics.scores.overall}/10`);

  writeOutput(metrics, outputPath);

  // Also output to stdout for piping
  if (args.includes("--json")) {
    console.log(JSON.stringify(metrics, null, 2));
  }
}

main();
