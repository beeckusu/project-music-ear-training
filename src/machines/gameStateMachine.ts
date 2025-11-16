import { createMachine, assign } from 'xstate';
import type { GameMachineContext, GameEvent } from './types';
import { SessionState, RoundState, GameAction } from './types';

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
};

/**
 * Game State Machine
 *
 * Hierarchical state machine with:
 * - Session states (IDLE, PLAYING, PAUSED, COMPLETED)
 * - Round states (substates of PLAYING)
 *
 * Key Benefit: When session transitions to PAUSED, round state is preserved.
 * On RESUME, you return to the exact same round state.
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
    /**
     * IDLE: Initial state before game starts
     */
    [SessionState.IDLE]: {
      on: {
        [GameAction.START_GAME]: {
          target: SessionState.PLAYING,
          actions: assign({
            // Reset all context when starting a new game
            currentNote: null,
            userGuess: null,
            correctCount: 0,
            totalAttempts: 0,
            currentStreak: 0,
            elapsedTime: 0,
            sessionDuration: 0,
            attemptHistory: [],
            feedbackMessage: '',
            // longestStreak is preserved across games
          }),
        },
      },
    },

    /**
     * PLAYING: Active game session
     * Contains round substates that handle individual note cycles
     */
    [SessionState.PLAYING]: {
      initial: RoundState.PLAYING_NOTE,
      on: {
        [GameAction.PAUSE]: {
          target: SessionState.PAUSED,
          // Note: Round state is preserved when pausing
        },
        [GameAction.COMPLETE]: {
          target: SessionState.COMPLETED,
        },
      },
      states: {
        /**
         * PLAYING_NOTE: Audio is playing the current note
         */
        [RoundState.PLAYING_NOTE]: {
          on: {
            [GameAction.NOTE_PLAYED]: {
              target: RoundState.WAITING_INPUT,
              actions: assign({
                feedbackMessage: '',
              }),
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
            [GameAction.TIMEOUT]: {
              target: RoundState.TIMEOUT_INTERMISSION,
              actions: assign({
                totalAttempts: ({ context }) => context.totalAttempts + 1,
                currentStreak: 0,
                feedbackMessage: 'Time\'s up!',
              }),
            },
            [GameAction.REPLAY_NOTE]: {
              target: RoundState.PLAYING_NOTE,
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
              target: RoundState.TIMEOUT_INTERMISSION,
              actions: assign({
                totalAttempts: ({ context }) => context.totalAttempts + 1,
                currentStreak: 0,
                feedbackMessage: 'Incorrect!',
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
              target: RoundState.PLAYING_NOTE,
              actions: assign({
                currentNote: null,
                userGuess: null,
                feedbackMessage: '',
              }),
            },
          },
        },

        /**
         * History state to preserve round state when resuming from pause
         */
        hist: {
          type: 'history',
          history: 'deep',
        },
      },
    },

    /**
     * PAUSED: Game paused by user
     * Round state is preserved
     */
    [SessionState.PAUSED]: {
      on: {
        [GameAction.RESUME]: {
          target: `${SessionState.PLAYING}.hist`,
          // Note: Returns to the exact same round state where it was paused
        },
        [GameAction.RESET]: {
          target: SessionState.IDLE,
        },
      },
    },

    /**
     * COMPLETED: Game finished
     */
    [SessionState.COMPLETED]: {
      on: {
        [GameAction.RESET]: {
          target: SessionState.IDLE,
        },
        [GameAction.PLAY_AGAIN]: {
          target: SessionState.PLAYING,
          actions: assign({
            // Reset all context for a fresh game
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
          }),
        },
      },
    },
  },
});
