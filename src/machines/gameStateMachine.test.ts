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

    it.each([
      { field: 'correctCount', expected: 0 },
      { field: 'totalAttempts', expected: 0 },
      { field: 'currentStreak', expected: 0 },
      { field: 'longestStreak', expected: 0 },
      { field: 'currentNote', expected: null },
      { field: 'userGuess', expected: null },
    ])('should initialize $field to $expected', ({ field, expected }) => {
      const context = actor.getSnapshot().context;
      expect(context[field as keyof typeof context]).toBe(expected);
    });
  });

  describe('Session State Transitions', () => {
    it.each`
      description                                    | setup                                                          | event                        | expectedState
      ${'IDLE to PLAYING on START_GAME'}            | ${[]}                                                          | ${GameAction.START_GAME}     | ${'playing.playing_note'}
      ${'PLAYING to PAUSED on PAUSE'}               | ${[GameAction.START_GAME]}                                     | ${GameAction.PAUSE}          | ${'paused'}
      ${'PAUSED to PLAYING on RESUME'}              | ${[GameAction.START_GAME, GameAction.PAUSE]}                   | ${GameAction.RESUME}         | ${'playing'}
      ${'PLAYING to COMPLETED on COMPLETE'}         | ${[GameAction.START_GAME]}                                     | ${GameAction.COMPLETE}       | ${'completed'}
      ${'COMPLETED to IDLE on RESET'}               | ${[GameAction.START_GAME, GameAction.COMPLETE]}                | ${GameAction.RESET}          | ${'idle'}
      ${'COMPLETED to PLAYING on PLAY_AGAIN'}       | ${[GameAction.START_GAME, GameAction.COMPLETE]}                | ${GameAction.PLAY_AGAIN}     | ${'playing.playing_note'}
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
      ${'PLAYING_NOTE to WAITING_INPUT on NOTE_PLAYED'}           | ${[]}                                                                                      | ${GameAction.NOTE_PLAYED}    | ${'playing.waiting_input'}
      ${'WAITING_INPUT to PROCESSING_GUESS on MAKE_GUESS'}        | ${[GameAction.NOTE_PLAYED]}                                                                | ${{ type: GameAction.MAKE_GUESS, guessedNote: 'C' }}  | ${'playing.processing_guess'}
      ${'PROCESSING_GUESS to TIMEOUT_INTERMISSION on CORRECT'}    | ${[GameAction.NOTE_PLAYED, { type: GameAction.MAKE_GUESS, guessedNote: 'C' }]}            | ${GameAction.CORRECT_GUESS}  | ${'playing.timeout_intermission'}
      ${'PROCESSING_GUESS to TIMEOUT_INTERMISSION on INCORRECT'}  | ${[GameAction.NOTE_PLAYED, { type: GameAction.MAKE_GUESS, guessedNote: 'C' }]}            | ${GameAction.INCORRECT_GUESS} | ${'playing.timeout_intermission'}
      ${'WAITING_INPUT to TIMEOUT_INTERMISSION on TIMEOUT'}       | ${[GameAction.NOTE_PLAYED]}                                                                | ${GameAction.TIMEOUT}        | ${'playing.timeout_intermission'}
      ${'TIMEOUT_INTERMISSION to PLAYING_NOTE on ADVANCE_ROUND'}  | ${[GameAction.NOTE_PLAYED, GameAction.TIMEOUT]}                                            | ${GameAction.ADVANCE_ROUND}  | ${'playing.playing_note'}
      ${'WAITING_INPUT to PLAYING_NOTE on REPLAY_NOTE'}           | ${[GameAction.NOTE_PLAYED]}                                                                | ${GameAction.REPLAY_NOTE}    | ${'playing.playing_note'}
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
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      expect(actor.getSnapshot().context.userGuess).toBe('C');
    });

    it.each`
      event                         | correctCount | totalAttempts | currentStreak | feedbackMessage
      ${GameAction.CORRECT_GUESS}   | ${1}         | ${1}          | ${1}          | ${'Correct!'}
      ${GameAction.INCORRECT_GUESS} | ${0}         | ${1}          | ${0}          | ${'Incorrect!'}
    `('should update context on $event', ({ event, correctCount, totalAttempts, currentStreak, feedbackMessage }) => {
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: event });

      const context = actor.getSnapshot().context;
      expect(context.correctCount).toBe(correctCount);
      expect(context.totalAttempts).toBe(totalAttempts);
      expect(context.currentStreak).toBe(currentStreak);
      expect(context.feedbackMessage).toBe(feedbackMessage);
    });

    it('should increment longestStreak on CORRECT_GUESS', () => {
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const context = actor.getSnapshot().context;
      expect(context.longestStreak).toBe(1);
    });

    it('should reset current streak on TIMEOUT', () => {
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.TIMEOUT });

      const context = actor.getSnapshot().context;
      expect(context.currentStreak).toBe(0);
      expect(context.totalAttempts).toBe(1);
      expect(context.feedbackMessage).toBe("Time's up!");
    });

    it('should update longestStreak when current streak exceeds it', () => {
      // First correct answer
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      expect(actor.getSnapshot().context.longestStreak).toBe(1);

      // Second correct answer
      actor.send({ type: GameAction.ADVANCE_ROUND });
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'D' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const context = actor.getSnapshot().context;
      expect(context.currentStreak).toBe(2);
      expect(context.longestStreak).toBe(2);
    });

    it.each`
      field                  | expectedValue
      ${'feedbackMessage'}   | ${''}
      ${'currentNote'}       | ${null}
      ${'userGuess'}         | ${null}
    `('should clear $field on ADVANCE_ROUND', ({ field, expectedValue }) => {
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      actor.send({ type: GameAction.ADVANCE_ROUND });

      const context = actor.getSnapshot().context;
      expect(context[field as keyof typeof context]).toBe(expectedValue);
    });

    it('should reset context on START_GAME but preserve longestStreak across sessions', () => {
      // Build up a streak
      actor.send({ type: GameAction.NOTE_PLAYED });
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
      actor.send({ type: GameAction.NOTE_PLAYED });

      // Now in WAITING_INPUT
      expect(actor.getSnapshot().matches('playing.waiting_input')).toBe(true);

      actor.send({ type: GameAction.PAUSE });
      expect(actor.getSnapshot().matches('paused')).toBe(true);

      actor.send({ type: GameAction.RESUME });

      // Should return to WAITING_INPUT (history state)
      expect(actor.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it.each`
      field
      ${'correctCount'}
      ${'totalAttempts'}
      ${'currentStreak'}
    `('should preserve $field when pausing and resuming', ({ field }) => {
      actor.send({ type: GameAction.START_GAME });
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      const contextBeforePause = actor.getSnapshot().context;

      actor.send({ type: GameAction.PAUSE });
      actor.send({ type: GameAction.RESUME });

      const contextAfterResume = actor.getSnapshot().context;
      expect(contextAfterResume[field as keyof typeof contextAfterResume]).toBe(
        contextBeforePause[field as keyof typeof contextBeforePause]
      );
    });
  });

  describe('Play Again vs Reset', () => {
    it.each`
      field              | expectedValue
      ${'correctCount'}  | ${0}
      ${'totalAttempts'} | ${0}
      ${'currentStreak'} | ${0}
    `('should reset $field to $expectedValue on PLAY_AGAIN', ({ field, expectedValue }) => {
      actor.send({ type: GameAction.START_GAME });
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      actor.send({ type: GameAction.COMPLETE });

      actor.send({ type: GameAction.PLAY_AGAIN });

      const context = actor.getSnapshot().context;
      expect(context[field as keyof typeof context]).toBe(expectedValue);
    });

    it('should preserve longestStreak on PLAY_AGAIN', () => {
      actor.send({ type: GameAction.START_GAME });
      actor.send({ type: GameAction.NOTE_PLAYED });
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      actor.send({ type: GameAction.COMPLETE });

      const longestBeforePlayAgain = actor.getSnapshot().context.longestStreak;

      actor.send({ type: GameAction.PLAY_AGAIN });

      const context = actor.getSnapshot().context;
      expect(context.longestStreak).toBe(longestBeforePlayAgain);
      expect(actor.getSnapshot().matches('playing.playing_note')).toBe(true);
    });
  });
});
