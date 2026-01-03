#!/usr/bin/env node
/**
 * Audit Comparison Script
 *
 * Compares current metrics against historical data and computes deltas.
 * Outputs trending analysis with improvements and regressions.
 *
 * Usage: node scripts/audit-compare.js [--current <path>] [--history <path>]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_HISTORY_PATH = path.join(ROOT_DIR, "docs", "audit-history.json");
const DEFAULT_REPORTS_DIR = path.join(ROOT_DIR, "docs", "audit-reports");

/**
 * Get trend indicator
 */
function getTrend(delta, metric) {
  // For some metrics, lower is better
  const lowerIsBetter = [
    "unsafeJsonParse",
    "exposedErrors",
    "asAnyCasts",
    "magicNumbers",
    "estimatedDuplicateLines",
    "usingRawFetch",
  ];

  if (delta === 0) return { symbol: "→", label: "stable", color: "yellow" };

  const isImprovement = lowerIsBetter.includes(metric)
    ? delta < 0
    : delta > 0;

  if (isImprovement) {
    return { symbol: "↑", label: "improved", color: "green" };
  } else {
    return { symbol: "↓", label: "regressed", color: "red" };
  }
}

/**
 * Calculate delta between two values
 */
function calcDelta(current, previous) {
  if (previous === null || previous === undefined) return null;
  if (current === null || current === undefined) return null;
  return current - previous;
}

/**
 * Format delta with sign
 */
