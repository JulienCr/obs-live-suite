# Audit Continue Command

Work on findings from the most recent audit report.

## Workflow

### Step 1: Load Latest Report

1. Find the most recent `{date}_audit-report.md` in `docs/audit-reports/`
2. If no report exists, tell the user to run `/audit` first
3. Read the report and parse findings by severity

### Step 2: Present Findings

Show findings grouped by priority:
- **Critical** (must fix)
- **High** (should fix soon)
- **Medium** (fix when convenient)
- **Low** (nice to have)

Suggest the top 3-5 most impactful items to work on.

### Step 3: Execute Fixes

After the user selects which findings to fix:

1. Verify clean git status (ask to commit/stash if needed)
2. Dispatch fix agents in parallel where possible:

| Type of fix | Agent | Justification |
|-------------|-------|---------------|
| DRY refactoring | `nextjs-expert` | Architecture, TypeScript |
| Bug fix | `nextjs-expert` | Full-stack fixes |
| WebSocket/real-time | `realtime-websocket` | Pub/sub, ChannelManager |
| OBS integration | `obs-websocket` | OBS WebSocket v5 protocol |
| Test coverage | `nextjs-expert` | Jest, testing-library |

3. After agents complete, run `pnpm type-check` to verify no regressions
4. Present summary of changes made

### Step 4: Report Progress

After each batch of fixes:
- List what was fixed and what files changed
- Note any remaining findings for the next batch
- Do NOT commit - the user will commit when ready
