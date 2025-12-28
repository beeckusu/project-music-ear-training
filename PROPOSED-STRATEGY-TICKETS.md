# Proposed Strategy Pattern Implementation Tickets

## New Epic: META-XXX: Implement Strategy Pattern for Game Orchestrator

**Description:** Refactor GameOrchestrator to use strategy pattern, enabling support for both ear training and chord training game flows with shared infrastructure.

**Goals:**
- Enable chord training modes to work properly
- Maintain all existing ear training functionality
- Create extensible architecture for future modes
- Unblock META-82 and other chord mode tickets

---

## Phase 1: Foundation

### META-XXX: Create ModeStrategy interface and type system
**Priority:** P1
**Type:** Task
**Estimate:** 1 day

**Description:**
Create the core strategy interface and supporting type definitions without modifying existing orchestrator behavior.

**Acceptance Criteria:**
- [ ] Create `src/game/strategies/ModeStrategy.ts` interface
- [ ] Define `StrategyContext` interface with orchestrator services
- [ ] Define `StrategyActionResult` return type
- [ ] Create `src/types/orchestrator.ts` with `UserAction` union type
- [ ] Add JSDoc documentation for all interfaces
- [ ] No breaking changes to existing code

**Files to Create:**
- `src/game/strategies/ModeStrategy.ts`
- `src/types/orchestrator.ts`

**Dependencies:** None

---

### META-XXX: Update mode registry to include strategy type
**Priority:** P1
**Type:** Task
**Estimate:** 0.5 days

**Description:**
Add `strategyType` field to mode metadata to enable automatic strategy selection.

**Acceptance Criteria:**
- [ ] Add `strategyType: 'ear-training' | 'chord-training'` to `ModeMetadata` interface
- [ ] Update all ear training mode registrations with `strategyType: 'ear-training'`
- [ ] Update all chord training mode registrations with `strategyType: 'chord-training'`
- [ ] Add validation in `modeRegistry.register()` to require strategyType
- [ ] All existing modes still load correctly

**Files to Modify:**
- `src/types/modeRegistry.ts`
- `src/game/modes/earTrainingModes.ts`
- `src/game/modes/noteTrainingModes.ts`
- `src/game/ModeRegistry.ts` (validation)

**Dependencies:** None

---

### META-XXX: Add mode-agnostic events to OrchestratorEvents
**Priority:** P1
**Type:** Task
**Estimate:** 0.5 days

**Description:**
Update event types to support both ear training and chord training with generic context objects.

**Acceptance Criteria:**
- [ ] Update `roundStart` event to include generic `context` object
- [ ] Context includes optional `note`, `chord`, `displayNotes` fields
- [ ] Update `roundComplete` event to be mode-agnostic
- [ ] Add `userAction` event type
- [ ] Maintain backwards compatibility with existing event consumers
- [ ] Add type tests to verify event structure

**Files to Modify:**
- `src/game/OrchestratorEvents.ts`

**Dependencies:** None

---

### META-XXX: Extend GameStateWithDisplay with interaction callbacks
**Priority:** P1
**Type:** Task
**Estimate:** 0.5 days

**Description:**
Add optional callback methods to GameStateWithDisplay interface for component interaction.

**Acceptance Criteria:**
- [ ] Add optional `onPianoKeyClick(note, context)` method
- [ ] Add optional `onSubmitClick(context)` method
- [ ] Add `CallbackContext` type definition
- [ ] Update JSDoc for interface
- [ ] Backwards compatible (callbacks are optional)

**Files to Modify:**
- `src/game/GameStateFactory.tsx`
- `src/types/game.ts` (if CallbackContext goes here)

**Dependencies:** None

---

## Phase 2: Ear Training Strategy

### META-XXX: Create EarTrainingStrategy implementation
**Priority:** P1
**Type:** Task
**Estimate:** 2 days

**Description:**
Extract current ear training game logic into EarTrainingStrategy, maintaining exact behavior.

