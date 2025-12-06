# Beads How-To Guide: Action-Based Workflow

This guide shows you how to use Beads in your daily workflow through specific action scenarios.

## What is Beads?

Beads is a memory system for AI coding agents. It's a graph-based issue tracker where tasks chain together like beads on a string, giving AI agents persistent memory across sessions and enabling complex, long-horizon work.

**Key Philosophy:** Beads is designed for AI agents to manage automatically. You guide the agent, and it maintains the issue tracker.

---

## 1. I Want to Set Up Beads

### First-Time Installation (Windows)

```bash
# Download beads binary
curl -L -o "C:\Users\<your-username>\beads.zip" "https://github.com/steveyegge/beads/releases/download/v0.28.0/beads_0.28.0_windows_amd64.zip"

# Extract
powershell -Command "Expand-Archive -Path 'C:\Users\<your-username>\beads.zip' -DestinationPath 'C:\Users\<your-username>\beads' -Force"

# Verify installation
"C:\Users\<your-username>\beads\bd.exe" --version
```

**Expected output:** `bd version 0.28.0 (045591af)`

**Optional:** Add `C:\Users\<your-username>\beads` to your PATH environment variable so you can run `bd` instead of the full path.

### Alternative Installation Methods

**macOS/Linux (Homebrew):**
```bash
brew tap steveyegge/beads
brew install bd
```

**npm (Node.js):**
```bash
npm install -g @beads/bd
```

**Quick install script (macOS/Linux):**
```bash
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

---

### Initialize Beads in Your Project

Navigate to your project root and run:

```bash
cd /path/to/your/project
bd init --quiet
```

**What this does:**
- Creates `.beads/` directory
- Initializes `beads.db` (SQLite cache, gitignored)
- Creates `issues.jsonl` (source of truth, committed to git)
- Sets up auto-sync with git

**Setup variations:**
- `bd init --team` - For team collaboration with branch workflow
- `bd init --contributor` - For OSS fork workflows
- `bd init --stealth` - Local-only, invisible to collaborators
- `bd init --quiet` - Non-interactive (best for agents)

**Verify setup:**
```bash
bd list
```

Should show empty list (no issues yet).

---

## 2. I Want to Make a Plan with Beads

### The "Issues-First" Approach (Yegge's Recommendation)

When starting a new feature or ticket:

**Step 1: Create a Design/Plan First**

Ask your AI agent:
> "Create an implementation plan for JIRA-XXX"

The agent creates a plan document (like we did with `streamed-juggling-hejlsberg.md`).

**Step 2: Ask Agent to File Beads Issues**

After the plan is ready:
> "Create a beads epic for JIRA-XXX with child issues based on the plan"

**What the agent does:**

```bash
# Create epic
bd create "JIRA-XXX: Feature Name" \
  -t epic \
  -p 1 \
  --description "High-level description of the feature"
```

**Output:** `✓ Created issue: meta-abc123` (your epic ID)

```bash
# Create child tasks (one per implementation phase)
bd create "Phase 1: Setup Infrastructure" \
  -t task \
  -p 1 \
  --parent meta-abc123 \
  --description "Detailed description of phase 1 work"

bd create "Phase 2: Implement Core Logic" \
  -t task \
  -p 1 \
  --parent meta-abc123 \
  --deps "meta-abc123.1" \
  --description "Phase 2 depends on Phase 1 completion"

# Continue for all phases...
```

**Step 3: Verify the Structure**

```bash
bd dep tree meta-abc123
```

Shows visual dependency graph of your epic and all child tasks.

```bash
bd ready
```

Shows tasks that have no blockers and are ready to start.

---

### Manual Planning (If You Prefer Direct Control)

**Create epic yourself:**

```bash
bd create "JIRA-XXX: Feature Name" -t epic -p 1
```

**Break down into granular tasks:**

```bash
# Task 1 (no dependencies)
bd create "Implement component X" -t task -p 1 --parent <epic-id>

# Task 2 (depends on Task 1)
bd create "Add tests for X" -t task -p 2 --parent <epic-id> --deps "<task-1-id>"

