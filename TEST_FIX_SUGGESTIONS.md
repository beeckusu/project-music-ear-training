# Test Fix Suggestions

## Summary

All failing tests share **3 root causes**:

1. **Missing `isPlayingNote()` method** - Tests expect this but it doesn't exist
2. **`playAgain()` sends wrong action** - Sends RESET instead of PLAY_AGAIN
3. **State machine context not updating** - Stats don't increment because context updates aren't working

## Detailed Fixes

### Fix 1: Add Missing `isPlayingNote()` Method

**Location**: `src/game/GameOrchestrator.ts:337-385` (Round state query methods section)

**Problem**: Tests call `orchestrator.isPlayingNote()` but this method doesn't exist

**Affected Tests**:
- `GameOrchestrator.test.ts` - 3 tests failing
- All tests that check round state transitions

**Solution**: Add the method after `isPlaying()` at line 337:

```typescript
  isPlaying(): boolean {
    return this.getSessionState() === 'playing';
  }

  /**
   * Check if orchestrator is in PLAYING_NOTE round state
   */
  isPlayingNote(): boolean {
    if (!this.isPlaying()) {
      return false;
    }
    const roundState = this.getRoundState();
    return roundState === 'playing_note';
  }

  /**
   * Check if orchestrator is waiting for user input
   */
  isWaitingInput(): boolean {
    // ... existing code
  }
```

---

### Fix 2: Fix `playAgain()` to Send PLAY_AGAIN Action

**Location**: `src/game/GameOrchestrator.ts:1002-1019`

**Problem**: `playAgain()` calls `resetGame()` which sends RESET action (COMPLETED → IDLE), but tests expect PLAY_AGAIN action (COMPLETED → PLAYING)

**Affected Tests**:
- `GameOrchestrator.test.ts` - "should transition from COMPLETED to PLAYING on PLAY_AGAIN"
- `SandboxMode.test.ts` - "resets stats on play again"
- `SessionActions.test.ts` - All "Play Again" tests (3 tests)
- `StateChangeActions.test.ts` - "COMPLETED → PLAYING: playAgain()"
- `EdgeCaseActions.test.ts` - "handles complete game lifecycle without errors"
- `gameStateMachine.test.ts` - "should transition from 'COMPLETED to PLAYING on PLAY_AGAIN"

**Current Implementation** (WRONG):
```typescript
playAgain(): void {
  // Game logic: Create fresh game state and reconfigure
  if (this.selectedMode && this.modeSettings) {
    const newGameState = createGameState(this.selectedMode, this.modeSettings);
    this.refreshGameMode(newGameState);
    if (this.noteFilter) {
      this.setNoteFilter(this.noteFilter);
    }
  }

  // Reset the game
  this.resetGame();  // ❌ This sends RESET action (COMPLETED → IDLE)

  // Schedule new round after short delay
  this.schedulePlayAgainDelay(() => {
    this.emit('advanceToNextRound', undefined);
  }, 100);
}
```

**Fixed Implementation**:
```typescript
playAgain(): void {
  if (LOGS_USER_ACTIONS_ENABLED) {
    console.log('[Orchestrator] User clicked Play Again');
  }

  // Clear all timers first
  this.clearAllTimers();

  // Game logic: Create fresh game state and reconfigure
  if (this.selectedMode && this.modeSettings) {
    const newGameState = createGameState(this.selectedMode, this.modeSettings);
    this.refreshGameMode(newGameState);
    if (this.noteFilter) {
      this.setNoteFilter(this.noteFilter);
    }
  }

  // Reset current note
  this.currentNote = null;

  // Send PLAY_AGAIN action to state machine (COMPLETED → PLAYING)
  this.send({ type: GameAction.PLAY_AGAIN });

  // Emit events for UI to react
  this.emit('gameReset', undefined);
  this.emit('feedbackUpdate', 'Click "Start Practice" to begin your ear training session');

  // Schedule new round after short delay
  this.schedulePlayAgainDelay(() => {
    this.emit('advanceToNextRound', undefined);
  }, 100);
}
```

