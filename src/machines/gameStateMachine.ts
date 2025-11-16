import { createMachine } from 'xstate';
import type { GameMachineContext, GameEvent } from './types';
import { SessionState, RoundState } from './types';

/**
 * Initial context for the game state machine
 */
const initialContext: GameMachineContext = {
  currentNote: null,
  userGuess: null,
  correctCount: 0,
  totalAttempts: 0,
  currentStreak: 0,
  longestStreak: 0,
  elapsedTime: 0,
  sessionDuration: 0,
  attemptHistory: [],
  feedbackMessage: '',
  showCorrectAnswer: false,
};

/**
 * Game State Machine
 *
 * Hierarchical state machine with:
 * - Session states (IDLE, PLAYING, PAUSED, COMPLETED)
 * - Round states (substates of PLAYING)
 *
 * To be implemented in META-166.
 */
export const gameStateMachine = createMachine({
  id: 'game',
  initial: SessionState.IDLE,
  context: initialContext,
  types: {} as {
    context: GameMachineContext;
    events: GameEvent;
  },
  states: {
    // TODO: Implement state definitions in META-166
    [SessionState.IDLE]: {},
    [SessionState.PLAYING]: {
      initial: RoundState.PLAYING_NOTE,
      states: {
        [RoundState.PLAYING_NOTE]: {},
        [RoundState.WAITING_INPUT]: {},
        [RoundState.PROCESSING_GUESS]: {},
        [RoundState.TIMEOUT_INTERMISSION]: {},
      },
    },
    [SessionState.PAUSED]: {},
    [SessionState.COMPLETED]: {},
  },
});
