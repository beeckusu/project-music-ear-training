# META-46: Chord Display UI - Critical Path Analysis

## Epic Overview
**META-46: Note Training - Chord Display UI**
- **Status:** Open
- **Priority:** P1 (High)
- **Total Subtasks:** 9
- **All Beads Created:** ✓ (meta-kru.1 through meta-kru.9)

---

## Logical Dependency Analysis

Based on component relationships and feature dependencies:

### Foundation Components (Can Start Immediately)
These 3 tickets have no dependencies and can be worked on in parallel:

1. **META-81** (meta-kru.1) - Create ChordDisplay component
   - Independent foundation component
   - Blocks: META-82, META-83

2. **META-84** (meta-kru.4) - Extend PianoKeyboard for multiple note highlighting
   - Independent foundation enhancement
   - Blocks: META-85

3. **META-88** (meta-kru.8) - Create ChordInput component
   - Independent foundation component
   - Blocks: META-89

### Second Wave (After Foundations Complete)
After foundation components are built:

4. **META-82** (meta-kru.2) - Show/hide ChordDisplay based on game mode
   - Depends on: META-81
   - Can run in parallel with META-83

5. **META-83** (meta-kru.3) - Visual indication of chord inversions
   - Depends on: META-81
   - Can run in parallel with META-82

6. **META-85** (meta-kru.5) - Multi-note selection mode for PianoKeyboard
   - Depends on: META-84
   - Blocks: META-86, META-87

7. **META-89** (meta-kru.9) - Keyboard shortcuts for chord names
   - Depends on: META-88

### Final Wave (Dependent on Selection Mode)
After multi-note selection is implemented:

8. **META-86** (meta-kru.6) - Color-coded feedback for multi-note selection
   - Depends on: META-85
   - Can run in parallel with META-87

9. **META-87** (meta-kru.7) - Submit button for chord note guesses
   - Depends on: META-85
   - Can run in parallel with META-86

---

## Critical Path Diagram

```
                    ┌─────────────┐
                    │   META-46   │
                    │    EPIC     │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
     ┌─────▼──────┐  ┌────▼─────┐  ┌─────▼──────┐
     │  META-81   │  │ META-84  │  │  META-88   │
     │ ChordDisplay│  │PianoKbd  │  │ChordInput  │
     │ Component  │  │Multi-Note│  │ Component  │
     └─────┬──────┘  └────┬─────┘  └─────┬──────┘
           │              │               │
      ┌────┴────┐         │               │
      │         │         │               │
 ┌────▼───┐┌───▼────┐┌───▼────┐     ┌────▼─────┐
 │META-82 ││META-83 ││META-85 │     │ META-89  │
 │Show/   ││Chord   ││Multi-  │     │Keyboard  │
 │Hide    ││Inver-  ││Note    │     │Shortcuts │
 │Logic   ││sions   ││Select  │     └──────────┘
 └────────┘└────────┘└───┬────┘
                         │
                    ┌────┴────┐
                    │         │
               ┌────▼───┐┌────▼───┐
               │META-86 ││META-87 │
               │Color   ││Submit  │
               │Feedback││Button  │
               └────────┘└────────┘
```

---

## Parallelization Strategy

### Phase 1: Maximum Parallelism (3 Agents)
**Start immediately with 3 parallel agents:**
- Agent 1 → META-81 (ChordDisplay component)
- Agent 2 → META-84 (PianoKeyboard multi-note highlighting)
- Agent 3 → META-88 (ChordInput component)

**Critical Path:** All 3 are on the critical path

---

### Phase 2: After First Completions (Up to 5 Agents)
**When META-81 completes:**
- Agent 4 → META-82 (Show/hide functionality)
- Agent 5 → META-83 (Chord inversions)

**When META-84 completes:**
- Agent 6 → META-85 (Multi-note selection mode)

**When META-88 completes:**
- Agent 7 → META-89 (Keyboard shortcuts)

**Critical Path:** META-85 is the longest remaining path

---

### Phase 3: Final Features (2 Agents)
**When META-85 completes:**
- Agent 8 → META-86 (Color-coded feedback)
- Agent 9 → META-87 (Submit button)

**Critical Path:** Both are equal length

---

## Recommended Agent Allocation

### Continuous Critical Path Coverage
**Always keep 1-2 agents on the longest critical path:**

1. **Start:** 3 agents in parallel on META-81, META-84, META-88
2. **Priority:** Complete META-84 → META-85 path first (longest chain)
3. **Secondary:** META-81 → META-82/META-83 (shorter branches)
4. **Tertiary:** META-88 → META-89 (independent, can be done anytime)

### Maximum Parallel Agents by Phase

| Phase | Time | Max Parallel Agents | Active Tickets |
|-------|------|---------------------|----------------|
| 1 | Start | **3** | META-81, META-84, META-88 |
| 2 | After any Phase 1 completion | **4-5** | META-82, META-83, META-85, META-89 |
| 3 | After META-85 complete | **2-4** | META-86, META-87, plus any remaining Phase 2 |

### Optimal Agent Count: **3-4 agents**
- Maintains continuous progress on all critical paths
- Minimizes idle time
- Avoids coordination overhead