function formatDelta(delta) {
  if (delta === null) return "N/A";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

/**
 * Compare score sections
 */
function compareScores(current, previous) {
  const comparisons = {};

  for (const key of Object.keys(current)) {
    const delta = calcDelta(current[key], previous?.[key]);
    comparisons[key] = {
      current: current[key],
      previous: previous?.[key] ?? null,
      delta,
      deltaFormatted: formatDelta(delta),
      trend: getTrend(delta, key),
    };
  }

  return comparisons;
}

/**
 * Compare quality metrics
 */
function compareQualityMetrics(current, previous) {
  const metrics = ["unsafeJsonParse", "exposedErrors", "asAnyCasts", "magicNumbers"];
  const comparisons = {};

  for (const metric of metrics) {
    const currCount = current?.[metric]?.count ?? 0;
    const prevCount = previous?.[metric]?.count ?? null;
    const delta = calcDelta(currCount, prevCount);

    comparisons[metric] = {
      current: currCount,
      previous: prevCount,
      delta,
      deltaFormatted: formatDelta(delta),
      trend: getTrend(delta, metric),
    };
  }

  return comparisons;
}

/**
 * Compare maintainability metrics
 */
function compareMaintainabilityMetrics(current, previous) {
  return {
    largestFile: {
      current: current?.fileSizes?.[0]?.lines ?? 0,
      previous: previous?.fileSizes?.[0]?.lines ?? null,
      file: current?.fileSizes?.[0]?.file ?? "N/A",
      delta: calcDelta(
        current?.fileSizes?.[0]?.lines ?? 0,
        previous?.fileSizes?.[0]?.lines
      ),
      trend: getTrend(
        calcDelta(
          current?.fileSizes?.[0]?.lines ?? 0,
          previous?.fileSizes?.[0]?.lines
        ),
        "largestFile" // lower is better
      ),
    },
    avgServiceLines: {
      current: current?.avgServiceLines ?? 0,
      previous: previous?.avgServiceLines ?? null,
      delta: calcDelta(current?.avgServiceLines, previous?.avgServiceLines),
      trend: getTrend(
        calcDelta(current?.avgServiceLines, previous?.avgServiceLines),
        "avgServiceLines"
      ),
    },
    repositoriesExtracted: {
      current: current?.repositories?.extracted ?? 0,
      previous: previous?.repositories?.extracted ?? null,
      delta: calcDelta(
        current?.repositories?.extracted,
        previous?.repositories?.extracted
      ),
      trend: getTrend(
        calcDelta(
          current?.repositories?.extracted,
          previous?.repositories?.extracted
        ),
        "extracted"
      ),
    },
  };
}

/**
 * Compare DRY metrics
 */
function compareDryMetrics(current, previous) {
  return {
    proxyHelperAdoption: {
      current: current?.proxyHelper?.usingProxyHelper ?? 0,
      previous: previous?.proxyHelper?.usingProxyHelper ?? null,
      delta: calcDelta(
        current?.proxyHelper?.usingProxyHelper,
        previous?.proxyHelper?.usingProxyHelper
      ),
      trend: getTrend(
        calcDelta(
          current?.proxyHelper?.usingProxyHelper,
          previous?.proxyHelper?.usingProxyHelper
        ),
        "usingProxyHelper"
      ),
    },
    rawFetchRemaining: {
      current: current?.proxyHelper?.usingRawFetch ?? 0,
      previous: previous?.proxyHelper?.usingRawFetch ?? null,
      delta: calcDelta(
        current?.proxyHelper?.usingRawFetch,
        previous?.proxyHelper?.usingRawFetch
      ),
      trend: getTrend(
        calcDelta(
          current?.proxyHelper?.usingRawFetch,
          previous?.proxyHelper?.usingRawFetch
        ),
        "usingRawFetch"
      ),
    },
    estimatedDuplicateLines: {
      current: current?.estimatedDuplicateLines ?? 0,
      previous: previous?.estimatedDuplicateLines ?? null,
      delta: calcDelta(
        current?.estimatedDuplicateLines,
        previous?.estimatedDuplicateLines
      ),
      trend: getTrend(
        calcDelta(
          current?.estimatedDuplicateLines,
          previous?.estimatedDuplicateLines
        ),
        "estimatedDuplicateLines"
      ),
    },
  };
}

/**
 * Compare test metrics
 */
function compareTestMetrics(current, previous) {
  return {
    testFileCount: {
      current: current?.testFileCount ?? 0,
      previous: previous?.testFileCount ?? null,
      delta: calcDelta(current?.testFileCount, previous?.testFileCount),
      trend: getTrend(
        calcDelta(current?.testFileCount, previous?.testFileCount),
        "testFileCount"
      ),
    },
    lineCoverage: {
      current: current?.coverage?.lines ?? 0,
      previous: previous?.coverage?.lines ?? null,
      delta: calcDelta(current?.coverage?.lines, previous?.coverage?.lines),
      trend: getTrend(
        calcDelta(current?.coverage?.lines, previous?.coverage?.lines),
        "lineCoverage"
      ),
    },
  };
}

/**
 * Generate summary of improvements and regressions
 */
function generateSummary(comparison) {
  const improvements = [];
  const regressions = [];
  const stable = [];

  function processComparison(obj, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      if (value.trend) {
        const label = prefix ? `${prefix}.${key}` : key;
        if (value.trend.label === "improved") {
          improvements.push({
            metric: label,
            delta: value.deltaFormatted,
            current: value.current,
          });
        } else if (value.trend.label === "regressed") {
          regressions.push({
            metric: label,
            delta: value.deltaFormatted,
            current: value.current,
          });
        } else {
          stable.push({ metric: label, current: value.current });
        }
      } else if (typeof value === "object" && value !== null) {
        processComparison(value, label);
      }
    }
  }

  processComparison(comparison.scores, "scores");
  processComparison(comparison.quality, "quality");
  processComparison(comparison.maintainability, "maintainability");
  processComparison(comparison.dry, "dry");
  processComparison(comparison.tests, "tests");

  return { improvements, regressions, stable };
}

/**
 * Main comparison function
 */
