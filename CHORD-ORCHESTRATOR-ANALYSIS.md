# Chord Mode Integration - Architecture Analysis & Options

## Current Architecture

### GameOrchestrator (Ear Training)
```
Component → GameOrchestrator → State Machine
                 ↓
            IGameMode (interface)
                 ↓
      Rush/Survival/Sandbox GameState
                 ↓
            Audio Engine
```

**Key Flow:**
1. `startNewRound()` - Generate note, play audio
2. User hears note → clicks piano key
3. `submitGuess(note)` - Validate single note
4. Auto-advance after delay
5. Repeat until complete

## What's Different for Chord Modes?

### Ear Training (Current)
| Aspect | Behavior |
|--------|----------|
| **Input** | Audio playback |
| **Display** | Single note (hidden) |
| **User Action** | Click one piano key |
| **Validation** | `validateGuess(note, note)` |
| **Advance** | Auto (2s delay) |
| **Timer** | 3s response limit |

### Chord Training (Needed)
| Aspect | Show Chord, Guess Notes | Show Notes, Guess Chord |
|--------|------------------------|------------------------|
| **Input** | Visual only (no audio) | Visual only (no audio) |
| **Display** | Chord name + piano notes | Piano notes (no chord name) |
| **User Action** | Select multiple keys | Type chord name |
| **Validation** | `handleSubmitAnswer()` | `handleSubmitGuess(string)` |
| **Advance** | Manual (click Submit) | Manual (click Submit) |
| **Timer** | None (or optional) | None (or optional) |

## Key Differences

### 1. Audio vs Visual
- **Ear Training:** `playCurrentNote(note)` - Audio playback required
- **Chord Training:** No audio - purely visual display

### 2. Single Note vs Chord
- **Ear Training:** `currentNote: NoteWithOctave`
- **Chord Training:** `currentChord: Chord` (array of notes)

### 3. Validation Methods
- **Ear Training:** `validateGuess(guessNote, actualNote)` → boolean
- **Chord Training:**
  - Show Chord: `handleSubmitAnswer()` → GameActionResult
  - Guess Chord: `handleSubmitGuess(chordName)` → GameActionResult

### 4. Auto-Advance vs Manual
- **Ear Training:** Auto-advance after 2s delay
- **Chord Training:** User clicks "Submit" button to advance

### 5. State Machine States
- **Ear Training:** Uses WAITING_INPUT → INTERMISSION → WAITING_INPUT
- **Chord Training:** Might need different states or different state handling

## Interface Compatibility

### IGameMode Interface
```typescript
interface IGameMode {
  generateNote(filter: NoteFilter): NoteWithOctave;
  validateGuess(guess: NoteWithOctave, actual: NoteWithOctave): boolean;
  isGameComplete(): boolean;
  getMode(): string;
}
```

### Chord Game States (Current)
```typescript
class SingleChordGameState implements IGameMode {
  // IGameMode methods (compatibility layer)
  generateNote(filter: NoteFilter): NoteWithOctave {
    // Returns first note of chord (for compatibility)
  }
  validateGuess(): boolean {
    return false; // Not used
  }

  // Actual chord methods
  handleSubmitAnswer(): GameActionResult;
  handleNoteSelection(note: NoteWithOctave): boolean;
  clearSelection(): void;
  getNoteHighlights(): NoteHighlight[];
}

class ChordIdentificationGameState implements IGameMode {
  // IGameMode methods (compatibility layer)
  generateNote(filter: NoteFilter): NoteWithOctave {
    // Returns first note of chord (for compatibility)
  }
  validateGuess(): boolean {
    return false; // Not used
  }

  // Actual chord methods
  handleSubmitGuess(guess: string): GameActionResult;
}
```

**Problem:** Chord states implement IGameMode but don't actually use those methods. They have their own methods that the orchestrator doesn't know about.

## Implementation Options

### Option 1: Unified Orchestrator with Mode Detection

**Approach:** Extend GameOrchestrator to detect and handle chord modes differently.

**Pros:**
- ✅ Single orchestrator class
- ✅ Shared state machine and timer logic
- ✅ Reuse existing infrastructure
- ✅ Minimal code duplication

**Cons:**
- ❌ Orchestrator becomes more complex
- ❌ More conditional logic (if ear training vs if chord)
- ❌ Harder to maintain as modes diverge