---

## Critical Path Metrics

### Longest Path (Most Critical)
**Path Length: 3 tickets**
```
META-84 → META-85 → META-86 (or META-87)
```

### Secondary Paths
**Path Length: 2 tickets**
```
META-81 → META-82
META-81 → META-83
META-88 → META-89
```

### Bottleneck Analysis
**META-85** is the most critical bottleneck:
- Depends on: META-84
- Blocks: META-86, META-87
- On the longest critical path
- Must complete before final 2 tickets can start

**Recommendation:** Assign most experienced agent to META-84 → META-85 path

---

## Work Effort Estimates

Based on task complexity:

| Ticket | Complexity | Estimated Effort | Notes |
|--------|-----------|------------------|-------|
| META-81 | Medium | 2-3 hours | New component with React/XState |
| META-82 | Low | 1 hour | Conditional rendering logic |
| META-83 | Medium | 1-2 hours | Inversion calculation + display |
| META-84 | Medium | 2-3 hours | Extend existing keyboard component |
| META-85 | High | 3-4 hours | Complex selection state management |
| META-86 | Medium | 2-3 hours | Feedback logic + styling |
| META-87 | Low | 1 hour | Button component + event handling |
| META-88 | Medium | 2-3 hours | Input component with autocomplete |
| META-89 | Low | 1-2 hours | Keyboard event handlers |

**Total Estimated Effort:** 15-22 hours

---

## Recommended Execution Plan

### Option A: Speed-Optimized (3 Agents)
**Goal:** Complete epic as fast as possible

**Timeline:**
1. **Hour 0-3:** All 3 agents work on META-81, META-84, META-88 in parallel
2. **Hour 3-7:**
   - Agent 1 → META-85 (longest remaining path)
   - Agent 2 → META-82 or META-83
   - Agent 3 → META-89
3. **Hour 7-10:**
   - Agent 1 → META-86
   - Agent 2 → META-87 or remaining from Phase 2
   - Agent 3 → Remaining ticket
4. **Hour 10-11:** Cleanup any remaining tickets

**Estimated Completion:** 10-12 hours with 3 agents

---

### Option B: Resource-Optimized (2 Agents)
**Goal:** Maintain steady progress with minimal resources

**Timeline:**
1. **Hour 0-3:** Agent 1 → META-84, Agent 2 → META-81
2. **Hour 3-7:** Agent 1 → META-85, Agent 2 → META-88
3. **Hour 7-10:** Agent 1 → META-86, Agent 2 → META-89
4. **Hour 10-13:** Agent 1 → META-87, Agent 2 → META-82
5. **Hour 13-14:** Agent 1 → META-83

**Estimated Completion:** 13-15 hours with 2 agents

---

### Option C: Maximum Parallelism (5 Agents)
**Goal:** Complete as many tasks simultaneously as possible

**Phase 1 (0-3 hours):** 3 agents on META-81, META-84, META-88
**Phase 2 (3-7 hours):** 4 agents on META-82, META-83, META-85, META-89
**Phase 3 (7-10 hours):** 2 agents on META-86, META-87

**Estimated Completion:** 7-10 hours with 5 agents

---

## Key Recommendations

1. **Always prioritize META-84 → META-85 → META-86/87 path** (longest critical path)

2. **Start with 3 agents minimum** for optimal parallelization:
   - META-81 (ChordDisplay)
   - META-84 (PianoKeyboard multi-highlight) **← Critical path priority**
   - META-88 (ChordInput)

3. **Meta-85 is the bottleneck** - assign experienced developer/agent

4. **Independent work:** META-88 → META-89 can be done anytime without blocking others

5. **Quick wins:** META-82, META-87, META-89 are simple tasks (1-2 hours each)

6. **Coordinate on PianoKeyboard:** META-84 and META-85 modify the same component

---

## Beads Commands Reference

### Start Work on Critical Path
```bash
# Priority 1: Start the longest path first
bd update meta-kru.4 --status in_progress  # META-84

# Priority 2: Start ChordDisplay foundation
bd update meta-kru.1 --status in_progress  # META-81

# Priority 3: Start independent ChordInput
bd update meta-kru.8 --status in_progress  # META-88
```

### Check What's Ready
```bash
bd ready --json
```

### Track Progress
```bash
bd dep tree meta-kru
bd list --status in_progress
```

### Mark Complete and Unblock Next
```bash
bd update meta-kru.4 --status done --reason "PianoKeyboard now supports multi-note highlighting"
bd ready  # Shows meta-kru.5 (META-85) is now unblocked
```

---

## Next Steps

1. **Set up dependencies in beads** to match this critical path analysis
2. **Assign agents** to foundation tickets (META-81, META-84, META-88)
3. **Monitor META-85** as the primary bottleneck
4. **Track progress** with `bd ready` and `bd dep tree meta-kru`
5. **Maintain at least 1 agent on critical path** at all times

---

*Generated: 2025-12-17*
*Epic: META-46*
*Total Tickets: 9*
*Critical Path Length: 3*
*Recommended Agents: 3-4*