**Acceptance Criteria:**
- [ ] Create `src/game/strategies/EarTrainingStrategy.ts`
- [ ] Implement `startRound()` - generate note, play audio, emit events
- [ ] Implement `handleUserAction()` - validate guesses, handle timeout
- [ ] Implement `shouldAutoAdvance()` returns true
- [ ] Implement `getAutoAdvanceDelay()` returns configured delay
- [ ] Unit tests with 100% coverage
- [ ] Behavior matches current orchestrator exactly

**Files to Create:**
- `src/game/strategies/EarTrainingStrategy.ts`
- `src/game/strategies/__tests__/EarTrainingStrategy.test.ts`

**Dependencies:**
- META-XXX: Create ModeStrategy interface

---

### META-XXX: Integrate EarTrainingStrategy into GameOrchestrator
**Priority:** P1
**Type:** Task
**Estimate:** 1.5 days

**Description:**
Add strategy selection and delegation to GameOrchestrator while maintaining fallback to old code path.

**Acceptance Criteria:**
- [ ] Add `createStrategy(mode)` method using metadata.strategyType
- [ ] Add `handleUserAction(action)` method that delegates to strategy
- [ ] Update `startNewRound()` to use strategy if available, fallback to old code
- [ ] Update `submitGuess()` to create UserAction and delegate to strategy
- [ ] Keep old code paths for safety (with deprecation warnings)
- [ ] Add integration tests
- [ ] All existing GameOrchestrator tests pass

**Files to Modify:**
- `src/game/GameOrchestrator.ts`
- `src/game/__tests__/GameOrchestrator.test.ts`

**Files to Create:**
- `src/game/__tests__/GameOrchestrator.strategies.test.ts`

**Dependencies:**
- META-XXX: Create EarTrainingStrategy implementation
- META-XXX: Update mode registry to include strategy type

---

### META-XXX: Add callbacks to ear training game states
**Priority:** P1
**Type:** Task
**Estimate:** 1 day

**Description:**
Implement interaction callbacks in Rush, Survival, and Sandbox game states.

