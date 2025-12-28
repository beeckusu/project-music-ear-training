# Refined Strategy Design (Based on Feedback)

## Design Decisions (Finalized)

✅ **Event System:** Mode-agnostic events with dynamic subscription
✅ **Component Integration:** Callback pattern (GameState provides callbacks)
✅ **Strategy Selection:** Add `strategyType` to mode metadata
✅ **State Machine:** Reuse existing states
✅ **Timer Support:** Optional timers (settings-driven)
✅ **Migration Path:** Incremental (4 phases)
✅ **Testing:** Ensure no regressions in existing functionality

---

## 1. Mode-Agnostic Event System

### Generic Events (Work for All Modes)

```typescript
interface OrchestratorEvents {
  // Round lifecycle
  roundStart: {
    context: {
      note?: NoteWithOctave;      // Ear training: single note
      chord?: Chord;               // Chord training: chord object
      displayNotes?: NoteWithOctave[];  // Visual display
    };
    feedback: string;
  };

  // User interaction
  userAction: {
    action: UserAction;
    result?: 'pending' | 'processing' | 'complete';
  };

  // Round completion
  roundComplete: {
    isCorrect: boolean;
    feedback: string;
    shouldAdvance: boolean;
    stats?: Partial<GameStats>;
  };

  // Session lifecycle
  sessionComplete: {
    stats: GameStats;
    session: GameSession;
  };

  // State changes
  stateChange: {
    sessionState: SessionState;
    roundState: RoundState;
  };

  // Feedback
  feedbackUpdate: {
    feedback: string;
  };
}
```

### Component Usage (Dynamic Subscription)

```typescript
// Component selects which events to listen to based on mode
useEffect(() => {
  const handleRoundStart = ({ context, feedback }) => {
    if (context.note) {
      // Ear training mode
      setCurrentNote(context.note);
    } else if (context.chord) {
      // Chord training mode
      setCurrentChord(context.chord);
      setDisplayedNotes(context.displayNotes);
    }
    setFeedback(feedback);
  };

  orchestrator.on('roundStart', handleRoundStart);
  return () => orchestrator.off('roundStart', handleRoundStart);
}, [selectedMode]); // Re-subscribe when mode changes
```

### Strategy Emits Generic Events

```typescript
// EarTrainingStrategy
async startRound(ctx: StrategyContext) {
  const note = ctx.gameMode.generateNote(ctx.noteFilter);
  await ctx.audioEngine.playNote(note);

  ctx.emit('roundStart', {
    context: { note },  // Only note populated
    feedback: ctx.gameMode.getFeedbackMessage(true)
  });
}

// ChordTrainingStrategy
async startRound(ctx: StrategyContext) {
  ctx.gameMode.generateNote(null);
  const chord = (ctx.gameMode as any).currentChord;

  ctx.emit('roundStart', {
    context: {
      chord,                    // Chord populated
      displayNotes: chord.notes // Visual display
    },
    feedback: ctx.gameMode.getFeedbackMessage(true)
  });
}
```

**Benefits:**
- ✅ Component doesn't need mode-specific event handlers
- ✅ Same event works for all modes
- ✅ Easy to add new modes (just populate relevant context fields)
- ✅ No event proliferation

---

## 2. Callback Pattern for Component Integration

### GameState Interface Extension

```typescript
interface GameStateWithDisplay extends BaseGameState {
  // Existing methods...
  modeDisplay: (props: CommonDisplayProps) => React.ReactElement;
  handleCorrectGuess: () => GameActionResult;
  // ...

  // NEW: Callback for piano keyboard interaction
  onPianoKeyClick?(
    note: NoteWithOctave,
    context: {
      orchestrator: GameOrchestrator;
      currentState: 'playing' | 'paused' | 'completed';
    }
  ): void;

  // NEW: Callback for submit button
  onSubmitClick?(
    context: {
      orchestrator: GameOrchestrator;
      currentState: 'playing' | 'paused' | 'completed';
    }
  ): void;
}
```