**Why This Works**:
- `resetGame()` sends RESET (transitions COMPLETED → IDLE)
- `playAgain()` should send PLAY_AGAIN (transitions COMPLETED → PLAYING)
- State machine already handles PLAY_AGAIN action correctly
- Still emits same UI events for component to react

---

### Fix 3: State Machine Missing PLAYING_NOTE State and Actions

**Location**: `src/machines/gameStateMachine.ts` and `src/machines/types.ts`

**Problem**: The state machine is missing the PLAYING_NOTE round state and NOTE_PLAYED/REPLAY_NOTE actions that tests expect

**Affected Tests**:
- `gameStateMachine.test.ts` - All "Round State Transitions" tests (7 tests)
- `gameStateMachine.test.ts` - All "Context Updates" tests (7 tests)
- `GameOrchestrator.test.ts` - "should update stats after correct guess"

**Root Cause**:

The tests expect this flow:
```
START_GAME → PLAYING_NOTE → NOTE_PLAYED → WAITING_INPUT → MAKE_GUESS → PROCESSING_GUESS
```

But the current state machine implements:
```
START_GAME → WAITING_INPUT → MAKE_GUESS → PROCESSING_GUESS
```

**Missing Components**:

1. **PLAYING_NOTE round state** - Not defined in RoundState enum
2. **NOTE_PLAYED action** - Not defined in GameAction enum
3. **REPLAY_NOTE action** - Not defined in GameAction enum
4. **Wrong transitions**:
   - INCORRECT_GUESS goes to WAITING_INPUT (should go to TIMEOUT_INTERMISSION)
   - ADVANCE_ROUND goes to WAITING_INPUT (should go to PLAYING_NOTE)

**Required Changes**:

#### 1. Add missing actions to `src/machines/types.ts`:

```typescript
export const GameAction = {
  // ... existing actions ...

  // Round lifecycle
  ADVANCE_ROUND: 'advance_round',
  NOTE_PLAYED: 'note_played',      // NEW
  REPLAY_NOTE: 'replay_note',      // NEW

  // ... rest of actions ...
}
```

#### 2. Add PLAYING_NOTE to RoundState enum in `src/machines/types.ts`:

```typescript
export const RoundState = {
  PLAYING_NOTE: 'playing_note',           // NEW - note is currently playing
  WAITING_INPUT: 'waiting_input',         // existing
  PROCESSING_GUESS: 'processing_guess',   // existing
  TIMEOUT_INTERMISSION: 'timeout_intermission'  // existing
} as const;
```

#### 3. Update state machine in `src/machines/gameStateMachine.ts`:

Change initial round state from WAITING_INPUT to PLAYING_NOTE:

