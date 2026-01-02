# Implementation Plan: META-151
## Write integration test for Show Chord → Guess Notes flow

**Branch:** META-151
**Parent Ticket:** META-52 (Note Training - Testing & Documentation)
**Issue Type:** Story/Task

---

## Overview

Create an end-to-end integration test for the ShowChordGuessNotes mode that tests the complete user workflow from session start to completion. Unlike the existing unit tests which test individual components in isolation, this integration test will verify the entire game flow with real state management, orchestration, and user interactions.

---

## Acceptance Criteria

From the Jira ticket:

1. ✅ Test full flow:
   - Start session
   - Chord is displayed
   - User selects notes on keyboard
   - User submits answer
   - Feedback is shown (correct/incorrect)
   - Next chord appears

2. ✅ Test with correct answers
3. ✅ Test with incorrect answers
4. ✅ Test with partial correct answers
5. ✅ Test session completion
6. ✅ Use React Testing Library

---

## Current State Analysis

### Existing Components

1. **SingleChordGameState** (`src/game/SingleChordGameState.tsx`)
   - Manages game logic for ShowChordGuessNotes mode
   - Handles note selection, validation, and scoring
   - Tracks correctNotes, incorrectNotes, selectedNotes
   - Implements completion criteria (targetChords reached)

2. **SingleChordModeDisplay** (`src/components/modes/SingleChordModeDisplay.tsx`)
   - UI component for the mode
   - Displays piano keyboard, chord name, feedback
   - Shows progress stats, guess history, timers
   - Handles user interactions

3. **Existing Tests**
   - `SingleChordModeDisplay.test.tsx` - Unit tests for the display component
   - Tests individual features but not the complete integrated flow
   - Does NOT test with GameOrchestrator integration

### What's Missing

- No integration test directory structure
- No end-to-end test covering the complete game flow
- No test verifying orchestrator ↔ game state ↔ display integration
- No test covering session lifecycle from start to completion

---

## Implementation Plan

### Step 1: Create Test Directory Structure

Create the integration tests directory as specified in the ticket:

```
src/
  __tests__/
    integration/
      showChordGuessNotes.test.tsx  ← NEW FILE
```

**Rationale:** Follows the directory structure mentioned in the Jira ticket's "Files to Create" section.

---

### Step 2: Set Up Test Infrastructure

The test will need to:

1. **Mock Audio Engine** - Prevent actual audio playback during tests
   ```typescript
   vi.mock('../../utils/audioEngine', () => ({
     audioEngine: {
       playChord: vi.fn(),
       playNote: vi.fn(),
       releaseAllNotes: vi.fn()
     }
   }));
   ```

2. **Mock ChordEngine** - Control which chords are generated for predictable testing
   ```typescript
   vi.mock('../../utils/chordEngine', () => ({
     ChordEngine: {
       getRandomChordFromFilter: vi.fn()
     }
   }));
   ```

3. **Set Up Test Container** - Wrap components with necessary context providers
   ```typescript
   const renderWithProviders = (component) => {
     return render(
       <SettingsProvider>
         {component}
       </SettingsProvider>
     );
   };
   ```

---

### Step 3: Test Scenarios

#### Test 1: Complete Successful Session Flow

**Purpose:** Verify that a user can complete a full session with all correct answers

**Steps:**
1. Initialize game state with `targetChords: 3`
2. Mock ChordEngine to return predictable chords (C major, D minor, E major)
3. Start session (trigger `onAdvanceRound`)
4. For each chord:
   - Verify chord is displayed
   - Select all correct notes on piano keyboard
   - Submit answer
   - Verify "correct" feedback is displayed
   - Verify stats are updated (correctChordsCount, currentStreak)
   - Verify round advances automatically
5. Verify session completes after 3 chords
6. Verify completion message is shown
7. Verify "Play Again" button is available

**Assertions:**
- Chord name displayed correctly
- Piano keyboard accepts clicks
- Submit button enables when notes selected
- Feedback shows "Perfect! 100%"
- Progress shows "3/3 chords identified"
- Streak increments correctly
- Accuracy shows 100%
- Completion message appears

---

#### Test 2: Incorrect Answer Flow

**Purpose:** Verify feedback and state updates when user selects wrong notes

**Steps:**
1. Start session
2. Chord displayed (e.g., C major: C-E-G)
3. Select incorrect notes (e.g., C-E-A)
4. Submit answer
5. Verify error feedback is displayed
6. Verify incorrect notes are highlighted in red
7. Verify missing notes are shown as dimmed
8. Verify user can modify selection
9. Submit correct answer
10. Verify round advances

