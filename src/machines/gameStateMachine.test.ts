import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { gameStateMachine } from './gameStateMachine';
import { GameAction } from './types';
import type { Actor } from 'xstate';

describe('Game State Machine', () => {
  let actor: Actor<typeof gameStateMachine>;

  beforeEach(() => {
    actor = createActor(gameStateMachine);
    actor.start();
  });

  describe('Initial State', () => {
    it('should start in IDLE state', () => {
      expect(actor.getSnapshot().matches('idle')).toBe(true);
    });

    it('should initialize with default context', () => {
      const context = actor.getSnapshot().context;
      expect(context.correctCount).toBe(0);
      expect(context.totalAttempts).toBe(0);
      expect(context.currentStreak).toBe(0);
      expect(context.longestStreak).toBe(0);
      expect(context.currentNote).toBeNull();
      expect(context.userGuess).toBeNull();
      expect(context.feedbackMessage).toBe('');
      expect(context.attemptHistory).toEqual([]);
    });
  });

  describe('Session State Transitions', () => {
    it.each`
      description                                    | setup                                                          | event                        | expectedState
      ${'IDLE to PLAYING on START_GAME'}            | ${[]}                                                          | ${GameAction.START_GAME}     | ${'playing.waiting_input'}
      ${'PLAYING to PAUSED on PAUSE'}               | ${[GameAction.START_GAME]}                                     | ${GameAction.PAUSE}          | ${'paused'}
      ${'PAUSED to PLAYING on RESUME'}              | ${[GameAction.START_GAME, GameAction.PAUSE]}                   | ${GameAction.RESUME}         | ${'playing'}
      ${'PLAYING to COMPLETED on COMPLETE'}         | ${[GameAction.START_GAME]}                                     | ${GameAction.COMPLETE}       | ${'completed'}
      ${'COMPLETED to IDLE on RESET'}               | ${[GameAction.START_GAME, GameAction.COMPLETE]}                | ${GameAction.RESET}          | ${'idle'}
      ${'COMPLETED to PLAYING on PLAY_AGAIN'}       | ${[GameAction.START_GAME, GameAction.COMPLETE]}                | ${GameAction.PLAY_AGAIN}     | ${'playing.waiting_input'}
    `('should transition from $description', ({ setup, event, expectedState }: { setup: any[]; event: any; expectedState: string }) => {
      // Setup: send all setup events
      setup.forEach((e: any) => actor.send({ type: e }));

      // Action: send the event being tested
      actor.send({ type: event });

      // Assert: check the expected state
      expect(actor.getSnapshot().matches(expectedState)).toBe(true);
    });
  });

  describe('Round State Transitions', () => {
    beforeEach(() => {
      actor.send({ type: GameAction.START_GAME });
    });

    it.each`
      description                                                  | setup                                                                                      | event                        | expectedState
      ${'WAITING_INPUT to PROCESSING_GUESS on MAKE_GUESS'}        | ${[]}                                                                                      | ${{ type: GameAction.MAKE_GUESS, guessedNote: 'C' }}  | ${'playing.processing_guess'}
      ${'PROCESSING_GUESS to TIMEOUT_INTERMISSION on CORRECT'}    | ${[{ type: GameAction.MAKE_GUESS, guessedNote: 'C' }]}                                    | ${GameAction.CORRECT_GUESS}  | ${'playing.timeout_intermission'}
      ${'PROCESSING_GUESS to WAITING_INPUT on INCORRECT'}         | ${[{ type: GameAction.MAKE_GUESS, guessedNote: 'C' }]}                                    | ${GameAction.INCORRECT_GUESS} | ${'playing.waiting_input'}
      ${'WAITING_INPUT to TIMEOUT_INTERMISSION on TIMEOUT'}       | ${[]}                                                                                      | ${GameAction.TIMEOUT}        | ${'playing.timeout_intermission'}
      ${'TIMEOUT_INTERMISSION to WAITING_INPUT on ADVANCE_ROUND'} | ${[GameAction.TIMEOUT]}                                                                    | ${GameAction.ADVANCE_ROUND}  | ${'playing.waiting_input'}
    `('should transition: $description', ({ setup, event, expectedState }: { setup: any[]; event: any; expectedState: string }) => {
      // Setup: send all setup events
      setup.forEach((e: any) => {
        if (typeof e === 'string') {
          actor.send({ type: e } as any);
        } else {
          actor.send(e as any);
        }
      });

      // Action: send the event being tested
      if (typeof event === 'string') {
        actor.send({ type: event } as any);
      } else {
        actor.send(event as any);
      }

      // Assert: check the expected state
      expect(actor.getSnapshot().matches(expectedState)).toBe(true);
    });
  });

  describe('Context Updates', () => {
    beforeEach(() => {
      actor.send({ type: GameAction.START_GAME });
    });

    it('should store user guess in context on MAKE_GUESS', () => {
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      expect(actor.getSnapshot().context.userGuess).toBe('C');
    });

    it('should increment stats on CORRECT_GUESS', () => {
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });

      // Assert before
      expect(actor.getSnapshot().context.correctCount).toBe(0);
      expect(actor.getSnapshot().context.totalAttempts).toBe(0);
      expect(actor.getSnapshot().context.currentStreak).toBe(0);

      actor.send({ type: GameAction.CORRECT_GUESS });

      // Assert after
      const context = actor.getSnapshot().context;
      expect(context.correctCount).toBe(1);
      expect(context.totalAttempts).toBe(1);
      expect(context.currentStreak).toBe(1);
      expect(context.longestStreak).toBe(1);
      expect(context.feedbackMessage).toBe('Correct!');
    });

    it('should increment total attempts but not correct count on INCORRECT_GUESS', () => {
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });

      // Assert before
      expect(actor.getSnapshot().context.correctCount).toBe(0);
      expect(actor.getSnapshot().context.totalAttempts).toBe(0);

      actor.send({ type: GameAction.INCORRECT_GUESS });

      // Assert after
      const context = actor.getSnapshot().context;
      expect(context.correctCount).toBe(0);
      expect(context.totalAttempts).toBe(1);
      expect(context.currentStreak).toBe(0);
      expect(context.feedbackMessage).toBe('Incorrect! Try again or click Next Note');
    });

    it('should increment longestStreak on CORRECT_GUESS', () => {
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const context = actor.getSnapshot().context;
      expect(context.longestStreak).toBe(1);
    });

    it('should reset current streak on TIMEOUT', () => {
      actor.send({ type: GameAction.TIMEOUT });

      const context = actor.getSnapshot().context;
      expect(context.currentStreak).toBe(0);
      expect(context.totalAttempts).toBe(1);
      expect(context.feedbackMessage).toBe("Time's up!");
    });

    it('should update longestStreak when current streak exceeds it', () => {
      // First correct answer
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      expect(actor.getSnapshot().context.longestStreak).toBe(1);

      // Second correct answer
      actor.send({ type: GameAction.ADVANCE_ROUND });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'D' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const context = actor.getSnapshot().context;
      expect(context.currentStreak).toBe(2);
      expect(context.longestStreak).toBe(2);
    });

    it('should clear round data on ADVANCE_ROUND', () => {
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      // Assert before - these should have values
      expect(actor.getSnapshot().context.feedbackMessage).toBe('Correct!');
      expect(actor.getSnapshot().context.userGuess).toBe('C');

      actor.send({ type: GameAction.ADVANCE_ROUND });

      // Assert after - round data cleared
      const context = actor.getSnapshot().context;
      expect(context.feedbackMessage).toBe('');
      expect(context.currentNote).toBeNull();
      expect(context.userGuess).toBeNull();
    });

    it('should reset context on START_GAME but preserve longestStreak across sessions', () => {
      // Build up a streak
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const initialLongestStreak = actor.getSnapshot().context.longestStreak;

      // Reset and start new game
      actor.send({ type: GameAction.COMPLETE });
      actor.send({ type: GameAction.RESET });
      actor.send({ type: GameAction.START_GAME });

      const context = actor.getSnapshot().context;
      expect(context.correctCount).toBe(0);
      expect(context.totalAttempts).toBe(0);
      expect(context.currentStreak).toBe(0);
      expect(context.longestStreak).toBe(initialLongestStreak); // Preserved
    });
  });

  describe('Pause/Resume Behavior', () => {
    it('should preserve round state when pausing and resuming', () => {
      actor.send({ type: GameAction.START_GAME });

      // Already in WAITING_INPUT after START_GAME
      expect(actor.getSnapshot().matches('playing.waiting_input')).toBe(true);

      actor.send({ type: GameAction.PAUSE });
      expect(actor.getSnapshot().matches('paused')).toBe(true);

      actor.send({ type: GameAction.RESUME });

      // Should return to WAITING_INPUT (history state)
      expect(actor.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('should preserve context when pausing and resuming', () => {
      actor.send({ type: GameAction.START_GAME });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const contextBeforePause = actor.getSnapshot().context;

      actor.send({ type: GameAction.PAUSE });
      actor.send({ type: GameAction.RESUME });

      const contextAfterResume = actor.getSnapshot().context;
      expect(contextAfterResume.correctCount).toBe(contextBeforePause.correctCount);
      expect(contextAfterResume.totalAttempts).toBe(contextBeforePause.totalAttempts);
      expect(contextAfterResume.currentStreak).toBe(contextBeforePause.currentStreak);
    });
  });

  describe('Play Again vs Reset', () => {
    it('should reset all stats on PLAY_AGAIN', () => {
      actor.send({ type: GameAction.START_GAME });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      actor.send({ type: GameAction.COMPLETE });

      // Assert before - should have stats
      expect(actor.getSnapshot().context.correctCount).toBe(1);
      expect(actor.getSnapshot().context.totalAttempts).toBe(1);
      expect(actor.getSnapshot().context.currentStreak).toBe(1);
      expect(actor.getSnapshot().context.longestStreak).toBe(1);

      actor.send({ type: GameAction.PLAY_AGAIN });

      // Assert after - all stats reset for fresh game
      const context = actor.getSnapshot().context;
      expect(context.correctCount).toBe(0);
      expect(context.totalAttempts).toBe(0);
      expect(context.currentStreak).toBe(0);
      expect(context.longestStreak).toBe(0);
      expect(actor.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });
  });

  describe('Timer Behavior', () => {
    it('should transition to COMPLETED when TIMEOUT event is received', () => {
      // GIVEN: Game is in PLAYING state
      actor.send({ type: GameAction.START_GAME });
      expect(actor.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: TIMEOUT event is received (from gameTimer service)
      actor.send({ type: 'TIMEOUT' });

      // THEN: State machine transitions to COMPLETED
      expect(actor.getSnapshot().matches('completed')).toBe(true);
    });

    it('should transition to COMPLETED from any round state on TIMEOUT', () => {
      // GIVEN: Game is in PROCESSING_GUESS state
      actor.send({ type: GameAction.START_GAME });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      expect(actor.getSnapshot().matches('playing.processing_guess')).toBe(true);

      // WHEN: TIMEOUT event is received
      actor.send({ type: 'TIMEOUT' });

      // THEN: State machine transitions to COMPLETED
      expect(actor.getSnapshot().matches('completed')).toBe(true);
    });

    it('should use countdown timer configuration for Sandbox mode', () => {
      // GIVEN: Actor created with countdown timer config
      const sandboxActor = createActor(gameStateMachine, {
        input: {
          timerConfig: {
            initialTime: 5,
            direction: 'down'
          },
          roundTimerConfig: {
            initialTime: 3,
            direction: 'down'
          }
        }
      });
      sandboxActor.start();

      // THEN: Timer config is stored in context
      const context = sandboxActor.getSnapshot().context;
      expect(context.timerConfig.initialTime).toBe(5);
      expect(context.timerConfig.direction).toBe('down');

      sandboxActor.stop();
    });
  });
});