### GameState Implementation

```typescript
// EarTrainingGameState (Rush, Survival, Sandbox)
class RushGameState implements GameStateWithDisplay {
  onPianoKeyClick(note, { orchestrator }) {
    // Ear training: immediately submit guess
    orchestrator.handleUserAction({ type: 'guess', note });
  }

  // No onSubmitClick - ear training doesn't have submit button
}

// ChordTrainingGameState
class SingleChordGameState implements GameStateWithDisplay {
  onPianoKeyClick(note, { orchestrator, currentState }) {
    if (currentState === 'playing') {
      // Chord training: just select/deselect note
      this.handleNoteSelection(note);
      orchestrator.handleUserAction({ type: 'selectNote', note });
    }
  }

  onSubmitClick({ orchestrator }) {
    // User clicked Submit Answer button
    orchestrator.handleUserAction({ type: 'submitAnswer' });
  }
}

// ChordIdentificationGameState
class ChordIdentificationGameState implements GameStateWithDisplay {
  onPianoKeyClick(note, { orchestrator }) {
    // Piano is read-only in this mode, do nothing
    // (or could highlight notes on hover)
  }

  onSubmitClick({ orchestrator }) {
    // User clicked Submit Guess button (with typed chord name)
    orchestrator.handleUserAction({ type: 'submitGuess', chordName: this.userGuess });
  }
}
```

### Component Usage (NoteIdentification)

```typescript
const NoteIdentification = () => {
  const { settings } = useSettings();
  const [gameState, setGameState] = useState<GameStateWithDisplay | null>(null);

  const handlePianoKeyClick = (note: NoteWithOctave) => {
    if (!gameState || !orchestratorRef.current) return;

    // Call gameState's callback (if it has one)
    gameState.onPianoKeyClick?.(note, {
      orchestrator: orchestratorRef.current,
      currentState: isPlaying() ? 'playing' : 'paused'
    });
  };

  const handleSubmitClick = () => {
    if (!gameState || !orchestratorRef.current) return;

    // Call gameState's callback (if it has one)
    gameState.onSubmitClick?.({
      orchestrator: orchestratorRef.current,
      currentState: 'playing'
    });
  };

  return (
    <>
      {/* Render mode display */}
      {gameState?.modeDisplay({
        responseTimeLimit,
        currentNote: !!currentNote,
        isPaused,
        onPianoKeyClick: handlePianoKeyClick,
        onSubmitClick: handleSubmitClick
      })}
    </>
  );
};
```

### Mode Display Usage

```typescript
// SingleChordModeDisplay
const SingleChordModeDisplay: React.FC<{
  gameState: SingleChordGameState;
  onPianoKeyClick: (note: NoteWithOctave) => void;
  onSubmitClick: () => void;
}> = ({ gameState, onPianoKeyClick, onSubmitClick }) => {
  return (
    <>
      <ChordDisplay chord={gameState.currentChord} showChordName={true} />

      <PianoKeyboard
        onNoteClick={onPianoKeyClick}  // Callback from component
        highlights={gameState.getNoteHighlights()}
      />

      <button onClick={onSubmitClick}>Submit Answer</button>
    </>
  );
};
```

**Benefits:**
- ✅ Component doesn't know about orchestrator
- ✅ GameState encapsulates behavior
- ✅ Mode displays receive callbacks as props
- ✅ Clear separation of concerns

---

## 3. Strategy Selection (Metadata)

### Mode Registry Extension

```typescript
// src/types/modeRegistry.ts
interface ModeMetadata {
  id: ModeType;
  type: TrainingType;
  icon: string;
  title: string;
  description: string;
  settingsComponent: React.ComponentType;
  settingsKey: string;
  gameStateFactory: (settings: any) => GameStateWithDisplay;
  defaultSettings: any;
  strategyType: 'ear-training' | 'chord-training';  // NEW
}
```

### Updated Mode Registrations