# Task 3 (depends on Task 1)
bd create "Integrate X with Y" -t task -p 1 --parent <epic-id> --deps "<task-1-id>"
```

**Best Practice: Granular Tasks**
- Each task should be 1-2 hours of work
- Clear, actionable description
- Explicit dependencies
- Appropriate priority (P0-P4, where P0 is highest)

---

## 3. I Want to Work on the Next Task with Beads

### Start Your Work Session

**Say to your AI agent:**
> "What's next?"

**What the agent does:**

```bash
bd ready --json
```

**Agent analyzes:**
- Tasks with no blockers
- Highest priority
- Estimates effort
- Shows you the top candidate

**Agent response:**
> "I see 3 ready issues. Highest priority is meta-abc123.1: Setup Infrastructure (P1).
> This is blocked by nothing and blocks 4 other issues. Shall I start?"

---

### Working on the Task

**You say:** "Yes"

**Agent marks it in progress:**

```bash
bd update meta-abc123.1 --status in_progress
```

**Agent implements the task** and during work:

**If agent discovers issues:**

```bash
# Agent files discovered bugs/todos automatically
bd create "Fix edge case in validation" \
  -t bug \
  -p 2 \
  --deps "discovered-from:meta-abc123.1"
```

**Agent asks you:**
> "I discovered issue meta-abc123.9 (fix edge case). Should I fix now or defer?"

**You decide:**
- "Fix now" → Agent works on it immediately
- "Defer" → Agent continues with main task, bug stays in backlog

---

### Completing the Task

**When agent finishes:**

```bash
bd update meta-abc123.1 \
  --status done \
  --reason "Implemented TimerBackend with pub/sub pattern and XState integration"
```

**Agent checks what unblocked:**

```bash
bd ready
```

**Agent reports:**
> "meta-abc123.1 complete! This unblocked:
> - meta-abc123.2 (Add tests)
> - meta-abc123.3 (Integrate with orchestrator)
> Next ready: meta-abc123.2. Continue?"

---

## 4. I Want to End My Work Session ("Landing the Plane")

**This is critical!** At the end of every session, perform hygiene to maintain clean state.

### The Landing the Plane Protocol

**You say:**
> "Let's land the plane for this session"

**Agent performs checklist:**

#### 1. Review In-Progress Work

```bash
bd list --status in_progress
```

**If tasks are incomplete:**

```bash
bd update <task-id> \
  --status open \
  --reason "Paused - need to investigate performance issue"
```

#### 2. File Any Discovered Issues

Agent reviews notes and creates issues for:
- TODOs found in code
- Bugs discovered
- Technical debt identified
- Follow-up work needed

```bash
bd create "Refactor timer cleanup logic" \
  -t chore \
  -p 3 \
  --deps "related:<current-epic-id>"
```

#### 3. Run Quality Gates

```bash
# Run tests
npm test

# Run linter
npm run lint

# If failures exist:
bd create "Fix failing tests in timer module" \
  -t bug \
  -p 0 \
  --description "Tests failing after timer refactor"
```

#### 4. Show Overall Progress

```bash
bd dep tree <epic-id>
```

Agent shows:
- What's completed (✓)
- What's in progress
- What's ready next
- What's blocked

#### 5. Commit Beads State to Git

Beads auto-syncs, but verify:

```bash
git status
```

Should show changes to `.beads/issues.jsonl`

```bash
git add .beads/issues.jsonl
git commit -m "Update beads: completed Phase 1, filed 3 new issues"
git push
```

#### 6. Prepare Next Session Context

**Agent provides handoff:**

> "Session complete! Summary:
> - ✓ Completed: meta-abc123.1 (Setup Infrastructure)
> - Filed: 3 new issues (2 bugs, 1 chore)
> - Tests: All passing
> - Next ready: meta-abc123.2 (Add tests) and meta-abc123.3 (Integrate)
>
> Next session, ask 'What's next?' to resume work."

---

## 5. I Want to Check Project Status

### View All Issues

```bash
bd list
```

Shows all issues with status, priority, type.

**Filter by status:**

```bash
bd list --status open
bd list --status in_progress
bd list --status done
```

**Filter by priority:**

```bash
bd list --priority 0,1  # Show only P0 and P1
```

---

### View Ready Work

```bash
bd ready
```

Shows only tasks with no blockers.

---

### View Specific Issue

```bash
bd show meta-abc123.1
```

Shows:
- Title, description
- Status, priority, type
- Dependencies (blocks/blocked by)
- History of updates
- Comments

---

### Visualize Dependencies

```bash
bd dep tree meta-abc123
```

Shows visual tree of epic and all child tasks with dependency relationships.

**Example output:**
```
🌲 Dependency tree for meta-abc123:

meta-abc123: JIRA-XXX: Feature Name [P1] (open)
├── meta-abc123.1: Setup Infrastructure [P1] (done) ✓
├── meta-abc123.2: Add Tests [P2] (open) [READY] [blocked by: meta-abc123.1]
├── meta-abc123.3: Integrate [P1] (open) [READY] [blocked by: meta-abc123.1]
└── meta-abc123.4: Documentation [P3] (open) [blocked by: meta-abc123.2, meta-abc123.3]
```

---

## 6. I Want to Search for Issues

### Search by Keyword

```bash
bd search "timer"
```

Shows all issues with "timer" in title or description.

---

### Find Issues by Label

```bash
bd list --labels bug,performance
```

Shows issues tagged with those labels.

---

## 7. I Want to Handle Dependencies

### Understanding Dependency Types

Beads supports 4 dependency types:

1. **`blocks`** (default) - This issue must complete before another can start
   - Example: "Setup DB" blocks "Write queries"

2. **`parent`** - Hierarchical relationship (epic → child tasks)
   - Example: Epic contains child tasks

3. **`related`** - Issues are related but independent
   - Example: "Add logging" related to "Add metrics"

4. **`discovered-from`** - Issue found while working on another
   - Example: Bug found while implementing feature

### Adding Dependencies

**When creating issue:**

```bash
bd create "Add tests" \
  -t task \
  -p 2 \
  --deps "blocks:meta-abc123.1,related:meta-abc123.5"
```

**After issue exists:**

```bash
bd dep add meta-abc123.2 meta-abc123.1 --type blocks
```

Means: meta-abc123.1 blocks meta-abc123.2

**Discovered-from pattern:**

```bash
bd create "Fix null pointer bug" \
  -t bug \
  -p 1 \
  --deps "discovered-from:meta-abc123.1"
```

---

## 8. I Want to Update an Existing Issue

### Change Status

```bash
bd update meta-abc123.1 --status in_progress
bd update meta-abc123.1 --status done --reason "Completed implementation"
bd update meta-abc123.1 --status blocked --reason "Waiting for API access"
```

**Valid statuses:** `open`, `in_progress`, `blocked`, `done`, `abandoned`

---

### Change Priority

```bash
bd update meta-abc123.1 --priority 0  # Highest (P0)
```

---

### Update Description

```bash
bd update meta-abc123.1 --description "New description with more details"
```

---

### Add Labels

```bash
bd update meta-abc123.1 --labels bug,urgent,backend
```

---

### Add Assignee

```bash
bd update meta-abc123.1 --assignee gavin
```

---

## 9. I Want to Close/Complete an Issue

### Mark as Done

```bash
bd update <issue-id> --status done --reason "What you accomplished"
```

**Best practice:** Always include `--reason` to document completion.

---

### Abandon an Issue

```bash
bd update <issue-id> --status abandoned --reason "No longer needed due to architecture change"
```

---

### Alternative: Use `bd close`

```bash
bd close <issue-id> --reason "Completed successfully"
```

Shorthand for marking done.

---

## 10. I Want to Use Beads Across Branches

### How Beads Handles Branches

**Beads uses git for sync:**
- `.beads/issues.jsonl` is committed to git
- When you switch branches, beads auto-imports the branch's issues
- When you pull changes, beads auto-imports updates

### Multi-Branch Workflow

**Scenario:** Working on feature branch

```bash
# On feature branch
git checkout feature/new-timer-system

# Beads auto-imports issues from this branch
bd list  # Shows issues for this branch

# Create feature-specific issues
bd create "Implement feature X" -t task -p 1

# Commit beads state
git add .beads/issues.jsonl
git commit -m "Add feature X tasks"

# Switch back to main
git checkout main