**Assertions:**
- Feedback shows percentage accuracy (e.g., "66.7% - 2 out of 3 notes correct")
- Incorrect notes highlighted as error (red)
- Missing notes highlighted as dimmed
- Streak resets to 0
- Total attempts increments
- User can clear and reselect notes
- Correct submission on retry advances round

---

#### Test 3: Partial Answer Handling

**Purpose:** Verify that partial answers (some but not all notes) are handled correctly

**Steps:**
1. Start session
2. Chord displayed (C major: C-E-G)
3. Select only partial notes (e.g., just C-E)
4. Submit answer
5. Verify partial feedback is displayed
6. Verify correct notes are highlighted as success
7. Verify missing notes NOT highlighted until submission
8. Add missing note (G)
9. Submit again
10. Verify round advances

**Assertions:**
- Feedback shows "Keep going! 2/3 notes identified"
- Correct notes highlighted green
- Missing notes shown as dimmed after submission
- shouldAdvance = false (stays on same chord)
- Adding final note and resubmitting advances round

---

#### Test 4: Session Completion Criteria

**Purpose:** Verify that session ends when target chords reached

**Steps:**
1. Initialize with `targetChords: 2`
2. Complete first chord correctly
3. Verify session continues
4. Complete second chord correctly
5. Verify session completes
6. Verify final stats are calculated
7. Verify "Play Again" button appears
8. Verify keyboard is disabled

**Assertions:**
- `isCompleted` = true after 2nd chord
- Completion message: "🎉 Note Training Complete! 2/2 chords identified"
- Final accuracy calculated correctly
- Piano keyboard disabled
- Play Again button enabled
- Stats show correct values

---

#### Test 5: Clear Selection Functionality

**Purpose:** Verify user can clear their note selection

**Steps:**
1. Start session
2. Select multiple notes
3. Click "Clear Selection" button
4. Verify all notes deselected
5. Verify submit button disabled
6. Reselect notes
7. Submit and verify

**Assertions:**
- Clear button enabled when notes selected
- Clear button disabled when no notes selected
- Clearing removes all highlights
- Submit button disabled after clear
- Can reselect and submit after clearing

---

#### Test 6: Next Chord Button

**Purpose:** Verify user can skip to next chord

**Steps:**
1. Start session
2. Chord displayed
3. Click "Next Chord" button
4. Verify new chord is generated
5. Verify previous selection is cleared
6. Verify progress increments (without scoring as correct)

**Assertions:**
- Next Chord button available during active chord
- Clicking advances to new chord
- Selection state resets
- Current streak maintained (not broken by skip)

---

#### Test 7: Play Chord Again Functionality

**Purpose:** Verify chord audio playback

**Steps:**
1. Start session
2. Chord displayed
3. Click "Play Chord Again" button
4. Verify audioEngine.playChord called with correct chord

**Assertions:**
- audioEngine.playChord called with current chord
- Button available during active chord
- Button disabled when paused

---

#### Test 8: Guess History Tracking

**Purpose:** Verify ChordGuessHistory component updates correctly

**Steps:**
1. Start session
2. Submit incorrect answer
3. Verify guess history shows failed attempt
4. Submit correct answer
5. Verify guess history shows successful attempt
6. Advance to next chord
7. Verify history persists

**Assertions:**
- History shows ✗ for incorrect guesses
- History shows ✓ for correct guesses
- Accuracy percentage displayed per attempt
- History persists across rounds
- maxDisplay limit respected

---

### Step 4: Test Structure

```typescript
describe('ShowChordGuessNotes Integration Test', () => {
  // Setup and teardown
  beforeEach(() => {
    // Mock audio engine
    // Mock chord engine
    // Reset all mocks
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Session Flow', () => {
    it('should complete full session with correct answers', async () => {
      // Test 1
    });

    it('should handle incorrect answers with proper feedback', async () => {
      // Test 2
    });

    it('should handle partial correct answers', async () => {
      // Test 3
    });
  });

  describe('Session Completion', () => {
    it('should complete session when target reached', async () => {
      // Test 4
    });

    it('should calculate final statistics correctly', async () => {
      // Additional validation
    });
  });

  describe('User Interactions', () => {
    it('should allow clearing note selection', async () => {
      // Test 5
    });

    it('should advance to next chord on skip', async () => {
      // Test 6
    });

    it('should replay chord audio', async () => {
      // Test 7
    });
  });

  describe('History Tracking', () => {
    it('should track guess history correctly', async () => {
      // Test 8
    });
  });
});
```

---

### Step 5: Implementation Details