```typescript
// Ear training modes
modeRegistry.register({
  id: EAR_TRAINING_SUB_MODES.RUSH,
  strategyType: 'ear-training',  // NEW
  // ... rest
});

modeRegistry.register({
  id: EAR_TRAINING_SUB_MODES.SANDBOX,
  strategyType: 'ear-training',  // NEW
  // ... rest
});

// Chord training modes
modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
  strategyType: 'chord-training',  // NEW
  // ... rest
});

modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD,
  strategyType: 'chord-training',  // NEW
  // ... rest
});
```

### Orchestrator Strategy Selection

```typescript
class GameOrchestrator {
  private createStrategy(mode: string): ModeStrategy {
    const metadata = modeRegistry.get(mode);

    if (!metadata) {
      console.warn(`Mode ${mode} not found, defaulting to ear training`);
      return new EarTrainingStrategy();
    }

    switch (metadata.strategyType) {
      case 'chord-training':
        return new ChordTrainingStrategy();
      case 'ear-training':
        return new EarTrainingStrategy();
      default:
        console.warn(`Unknown strategy type ${metadata.strategyType}`);
        return new EarTrainingStrategy();
    }
  }
}
```

---

## 4. User Action Types

### Typed Action Union

```typescript
// src/types/orchestrator.ts
export type UserAction =
  // Ear Training
  | { type: 'guess'; note: NoteWithOctave }
  | { type: 'replayNote' }

  // Chord Training: Show Chord, Guess Notes
  | { type: 'selectNote'; note: NoteWithOctave }
  | { type: 'deselectNote'; note: NoteWithOctave }
  | { type: 'clearSelection' }
  | { type: 'submitAnswer' }

  // Chord Training: Show Notes, Guess Chord
  | { type: 'submitGuess'; chordName: string }

  // Common
  | { type: 'skipRound' };
```

### Strategy Result Type

