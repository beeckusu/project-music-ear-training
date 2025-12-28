# Strategy Pattern Tickets Created Successfully

## Epic Created

**META-200: Implement Strategy Pattern for Game Orchestrator** (meta-r3j)
- Priority: P0
- Status: Open
- Type: Epic
- Children: 15 tickets

**Description**: Refactor GameOrchestrator to use strategy pattern, enabling support for both ear training and chord training game flows with shared infrastructure. This epic unblocks chord training modes and enables them to work properly.

---

## All 15 Tickets Created

### Phase 1: Foundation (4 tickets - P0)

1. **META-201** (meta-r3j.1): Create ModeStrategy interface and type system
   - Create core strategy interface and supporting type definitions
   - Files: `src/game/strategies/ModeStrategy.ts`, `src/types/orchestrator.ts`
   - **Dependencies**: None (READY TO START)

2. **META-202** (meta-r3j.2): Update mode registry to include strategy type
   - Add `strategyType` field to mode metadata
   - Update all mode registrations with appropriate strategyType
   - **Dependencies**: None (READY TO START)

3. **META-203** (meta-r3j.3): Add mode-agnostic events to OrchestratorEvents
   - Update event types to support both training types
   - roundStart event includes context with optional note/chord/displayNotes
   - **Dependencies**: None (READY TO START)

4. **META-204** (meta-r3j.4): Extend GameStateWithDisplay with interaction callbacks
   - Add optional `onPianoKeyClick` and `onSubmitClick` methods
   - Callbacks are optional for backwards compatibility
   - **Dependencies**: None (READY TO START)

---

### Phase 2: Ear Training Strategy (4 tickets - P0)

5. **META-205** (meta-r3j.5): Create EarTrainingStrategy implementation
   - Extract ear training game logic into EarTrainingStrategy
   - Implement startRound(), handleUserAction(), shouldAutoAdvance(), etc.
   - Include unit tests with 100% coverage
   - **Dependencies**: META-201 (ModeStrategy interface)

6. **META-206** (meta-r3j.6): Integrate EarTrainingStrategy into GameOrchestrator
   - Add strategy selection and delegation
   - Add createStrategy(mode) and handleUserAction(action) methods
   - Keep old code paths with deprecation warnings
   - **Dependencies**: META-205, META-202, META-203

7. **META-207** (meta-r3j.7): Add callbacks to ear training game states
   - Implement callbacks in Rush, Survival, Sandbox game states
   - onPianoKeyClick calls handleUserAction({ type: 'guess' })
   - **Dependencies**: META-204, META-206

8. **META-208** (meta-r3j.8): Validate ear training regression testing
   - Comprehensive testing to ensure no regressions
   - Manual QA in each mode, verify audio, auto-advance, timeouts, stats
   - **Dependencies**: META-207

---

### Phase 3: Chord Training Strategy (5 tickets - P0)

9. **META-209** (meta-r3j.9): Create ChordTrainingStrategy implementation
   - Implement visual chord training game flow
   - startRound() with NO audio
   - handleUserAction() for selectNote/clearSelection/submitAnswer/submitGuess
   - shouldAutoAdvance() returns false
   - **Dependencies**: META-201 (ModeStrategy interface)

10. **META-210** (meta-r3j.10): Add callbacks to chord training game states
    - Implement callbacks in SingleChordGameState and ChordIdentificationGameState
    - SingleChord: onPianoKeyClick → selectNote, onSubmitClick → submitAnswer
    - ChordIdentification: onPianoKeyClick → no-op, onSubmitClick → submitGuess
    - **Dependencies**: META-204, META-209
    - **Unblocks**: META-79, META-80

11. **META-211** (meta-r3j.11): Update NoteIdentification component for callback pattern
    - Use gameState callbacks instead of direct orchestrator calls
    - Add handlePianoKeyClick and handleSubmitClick
    - Component becomes mode-agnostic
    - **Dependencies**: META-207, META-210

12. **META-212** (meta-r3j.12): Update mode displays to use callbacks
    - Update all mode displays to receive callbacks via props
    - Remove direct orchestrator references from displays
    - **Dependencies**: META-211

13. **META-213** (meta-r3j.13): Validate chord training modes work end-to-end
    - Comprehensive testing of chord training modes
    - Manual QA in Chord Training and Chord Identification modes
    - Verify no audio, chord name visibility (META-82), multi-note selection, Submit button
    - **Dependencies**: META-212, META-206
    - **Unblocks**: META-82 (QA testing)

---

### Phase 4: Cleanup & Optimization (2 tickets - P1)

14. **META-214** (meta-r3j.14): Remove fallback code paths from GameOrchestrator
    - Remove old code paths now that all modes use strategies
    - Remove fallback logic, deprecated methods, strategy null checks
    - **Dependencies**: META-208, META-213

