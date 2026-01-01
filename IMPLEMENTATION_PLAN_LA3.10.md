# Implementation Plan: META-LA3.10 - Add Comprehensive Tests for Chord Mode UI

## Overview
Create comprehensive test coverage for all chord mode UI components and interactions, including unit tests for individual components and integration tests for complete user workflows.

## Context
- **Bead**: meta-la3.10
- **Parent Epic**: meta-la3 (Chord Training UI epic)
- **Branch**: meta-la3.10 (created from main)

## Existing Test Infrastructure
- Test framework: Vitest
- React testing: @testing-library/react
- Existing test patterns found in:
  - `src/components/ChordSelection.test.tsx` ✅ (already comprehensive)
  - `src/components/FeedbackMessage.test.tsx`
  - `src/components/PianoKeyboard.test.tsx`
- Helper: `renderWithSettings()` for components using SettingsContext

## Test Files to Create

### 1. ChordGuessHistory Component Unit Tests
**File**: `src/components/ChordGuessHistory.test.tsx`

**Test Coverage**:
- Rendering states:
  - Empty state (no attempts)
  - With attempts (correct, wrong, partial)
  - Max display limit (default 10)
- Icon display:
  - ✓ for correct guesses
  - ✗ for wrong guesses
  - ~ for partial credit
- Hover tooltips:
  - Training mode tooltip (correct/missed/incorrect notes breakdown)
  - Identification mode tooltip (actual vs guessed chord)
  - Tooltip positioning and visibility
- Auto-scroll behavior:
  - Scrolls to newest attempt on addition
- Mode differences:
  - Training mode shows note-level details
  - Identification mode shows chord names

**Key Test Cases**:
```typescript
describe('ChordGuessHistory', () => {
  describe('Rendering', () => {
    it('should show empty state when no attempts')
    it('should render recent attempts with correct icons')
    it('should limit display to maxDisplay prop')
    it('should auto-scroll to newest attempt')
  })

  describe('Icons', () => {
    it('should show ✓ for correct attempts')
    it('should show ✗ for wrong attempts')
    it('should show ~ for partial attempts')
  })

  describe('Tooltips - Training Mode', () => {
    it('should show correct notes breakdown on hover')
    it('should show missed notes breakdown on hover')
    it('should show incorrect notes breakdown on hover')
    it('should display accuracy percentage')
  })

  describe('Tooltips - Identification Mode', () => {
    it('should show actual vs guessed chord on hover')
    it('should show correct message for right answer')
  })
})
```

### 2. SingleChordModeDisplay Integration Tests
**File**: `src/components/modes/SingleChordModeDisplay.test.tsx`

**Test Coverage**:
- Gray selection toggle behavior:
  - Click key → highlights gray
  - Click again → unhighlights
  - Multiple notes can be selected
- Color feedback after submit:
  - Green for correct notes (clicked AND in chord)
  - Yellow for missed notes (NOT clicked AND in chord)
  - Red for incorrect notes (clicked but NOT in chord)
- Submit button:
  - Disabled when no notes selected
  - Enabled when notes selected
  - Triggers validation on click
- Clear Selection:
  - Removes all selected notes
  - Disabled when no selection
- Round flow:
  - Play Again button behavior
  - Next Chord button behavior
  - Timer integration
- Progress stats display:
  - Correct/total count
  - Streak counter
  - Accuracy percentage

**Key Test Cases**:
```typescript
describe('SingleChordModeDisplay', () => {
  describe('Note Selection', () => {
    it('should toggle gray highlight on piano key click')
    it('should allow multiple notes to be selected')
    it('should deselect note on second click')
    it('should enable submit when notes selected')
  })

  describe('Submit Validation', () => {
    it('should show green for correct notes after submit')
    it('should show yellow for missed notes after submit')
    it('should show red for incorrect notes after submit')
    it('should maintain feedback until next round')
  })

  describe('Clear Selection', () => {
    it('should clear all selected notes')
    it('should disable submit after clearing')
    it('should be disabled when no selection')
  })

  describe('Round Buttons', () => {
    it('should advance to next round on Next Chord')
    it('should restart session on Play Again')
    it('should clear selection on round advance')
  })

  describe('Timer Integration', () => {
    it('should display timer when active')
    it('should pause timer when game paused')
    it('should show elapsed time')
  })

  describe('Progress Stats', () => {
    it('should display correct/total count')
    it('should update streak on correct guess')
    it('should calculate accuracy percentage')
  })
})
```

