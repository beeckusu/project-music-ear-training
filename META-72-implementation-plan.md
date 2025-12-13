# META-72: Create SingleChordGameState Class

## Ticket Information
- **Ticket**: META-72
- **Type**: Story
- **Priority**: Medium
- **Status**: In Progress
- **Parent**: META-45 (Note Training - Game State Logic)
- **Branch**: META-72

## Summary
Implement the game state for "Single Chord" mode, where a chord is played/displayed and the user must identify all the individual notes that make up the chord.

## Acceptance Criteria
- [x] Create SingleChordGameState class in `src/game/SingleChordGameState.tsx`
- [x] Extend BaseGameState interface
- [x] Implement GameStateWithDisplay interface
- [x] Store state:
  - `currentChord: Chord`
  - `selectedNotes: Set<NoteWithOctave>`
  - `correctNotes: Set<NoteWithOctave>`
  - `incorrectNotes: Set<NoteWithOctave>`
- [x] Implement constructor with NoteTrainingModeSettings
- [x] Add JSDoc documentation

## Technical Analysis

### Existing Patterns
Based on analysis of `RushGameState.tsx` and `SurvivalGameState.tsx`, the implementation should follow this pattern:

1. **Class Structure**:
   - Implement both the interface (extends BaseGameState) and GameStateWithDisplay
   - Store mode-specific settings in constructor
   - Initialize all state properties with default values

2. **Required Interfaces**:
   - `BaseGameState` (src/types/game.ts:74-93): Core game state properties and end screen strategy methods
   - `GameStateWithDisplay` (src/game/GameStateFactory.tsx:37-57): Display component and game action handlers

3. **Core Methods to Implement**:
   - `modeDisplay`: Returns React component for mode-specific UI
   - `handleCorrectGuess`: Handles correct user input
   - `handleIncorrectGuess`: Handles incorrect user input
   - `updateState`: Updates state with partial updates
   - `getFeedbackMessage`: Returns current feedback message
   - `onStartNewRound`: Hook called when starting new round
   - `getTimerMode`: Returns timer behavior ('count-up' | 'count-down' | 'none')
   - `getCompletionMessage`: Returns completion message
   - `getSessionSettings`: Returns session settings for history
   - `getSessionResults`: Returns session results for history
   - End screen strategy methods (getCelebrationEmoji, getHeaderTitle, etc.)

### Key Differences for Show Chord Guess Notes Mode

Unlike Rush/Survival modes which track single note guesses:
- **Multi-note selection**: Users select multiple notes to match the chord
- **Partial correctness**: Track which notes are correct/incorrect separately
- **Chord-based gameplay**: Generate and validate against Chord objects instead of single notes
- **Different win condition**: User must identify all notes in the chord correctly

### Data Structures

The state will track:
```typescript
currentChord: Chord                        // Currently displayed chord
selectedNotes: Set<NoteWithOctave>         // Notes user has selected
correctNotes: Set<NoteWithOctave>          // Notes correctly identified
incorrectNotes: Set<NoteWithOctave>        // Notes incorrectly selected
```

## Implementation Plan

### Step 1: Create SingleChordGameState Class File
**File**: `src/game/SingleChordGameState.tsx`

Create the class structure with:
- Imports from types and dependencies
- Class declaration implementing required interfaces
- State properties (from BaseGameState and mode-specific)
- Constructor accepting `NoteTrainingModeSettings`

### Step 2: Implement Core State Properties
Add all required BaseGameState properties:
- `elapsedTime: number = 0`
- `isCompleted: boolean = false`
- `totalAttempts: number = 0`
- `longestStreak: number = 0`
- `currentStreak: number = 0`
- `startTime?: Date`

Add mode-specific properties:
- `currentChord: Chord | null = null`
- `selectedNotes: Set<NoteWithOctave> = new Set()`
- `correctNotes: Set<NoteWithOctave> = new Set()`
- `incorrectNotes: Set<NoteWithOctave> = new Set()`
- `correctChordsCount: number = 0`
- `noteTrainingSettings: NoteTrainingModeSettings`

### Step 3: Implement Display Component Method
Create `modeDisplay` method that returns a React component.

**Note**: Will need to create `ShowChordGuessNotesModeDisplay` component separately (separate ticket).

For now, return a placeholder or basic component reference.

### Step 4: Implement Game Action Handlers

