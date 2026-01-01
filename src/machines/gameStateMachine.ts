import { createMachine, assign, sendTo } from 'xstate';
import type { GameMachineContext, GameEvent, GameMachineInput } from './types';
import { SessionState, RoundState, GameAction } from './types';
import { timerService, roundTimerService } from './services/timerService';

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
  roundTimeRemaining: 0,
  attemptHistory: [],
  feedbackMessage: '',
  timerConfig: {
    initialTime: 0,
    direction: 'up',
  },
  roundTimerConfig: {
    initialTime: 3,
    direction: 'down',
  },
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
  context: ({ input }) => {
    const timerConfig = input?.timerConfig ?? initialContext.timerConfig;
    const roundTimerConfig = input?.roundTimerConfig ?? initialContext.roundTimerConfig;
    return {
      ...initialContext,
      timerConfig,
      roundTimerConfig,
      // Initialize roundTimeRemaining from roundTimerConfig
      roundTimeRemaining: roundTimerConfig.initialTime,
      // Initialize elapsedTime - for countdown timers, start at initialTime
      elapsedTime: timerConfig.direction === 'down' ? timerConfig.initialTime : 0,
    };
  },
  types: {} as {
    context: GameMachineContext;
    events: GameEvent;
    input: GameMachineInput;
  },
  invoke: [
    {
      id: 'gameTimer',
      src: timerService,
      input: ({ context }) => ({
        initialTime: context.timerConfig.initialTime,
        direction: context.timerConfig.direction,
        interval: 100,
      }),
    },
    {
      id: 'roundTimer',
      src: roundTimerService,
      input: ({ context }) => ({
        initialTime: context.roundTimerConfig.initialTime,
        direction: context.roundTimerConfig.direction,
        interval: 100,
      }),
    },
  ],
  on: {
    TIMER_UPDATE: {
      actions: assign({
        elapsedTime: ({ event }) => event.elapsed,
      }),
    },
    ROUND_TIMER_UPDATE: {
      actions: assign({
        roundTimeRemaining: ({ event }) => event.elapsed,
      }),
    },
    // Handle session timeout from gameTimer (for Sandbox mode countdown)
    TIMEOUT: {
      target: `.${SessionState.COMPLETED}`,
      actions: () => {
        console.log('[gameStateMachine] TIMEOUT event received - transitioning to COMPLETED');
      },
    },
  },
  states: {
    /**
     * IDLE: Initial state before game starts
     */
    [SessionState.IDLE]: {
      on: {
        [GameAction.START_GAME]: {
          target: SessionState.PLAYING,
          actions: [
            sendTo('gameTimer', { type: 'RESET' }),
            sendTo('roundTimer', { type: 'RESET' }),
            assign({
              // Reset all context when starting a new game
              currentNote: null,
              userGuess: null,
              correctCount: 0,
              totalAttempts: 0,
              currentStreak: 0,
              // Reset elapsedTime to initial timer config value
              elapsedTime: ({ context }) => context.timerConfig.direction === 'down' ? context.timerConfig.initialTime : 0,
              sessionDuration: 0,
              // Reset roundTimeRemaining to initial round timer config value
              roundTimeRemaining: ({ context }) => context.roundTimerConfig.initialTime,
              attemptHistory: [],
              feedbackMessage: '',
              // longestStreak is preserved across games
            }),
          ],
        },
      },
    },

    /**
     * PLAYING: Active game session
     * Contains round substates that handle individual note cycles
     */
    [SessionState.PLAYING]: {
      entry: sendTo('gameTimer', { type: 'RESUME' }),
      exit: [
        sendTo('gameTimer', { type: 'PAUSE' }),
        sendTo('roundTimer', { type: 'PAUSE' }),
      ],
      initial: RoundState.WAITING_INPUT,
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
         * WAITING_INPUT: Waiting for user's key guess
         * Note plays as a side effect when entering this state
         */
        [RoundState.WAITING_INPUT]: {
          entry: sendTo('roundTimer', { type: 'RESUME' }),
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
                userGuess: null, // Clear user guess on timeout
              }),
            },
            // Handle round timer timeout (from roundTimer service)
            ROUND_TIMEOUT: {
              target: RoundState.TIMEOUT_INTERMISSION,
              actions: assign({
                totalAttempts: ({ context }) => context.totalAttempts + 1,
                currentStreak: 0,
                feedbackMessage: 'Time\'s up!',
                userGuess: null, // Clear user guess on timeout
              }),
            },
            // Handle manual round advancement (for chord training modes)
            [GameAction.ADVANCE_ROUND]: {
              target: RoundState.WAITING_INPUT,
              reenter: true, // Force entry actions to fire on self-transition
              actions: [
                sendTo('roundTimer', { type: 'RESET' }),
                assign({
                  currentNote: null,
                  userGuess: null,
                  feedbackMessage: '',
                }),
              ],
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
              target: RoundState.WAITING_INPUT,
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
          entry: sendTo('roundTimer', { type: 'PAUSE' }),
          on: {
            [GameAction.ADVANCE_ROUND]: {
              target: RoundState.WAITING_INPUT,
              actions: [
                sendTo('roundTimer', { type: 'RESET' }),
                assign({
                  currentNote: null,
                  userGuess: null,
                  feedbackMessage: '',
                }),
              ],
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
      entry: sendTo('gameTimer', { type: 'STOP' }),
      on: {
        [GameAction.RESET]: {
          target: SessionState.IDLE,
        },
        [GameAction.PLAY_AGAIN]: {
          target: SessionState.PLAYING,
          actions: [
            sendTo('gameTimer', { type: 'RESET' }),
            sendTo('roundTimer', { type: 'RESET' }),
            assign({
              // Reset all context for a fresh game
              currentNote: null,
              userGuess: null,
              correctCount: 0,
              totalAttempts: 0,
              currentStreak: 0,
              longestStreak: 0,
              // Reset elapsedTime to initial timer config value
              elapsedTime: ({ context }) => context.timerConfig.direction === 'down' ? context.timerConfig.initialTime : 0,
              sessionDuration: 0,
              // Reset roundTimeRemaining to initial round timer config value
              roundTimeRemaining: ({ context }) => context.roundTimerConfig.initialTime,
              attemptHistory: [],
              feedbackMessage: '',
            }),
          ],
        },
      },
    },
  },
});
