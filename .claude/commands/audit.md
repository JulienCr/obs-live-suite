# Audit Command

Runs a codebase audit: automated metrics, parallel qualitative analysis, and report generation.

## Workflow

### Step 1: Pre-checks

1. Run `git status` - if there are uncommitted changes, ask the user to commit or stash first
2. Verify `docs/audit-history.json` exists

### Step 2: Run Audit

Dispatch the `codebase-auditor` agent:

```
Task(subagent_type="codebase-auditor", prompt="Run a full codebase audit. Execute all 3 phases: collect context (metrics + comparison + open issues), dispatch 2 parallel analysis agents (DRY+quality, bugs+safety), and generate the dated report in docs/audit-reports/. Update docs/audit-history.json with the new entry.")
```

### Step 3: Present Results

After the agent completes, show the user:
- Score comparison table (current vs previous)
- Key metric changes
- Notable findings summary
- Offer to create GitHub issues for selected findings
- Use `/audit-continue` to work on findings from the report
