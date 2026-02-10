#!/usr/bin/env node
/**
 * Audit Metrics Collection Script
 *
 * Collects automated code quality metrics for the OBS Live Suite project.
 * Outputs structured JSON for trending analysis.
 *
 * Usage: node scripts/audit-metrics.js [--output <path>] [--json]
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "docs", "audit-reports");

// Source directories for pattern scanning (quality metrics)
const SCAN_DIRS = ["lib", "server", "components", "hooks", "app"];

// Service directories for maintainability tracking (file sizes, avg lines)
const SERVICE_DIRS = ["lib/services", "lib/repositories"];

function getGitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT_DIR })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

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

function countLines(filePath) {
  try {
    const content = fs.readFileSync(path.join(ROOT_DIR, filePath), "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

/**
 * Find JSON.parse calls not wrapped in try-catch or Zod chain
 */
function findUnsafeJsonParse(files) {
  const matches = [];
  const safeLinePatterns = [
    /safeJsonParse/,
    /safeJsonParseOptional/,
    /\.parse\s*\(\s*JSON\.parse/, // Zod schema.parse(JSON.parse(...))
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
        if (!line.includes("JSON.parse")) return;

        // Check if the line itself uses a safe wrapper
        if (safeLinePatterns.some((p) => p.test(line))) return;

        // Check if within a try block (previous 5 lines)
        const context = lines
          .slice(Math.max(0, index - 5), index + 1)
          .join("\n");
        if (/try\s*\{/.test(context)) return;

        // Check for Zod chain split across lines: schema.parse(\n  JSON.parse(...))
        const prevContext = lines
          .slice(Math.max(0, index - 3), index)
          .join("\n");
        if (/\.parse\s*\(\s*$/.test(prevContext.trim())) return;

        matches.push({
          file,
          line: index + 1,
          context: line.trim().substring(0, 100),
        });
      });
    } catch {
      // Skip unreadable files
    }
  }

  return matches;
}

/**
 * Find 'as any' type casts
 */
function findAsAnyCasts(files) {
  const matches = [];

  for (const file of files) {
    if (
      file.includes("node_modules") ||
      file.includes(".test.") ||
      file.includes(".d.ts")
    )
      continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const lineMatches = line.match(/as\s+any(?!\w)/g);
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
      // Skip
    }
  }

  return matches;
}

/**
 * Count TODO/FIXME/HACK/XXX comments in source files
 */