```typescript
export type StrategyActionResult = {
  // Round completion (null = action didn't complete round)
  roundResult: GameActionResult | null;

  // Optional: emit specific events
  events?: Array<{
    type: keyof OrchestratorEvents;
    data: any;
  }>;

  // Optional: state to update
  stateUpdates?: {
    feedback?: string;
    // ... other updates
  };
};
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Create strategy infrastructure without breaking existing functionality

**Tasks:**
1. Create `src/game/strategies/ModeStrategy.ts` interface
2. Create `src/types/orchestrator.ts` (UserAction types)
3. Update `src/types/modeRegistry.ts` (add strategyType)
4. Update OrchestratorEvents to be mode-agnostic
5. Add `onPianoKeyClick`, `onSubmitClick` to GameStateWithDisplay interface

**Deliverable:** Infrastructure in place, no breaking changes

---

### Phase 2: Extract Ear Training Strategy (Week 1-2)
**Goal:** Move existing ear training logic into EarTrainingStrategy

**Tasks:**
1. Create `src/game/strategies/EarTrainingStrategy.ts`
2. Extract current `startNewRound()` logic into strategy
3. Extract current `submitGuess()` logic into strategy
4. Add strategy selection to GameOrchestrator
5. Update all ear training game states with callbacks
6. **Test:** All existing ear training tests pass

**Deliverable:** Ear training uses strategy pattern, all tests green

---

### Phase 3: Add Chord Training Strategy (Week 2)
**Goal:** Implement ChordTrainingStrategy for chord modes

**Tasks:**
1. Create `src/game/strategies/ChordTrainingStrategy.ts`
2. Implement `startRound()` (no audio, emit chord context)
3. Implement `handleUserAction()` for chord actions
4. Update chord game states with callbacks
5. Add `handleUserAction()` support in GameOrchestrator
6. **Test:** Chord modes work, can QA META-82

**Deliverable:** Chord modes fully functional, META-82 unblocked

---

### Phase 4: Cleanup & Optimization (Week 3)
**Goal:** Remove fallbacks, optimize, document

**Tasks:**
1. Remove old code paths and fallbacks
2. Refactor common strategy logic into base class (if needed)
3. Optimize event emissions
4. Add comprehensive documentation
5. Performance testing
6. Update all related docs

**Deliverable:** Production-ready, optimized, documented

---

## 6. Testing Strategy

### Unit Tests

**EarTrainingStrategy.test.ts**
```typescript
describe('EarTrainingStrategy', () => {
  it('plays audio on round start', async () => { ... });
  it('validates single note guess', () => { ... });
  it('auto-advances after correct guess', () => { ... });
  it('handles timeout as incorrect', () => { ... });
  it('emits roundStart with note context', () => { ... });
});
```

**ChordTrainingStrategy.test.ts**
```typescript
describe('ChordTrainingStrategy', () => {
  it('does not play audio on round start', async () => { ... });
  it('handles note selection', () => { ... });
  it('validates multi-note answer', () => { ... });
  it('validates chord name guess', () => { ... });
  it('does not auto-advance', () => { ... });
  it('emits roundStart with chord context', () => { ... });
});
```

### Integration Tests

**GameOrchestrator.strategies.test.ts**
```typescript
describe('GameOrchestrator with Strategies', () => {
  it('selects EarTrainingStrategy for rush mode', () => { ... });
  it('selects ChordTrainingStrategy for chord mode', () => { ... });
  it('emits correct events for each strategy', () => { ... });
  it('handles mode switching mid-session', () => { ... });
});
```

### Regression Tests

**Ensure existing tests still pass:**
- ✅ All GameOrchestrator tests
- ✅ All ear training mode tests (Rush, Survival, Sandbox)
- ✅ All component integration tests
- ✅ State machine tests

---

## Summary

### Key Interfaces

**ModeStrategy**
```typescript
interface ModeStrategy {
  startRound(context: StrategyContext): Promise<void>;
  handleUserAction(action: UserAction): StrategyActionResult;
  shouldAutoAdvance(): boolean;
  getAutoAdvanceDelay(): number;
}
```

**StrategyContext**
```typescript
interface StrategyContext {
  gameMode: IGameMode;
  noteFilter: NoteFilter | null;
  audioEngine: typeof audioEngine;
  noteDuration: NoteDuration;
  emit: <K extends keyof OrchestratorEvents>(
    event: K,
    data: OrchestratorEvents[K]
  ) => void;
}
```

**GameStateWithDisplay (Extended)**
```typescript
interface GameStateWithDisplay {
  // ... existing methods ...

  // NEW: Interaction callbacks
  onPianoKeyClick?(note: NoteWithOctave, context: CallbackContext): void;
  onSubmitClick?(context: CallbackContext): void;
}
```

### Updated Architecture

```
Component (NoteIdentification)
    ↓ (callbacks via gameState)
GameState (mode-specific)
    ↓ (calls orchestrator.handleUserAction)
GameOrchestrator
    ↓ (delegates to strategy)
ModeStrategy (EarTraining | ChordTraining)
    ↓ (uses gameMode methods)
GameMode (Rush | SingleChord | ChordIdentification)
    ↓ (plays audio if ear training)
AudioEngine
```

### Event Flow

```
Strategy.startRound()
    → emit('roundStart', { context: {...}, feedback })
    → Component updates UI based on context

User interacts
    → gameState.onPianoKeyClick(note, { orchestrator })
    → orchestrator.handleUserAction({ type: 'selectNote', note })
    → strategy.handleUserAction(action)
    → returns StrategyActionResult
    → orchestrator.emit('roundComplete', { ... })
    → Component updates UI
```

---

## Ready for Tickets?

All design decisions finalized:
- ✅ Mode-agnostic events
- ✅ Callback pattern for component integration
- ✅ Metadata-driven strategy selection
- ✅ State machine reuse
- ✅ Optional timer support
- ✅ Incremental migration
- ✅ Focus on regression prevention

Should I create the implementation tickets now?