15. **META-215** (meta-r3j.15): Optimize and document strategy pattern implementation
    - Final optimization, documentation, performance validation
    - Add JSDoc, create STRATEGY-PATTERN.md, usage examples, performance benchmarks
    - **Dependencies**: META-214

---

## Existing Tickets Updated

### Comments Added

**META-82** (meta-kru.2): Add show/hide functionality to ChordDisplay
- ✅ Comment added explaining implementation is complete but QA is blocked
- ✅ Dependency added: Depends on META-213
- Will be unblocked when chord training modes work end-to-end

### Descriptions Updated

**META-79** (meta-6fb.9): Update GameStateFactory to support Note Training modes
- ✅ Description updated to focus on callback implementation
- ✅ Dependency added: Depends on META-210
- Re-scoped to ensure proper instantiation with strategy callbacks

**META-80** (meta-6fb.10): Ensure GameStateWithDisplay interface compliance
- ✅ Description updated to include callback verification
- ✅ Dependency added: Depends on META-210
- Re-scoped to verify callback implementation

### Closed as Duplicate

**META-90** (meta-ywl): Create ShowChordGuessNotesModeDisplay component
- ✅ Closed with reason: "Duplicate - SingleChordModeDisplay already exists"
- ✅ Comment added explaining component already exists

**META-91** (meta-eaf): Create ShowNotesGuessChordModeDisplay component
- ✅ Closed with reason: "Duplicate - ChordIdentificationModeDisplay already exists"
- ✅ Comment added explaining component already exists

---

## Dependency Graph Summary

### Phase 1 (All Ready - No Dependencies)
```
META-201 (ModeStrategy interface) ────────┐
META-202 (Registry strategyType)          │
META-203 (Mode-agnostic events)           │
META-204 (Callback interface)             │
                                          │
All 4 can start in parallel ─────────────┘
```

### Phase 2 (Ear Training - Sequential)
```
META-201 ──→ META-205 (EarTrainingStrategy)
             │
META-202 ────┤
META-203 ────┼──→ META-206 (Integrate to Orchestrator)
             │              │
META-204 ────┤              │
             └──────────────┼──→ META-207 (Add callbacks)
                            │              │
                            └──────────────┼──→ META-208 (Regression tests)
                                           │
                                           └──→ Phase 2 Complete
```

### Phase 3 (Chord Training - Can Start After Phase 1)
```
META-201 ──→ META-209 (ChordTrainingStrategy)
                       │
META-204 ──────────────┼──→ META-210 (Add callbacks) ──→ META-79, META-80
                       │              │
META-207 ──────────────┼──────────────┼──→ META-211 (Update component)
(from Phase 2)         │              │              │
                       └──────────────┘              │
                                                     │
                                                     └──→ META-212 (Update displays)
                                                                    │
META-206 ───────────────────────────────────────────────────────────┤
(from Phase 2)                                                      │
                                                                    │
                                                                    └──→ META-213 (End-to-end validation)
                                                                                   │
                                                                                   └──→ META-82 (UNBLOCKED!)
```

### Phase 4 (Cleanup - After Both Phase 2 and 3)
```
META-208 ────┐
             ├──→ META-214 (Remove fallbacks) ──→ META-215 (Document & optimize)
META-213 ────┘
```

---

## Ready to Start (No Blockers)

The following 4 tickets are ready to start immediately:

1. **META-201**: Create ModeStrategy interface
2. **META-202**: Update mode registry
3. **META-203**: Add mode-agnostic events
4. **META-204**: Extend GameStateWithDisplay

**All Phase 1 tickets can be worked on in parallel!**

---

## Critical Path to Unblock META-82

```
Phase 1 (any order, 2.5 days total)
  ↓
META-209 (ChordTrainingStrategy - 2 days)
  ↓
META-210 (Chord callbacks - 1 day)
  ↓
META-206 (Orchestrator integration - 1.5 days) [from Phase 2]
  +
META-207 (Ear training callbacks - 1 day) [from Phase 2]
  ↓
META-211 (Update component - 1 day)
  ↓
META-212 (Update displays - 0.5 days)
  ↓
META-213 (End-to-end validation - 1 day)
  ↓
META-82 QA UNBLOCKED! ✅
```

**Estimated time to unblock META-82**: 10.5 days

**Recommended**: Complete full Phase 2 as well for comprehensive testing (~16 days total)

---

## Next Steps

1. **Start Phase 1**: Begin work on META-201, 202, 203, 204 (all can be done in parallel)
2. **Once Phase 1 complete**: Start Phase 2 (ear training) AND Phase 3 (chord training) in parallel if you have team capacity
3. **Phase 2 completion**: Validates no regressions in existing functionality
4. **Phase 3 completion**: Unblocks META-82 and enables chord training modes
5. **Phase 4**: Cleanup and optimization

**Total epic estimate**: 16 days (~3.2 weeks) for complete implementation