# Beads auto-imports main branch issues
bd list  # Shows different issues (main branch)
```

**Hash-based IDs prevent conflicts:**
- Old: Sequential IDs (bd-1, bd-2) caused merge conflicts
- New: Hash-based IDs (bd-a1b2c3) unique across branches

---

## Beads Best Practices (From Steve Yegge)

### Three Critical Areas to Use Beads Consciously

#### 1. After Design Docs
**When:** You create a plan/design document

**Action:**
> "File beads epics and issues for this design"

**Agent creates:**
- One epic for the feature
- Child tasks for each implementation phase
- Dependencies between tasks

---

#### 2. During Work (Discover Issues)
**When:** Agent finds bugs, TODOs, or follow-up work while coding

**Action:** Nudge agent if it doesn't file automatically
> "File a beads issue for that TODO"

**Agent creates:**
```bash
bd create "TODO: Add error handling to X" \
  -t chore \
  -p 3 \
  --deps "discovered-from:<current-task>"
```

---

#### 3. End of Session (Landing the Plane)
**When:** Ending your work session

**Action:**
> "Let's land the plane"

**Agent performs:**
- File any unfiled issues
- Update in-progress tasks
- Run tests/linters, file bugs if failing
- Commit beads state to git
- Provide next-session handoff

**Critical:** Explicitly remind agents about this hygiene!

---

### General Best Practices

#### Granular Tasks
- Break work into 1-2 hour chunks
- Clear, actionable descriptions
- One task = one logical unit of work

#### Explicit Dependencies
- Always link related issues
- Use correct dependency type
- Helps agents understand work order

#### Priority Discipline
- **P0** - Critical, blocking (fix immediately)
- **P1** - High priority, main features
- **P2** - Medium priority, nice-to-have
- **P3** - Low priority, future work
- **P4** - Maybe someday

#### Status Hygiene
- Mark `in_progress` when starting
- Mark `done` with reason when complete
- Mark `blocked` if waiting on something
- Never leave stale `in_progress` issues

#### Epic Per Feature
- One epic for each Jira ticket or major feature
- All child tasks under that epic
- Easy to track feature progress

---

## Common Workflows Cheat Sheet

### Start New Feature
```bash
# 1. Create epic
bd create "JIRA-XXX: Feature" -t epic -p 1

# 2. Break into tasks
bd create "Phase 1: ..." -t task -p 1 --parent <epic-id>
bd create "Phase 2: ..." -t task -p 1 --parent <epic-id> --deps "<phase1-id>"

# 3. Check what's ready
bd ready
```

### Daily Work Session
```bash
# Start session
bd ready  # See what's available

# Pick a task
bd update <task-id> --status in_progress

# Work on it...

# Complete it
bd update <task-id> --status done --reason "..."

# Check next
bd ready
```

### End of Session
```bash
# Review progress
bd list --status in_progress

# Update incomplete work
bd update <task-id> --status open --reason "Paused because..."

# File discovered issues
bd create "Fix X" -t bug -p 2

# Check overall status
bd dep tree <epic-id>

# Commit to git
git add .beads/issues.jsonl
git commit -m "Update beads state"
```

---

## Troubleshooting

### Beads feels out of sync
```bash
# Force import from JSONL
bd list --no-auto-import
```

### Want to see verbose output
```bash
bd list --verbose
```

### JSON output for scripting
```bash
bd ready --json
```

### Check beads version
```bash
bd --version
```

---

## Resources

- **GitHub:** https://github.com/steveyegge/beads
- **Steve Yegge's Articles:**
  - [Introducing Beads](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)
  - [The Beads Revolution](https://steve-yegge.medium.com/the-beads-revolution-how-i-built-the-todo-system-that-ai-agents-actually-want-to-use-228a5f9be2a9)
  - [Beads Blows Up](https://steve-yegge.medium.com/beads-blows-up-a0a61bb889b4)
- **Beads Viewer:** https://github.com/Dicklesworthstone/beads_viewer

---

## Quick Reference Card

| I Want To... | Command |
|-------------|---------|
| See what's ready | `bd ready` |
| List all issues | `bd list` |
| Show issue details | `bd show <id>` |
| Create new issue | `bd create "Title" -t task -p 1` |
| Start working | `bd update <id> --status in_progress` |
| Complete work | `bd update <id> --status done --reason "..."` |
| Add dependency | `bd dep add <id> <parent-id> --type blocks` |
| View dep tree | `bd dep tree <id>` |
| Search issues | `bd search "keyword"` |

---

**Remember:** Beads is designed for AI agents to manage. You guide the workflow, the agent maintains the tracker. Start every session with "What's next?" and end with "Let's land the plane!"
