# Audit Command

Runs a comprehensive codebase audit: automated metrics, parallel qualitative analysis, deduplication against existing GitHub issues, and automatic issue creation.

## Reference Files

- `docs/audit-history.json` - Historical metrics for comparison
- `docs/audit-reports/` - Previous audit reports
- `scripts/audit-metrics.js` - Automated quantitative metrics
- `scripts/audit-compare.js` - Historical comparison

## Workflow

### Step 1: Pre-checks

1. Verify git status - ensure no uncommitted files
2. If modified files exist, ask the user to commit/stash before continuing

### Step 2: Quantitative Metrics

Run automated metric collection and comparison:

```bash
node scripts/audit-metrics.js --json
node scripts/audit-compare.js --json
```

Display the scores table and trending summary to the user.

### Step 3: Qualitative Analysis (Codebase Auditor Agent)

Dispatch the `codebase-auditor` agent which handles the full qualitative pipeline:

```
Task(subagent_type="codebase-auditor", prompt="Run a full codebase audit. Execute all 7 phases as described in your AGENT.md: collect existing GitHub issues for deduplication, dispatch 6 parallel analysis agents, deduplicate findings, verify critical/high severity issues, create GitHub issues for new findings, and generate the dated audit report. The quantitative metrics have already been collected - use the latest metrics file from docs/audit-reports/.")
```

The agent will:
- Collect existing GitHub issues (open + closed) for deduplication
- Dispatch 6 parallel analysis agents (DRY x3, Bugs x2, Quality x1)
- Deduplicate findings against existing issues using fingerprints and title matching
- Verify Critical/High findings by reading actual source code
- Create GitHub issues with labels and hidden fingerprints for future dedup
- Generate a dated report in `docs/audit-reports/`
- Update `docs/audit-history.json`

### Step 4: Present Results

After the agent completes, show the user:
- Score comparison table (current vs previous)
- Number of new issues created (with links)
- Notable findings summary
- Any regressions flagged

---

## Scoring

Scores are calculated automatically by `audit-metrics.js`:

| Score | Calculation |
|-------|------------|
| Quality | 10 - (unsafeJsonParse x 0.3 + exposedErrors x 0.2 + asAny x 0.1) |
| Maintainability | 10 - largestFile/300 + repoProgress x 3 |
| DRY | proxyAdoption x 10 |
| Tests | coverage / 10 |
| Overall | Average of 4 scores |

## Notes

- The audit is **idempotent**: re-running it will not create duplicate issues
- Both open AND closed issues are checked (fixed issues won't be re-reported)
- Issue fingerprints (`<!-- audit-fingerprint: ... -->`) enable stable deduplication
- Each run produces a new dated report without overwriting previous ones
- Use `/audit-continue` to execute approved corrections from the audit report
