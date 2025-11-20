import { createActor, type Actor } from 'xstate';
import { gameStateMachine } from '../machines/gameStateMachine';
import type { GameMachineContext, GameEvent } from '../machines/types';
import { SessionState, RoundState, GameAction } from '../machines/types';
import { audioEngine } from '../utils/audioEngine';
import type { NoteWithOctave, NoteDuration } from '../types/music';

/**
 * GameOrchestrator
 *
 * Coordinates game flow by bridging the UI component, state machine, and game logic.
 *
 * Responsibilities:
 * - Manages XState actor lifecycle
 * - Subscribes to state machine events
 * - Dispatches actions to state machine
 * - Coordinates audio playback
 * - Manages ALL timing logic (eliminates setTimeout race conditions)
 * - Updates game state classes (Rush/Survival/Sandbox)
 *
 * Architecture:
 * Component (UI) → Orchestrator (Logic) → State Machine (State)
 *                       ↓
 *               Game State Classes
 *                       ↓
 *               Audio Engine
 */
export class GameOrchestrator {
  private actor: Actor<typeof gameStateMachine>;
  private subscriptions: Array<() => void> = [];
  private currentNote: NoteWithOctave | null = null;
  private noteDuration: NoteDuration = '2n';

  // Timer management - eliminates setTimeout race conditions
  private activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private timerCallbacks: Map<string, () => void> = new Map();

  constructor() {
    // Create the state machine actor
    this.actor = createActor(gameStateMachine);
  }

  /**
   * Start the state machine actor
   * Must be called before any state transitions
   */
  start(): void {
    this.actor.start();
  }

  /**
   * Stop the state machine actor and clean up subscriptions
   */
  stop(): void {
    // Clean up all timers first
    this.clearAllTimers();

    // Clean up all subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Stop the actor
    this.actor.stop();
  }

  // ========================================
  // Timer Management
  // ========================================

  /**
   * Schedule a timer with automatic cleanup
   * Replaces direct setTimeout usage to prevent race conditions
   */
  private scheduleTimer(key: string, callback: () => void, delay: number): void {
    // Clear any existing timer with this key
    this.clearTimer(key);

    // Store the callback
    this.timerCallbacks.set(key, callback);

    // Schedule the timer
    const timerId = setTimeout(() => {
      // Execute callback
      callback();

      // Clean up
      this.activeTimers.delete(key);
      this.timerCallbacks.delete(key);
    }, delay);

    // Track the timer
    this.activeTimers.set(key, timerId);
  }

  /**
   * Clear a specific timer
   */
  private clearTimer(key: string): void {
    const timerId = this.activeTimers.get(key);
    if (timerId) {
      clearTimeout(timerId);
      this.activeTimers.delete(key);
      this.timerCallbacks.delete(key);
    }
  }

  /**
   * Clear all active timers
   * Called on state transitions to prevent race conditions
   */
  clearAllTimers(): void {
    this.activeTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.activeTimers.clear();
    this.timerCallbacks.clear();
  }

  /**
   * Subscribe to state machine changes
   * Returns unsubscribe function
   */
  subscribe(callback: (snapshot: ReturnType<typeof this.actor.getSnapshot>) => void): () => void {
    const subscription = this.actor.subscribe((snapshot) => {
      callback(snapshot);
    });

    // Store unsubscribe function
    this.subscriptions.push(subscription.unsubscribe);

    return subscription.unsubscribe;
  }

  /**
   * Get current state machine snapshot
   */
  getSnapshot() {
    return this.actor.getSnapshot();
  }

  /**
   * Send an event to the state machine
   */
  send(event: GameEvent): void {
    this.actor.send(event);
  }

  // ========================================
  // State Queries
  // ========================================

  /**
   * Check if game is in IDLE session state
   */
  isIdle(): boolean {
    return this.actor.getSnapshot().matches(SessionState.IDLE);
  }

  /**
   * Check if game is in PLAYING session state
   */
  isPlaying(): boolean {
    return this.actor.getSnapshot().matches(SessionState.PLAYING);
  }

  /**
   * Check if game is in PAUSED session state
   */
  isPaused(): boolean {
    return this.actor.getSnapshot().matches(SessionState.PAUSED);
  }

  /**
   * Check if game is in COMPLETED session state
   */
  isCompleted(): boolean {
    return this.actor.getSnapshot().matches(SessionState.COMPLETED);
  }

  /**
   * Check if currently playing a note (PLAYING_NOTE round state)
   */
  isPlayingNote(): boolean {
    return this.actor.getSnapshot().matches({
      [SessionState.PLAYING]: RoundState.PLAYING_NOTE
    });
  }

  /**
   * Check if waiting for user input (WAITING_INPUT round state)
   */
  isWaitingInput(): boolean {
    return this.actor.getSnapshot().matches({
      [SessionState.PLAYING]: RoundState.WAITING_INPUT
    });
  }

  /**
   * Check if processing a guess (PROCESSING_GUESS round state)
   */
  isProcessingGuess(): boolean {
    return this.actor.getSnapshot().matches({
      [SessionState.PLAYING]: RoundState.PROCESSING_GUESS
    });
  }