#### Required Imports

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { SingleChordGameState } from '../../game/SingleChordGameState';
import SingleChordModeDisplay from '../../components/modes/SingleChordModeDisplay';
import { SettingsProvider } from '../../contexts/SettingsContext';
import type { NoteTrainingModeSettings } from '../../types/game';
import type { NoteWithOctave, Chord } from '../../types/music';
```

#### Test Data Setup

```typescript
const TEST_CHORDS: Chord[] = [
  {
    name: 'C major',
    notes: [
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 },
      { note: 'G', octave: 4 }
    ],
    quality: 'major',
    rootNote: 'C',
    inversion: 0,
    type: 'major' as any
  },
  {
    name: 'D minor',
    notes: [
      { note: 'D', octave: 4 },
      { note: 'F', octave: 4 },
      { note: 'A', octave: 4 }
    ],
    quality: 'minor',
    rootNote: 'D',
    inversion: 0,
    type: 'minor' as any
  }
];
```

#### Helper Functions

```typescript
// Click a piano key by note name
const clickPianoKey = (container: HTMLElement, note: string) => {
  const key = container.querySelector(`[data-note="${note}"]`);
  if (key) fireEvent.click(key);
};

// Select multiple notes
const selectNotes = (container: HTMLElement, notes: string[]) => {
  notes.forEach(note => clickPianoKey(container, note));
};

// Wait for feedback to appear
const waitForFeedback = async (text: string) => {
  await waitFor(() => {
    expect(screen.getByText(text)).toBeInTheDocument();
  });
};
```

---

## Testing Considerations

### Mock Strategy

1. **ChordEngine.getRandomChordFromFilter**
   - Return predictable chords from TEST_CHORDS array
   - Use sequential index to ensure deterministic flow

2. **audioEngine**
   - Mock all audio methods to prevent actual playback
   - Verify correct methods called with correct arguments

3. **Timers**
   - May need to mock setTimeout for auto-advance delays
   - Use `vi.useFakeTimers()` if timing-sensitive

### Edge Cases to Test

- Session with 0 incorrect answers (100% accuracy)
- Session with all incorrect answers (0% accuracy)
- Session with mixed results
- Partial answers followed by completion
- Clearing selection multiple times
- Skipping chords without answering
- Rapid clicking (debouncing if needed)

### Performance Considerations

- Each test should be independent (no shared state)
- Clean up mocks between tests
- Use waitFor for async state updates
- Avoid excessive delays (use fake timers if needed)

---

## Success Criteria

The implementation will be considered complete when:

1. ✅ Integration test file created at correct path
2. ✅ All 8 test scenarios pass
3. ✅ Test coverage includes:
   - Correct answer flow
   - Incorrect answer flow
   - Partial answer flow
   - Session completion
   - Clear selection
   - Skip functionality
   - Audio playback
   - History tracking
4. ✅ All assertions verify expected behavior
5. ✅ Tests are deterministic and reproducible
6. ✅ No console errors or warnings
7. ✅ Tests run successfully with `npm test`

---

## Files to Create

```
src/
  __tests__/
    integration/
      showChordGuessNotes.test.tsx  ← NEW FILE (~500-700 lines)
```

---

## Files to Reference

- `src/game/SingleChordGameState.tsx` - Game logic
- `src/components/modes/SingleChordModeDisplay.tsx` - UI component
- `src/components/modes/SingleChordModeDisplay.test.tsx` - Example test patterns
- `src/utils/chordEngine.ts` - Chord generation
- `src/types/game.ts` - Type definitions
- `vitest.config.ts` - Test configuration

---

## Dependencies

No new dependencies required. Using existing:
- vitest
- @testing-library/react
- @testing-library/user-event (if needed for complex interactions)

---

## Estimated Scope

- **Test File:** ~500-700 lines
- **Test Scenarios:** 8 main tests + setup/helpers
- **Time Estimate:** N/A (no time estimates per guidelines)

---

## Notes

1. **Focus on Integration:** This test should verify the complete flow, not individual component details. Unit tests already cover component-level behavior.

2. **Real State Management:** Unlike unit tests, this should use real SingleChordGameState instances and verify state changes throughout the flow.

3. **User-Centric:** Test from the user's perspective - what they see, click, and experience.

4. **Documentation Value:** These tests will serve as living documentation for how the ShowChordGuessNotes mode should behave.

5. **Future Enhancement:** This pattern can be replicated for other modes (ShowNotesGuessChord, ChordIdentification, etc.)

---

## Questions to Resolve (None Currently)

All requirements are clear from the ticket and existing codebase.

---

## Next Steps

Once this plan is approved:

1. Create `src/__tests__/integration/` directory
2. Create `showChordGuessNotes.test.tsx` file
3. Implement test infrastructure (mocks, helpers)
4. Implement each test scenario
5. Verify all tests pass
6. Run full test suite to ensure no regressions
7. Commit and push to META-151 branch
8. Update ticket status in Jira

---

**Plan Status:** ✅ Ready for implementation
**Last Updated:** 2026-01-01
**Next Action:** Begin implementation