### 3. ChordIdentificationModeDisplay Integration Tests
**File**: `src/components/modes/ChordIdentificationModeDisplay.test.tsx`

**Test Coverage**:
- Read-only keyboard:
  - Shows chord notes in green
  - Keys are disabled (no click events)
- Chord selection UI:
  - Base note selection
  - Chord type selection
  - Selected chord name display
- Manual input vs button selection:
  - Manual input clears button selection
  - Button selection clears manual input
- Submit button:
  - Disabled when no input
  - Enabled with manual input OR button selection
  - Validates guess on submit
- Round flow and timer (similar to Training mode)

**Key Test Cases**:
```typescript
describe('ChordIdentificationModeDisplay', () => {
  describe('Read-only Keyboard', () => {
    it('should display chord notes in green')
    it('should disable all piano keys')
    it('should not trigger onNoteClick')
  })

  describe('Chord Selection', () => {
    it('should select base note from buttons')
    it('should select chord type from buttons')
    it('should display selected chord name')
    it('should clear manual input when using buttons')
  })

  describe('Manual Input', () => {
    it('should accept manual chord input')
    it('should clear button selection when typing')
    it('should submit with Enter key')
  })

  describe('Submit Button', () => {
    it('should be disabled with no input')
    it('should be enabled with manual input')
    it('should be enabled with complete button selection')
    it('should validate guess on submit')
  })

  describe('Round Buttons', () => {
    it('should advance to next round on Next Chord')
    it('should restart session on Play Again')
    it('should clear input/selection on round advance')
  })

  describe('Timer Integration', () => {
    it('should display timer when active')
    it('should pause timer when game paused')
  })
})
```

## Test Utilities & Mocking

### Game State Mocks
Create mock factory functions for game states:

```typescript
// src/__tests__/helpers/gameStateMocks.ts

export const createMockSingleChordGameState = (overrides = {}) => ({
  currentChord: { name: 'C major', notes: [...] },
  selectedNotes: new Set(),
  correctNotes: new Set(),
  incorrectNotes: new Set(),
  guessHistory: [],
  correctChordsCount: 0,
  currentStreak: 0,
  totalAttempts: 0,
  isCompleted: false,
  ...overrides
});

export const createMockChordIdentificationGameState = (overrides = {}) => ({
  currentChord: { name: 'C major', notes: [...] },
  displayedNotes: [...],
  guessHistory: [],
  correctChordsCount: 0,
  currentStreak: 0,
  totalAttempts: 0,
  isCompleted: false,
  ...overrides
});
```

### Audio Engine Mocks
Mock audioEngine in tests:
```typescript
vi.mock('../utils/audioEngine', () => ({
  audioEngine: {
    playChord: vi.fn(),
    playNote: vi.fn(),
    releaseAllNotes: vi.fn()
  }
}));
```

## Edge Cases to Test

1. **Rapid clicking**: Multiple rapid clicks on same key
2. **Empty guess submission**: Attempting to submit with no input
3. **Game completion**: Behavior when reaching target chord count
4. **Timer expiration**: What happens when round timer runs out
5. **Pause/Resume**: Game state during pause
6. **Responsive behavior**: Component rendering at different viewport sizes
7. **Accessibility**: ARIA attributes, keyboard navigation (if applicable)

## Test Execution Strategy

1. **Phase 1**: ChordGuessHistory unit tests
2. **Phase 2**: SingleChordModeDisplay integration tests
3. **Phase 3**: ChordIdentificationModeDisplay integration tests
4. **Phase 4**: Run full test suite and fix any failures
5. **Phase 5**: Verify test coverage metrics

## Success Criteria

- ✅ All new tests pass
- ✅ Existing tests still pass (no regressions)
- ✅ Code coverage for chord mode components >80%
- ✅ Edge cases covered
- ✅ Integration tests verify complete user workflows
- ✅ Tests are maintainable and well-documented

## Dependencies

- Existing components must be functional
- Game state classes must be working
- Audio engine mock must be properly configured

## Notes

- **ChordSelection** already has comprehensive tests - no work needed
- Follow existing test patterns from ChordSelection.test.tsx
- Use `renderWithSettings()` helper for components using context
- Mock audio engine to avoid audio playback during tests
- Use `fireEvent` for user interactions
- Use `waitFor` for async operations
- Focus on testing user-facing behavior, not implementation details