**Implementation:**
```typescript
class GameOrchestrator {
  private isChordMode(): boolean {
    return this.gameMode?.getMode().includes('chord');
  }

  async startNewRound(): Promise<void> {
    const newNote = this.generateNote();
    this.gameMode.onStartNewRound();

    if (this.isChordMode()) {
      // Chord flow: Don't play audio, different events
      this.emit('chordRoundStart', { chord: this.gameMode.currentChord });
    } else {
      // Ear training flow: Play audio
      await this.playCurrentNote(newNote);
      this.emit('roundStart', { note: newNote });
    }
  }

  submitGuess(guessedNote: NoteWithOctave): void {
    // Ear training flow
  }

  submitChordAnswer(): void {
    // Chord training flow
    const result = this.gameMode.handleSubmitAnswer();
    // Handle result...
  }

  submitChordGuess(chordName: string): void {
    // Chord identification flow
    const result = this.gameMode.handleSubmitGuess(chordName);
    // Handle result...
  }
}
```

**Estimated Work:** ~3-5 days
- Add mode detection
- Add chord-specific methods
- Update startNewRound logic
- Add new event types
- Update state machine handling
- Testing

---

### Option 2: Separate ChordOrchestrator

**Approach:** Create a dedicated ChordOrchestrator for chord modes, extract shared logic to base class.

**Pros:**
- ✅ Clean separation of concerns
- ✅ Each orchestrator is simpler
- ✅ Easier to maintain and test
- ✅ Can evolve independently
- ✅ Clear which orchestrator to use

**Cons:**
- ❌ More code (two orchestrator classes)
- ❌ Need to extract shared logic to base class
- ❌ Component needs to choose correct orchestrator

**Implementation:**
```typescript
// Base class with shared logic
abstract class BaseOrchestrator extends EventEmitter {
  protected actor: Actor<typeof gameStateMachine>;
  protected gameMode: IGameMode | null = null;
  protected activeTimers: Map<string, ReturnType<typeof setTimeout>>;

  // Shared methods
  start(): void { }
  stop(): void { }
  pause(): void { }
  resume(): void { }
  reset(): void { }
  applySettings(): void { }

  // Abstract methods (must implement)
  abstract startNewRound(): Promise<void>;
  abstract handleUserAction(action: any): void;
}

// Ear training orchestrator
class EarTrainingOrchestrator extends BaseOrchestrator {
  async startNewRound(): Promise<void> {
    const note = this.generateNote();
    await this.playCurrentNote(note);
    this.emit('roundStart', { note });
  }

  handleUserAction(action: { type: 'guess', note: NoteWithOctave }): void {
    this.submitGuess(action.note);
  }
}

// Chord training orchestrator
class ChordOrchestrator extends BaseOrchestrator {
  async startNewRound(): Promise<void> {
    const chord = this.generateChord();
    // No audio playback
    this.emit('chordRoundStart', { chord });
  }

  handleUserAction(action: ChordAction): void {
    if (action.type === 'submitAnswer') {
      this.submitAnswer();
    } else if (action.type === 'submitGuess') {
      this.submitGuess(action.chordName);
    } else if (action.type === 'selectNote') {
      this.handleNoteSelection(action.note);
    }
  }
}

// Component chooses orchestrator based on mode
const orchestrator = isChordMode(mode)
  ? new ChordOrchestrator()
  : new EarTrainingOrchestrator();
```

**Estimated Work:** ~5-7 days
- Extract BaseOrchestrator
- Refactor GameOrchestrator to extend base
- Create ChordOrchestrator
- Update component to use correct orchestrator
- Update all event handling
- Testing

---

### Option 3: Strategy Pattern with Orchestrator Adapters

**Approach:** Single orchestrator, mode-specific strategy objects handle differences.

**Pros:**
- ✅ Single orchestrator maintains coordination
- ✅ Clean separation via strategies
- ✅ Easy to add new mode types
- ✅ Strategies can be unit tested independently
- ✅ No orchestrator duplication

**Cons:**
- ❌ More abstraction layers
- ❌ Slightly more complex to understand

