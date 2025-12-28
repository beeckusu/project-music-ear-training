# Strategy Pattern - Design Considerations

## 1. Event System Design

### Current Events (Ear Training)
```typescript
interface OrchestratorEvents {
  roundStart: { note: NoteWithOctave; feedback: string };
  guessAttempt: GuessAttempt;
  guessResult: { isCorrect: boolean; feedback: string; shouldAdvance: boolean };
  sessionComplete: { stats: GameStats; session: GameSession };
  feedbackUpdate: { feedback: string };
  stateChange: { state: string };
}
```

### New Events Needed for Chord Modes?

**Option A: Reuse Existing Events**
```typescript
// roundStart still works - just ignore the note field
orchestrator.emit('roundStart', {
  note: chord.notes[0], // First note for compatibility
  feedback: 'Select all notes in this chord'
});
```
- ✅ No breaking changes
- ✅ Backwards compatible
- ❌ Semantically misleading (it's a chord, not a note)

**Option B: Add Chord-Specific Events**
```typescript
interface OrchestratorEvents {
  // Existing
  roundStart: { note: NoteWithOctave; feedback: string };

  // New
  chordRoundStart: { chord: Chord; feedback: string };
  noteSelectionChanged: { selectedNotes: Set<NoteWithOctave> };
  chordGuessAttempt: { guess: string | NoteWithOctave[] };
}
```
- ✅ Semantically clear
- ✅ Type-safe
- ❌ Components need to listen to multiple events
- ❌ More event types to manage

**Option C: Generic Action Events**
```typescript
interface OrchestratorEvents {
  roundStart: {
    type: 'note' | 'chord';
    data: NoteWithOctave | Chord;
    feedback: string;
  };
  userAction: {
    type: 'guess' | 'selectNote' | 'submitAnswer' | 'submitGuess';
    data: any;
  };
}
```
- ✅ Flexible
- ✅ Easy to extend
- ❌ Loses type safety
- ❌ Components need to check type

**RECOMMENDATION:** Option B - Add chord-specific events
- Components already handle different modes differently
- Type safety is valuable
- Clear semantics make code readable

---

## 2. State Machine Compatibility

### Current State Machine States
```typescript
SessionState: IDLE | PLAYING | PAUSED | COMPLETED
RoundState: WAITING_INPUT | INTERMISSION | PLAYING_AUDIO
```

### Questions:

**Q1: Do chord modes use the same states?**
- IDLE → Yes (before game starts)
- PLAYING → Yes (during game)
- PAUSED → Yes (can pause)
- COMPLETED → Yes (game ends)
- WAITING_INPUT → Yes (waiting for user to select notes/type)
- INTERMISSION → Maybe? (between rounds, but no auto-advance)
- PLAYING_AUDIO → No (chord modes are visual only)

**Q2: Do we need new states?**
```typescript
RoundState:
  | WAITING_INPUT      // User selecting notes or typing
  | VALIDATING         // Checking answer (brief)
  | INTERMISSION       // Between rounds (but no auto-advance for chord)
  | PLAYING_AUDIO      // Ear training only
```

**Option A: Keep Same States**
- Strategies handle state transitions differently
- INTERMISSION means "round ended" (not "auto-advancing")
- ✅ No state machine changes needed
- ✅ Backwards compatible
- ❌ INTERMISSION semantically wrong for chord modes

**Option B: Add Chord-Specific States**
```typescript
RoundState:
  | WAITING_INPUT
  | WAITING_SUBMISSION  // Chord: user building answer
  | VALIDATING          // Chord: checking answer
  | INTERMISSION        // Ear: auto-advance delay
  | PLAYING_AUDIO       // Ear: audio playback
```
- ✅ Clear semantics
- ❌ State machine changes
- ❌ More complexity

**RECOMMENDATION:** Option A - Keep same states
- WAITING_INPUT works for both (waiting for guess OR submission)
- INTERMISSION can mean "round complete, ready for next"
- Strategy controls whether auto-advance happens
- Simpler implementation

---

## 3. User Action Type System

### Define All Possible Actions
```typescript
// src/types/orchestrator.ts
type UserAction =
  // Ear Training Actions
  | { type: 'guess'; note: NoteWithOctave }
  | { type: 'replayNote' }

  // Chord Training: Show Chord, Guess Notes
  | { type: 'selectNote'; note: NoteWithOctave }
  | { type: 'clearSelection' }
  | { type: 'submitAnswer' }

  // Chord Training: Show Notes, Guess Chord
  | { type: 'submitGuess'; chordName: string }

  // Common
  | { type: 'nextRound' }
  | { type: 'skipRound' };

interface ModeStrategy {
  handleUserAction(action: UserAction): GameActionResult | null;
  // null = action doesn't advance round (e.g., selectNote)
  // GameActionResult = action completed round (e.g., submitAnswer)
}
```

**Design Decision: When to emit events?**

**Option A: Strategy emits events**
```typescript
class ChordTrainingStrategy {
  handleUserAction(action: UserAction) {
    if (action.type === 'selectNote') {
      this.gameMode.handleNoteSelection(action.note);
      this.emit('noteSelectionChanged', { ... }); // Strategy emits
      return null;
    }
  }
}
```
- ❌ Strategy needs access to emit()
- ❌ Tight coupling

**Option B: Orchestrator emits based on strategy result**
```typescript
class ChordTrainingStrategy {
  handleUserAction(action: UserAction) {
    if (action.type === 'selectNote') {
      this.gameMode.handleNoteSelection(action.note);
      return {
        type: 'noteSelectionChanged',
        data: { selectedNotes: this.gameMode.selectedNotes }
      };
    }
  }
}

// Orchestrator
handleUserAction(action) {
  const result = this.strategy.handleUserAction(action);
  if (result?.type === 'noteSelectionChanged') {
    this.emit('noteSelectionChanged', result.data);
  }
}
```
- ✅ Strategy returns data, orchestrator emits
- ✅ Strategy stays decoupled
- ✅ Orchestrator controls event flow

**RECOMMENDATION:** Option B - Strategy returns result, orchestrator emits

---

## 4. Component Integration

### Current Pattern (NoteIdentification)
```typescript
// User clicks piano key
const handleNoteClick = (note: NoteWithOctave) => {
  orchestrator.submitGuess(note);
};

// Orchestrator events
orchestrator.on('roundStart', ({ note, feedback }) => {
  setCurrentNote(note);
  setFeedback(feedback);
});
```

### New Pattern with Strategies
```typescript
// User clicks piano key
const handleNoteClick = (note: NoteWithOctave) => {
  if (isChordMode) {
    orchestrator.handleUserAction({ type: 'selectNote', note });
  } else {
    orchestrator.handleUserAction({ type: 'guess', note });
  }
};

// Or use mode display to determine action
const handleNoteClick = (note: NoteWithOctave) => {
  // Mode display knows which action to send
  gameState.onPianoClick?.(note, orchestrator);
};

// Orchestrator events
orchestrator.on('roundStart', ({ note, feedback }) => { ... });
orchestrator.on('chordRoundStart', ({ chord, feedback }) => { ... });
```

**Question: Should NoteIdentification know about modes?**

**Option A: Component mode-aware**
```typescript
const handlePianoClick = (note) => {
  const action = isEarTraining
    ? { type: 'guess', note }
    : { type: 'selectNote', note };
  orchestrator.handleUserAction(action);
};
```
- ❌ Component has mode logic
- ❌ Tight coupling

**Option B: GameState provides callbacks**
```typescript
// GameState interface
interface GameStateWithDisplay {
  onPianoClick?(note: NoteWithOctave, orchestrator: GameOrchestrator): void;
}

// SingleChordGameState
onPianoClick(note, orchestrator) {
  orchestrator.handleUserAction({ type: 'selectNote', note });
}

// RushGameState
onPianoClick(note, orchestrator) {
  orchestrator.handleUserAction({ type: 'guess', note });
}

// Component
const handlePianoClick = (note) => {
  gameState.onPianoClick?.(note, orchestrator);
};
```
- ✅ Component doesn't know about modes
- ✅ GameState encapsulates behavior
- ❌ Coupling to orchestrator

**Option C: Mode Display handles it**
```typescript
// Mode display already knows the mode
const SingleChordModeDisplay = ({ gameState, orchestrator }) => {
  const handleNoteClick = (note) => {
    orchestrator.handleUserAction({ type: 'selectNote', note });
  };

  return <PianoKeyboard onNoteClick={handleNoteClick} />;
};
```
- ✅ Mode display encapsulates interaction
- ✅ Component stays generic
- ✅ Already have mode-specific displays
- ⚠️ Requires passing orchestrator to mode displays

**RECOMMENDATION:** Option C - Mode Display handles actions
- Mode displays already exist and are mode-specific
- Natural place for mode-specific interaction logic
- Keep NoteIdentification generic

---

## 5. Strategy Selection Logic

### How do we know which strategy to use?

**Option A: Based on mode string**
```typescript
private createStrategy(mode: string): ModeStrategy {
  if (mode.includes('chord') ||
      mode === NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES ||
      mode === NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD) {
    return new ChordTrainingStrategy();
  }
  return new EarTrainingStrategy();
}
```
- ✅ Simple
- ❌ String matching fragile
- ❌ Need to update for each new mode

**Option B: Mode metadata property**
```typescript
// In modeRegistry
modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
  strategyType: 'chord-training', // NEW FIELD
  // ...
});

private createStrategy(mode: string): ModeStrategy {
  const metadata = modeRegistry.get(mode);
  switch (metadata.strategyType) {
    case 'chord-training': return new ChordTrainingStrategy();
    case 'ear-training': return new EarTrainingStrategy();
    default: return new EarTrainingStrategy();
  }
}
```
- ✅ Explicit and clear
- ✅ Easy to add new strategies
- ✅ Metadata drives behavior
- ❌ Need to update all mode registrations

**Option C: Strategy factory in metadata**
```typescript
// In modeRegistry
modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
  createStrategy: () => new ChordTrainingStrategy(), // Factory
  // ...
});

private createStrategy(mode: string): ModeStrategy {
  const metadata = modeRegistry.get(mode);
  return metadata.createStrategy?.() ?? new EarTrainingStrategy();
}
```
- ✅ Most flexible
- ✅ Mode controls its own strategy
- ✅ No central switch statement
- ❌ More indirection

**RECOMMENDATION:** Option B - Metadata property
- Clear and explicit
- Easy to understand which modes use which strategy
- Simple to implement
- Centralized strategy creation logic

---

## 6. Timer Management

### Chord Modes and Timers

**Question: Do chord modes need timers?**

Current ear training:
- Response time limit (3s to answer)
- Auto-advance delay (2s after correct)
- Session duration (Sandbox: 5 min)

Chord modes:
- ❌ No auto-advance (user clicks Submit)
- ❓ Optional response time limit?
- ✅ Session duration (same as Sandbox)

**Design Decision:**

**Option A: No timers for chord modes**
```typescript
class ChordTrainingStrategy {
  shouldAutoAdvance() { return false; }
  getAutoAdvanceDelay() { return 0; }
  shouldEnforceTimeLimit() { return false; }
}
```
- ✅ Simplest
- ❌ Can't add timed challenges later

**Option B: Optional timers**
```typescript
class ChordTrainingStrategy {
  constructor(private settings: NoteTrainingModeSettings) {}

  shouldEnforceTimeLimit() {
    return this.settings.responseTimeLimit !== null;
  }

  getTimeLimit() {
    return this.settings.responseTimeLimit ?? 0;
  }
}
```
- ✅ Flexible
- ✅ Can add timed mode later
- ✅ Settings-driven

**RECOMMENDATION:** Option B - Optional timers
- Settings can disable by setting responseTimeLimit to null
- Future-proof for timed chord challenges
- Consistent with ear training

---

## 7. Testing Strategy

### How do we test without breaking existing tests?

**Approach:**
1. **Keep existing GameOrchestrator tests** - Should still pass
2. **Add strategy unit tests** - Test each strategy independently
3. **Add integration tests** - Test orchestrator with each strategy
4. **Update component tests** - Mock handleUserAction

**Test Structure:**
```
src/game/strategies/__tests__/
  ├── EarTrainingStrategy.test.ts
  ├── ChordTrainingStrategy.test.ts
  └── strategyIntegration.test.ts

src/game/__tests__/
  ├── GameOrchestrator.test.ts (update, should still pass)
  └── GameOrchestrator.strategies.test.ts (new integration tests)
```

**Key Test Cases:**

**EarTrainingStrategy:**
- ✅ Plays audio on round start
- ✅ Validates single note guess
- ✅ Auto-advances after correct
- ✅ Handles timeout

**ChordTrainingStrategy:**
- ✅ No audio on round start
- ✅ Handles note selection
- ✅ Validates multi-note answer
- ✅ Validates chord name guess
- ✅ No auto-advance

**Integration:**
- ✅ Orchestrator selects correct strategy
- ✅ Events emitted correctly for each strategy
- ✅ State transitions work for both
- ✅ Can switch strategies mid-session (reset)

---

## 8. Migration Path

### Can we do this incrementally?

**Phase 1: Foundation (Non-breaking)**
1. Create ModeStrategy interface
2. Create EarTrainingStrategy (extract current logic)
3. Add strategy selection to GameOrchestrator
4. Keep fallback to old code path

```typescript
class GameOrchestrator {
  async startNewRound() {
    if (this.strategy) {
      await this.strategy.startRound(ctx);
    } else {
      // OLD CODE PATH (fallback)
      const note = this.generateNote();
      await this.playCurrentNote(note);
    }
  }
}
```

**Phase 2: Ear Training Migration**
1. Update all ear training modes to use EarTrainingStrategy
2. Test thoroughly
3. Remove old code path once confirmed working

**Phase 3: Chord Training**
1. Create ChordTrainingStrategy
2. Update chord modes to use it
3. Test META-82 and other chord features

**Phase 4: Cleanup**
1. Remove fallback code
2. Refactor common logic
3. Optimize

**RECOMMENDATION:** Incremental migration
- ✅ Lower risk
- ✅ Can test each phase
- ✅ Easy to rollback if issues
- ✅ Doesn't block other work

---

## 9. Error Handling

### Strategy Error Boundaries

**Question: What happens if strategy throws error?**

```typescript
class GameOrchestrator {
  async startNewRound() {
    try {
      await this.strategy.startRound(ctx);
    } catch (error) {
      console.error('Strategy error:', error);
      this.emit('error', {
        type: 'strategy-error',
        message: error.message,
        recovery: 'reset'
      });
      this.reset(); // Safe fallback
    }
  }
}
```

**Strategy Contract:**
- Strategies should handle their own errors when possible
- Throw only for unrecoverable errors
- Orchestrator catches and emits error events
- Component can show error UI and offer reset

---

## 10. Backwards Compatibility

### Ensuring Ear Training Still Works

**Requirements:**
1. ✅ All existing ear training tests pass
2. ✅ No breaking changes to public API
3. ✅ Component integration unchanged (initially)
4. ✅ Events remain the same (add new, don't change old)

**Strategy:**
1. EarTrainingStrategy should replicate current behavior exactly
2. Add new chord events without removing ear training events
3. Keep existing methods as wrappers initially
4. Deprecate old methods after migration complete

```typescript
class GameOrchestrator {
  // OLD (deprecated but still works)
  submitGuess(note: NoteWithOctave) {
    this.handleUserAction({ type: 'guess', note });
  }

  // NEW (recommended)
  handleUserAction(action: UserAction) {
    const result = this.strategy.handleUserAction(action);
    // ...
  }
}
```

---

## Summary of Design Decisions

| Consideration | Decision | Rationale |
|--------------|----------|-----------|
| **Events** | Add chord-specific events | Type safety, clear semantics |
| **State Machine** | Keep same states | Simpler, strategies handle differences |
| **User Actions** | Typed action union | Type-safe, explicit |
| **Action Handling** | Mode Display sends actions | Natural encapsulation |
| **Strategy Selection** | Metadata property | Explicit, maintainable |
| **Timers** | Optional via settings | Flexible, future-proof |
| **Testing** | Unit + Integration | Thorough coverage |
| **Migration** | Incremental phases | Lower risk |
| **Error Handling** | Orchestrator catches | Safe recovery |
| **Compatibility** | Keep old API initially | No breaking changes |

## Questions for Discussion

1. **Events:** Agree with adding chord-specific events?
2. **Component Integration:** Pass orchestrator to mode displays?
3. **Strategy Selection:** Add strategyType to mode metadata?
4. **Migration:** Start with EarTrainingStrategy first or both at once?
5. **Timers:** Support optional response time limits for chord modes?
6. **Testing:** Any specific edge cases you want covered?
7. **API Changes:** Deprecate old methods or keep forever?

