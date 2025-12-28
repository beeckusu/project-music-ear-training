# Beads Epic Analyzer

A PowerShell script that analyzes beads epics to show **dependency graphs**, parallelization opportunities, and critical path visualization.

## Usage

```powershell
# Using beads ID
.\beads-epic-analyzer.ps1 meta-6fb

# Using META tag
.\beads-epic-analyzer.ps1 META-45

# Using any epic identifier
.\beads-epic-analyzer.ps1 <epic-id-or-meta-tag>
```

## What It Shows

### 🎯 **NEW: Visual Dependency Graph**

The script now displays a tree-based dependency graph showing the hierarchical structure of tasks:

```
  meta-6fb
  |
  +-- EPIC - META-45: Note Training - Game State Logic
      |
      +-- [LEVEL 0 - READY - CAN START NOW]
          +-- [READY] meta-6fb.7: Implement chord identification validation
          +-- [READY] meta-6fb.10: Ensure GameStateWithDisplay interface compliance
          +-- [READY] meta-6fb.8: Support enharmonic equivalents
          \-- [READY] meta-6fb.9: Update GameStateFactory
      |
      +-- [LEVEL 1 - BLOCKED - NEEDS LEVEL 0]
          +-- [BLCK] meta-6fb.5: Task waiting on level 0
          \-- [BLCK] meta-6fb.6: Another blocked task
      |
      +-- [COMPLETED: 7 tasks]
          +-- [DONE] meta-6fb.1: Create SingleChordGameState class
          +-- [DONE] meta-6fb.2: Implement chord display
          \-- ... and 5 more
```

This visual graph makes it instantly clear:
- Which tasks can start immediately (Level 0)
- Which tasks are blocked and what they're waiting on
- The dependency hierarchy
- What's already completed

### 1. **Epic Overview**
- Total tasks in the epic
- Completion percentage
- Tasks done, in progress, and open

### 2. **Parallelization Analysis**
Shows you exactly how many agents you can deploy simultaneously:
```
[DEPLOY] CAN DEPLOY: 4 agents in parallel
```

### 3. **Critical Path Tasks**
Identifies tasks that block other tasks - these should be prioritized:
```
[!] CRITICAL PATH TASKS (block other tasks):
  [TODO] meta-abc.1: Important Foundation Task
    |-> Blocks 5 other task(s)
```

### 4. **Ready Tasks**
Lists all tasks with no blockers that can be started immediately:
```
Available to Start:
  1. meta-6fb.7: Implement chord identification validation
  2. meta-6fb.8: Support enharmonic equivalents
  3. meta-6fb.9: Update GameStateFactory
  4. meta-6fb.10: Ensure interface compliance
```

### 5. **Blocked Tasks**
Shows tasks that are waiting on dependencies:
```
[BLCK] meta-kru.5: Add multi-note selection mode
  |-> Waiting on 1 task(s)
```

### 6. **Completed Tasks**
Summary of what's already done

### 7. **Recommendations**
Actionable next steps based on the analysis

## Example Output

```
================================================================================
  EPIC: meta-6fb - META-45: Note Training - Game State Logic
================================================================================

  Total Tasks: 11
  [DONE] Done: 7 (64%)
  [>>>>] In Progress: 0
  [TODO] Open: 4

--------------------------------------------------------------------------------
 DEPENDENCY GRAPH
--------------------------------------------------------------------------------

  Legend - [READY] = No blockers | [BLCK] = Blocked | [DONE] = Complete

  meta-6fb
  |
  +-- EPIC - META-45: Note Training - Game State Logic
      |
      +-- [LEVEL 0 - READY - CAN START NOW]
          +-- [READY] meta-6fb.7: Implement chord identification validation
          +-- [READY] meta-6fb.10: Ensure GameStateWithDisplay interface compliance
          +-- [READY] meta-6fb.8: Support enharmonic equivalents
          \-- [READY] meta-6fb.9: Update GameStateFactory
      |
      +-- [COMPLETED: 7 tasks]
          +-- [DONE] meta-6fb.1: Create SingleChordGameState class
          +-- [DONE] meta-6fb.2: Implement chord display
          \-- ... and 5 more

--------------------------------------------------------------------------------
 PARALLELIZATION ANALYSIS
--------------------------------------------------------------------------------

  [DEPLOY] CAN DEPLOY: 4 agents in parallel

--------------------------------------------------------------------------------
 READY TO START (No Blockers - Deploy Agents Here!)
--------------------------------------------------------------------------------

  Available to Start:
  1. meta-6fb.7: META-77: Implement chord identification validation
  2. meta-6fb.8: META-78: Support enharmonic equivalents
  3. meta-6fb.9: META-79: Update GameStateFactory
  4. meta-6fb.10: META-80: Ensure interface compliance

================================================================================
 RECOMMENDATIONS
================================================================================

  1. Deploy up to 4 agents in parallel
  2. Focus on critical path tasks first (they unblock others)
```

## Key Benefits

1. **Know Your Parallelization Limit**: See exactly how many agents can work simultaneously
2. **Identify Critical Path**: Focus on tasks that unblock the most work
3. **Optimize Workflow**: Deploy agents on independent tasks in parallel
4. **Track Progress**: See completion percentage and what's remaining

## Color Coding

- **Green**: Ready tasks (can start now)
- **Yellow**: In progress tasks
- **Red**: Blocked tasks (waiting on dependencies)
- **Magenta**: Critical path tasks (block other work)
- **Gray**: Completed tasks
- **Cyan**: Epic header

## Tips

- Run this before each work session to see what's available
- Deploy agents on all ready tasks simultaneously for maximum efficiency
- Prioritize critical path tasks to unblock more work
- Rerun after completing tasks to see newly unblocked work

## Related Commands

```bash
# List all epics
bd list --json | ConvertFrom-Json | Where-Object { $_.issue_type -eq "epic" }

# See all ready tasks across all epics
bd ready

# Show dependency tree
bd dep tree <epic-id>
```