function compareMetrics(currentMetrics, historyPath) {
  // Load history
  let history = { audits: [] };
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
  }

  // Get previous audit (most recent)
  const previousAudit = history.audits[history.audits.length - 1] || null;

  console.log("Comparing metrics...\n");
  console.log(`Current: ${currentMetrics.commit} (${currentMetrics.timestamp})`);
  console.log(
    `Previous: ${previousAudit?.commit ?? "N/A"} (${previousAudit?.date ?? "N/A"})\n`
  );

  // Build comparison
  const comparison = {
    current: {
      timestamp: currentMetrics.timestamp,
      commit: currentMetrics.commit,
      branch: currentMetrics.branch,
    },
    previous: previousAudit
      ? {
          date: previousAudit.date,
          commit: previousAudit.commit,
          label: previousAudit.label,
        }
      : null,
    scores: compareScores(currentMetrics.scores, previousAudit?.scores),
    quality: compareQualityMetrics(
      currentMetrics.metrics.quality,
      previousAudit?.metrics?.quality
    ),
    maintainability: compareMaintainabilityMetrics(
      currentMetrics.metrics.maintainability,
      previousAudit?.metrics?.maintainability
    ),
    dry: compareDryMetrics(
      currentMetrics.metrics.dry,
      previousAudit?.metrics?.dry
    ),
    tests: compareTestMetrics(
      currentMetrics.metrics.tests,
      previousAudit?.metrics?.tests
    ),
  };

  // Generate summary
  comparison.summary = generateSummary(comparison);

  return comparison;
}

/**
 * Print comparison to console
 */
function printComparison(comparison) {
  console.log("=== SCORE COMPARISON ===\n");

  const scoreTable = Object.entries(comparison.scores).map(([key, val]) => ({
    Dimension: key.charAt(0).toUpperCase() + key.slice(1),
    Previous: val.previous ?? "N/A",
    Current: val.current,
    Delta: val.deltaFormatted,
    Trend: val.trend.symbol,
  }));

  console.table(scoreTable);

  console.log("\n=== SUMMARY ===\n");

  if (comparison.summary.improvements.length > 0) {
    console.log("Improvements:");
    comparison.summary.improvements.forEach((i) => {
      console.log(`  ↑ ${i.metric}: ${i.delta}`);
    });
  }

  if (comparison.summary.regressions.length > 0) {
    console.log("\nRegressions:");
    comparison.summary.regressions.forEach((r) => {
      console.log(`  ↓ ${r.metric}: ${r.delta}`);
    });
  }

  if (
    comparison.summary.improvements.length === 0 &&
    comparison.summary.regressions.length === 0
  ) {
    console.log("No significant changes detected.");
  }

  console.log(
    `\nTotal: ${comparison.summary.improvements.length} improvements, ${comparison.summary.regressions.length} regressions`
  );
}

/**
 * Find most recent metrics file
 */
function findLatestMetrics(reportsDir) {
  if (!fs.existsSync(reportsDir)) return null;

  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith("metrics-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) return null;
  return path.join(reportsDir, files[0]);
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let currentPath;
  let historyPath = DEFAULT_HISTORY_PATH;

  const currentIndex = args.indexOf("--current");
  if (currentIndex !== -1 && args[currentIndex + 1]) {
    currentPath = args[currentIndex + 1];
  } else {
    currentPath = findLatestMetrics(DEFAULT_REPORTS_DIR);
    if (!currentPath) {
      console.error(
        "No metrics file found. Run 'node scripts/audit-metrics.js' first."
      );
      process.exit(1);
    }
  }

  const historyIndex = args.indexOf("--history");
  if (historyIndex !== -1 && args[historyIndex + 1]) {
    historyPath = args[historyIndex + 1];
  }

  // Load current metrics
  if (!fs.existsSync(currentPath)) {
    console.error(`Metrics file not found: ${currentPath}`);
    process.exit(1);
  }

  const currentMetrics = JSON.parse(fs.readFileSync(currentPath, "utf-8"));

  // Compare
  const comparison = compareMetrics(currentMetrics, historyPath);

  // Output
  printComparison(comparison);

  // Write comparison to file
  const outputPath = currentPath.replace("metrics-", "comparison-");
  fs.writeFileSync(outputPath, JSON.stringify(comparison, null, 2));
  console.log(`\nComparison written to: ${outputPath}`);

  // Output JSON if requested
  if (args.includes("--json")) {
    console.log("\n" + JSON.stringify(comparison, null, 2));
  }
}

main();