**`handleCorrectGuess()`**:
- Increment correctChordsCount
- Update streak counters
- Increment totalAttempts
- Check win conditions based on settings:
  - `targetChords` reached
  - `sessionDuration` elapsed
  - `targetAccuracy` achieved
- Return GameActionResult with completion status and stats

**`handleIncorrectGuess()`**:
- Reset current streak to 0
- Increment totalAttempts
- Return GameActionResult indicating to stay on current chord

**`handleNoteSelection(note: NoteWithOctave)`** (mode-specific):
- Add/remove note from selectedNotes
- Check if note is in currentChord.notes
- Update correctNotes or incorrectNotes accordingly
- Check if all chord notes identified → trigger completion of current chord

### Step 5: Implement Helper Methods

**`updateState(updates: Partial<BaseGameState>)`**:
- Use Object.assign to merge updates

**`getFeedbackMessage(currentNote: boolean)`**:
- Return appropriate message based on game state
- Example: "Select all notes in the chord" or "X/Y notes identified"

**`onStartNewRound()`**:
- Generate new chord using `AudioEngine.getRandomChordFromFilter(chordFilter)`
- Reset selectedNotes, correctNotes, incorrectNotes
- Track start time on first round

**`getTimerMode()`**:
- Return 'count-down' if sessionDuration is set
- Otherwise return 'count-up'

**`getCompletionMessage()`**:
- Return completion message based on how game ended

**`getSessionSettings()`**:
- Return NoteTrainingModeSettings as Record<string, any>

**`getSessionResults(stats: GameStats)`**:
- Return results object with:
  - chordsCompleted
  - longestStreak
  - averageTimePerChord
  - accuracy

### Step 6: Implement End Screen Strategy Methods

Based on RushGameState and SurvivalGameState patterns:

**`getCelebrationEmoji(sessionResults)`**: Return appropriate emoji
**`getHeaderTitle(sessionResults)`**: Return "Congratulations!" or similar
**`getModeCompletionText(sessionResults)`**: Return "Single Chord Complete"
**`getPerformanceRating(gameStats, sessionResults)`**: Return rating based on performance
**`getHeaderThemeClass(sessionResults)`**: Return CSS class for theme
**`getStatsItems(gameStats, sessionResults)`**: Return array of StatItem objects
**`getAdditionalStatsSection(sessionResults)`**: Return null or additional section
**`getHistoryTitle(settings)`**: Return history section title
**`getHistoryItems(sessions)`**: Return array of HistoryItem objects
**`shouldShowHistory(sessions)`**: Return true if sessions.length > 0

### Step 7: Add JSDoc Documentation

Add comprehensive JSDoc comments for:
- Class description
- Constructor parameters
- All public methods
- Key properties

### Step 8: Update GameStateFactory (Future Ticket)

**Note**: This will be a separate ticket, but the factory will need to:
- Import SingleChordGameStateImpl
- Add case for NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES
- Create and return instance with noteTrainingSettings

## Files to Create
- `src/game/SingleChordGameState.tsx` - Main implementation

## Files to Reference
- `src/types/game.ts` - BaseGameState interface and related types
- `src/types/music.ts` - Chord and NoteWithOctave types
- `src/game/GameStateFactory.tsx` - GameStateWithDisplay interface
- `src/game/RushGameState.tsx` - Reference implementation
- `src/game/SurvivalGameState.tsx` - Reference implementation
- `src/constants/index.ts` - NOTE_TRAINING_SUB_MODES constant

## Dependencies
- React
- Chord type and ChordFilter from types/music
- NoteTrainingModeSettings from types/game
- AudioEngine for chord generation
- NOTE_TRAINING_SUB_MODES constant

## Notes
- This is focused purely on game state logic - no UI components yet
- The multi-note selection logic is unique to this mode
- Will need helper methods to compare Sets of NoteWithOctave
- Consider equality checks for NoteWithOctave (note + octave must match)
- Timer integration will depend on whether sessionDuration is set

## Future Considerations
- Separate ticket needed for ShowChordGuessNotesModeDisplay component
- Separate ticket needed to integrate into GameStateFactory
- May need to add IGameMode interface implementation (for chord generation)
- Consider adding "hint" system to show partial notes
- Consider adding difficulty progression (more complex chords over time)

## Testing Strategy
- Unit tests for state transitions
- Test chord generation with various filters
- Test note selection logic (correct/incorrect tracking)
- Test win conditions (targetChords, accuracy, duration)
- Test streak tracking
- Test end screen strategy methods return correct values