  /**
   * Check if in intermission between rounds (TIMEOUT_INTERMISSION round state)
   */
  isInIntermission(): boolean {
    return this.actor.getSnapshot().matches({
      [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION
    });
  }

  // ========================================
  // Context Accessors
  // ========================================

  /**
   * Get the current context from state machine
   */
  getContext(): GameMachineContext {
    return this.actor.getSnapshot().context;
  }

  /**
   * Get current note from context
   */
  getCurrentNote() {
    return this.getContext().currentNote;
  }

  /**
   * Get user's guess from context
   */
  getUserGuess() {
    return this.getContext().userGuess;
  }

  /**
   * Get statistics from context
   */
  getStats() {
    const context = this.getContext();
    return {
      correctCount: context.correctCount,
      totalAttempts: context.totalAttempts,
      currentStreak: context.currentStreak,
      longestStreak: context.longestStreak,
      elapsedTime: context.elapsedTime,
      sessionDuration: context.sessionDuration,
    };
  }

  /**
   * Get feedback message from context
   */
  getFeedbackMessage(): string {
    return this.getContext().feedbackMessage;
  }

  // ========================================
  // Action Dispatchers
  // ========================================

  /**
   * Start a new game
   */
  startGame(): void {
    // Clear all timers when starting new game
    this.clearAllTimers();
    this.send({ type: GameAction.START_GAME });
  }

  /**
   * Pause the game
   */
  pause(): void {
    // Clear timers on pause to prevent them from firing while paused
    this.clearAllTimers();
    this.send({ type: GameAction.PAUSE });
  }

  /**
   * Resume the game
   */
  resume(): void {
    this.send({ type: GameAction.RESUME });
  }

  /**
   * Complete the game
   */
  complete(): void {
    // Clear all timers when completing game
    this.clearAllTimers();
    this.send({ type: GameAction.COMPLETE });
  }

  /**
   * Reset the game to IDLE
   */
  reset(): void {
    // Clear all timers when resetting
    this.clearAllTimers();
    this.send({ type: GameAction.RESET });
  }

  /**
   * Play again (from COMPLETED to PLAYING)
   */
  playAgain(): void {
    // Clear all timers before playing again
    this.clearAllTimers();
    this.send({ type: GameAction.PLAY_AGAIN });
  }

  // ========================================
  // Audio Playback
  // ========================================

  /**
   * Set the note duration for audio playback
   */
  setNoteDuration(duration: NoteDuration): void {
    this.noteDuration = duration;
  }

  /**
   * Play the current note
   * Handles PLAYING_NOTE → WAITING_INPUT transition
   */
  async playCurrentNote(note: NoteWithOctave): Promise<void> {
    this.currentNote = note;

    // Initialize audio engine if needed
    await audioEngine.initialize();

    // Transition to PLAYING_NOTE state
    // (This would be triggered by the component/game logic before calling this method)

    // Play the note
    audioEngine.playNote(note, this.noteDuration);

    // After note finishes playing, dispatch NOTE_PLAYED to transition to WAITING_INPUT
    // Use orchestrator's timer management instead of direct setTimeout
    this.scheduleTimer('audio-completion', () => {
      this.send({ type: GameAction.NOTE_PLAYED });
    }, 500); // 500ms matches the component's current behavior
  }

  /**
   * Replay the current note
   * Listens for REPLAY_NOTE action from state machine
   */
  async replayNote(): Promise<void> {
    if (!this.currentNote) {
      console.warn('No current note to replay');
      return;
    }

    // Initialize audio engine if needed
    await audioEngine.initialize();

    // Send REPLAY_NOTE action to state machine
    this.send({ type: GameAction.REPLAY_NOTE });

    // Play the note again
    audioEngine.playNote(this.currentNote, this.noteDuration);
  }

  /**
   * Get the current note being played
   */
  getCurrentNoteWithOctave(): NoteWithOctave | null {
    return this.currentNote;
  }

  // ========================================
  // Public Timer API for Components
  // ========================================

  /**
   * Schedule auto-advance after timeout intermission
   * Replaces setTimeout in handleTimeUp
   */
  scheduleAdvanceAfterTimeout(callback: () => void, delay: number): void {
    this.scheduleTimer('advance-after-timeout', callback, delay);
  }

  /**
   * Schedule auto-advance after correct guess
   * Replaces setTimeout in handleNoteGuess
   */
  scheduleAdvanceAfterCorrectGuess(callback: () => void, delay: number): void {
    this.scheduleTimer('advance-after-correct', callback, delay);
  }

  /**
   * Schedule feedback display update
   * Replaces setTimeout in startNewRound
   */
  scheduleFeedbackUpdate(callback: () => void, delay: number): void {
    this.scheduleTimer('feedback-update', callback, delay);
  }

  /**
   * Schedule delayed audio resumption after replay
   * Replaces setTimeout in playCurrentNote
   */
  scheduleAudioResume(callback: () => void, delay: number): void {
    this.scheduleTimer('audio-resume', callback, delay);
  }

  /**
   * Schedule play again delay
   * Replaces setTimeout in handlePlayAgain
   */
  schedulePlayAgainDelay(callback: () => void, delay: number): void {
    this.scheduleTimer('play-again-delay', callback, delay);
  }

}