**Implementation:**
```typescript
interface ModeStrategy {
  startRound(gameMode: IGameMode): Promise<void>;
  handleUserInput(action: any): GameActionResult;
  shouldAutoAdvance(): boolean;
  getAdvanceDelay(): number;
}

class EarTrainingStrategy implements ModeStrategy {
  async startRound(gameMode: IGameMode): Promise<void> {
    const note = gameMode.generateNote(this.noteFilter);
    await this.audioEngine.playNote(note);
  }

  handleUserInput(action: { note: NoteWithOctave }): GameActionResult {
    return this.gameMode.validateGuess(action.note, this.currentNote);
  }

  shouldAutoAdvance(): boolean { return true; }
  getAdvanceDelay(): number { return 2; }
}

class ChordTrainingStrategy implements ModeStrategy {
  async startRound(gameMode: IGameMode): Promise<void> {
    gameMode.generateNote(null); // Generates chord
    // No audio playback
  }

  handleUserInput(action: ChordAction): GameActionResult {
    if (action.type === 'submitAnswer') {
      return gameMode.handleSubmitAnswer();
    }
    // Handle other actions...
  }

  shouldAutoAdvance(): boolean { return false; }
  getAdvanceDelay(): number { return 0; }
}

class GameOrchestrator {
  private strategy: ModeStrategy;

  setMode(mode: string): void {
    this.strategy = mode.includes('chord')
      ? new ChordTrainingStrategy()
      : new EarTrainingStrategy();
  }

  async startNewRound(): Promise<void> {
    await this.strategy.startRound(this.gameMode);
  }

  handleUserAction(action: any): void {
    const result = this.strategy.handleUserInput(action);
    // Process result...

    if (this.strategy.shouldAutoAdvance()) {
      this.scheduleAdvance(this.strategy.getAdvanceDelay());
    }
  }
}
```

**Estimated Work:** ~4-6 days
- Define ModeStrategy interface
- Create EarTrainingStrategy
- Create ChordTrainingStrategy
- Refactor GameOrchestrator to use strategies
- Update event flows
- Testing

---

### Option 4: Extended IGameMode Interface

**Approach:** Extend IGameMode to support both flows, orchestrator uses capabilities.

**Pros:**
- ✅ Minimal orchestrator changes
- ✅ Game modes declare their capabilities
- ✅ Backwards compatible
- ✅ Single interface

**Cons:**
- ❌ Interface becomes larger
- ❌ Optional methods (not ideal for interfaces)
- ❌ Still need conditional logic in orchestrator

**Implementation:**
```typescript
interface IGameMode extends GameStateWithDisplay {
  // Core methods (all modes)
  generateNote(filter: NoteFilter): NoteWithOctave;
  isGameComplete(): boolean;
  getMode(): string;

  // Capability flags
  requiresAudio(): boolean;
  requiresAutoAdvance(): boolean;

  // Validation methods (pick one based on mode)
  validateGuess?(guess: NoteWithOctave, actual: NoteWithOctave): boolean;
  handleSubmitAnswer?(): GameActionResult;
  handleSubmitGuess?(guess: string): GameActionResult;

  // User interaction (chord modes)
  handleNoteSelection?(note: NoteWithOctave): boolean;
}

class GameOrchestrator {
  async startNewRound(): Promise<void> {
    const note = this.gameMode.generateNote(this.noteFilter);

    if (this.gameMode.requiresAudio()) {
      await this.playCurrentNote(note);
    }

    this.emit('roundStart', { note, feedback });
  }

  handleSubmit(data: any): void {
    let result: GameActionResult;

    if (this.gameMode.validateGuess) {
      // Ear training
      result = this.processNoteGuess(data.note);
    } else if (this.gameMode.handleSubmitAnswer) {
      // Chord note selection
      result = this.gameMode.handleSubmitAnswer();
    } else if (this.gameMode.handleSubmitGuess) {
      // Chord name guess
      result = this.gameMode.handleSubmitGuess(data.chordName);
    }

    this.processResult(result);

    if (this.gameMode.requiresAutoAdvance()) {
      this.scheduleAdvance();
    }
  }
}
```

**Estimated Work:** ~2-4 days
- Extend IGameMode interface
- Add capability flags to game states
- Update orchestrator to check capabilities
- Minimal state machine changes
- Testing

---

## Recommendation: Option 3 (Strategy Pattern)

### Why Strategy Pattern?

1. **Best Balance:** Clean separation without duplication
2. **Testable:** Each strategy can be unit tested independently
3. **Extensible:** Easy to add interval training, scale training, etc.
4. **Maintainable:** Changes to chord logic stay in ChordStrategy
5. **Single Orchestrator:** Component doesn't need to choose
6. **Reusable:** Shared timer/state machine/event infrastructure

### Implementation Plan

#### Phase 1: Define Strategy Interface (1 day)
```typescript
// src/game/strategies/ModeStrategy.ts
interface ModeStrategy {
  startRound(context: StrategyContext): Promise<void>;
  handleUserAction(action: UserAction): GameActionResult | null;
  shouldAutoAdvance(): boolean;
  getAutoAdvanceDelay(): number;
}

interface StrategyContext {
  gameMode: IGameMode;
  noteFilter: NoteFilter | null;
  audioEngine: typeof audioEngine;
  emit: (event: string, data: any) => void;
}
```