```typescript
[SessionState.PLAYING]: {
  initial: RoundState.PLAYING_NOTE,  // ← Changed from WAITING_INPUT
  on: {
    // ... session level events
  },
  states: {
    /**
     * PLAYING_NOTE: Note is currently playing
     */
    [RoundState.PLAYING_NOTE]: {
      on: {
        [GameAction.NOTE_PLAYED]: {
          target: RoundState.WAITING_INPUT,
        },
      },
    },

    /**
     * WAITING_INPUT: Waiting for user's key guess
     */
    [RoundState.WAITING_INPUT]: {
      on: {
        [GameAction.MAKE_GUESS]: {
          target: RoundState.PROCESSING_GUESS,
          actions: assign({
            userGuess: ({ event }) => event.guessedNote,
          }),
        },
        [GameAction.REPLAY_NOTE]: {
          target: RoundState.PLAYING_NOTE,  // NEW - replay note
        },
        [GameAction.TIMEOUT]: {
          target: RoundState.TIMEOUT_INTERMISSION,
          actions: assign({
            totalAttempts: ({ context }) => context.totalAttempts + 1,
            currentStreak: 0,
            feedbackMessage: 'Time\'s up!',
          }),
        },
      },
    },

    /**
     * PROCESSING_GUESS: Validating the user's guess
     */
    [RoundState.PROCESSING_GUESS]: {
      on: {
        [GameAction.CORRECT_GUESS]: {
          target: RoundState.TIMEOUT_INTERMISSION,
          actions: assign({
            correctCount: ({ context }) => context.correctCount + 1,
            totalAttempts: ({ context }) => context.totalAttempts + 1,
            currentStreak: ({ context }) => context.currentStreak + 1,
            longestStreak: ({ context }) =>
              Math.max(context.longestStreak, context.currentStreak + 1),
            feedbackMessage: 'Correct!',
          }),
        },
        [GameAction.INCORRECT_GUESS]: {
          target: RoundState.TIMEOUT_INTERMISSION,  // ← Changed from WAITING_INPUT
          actions: assign({
            totalAttempts: ({ context }) => context.totalAttempts + 1,
            currentStreak: 0,
            feedbackMessage: 'Incorrect! Try again or click Next Note',
          }),
        },
      },
    },

    /**
     * TIMEOUT_INTERMISSION: Brief pause between rounds
     */
    [RoundState.TIMEOUT_INTERMISSION]: {
      on: {
        [GameAction.ADVANCE_ROUND]: {
          target: RoundState.PLAYING_NOTE,  // ← Changed from WAITING_INPUT
          actions: assign({
            currentNote: null,
            userGuess: null,
            feedbackMessage: '',
          }),
        },
      },
    },

    // ... history state
  },
},
```

**Why This Fixes Context Updates**:

The context wasn't updating because tests were sending NOTE_PLAYED first (which the machine didn't recognize), so subsequent events weren't being processed correctly. With PLAYING_NOTE state added, the flow works correctly and context updates will execute.

---

## Fix Priority

1. **HIGHEST PRIORITY**: Fix #2 (`playAgain()` sending wrong action)
   - Fixes 10+ tests across 6 test files
   - Simple one-method change
   - Clear root cause

2. **HIGH PRIORITY**: Fix #1 (Add `isPlayingNote()` method)
   - Fixes 3 tests
   - Simple one-method addition
   - Clear root cause

3. **MEDIUM PRIORITY**: Fix #3 (Context updates)
   - Fixes 8 tests
   - More complex - requires reading state machine file
   - May have multiple sub-issues

---

## Implementation Order

### Step 1: Add `isPlayingNote()` Method
- File: `src/game/GameOrchestrator.ts`
- Line: After line 337 (after `isPlaying()` method)
- Estimated impact: 3 tests pass

### Step 2: Fix `playAgain()` Method
- File: `src/game/GameOrchestrator.ts`
- Line: 1002-1019 (replace entire method)
- Estimated impact: 10+ tests pass

### Step 3: Investigate and Fix State Machine Context Updates
- File: `src/machines/gameStateMachine.ts`
- Need to read file first to identify specific issues
- Estimated impact: 8 tests pass

---

## Expected Test Results After All Fixes

**Current**: 6 failed test files, 4 passed
**After Fix 1+2**: ~4 failed test files (mostly gameStateMachine.test.ts context issues)
**After Fix 3**: All 10 test files should pass

---

## Additional Notes

### Why `playAgain()` Was Wrong

The confusion likely came from thinking "reset" means "start over", but in the state machine:
- **RESET**: COMPLETED → IDLE (game is stopped, user must click "Start Practice")
- **PLAY_AGAIN**: COMPLETED → PLAYING (game continues with fresh stats)

The UI component calls `playAgain()` when the user clicks "Play Again" button, expecting the game to continue in PLAYING state, not return to IDLE.

### State Machine Actions Not Firing

The context update issue suggests actions aren't being executed. Common causes:
1. Actions not assigned to transitions
2. Action names misspelled
3. `assign()` function not working correctly
4. XState version incompatibility

Will need to inspect `gameStateMachine.ts` to determine exact cause.
