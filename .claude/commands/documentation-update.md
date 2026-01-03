# Documentation Update Command

Audit the codebase and synchronize all documentation with the current state.

## What This Command Does

1. **Explores the codebase** using parallel agents to discover:
   - All routes (pages, API, overlays)
   - All services and adapters
   - Component structure
   - Backend architecture
   - Stream Deck plugin

2. **Reads existing documentation**:
   - README.md
   - CLAUDE.md
   - docs/*.md
   - Agent definitions

3. **Identifies gaps**:
   - Undocumented features
   - Outdated file paths
   - Missing services/routes
   - Agent coherence issues

4. **Updates documentation**:
   - README.md with missing features
   - CLAUDE.md with new services/patterns
   - Agent AGENT.md files with correct paths

5. **Suggests new features**:
   - Based on codebase analysis
   - Prioritized by effort/value

## Instructions

Perform a comprehensive documentation audit:

### Step 1: Explore Codebase (Parallel)

Launch these exploration tasks simultaneously:

```
Task(subagent_type="Explore", prompt="Explore app/ for all routes, pages, API endpoints")
Task(subagent_type="Explore", prompt="Explore lib/ for all services, adapters, models")
Task(subagent_type="Explore", prompt="Explore components/ for component organization")
Task(subagent_type="Explore", prompt="Explore server/ for backend architecture")
Task(subagent_type="Explore", prompt="Explore streamdeck-plugin/ for plugin structure")
```

### Step 2: Read Current Documentation

Read these files:
- README.md
- CLAUDE.md
- All docs/*.md files
- All .claude/agents/*/AGENT.md files

### Step 3: Analyze Gaps

Create a gap report comparing discovered vs documented:

| Category | Discovered | Documented | Gap |
|----------|------------|------------|-----|
| Overlays | X | Y | Z missing |
| Services | X | Y | Z missing |
| Routes | X | Y | Z missing |
| Agents | X paths | Y correct | Z incorrect |

### Step 4: Update Files

Update documentation files:
1. **README.md** - Add missing features, routes, overlays
2. **CLAUDE.md** - Add missing services, patterns, flows
3. **Agent files** - Fix incorrect paths, add missing context

### Step 5: Compile Feature Ideas

Based on audit findings, suggest:
- High priority (natural extensions)
- Medium priority (integrations, UX)
- Low priority (nice-to-have)
- Technical improvements

## Expected Output

1. Updated README.md
2. Updated CLAUDE.md
3. Updated agent AGENT.md files (if needed)
4. Gap report summary
5. Feature ideas list with priorities