#### Phase 2: Extract Ear Training Strategy (1-2 days)
```typescript
// src/game/strategies/EarTrainingStrategy.ts
class EarTrainingStrategy implements ModeStrategy {
  async startRound(ctx: StrategyContext): Promise<void> {
    const note = ctx.gameMode.generateNote(ctx.noteFilter!);
    await ctx.audioEngine.playNote(note, this.noteDuration);
    ctx.emit('roundStart', { note });
  }

  handleUserAction(action: UserAction): GameActionResult | null {
    if (action.type === 'guess') {
      const isCorrect = this.gameMode.validateGuess(
        action.note,
        this.currentNote
      );
      return this.createResult(isCorrect);
    }
    return null;
  }

  shouldAutoAdvance(): boolean { return true; }
  getAutoAdvanceDelay(): number { return this.autoAdvanceSpeed; }
}
```

#### Phase 3: Create Chord Training Strategy (2 days)
```typescript
// src/game/strategies/ChordTrainingStrategy.ts
class ChordTrainingStrategy implements ModeStrategy {
  async startRound(ctx: StrategyContext): Promise<void> {
    // Generate chord (returns first note for compatibility)
    ctx.gameMode.generateNote(null as any);

    // No audio playback for chord modes

    // Emit chord-specific event
    ctx.emit('chordRoundStart', {
      chord: (ctx.gameMode as any).currentChord
    });
  }

  handleUserAction(action: UserAction): GameActionResult | null {
    const gameMode = this.gameMode as SingleChordGameState;

    switch (action.type) {
      case 'selectNote':
        gameMode.handleNoteSelection(action.note);
        return null; // Don't advance yet

      case 'submitAnswer':
        return gameMode.handleSubmitAnswer();

      case 'clearSelection':
        gameMode.clearSelection();
        return null;

      default:
        return null;
    }
  }

  shouldAutoAdvance(): boolean { return false; }
  getAutoAdvanceDelay(): number { return 0; }
}
```

#### Phase 4: Refactor GameOrchestrator (1-2 days)
```typescript
class GameOrchestrator extends EventEmitter {
  private strategy: ModeStrategy;

  applySettings(mode: string, ...): void {
    // Select strategy based on mode
    this.strategy = this.createStrategy(mode);
    // ... rest of setup
  }

  private createStrategy(mode: string): ModeStrategy {
    if (mode.includes('chord') || mode.includes('note-training')) {
      return new ChordTrainingStrategy(this);
    } else {
      return new EarTrainingStrategy(this);
    }
  }

  async startNewRound(): Promise<void> {
    const ctx = this.createStrategyContext();
    await this.strategy.startRound(ctx);

    // Common logic after round start...
  }

  handleUserAction(action: UserAction): void {
    const result = this.strategy.handleUserAction(action);

    if (result) {
      this.processResult(result);

      if (this.strategy.shouldAutoAdvance() && result.shouldAdvance) {
        this.scheduleAdvance(this.strategy.getAutoAdvanceDelay());
      }
    }
  }
}
```

#### Phase 5: Update Component Integration (1 day)
```typescript
// NoteIdentification.tsx
// Change from submitGuess to handleUserAction

// For ear training modes
orchestrator.handleUserAction({
  type: 'guess',
  note: clickedNote
});

// For chord modes
orchestrator.handleUserAction({
  type: 'selectNote',
  note: clickedNote
});

orchestrator.handleUserAction({
  type: 'submitAnswer'
});
```

#### Phase 6: Testing & Validation (1-2 days)
- Unit test strategies
- Integration test with both mode types
- E2E test full game flows
- Verify no regressions in ear training
- QA test META-82

### Total Time Estimate: 7-11 days

### Files to Create/Modify

**New Files:**
- `src/game/strategies/ModeStrategy.ts` (interface)
- `src/game/strategies/EarTrainingStrategy.ts`
- `src/game/strategies/ChordTrainingStrategy.ts`
- `src/game/strategies/index.ts` (exports)
- `src/types/orchestrator.ts` (UserAction types)

**Modified Files:**
- `src/game/GameOrchestrator.ts` (use strategies)
- `src/components/NoteIdentification.tsx` (handleUserAction)
- `src/game/OrchestratorEvents.ts` (add chord events)

**Tests:**
- `src/game/strategies/__tests__/EarTrainingStrategy.test.ts`
- `src/game/strategies/__tests__/ChordTrainingStrategy.test.ts`