function countTodoFixme(files) {
  let count = 0;
  const locations = [];

  for (const file of files) {
    if (file.includes(".test.") || file.includes("node_modules")) continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) {
          count++;
          if (locations.length < 20) {
            locations.push({
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

  return { count, locations };
}

/**
 * Count console.log statements in source files (excludes tests, Logger.ts)
 */
function countConsoleLogs(files) {
  let count = 0;
  const locations = [];

  for (const file of files) {
    if (
      file.includes(".test.") ||
      file.includes("node_modules") ||
      file.includes("Logger.ts")
    )
      continue;

    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (/console\.log\s*\(/.test(line) && !line.trim().startsWith("//")) {
          count++;
          if (locations.length < 20) {
            locations.push({
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

  return { count, locations };
}

/**
 * Get file sizes for service/repository files (maintainability tracking)
 */
function getServiceFileSizes() {
  const sizes = [];

  for (const dir of SERVICE_DIRS) {
    const files = getTypeScriptFiles(dir);
    for (const file of files) {
      if (file.endsWith(".test.ts")) continue;
      const lines = countLines(file);
      if (lines > 50) {
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
      } else if (
        content.includes("fetch(") &&
        content.includes("BACKEND_URL")
      ) {
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
  return { extracted: files.length, files };
}

/**
 * Count total source files and lines across all scanned directories
 */
function countSourceStats(allFiles) {
  let totalFiles = 0;
  let totalLines = 0;

  for (const file of allFiles) {
    if (file.includes(".test.")) continue;
    totalFiles++;
    totalLines += countLines(file);
  }

  return { totalFiles, totalLines };
}

/**
 * Calculate scores based on metrics
 */
function calculateScores(metrics) {
  // Quality (0-10): penalize unsafe patterns and code smells
  const qualityScore = Math.max(
    0,
    Math.min(
      10,
      10 -
        metrics.quality.unsafeJsonParse.count * 0.5 -
        metrics.quality.asAnyCasts.count * 0.2 -
        Math.min(3, metrics.quality.consoleLogCount.count * 0.05)
    )
  );

  // Maintainability (0-10): penalize large files, reward repo extraction
  const largestFileLines = metrics.maintainability.fileSizes[0]?.lines || 0;
  const avgLines = metrics.maintainability.avgServiceLines;
  const repoBonus = Math.min(
    2,
    metrics.maintainability.repositories.extracted * 0.3
  );
  const maintainabilityScore = Math.max(
    0,
    Math.min(
      10,
      10 -
        Math.max(0, (largestFileLines - 300) / 200) -
        Math.max(0, (avgLines - 150) / 100) +
        repoBonus
    )
  );

  // DRY (0-10): based on proxy helper adoption
  const proxyTotal =
    metrics.dry.proxyHelper.usingProxyHelper +
    metrics.dry.proxyHelper.usingRawFetch;
  const proxyAdoption =
    proxyTotal > 0
      ? metrics.dry.proxyHelper.usingProxyHelper / proxyTotal
      : 1;
  const dryScore = Math.max(0, Math.min(10, proxyAdoption * 10));

  // Tests (0-10): coverage if available, otherwise test-to-source ratio
  let testScore;
  const coverage = metrics.tests.coverage?.lines;
  if (coverage != null && coverage > 0) {
    testScore = Math.min(10, coverage / 10);
  } else {
    testScore = Math.min(10, metrics.tests.testToSourceRatio * 30);
  }
  testScore = Math.max(0, testScore);

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

  // Get all TypeScript files from scan directories
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...getTypeScriptFiles(dir));
  }
  // Deduplicate (in case of overlapping dirs)
  const uniqueFiles = [...new Set(allFiles)];

  console.log(`Found ${uniqueFiles.length} TypeScript files to analyze\n`);

  // Quality metrics
  const unsafeJsonParse = findUnsafeJsonParse(uniqueFiles);
  console.log(`- Unsafe JSON.parse: ${unsafeJsonParse.length}`);

  const asAnyCasts = findAsAnyCasts(uniqueFiles);
  console.log(`- 'as any' casts: ${asAnyCasts.length}`);

  const todoFixme = countTodoFixme(uniqueFiles);
  console.log(`- TODO/FIXME/HACK/XXX: ${todoFixme.count}`);

  const consoleLogs = countConsoleLogs(uniqueFiles);
  console.log(`- console.log statements: ${consoleLogs.count}`);

  // Maintainability metrics
  const fileSizes = getServiceFileSizes();
  console.log(`- Large service files: ${fileSizes.length}`);

  const repositories = countRepositories();
  console.log(`- Repositories extracted: ${repositories.extracted}`);

  const sourceStats = countSourceStats(uniqueFiles);
  console.log(`- Total source files: ${sourceStats.totalFiles}`);
  console.log(`- Total source lines: ${sourceStats.totalLines}`);

  // DRY metrics
  const proxyHelper = countProxyHelperUsage();
  console.log(
    `- ProxyHelper usage: ${proxyHelper.usingProxyHelper}/${proxyHelper.usingProxyHelper + proxyHelper.usingRawFetch}`
  );

  // Test metrics
  const testFileCount = countTestFiles();
  console.log(`- Test files: ${testFileCount}`);

  const coverage = getJestCoverage();
  console.log(`- Coverage available: ${coverage ? "Yes" : "No"}`);

  const testToSourceRatio =
    sourceStats.totalFiles > 0 ? testFileCount / sourceStats.totalFiles : 0;
  console.log(
    `- Test-to-source ratio: ${(testToSourceRatio * 100).toFixed(1)}%`
  );

  // Build metrics object
  const metrics = {
    quality: {
      unsafeJsonParse: {
        count: unsafeJsonParse.length,
        locations: unsafeJsonParse.slice(0, 10),
      },
      asAnyCasts: {
        count: asAnyCasts.length,
        locations: asAnyCasts.slice(0, 10),
      },
      consoleLogCount: {
        count: consoleLogs.count,
        locations: consoleLogs.locations.slice(0, 10),
      },
      todoFixmeCount: {
        count: todoFixme.count,
        locations: todoFixme.locations.slice(0, 10),
      },
    },
    maintainability: {
      fileSizes: fileSizes.slice(0, 10),
      avgServiceLines:
        fileSizes.length > 0
          ? Math.round(
              fileSizes.reduce((sum, f) => sum + f.lines, 0) / fileSizes.length
            )
          : 0,
      repositories,
      totalSourceFiles: sourceStats.totalFiles,
      totalSourceLines: sourceStats.totalLines,
    },
    dry: {
      proxyHelper,
      estimatedDuplicateLines: proxyHelper.usingRawFetch * 40,
    },
    tests: {
      testFileCount,
      coverage,
      testToSourceRatio: Math.round(testToSourceRatio * 1000) / 1000,
    },
  };

  // Calculate scores
  const scores = calculateScores(metrics);

  return {
    timestamp: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getGitBranch(),
    scores,
    metrics,
  };
}

function writeOutput(data, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nMetrics written to: ${outputPath}`);
}

function main() {
  const args = process.argv.slice(2);
  let outputPath;

  const outputIndex = args.indexOf("--output");
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputPath = args[outputIndex + 1];
  } else {
    const timestamp = new Date().toISOString().split("T")[0];
    outputPath = path.join(OUTPUT_DIR, `metrics-${timestamp}.json`);
  }

  const metrics = collectMetrics();

  console.log("\n--- Scores ---");
  console.log(`Quality:         ${metrics.scores.quality}/10`);
  console.log(`Maintainability: ${metrics.scores.maintainability}/10`);
  console.log(`DRY:             ${metrics.scores.dry}/10`);
  console.log(`Tests:           ${metrics.scores.tests}/10`);
  console.log(`Overall:         ${metrics.scores.overall}/10`);

  writeOutput(metrics, outputPath);

  if (args.includes("--json")) {
    console.log(JSON.stringify(metrics, null, 2));
  }
}

main();