**Acceptance Criteria:**
- [ ] Add `onPianoKeyClick` to RushGameState - calls `handleUserAction({ type: 'guess' })`
- [ ] Add `onPianoKeyClick` to SurvivalGameState - calls `handleUserAction({ type: 'guess' })`
- [ ] Add `onPianoKeyClick` to SandboxGameState - calls `handleUserAction({ type: 'guess' })`
- [ ] No `onSubmitClick` needed (ear training doesn't have submit button)
- [ ] Add unit tests for callbacks
- [ ] All mode tests still pass

**Files to Modify:**
- `src/game/RushGameState.tsx`
- `src/game/SurvivalGameState.tsx`
- `src/game/SandboxGameState.tsx`
- Tests for each

**Dependencies:**
- META-XXX: Extend GameStateWithDisplay with interaction callbacks

---

### META-XXX: Validate ear training regression testing
**Priority:** P1
**Type:** Task
**Estimate:** 1 day

**Description:**
Comprehensive testing to ensure ear training modes work identically to before.

**Acceptance Criteria:**
- [ ] All existing GameOrchestrator tests pass
- [ ] All ear training mode tests pass (Rush, Survival, Sandbox)
- [ ] Manual QA: Play through full session in each ear training mode
- [ ] Verify audio playback works
- [ ] Verify auto-advance works
- [ ] Verify timeouts work
- [ ] Verify all statistics track correctly
- [ ] No console errors or warnings
- [ ] Performance benchmarks match baseline

**Dependencies:**
- META-XXX: Add callbacks to ear training game states
- META-XXX: Integrate EarTrainingStrategy into GameOrchestrator

---

## Phase 3: Chord Training Strategy

### META-XXX: Create ChordTrainingStrategy implementation
**Priority:** P1
**Type:** Task
**Estimate:** 2 days

**Description:**
Implement ChordTrainingStrategy to handle visual chord training game flow.

**Acceptance Criteria:**
- [ ] Create `src/game/strategies/ChordTrainingStrategy.ts`
- [ ] Implement `startRound()` - generate chord, NO audio, emit chord context
- [ ] Implement `handleUserAction()` for all chord actions:
  - `selectNote` - update selection state, emit selection event
  - `clearSelection` - clear selection state
  - `submitAnswer` - validate multi-note answer
  - `submitGuess` - validate chord name
- [ ] Implement `shouldAutoAdvance()` returns false
- [ ] Implement `getAutoAdvanceDelay()` returns 0
- [ ] Unit tests with 100% coverage
- [ ] Integration tests with GameOrchestrator

**Files to Create:**
- `src/game/strategies/ChordTrainingStrategy.ts`
- `src/game/strategies/__tests__/ChordTrainingStrategy.test.ts`

**Dependencies:**
- META-XXX: Create ModeStrategy interface

---

### META-XXX: Add callbacks to chord training game states
**Priority:** P1
**Type:** Task
**Estimate:** 1 day

**Description:**
Implement interaction callbacks in SingleChordGameState and ChordIdentificationGameState.

**Acceptance Criteria:**
- [ ] SingleChordGameState:
  - `onPianoKeyClick` - calls `handleUserAction({ type: 'selectNote' })`
  - `onSubmitClick` - calls `handleUserAction({ type: 'submitAnswer' })`
- [ ] ChordIdentificationGameState:
  - `onPianoKeyClick` - no-op (read-only keyboard)
  - `onSubmitClick` - calls `handleUserAction({ type: 'submitGuess', chordName })`
- [ ] Add unit tests for callbacks
- [ ] Game states update internal state correctly

**Files to Modify:**
- `src/game/SingleChordGameState.tsx`
- `src/game/ChordIdentificationGameState.tsx`
- Tests for each

**Dependencies:**
- META-XXX: Extend GameStateWithDisplay with interaction callbacks

---

### META-XXX: Update NoteIdentification component for callback pattern
**Priority:** P1
**Type:** Task
**Estimate:** 1 day

**Description:**
Update NoteIdentification component to use gameState callbacks instead of direct orchestrator calls.

**Acceptance Criteria:**
- [ ] Add `handlePianoKeyClick` that calls `gameState.onPianoKeyClick?.()`
- [ ] Add `handleSubmitClick` that calls `gameState.onSubmitClick?.()`
- [ ] Pass callbacks to mode displays via CommonDisplayProps
- [ ] Update event listeners to handle mode-agnostic events
- [ ] Component doesn't know about mode types directly
- [ ] All mode displays receive and use callbacks
- [ ] Manual testing: Both ear training and chord modes work

**Files to Modify:**
- `src/components/NoteIdentification.tsx`
- `src/types/game.ts` (CommonDisplayProps if needed)

**Dependencies:**
- META-XXX: Add callbacks to chord training game states
- META-XXX: Create ChordTrainingStrategy implementation

---

### META-XXX: Update mode displays to use callbacks
**Priority:** P1
**Type:** Task
**Estimate:** 0.5 days

**Description:**
Update all mode display components to receive and use interaction callbacks.

**Acceptance Criteria:**
- [ ] Update SingleChordModeDisplay to accept `onPianoKeyClick`, `onSubmitClick`
- [ ] Update ChordIdentificationModeDisplay to accept `onPianoKeyClick`, `onSubmitClick`
- [ ] Update RushModeDisplay to accept `onPianoKeyClick` (if not already)
- [ ] Update SurvivalModeDisplay to accept `onPianoKeyClick` (if not already)
- [ ] Update SandboxModeDisplay to accept `onPianoKeyClick` (if not already)
- [ ] Remove any direct orchestrator references from displays
- [ ] All displays compile without errors

**Files to Modify:**
- `src/components/modes/SingleChordModeDisplay.tsx`
- `src/components/modes/ChordIdentificationModeDisplay.tsx`
- `src/components/modes/RushModeDisplay.tsx`
- `src/components/modes/SurvivalModeDisplay.tsx`
- `src/components/modes/SandboxModeDisplay.tsx`

**Dependencies:**
- META-XXX: Update NoteIdentification component for callback pattern

---

### META-XXX: Validate chord training modes work end-to-end
**Priority:** P1
**Type:** Task
**Estimate:** 1 day

**Description:**
Comprehensive testing to ensure chord training modes work correctly.

**Acceptance Criteria:**
- [ ] Manual QA: Complete full session in "Chord Training" mode
- [ ] Manual QA: Complete full session in "Chord Identification" mode
- [ ] Verify no audio plays for chord modes
- [ ] Verify chord name shows/hides correctly (META-82)
- [ ] Verify multi-note selection works
- [ ] Verify Submit button works
- [ ] Verify feedback messages display
- [ ] Verify statistics track correctly
- [ ] Verify session completion works
- [ ] No console errors or warnings
- [ ] Can switch between ear training and chord modes

**Dependencies:**
- META-XXX: Update mode displays to use callbacks
- META-XXX: Create ChordTrainingStrategy implementation

---

## Phase 4: Cleanup & Optimization

### META-XXX: Remove fallback code paths from GameOrchestrator
**Priority:** P2
**Type:** Task
**Estimate:** 0.5 days

**Description:**
Remove old code paths now that all modes use strategies.

**Acceptance Criteria:**
- [ ] Remove fallback logic from `startNewRound()`
- [ ] Remove deprecated `submitGuess()` method (or mark truly deprecated)
- [ ] Remove any strategy null checks
- [ ] All tests still pass
- [ ] Code coverage maintained or improved

**Files to Modify:**
- `src/game/GameOrchestrator.ts`

**Dependencies:**
- META-XXX: Validate chord training modes work end-to-end

---

### META-XXX: Optimize and document strategy pattern implementation
**Priority:** P2
**Type:** Task
**Estimate:** 1 day

**Description:**
Final optimization, documentation, and performance validation.

**Acceptance Criteria:**
- [ ] Add comprehensive JSDoc to all strategy files
- [ ] Add architecture diagram to `STRATEGY-PATTERN.md`
- [ ] Add usage examples to documentation
- [ ] Run performance benchmarks (should match baseline)
- [ ] Review and optimize event emission frequency
- [ ] Add migration guide for future strategies
- [ ] Code review and refactoring for clarity

**Files to Create:**
- `docs/STRATEGY-PATTERN.md`

**Files to Modify:**
- All strategy files (add documentation)

**Dependencies:**
- META-XXX: Remove fallback code paths from GameOrchestrator

---

## Summary

### New Tickets to Create: 16
- **Phase 1 (Foundation):** 4 tickets - 2.5 days
- **Phase 2 (Ear Training):** 4 tickets - 6.5 days
- **Phase 3 (Chord Training):** 5 tickets - 5.5 days
- **Phase 4 (Cleanup):** 2 tickets - 1.5 days
- **Total Estimated Time:** 16 days (3.2 weeks)

### Priority Breakdown
- **P1 (Critical Path):** 14 tickets
- **P2 (Polish):** 2 tickets

### Milestone: Unblock META-82
Tickets needed to unblock META-82 QA testing:
1. All Phase 1 tickets (foundation)
2. All Phase 3 tickets (chord training)
3. META-XXX: Validate chord training modes work end-to-end

**Can skip Phase 2 initially** if we want to fast-track chord modes (risky but possible)

### Dependencies Graph
```
Phase 1 (All parallel)
  ↓
Phase 2 (Ear Training) ←→ Phase 3 (Chord Training) [can be parallel!]
  ↓
Phase 4 (Cleanup)
```

**Key Insight:** Phase 2 and Phase 3 can be done in parallel by different developers!
