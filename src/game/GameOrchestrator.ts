import { createActor, type Actor } from 'xstate';
import { gameStateMachine } from '../machines/gameStateMachine';
import type { GameMachineContext, GameEvent } from '../machines/types';
import { SessionState, RoundState, GameAction } from '../machines/types';
import { audioEngine } from '../utils/audioEngine';
import type { NoteWithOctave, NoteDuration } from '../types/music';
import { EventEmitter, type Unsubscribe } from '../utils/EventEmitter';
import type { OrchestratorEvents } from './OrchestratorEvents';
import type { IGameMode } from './IGameMode';
import type { NoteFilter } from '../types/filters';
import type { GuessAttempt } from '../types/game';
import { LOGS_STATE_ENABLED, LOGS_EVENTS_ENABLED, LOGS_TIMERS_ENABLED } from '../config/logging';

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
 * - Emits events for UI components to react to
 *
 * Architecture:
 * Component (UI) → Orchestrator (Logic) → State Machine (State)
 *                       ↓
 *               Game State Classes
 *                       ↓
 *               Audio Engine
 */
export class GameOrchestrator extends EventEmitter<OrchestratorEvents> {
  private actor: Actor<typeof gameStateMachine>;
  private subscriptions: Array<() => void> = [];
  private currentNote: NoteWithOctave | null = null;
  private noteDuration: NoteDuration = '2n';

  // Game mode and settings
  private gameMode: IGameMode | null = null;
  private noteFilter: NoteFilter | null = null;

  // Timer management - eliminates setTimeout race conditions
  private activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private timerCallbacks: Map<string, () => void> = new Map();

  // Game flow callbacks - allows component to react to orchestrator decisions
  private onTimeoutCallback?: (correctNote: NoteWithOctave) => void;
  private onAutoAdvanceCallback?: () => void;
  private onFeedbackUpdateCallback?: (message: string) => void;
  private onRoundStartCallback?: (note: NoteWithOctave) => void;

  constructor() {
    super();

    // Create the state machine actor
    this.actor = createActor(gameStateMachine);
  }

  /**
   * Override emit to add logging for all events
   */
  emit<K extends keyof OrchestratorEvents>(event: K, data: OrchestratorEvents[K]): void {
    if (LOGS_EVENTS_ENABLED) {
      console.log('[Orchestrator] Emitting event:', event, data);
    }
    super.emit(event, data);
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

    // Clean up all event listeners
    this.removeAllListeners();

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

    if (LOGS_TIMERS_ENABLED) {
      console.log('[Orchestrator] Scheduling timer:', key, 'delay:', delay, 'ms');
    }

    // Store the callback
    this.timerCallbacks.set(key, callback);

    // Schedule the timer
    const timerId = setTimeout(() => {
      if (LOGS_TIMERS_ENABLED) {
        console.log('[Orchestrator] Timer fired:', key);
      }
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
      if (LOGS_TIMERS_ENABLED) {
        console.log('[Orchestrator] Clearing timer:', key);
      }
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
    if (this.activeTimers.size > 0 && LOGS_TIMERS_ENABLED) {
      console.log('[Orchestrator] Clearing all timers. Active timers:', Array.from(this.activeTimers.keys()));
      console.trace('[Orchestrator] clearAllTimers called from:');
    }
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
      // Emit state change event
      const state = snapshot.value;

      if (LOGS_STATE_ENABLED) {
        console.log('[Orchestrator] State changed:', state);
      }

      if (typeof state === 'string') {
        this.emit('stateChange', {
          sessionState: state as SessionState,
        });
      } else if (typeof state === 'object' && state !== null) {
        const sessionState = Object.keys(state)[0] as SessionState;
        const roundState = (state as any)[sessionState] as RoundState | undefined;

        if (LOGS_STATE_ENABLED) {
          console.log('[Orchestrator] State changed to:', sessionState, roundState ? `-> ${roundState}` : '');
        }

        this.emit('stateChange', {
          sessionState,
          roundState,
        });
      }

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
    if (LOGS_STATE_ENABLED) {
      console.log('[Orchestrator] Sending event:', event.type, event);
    }
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
    // Always clear timers on pause to prevent them from firing while paused
    // This includes auto-advance timers during intermission
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
   * Reset the entire game (state machine + game mode)
   * Used for "Play Again" or external reset triggers
   */
  resetGame(): void {
    // Clear all timers
    this.clearAllTimers();

    // Reset state machine
    this.send({ type: GameAction.RESET });

    // Reset current note
    this.currentNote = null;

    // Emit reset event for UI to react
    this.emit('feedbackUpdate', 'Click "Start Practice" to begin your ear training session');
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
   * Simply plays the audio without state transitions
   */
  async playCurrentNote(note: NoteWithOctave): Promise<void> {
    this.currentNote = note;

    // Initialize audio engine if needed
    await audioEngine.initialize();

    // Play the note
    audioEngine.playNote(note, this.noteDuration);
  }

  /**
   * Replay the current note
   * Used when user clicks "Play Note Again" button
   */
  async replayNote(): Promise<void> {
    if (!this.currentNote) {
      console.warn('No current note to replay');
      return;
    }

    // Initialize audio engine if needed
    await audioEngine.initialize();

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

  // ========================================
  // Game Flow Callback Configuration
  // ========================================

  /**
   * Configure callback for when round times out
   */
  setOnTimeoutCallback(callback: (correctNote: NoteWithOctave) => void): void {
    this.onTimeoutCallback = callback;
  }

  /**
   * Configure callback for auto-advance after correct guess
   */
  setOnAutoAdvanceCallback(callback: () => void): void {
    this.onAutoAdvanceCallback = callback;
  }

  /**
   * Configure callback for feedback updates
   */
  setOnFeedbackUpdateCallback(callback: (message: string) => void): void {
    this.onFeedbackUpdateCallback = callback;
  }

  /**
   * Configure callback for when new round starts
   */
  setOnRoundStartCallback(callback: (note: NoteWithOctave) => void): void {
    this.onRoundStartCallback = callback;
  }

  // ========================================
  // Round Flow Management
  // ========================================

  /**
   * Handle timeout event
   * Treats timeout as an incorrect guess with no user input
   */
  handleTimeout(autoAdvanceSpeed: number): void {
    if (!this.gameMode || !this.currentNote) return;

    // Create attempt record for timeout (no guess made)
    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: this.currentNote,
      guessedNote: null,
      isCorrect: false,
    };

    // Emit guess attempt event
    this.emit('guessAttempt', attempt);

    // Send timeout event to state machine
    this.send({ type: GameAction.TIMEOUT });

    // Handle as incorrect guess through game state
    const result = this.gameMode.handleIncorrectGuess();

    // Emit guess result event with timeout-specific feedback
    this.emit('guessResult', {
      isCorrect: false,
      feedback: `Time's up! The correct answer was ${this.currentNote.note}. ${result.feedback}`,
      shouldAdvance: result.shouldAdvance,
      gameCompleted: result.gameCompleted,
      stats: result.stats,
    });

    // Handle game completion
    if (result.gameCompleted && result.stats) {
      // Transition state machine to COMPLETED
      this.complete();

      this.emit('sessionComplete', {
        session: this.createGameSession(result.stats),
        stats: result.stats,
      });
      return; // Don't schedule auto-advance if game is complete
    }

    // Schedule auto-advance to next round
    const advanceTime = Math.min(autoAdvanceSpeed, 2);
    this.scheduleAdvanceAfterTimeout(() => {
      // Advance to next round in state machine
      this.send({ type: GameAction.ADVANCE_ROUND });

      // Notify component to start new round
      this.onAutoAdvanceCallback?.();
    }, advanceTime * 1000);
  }

  /**
   * Handle auto-advance after correct guess
   * @param advanceTimeMs - Delay in milliseconds before advancing
   */
  handleAutoAdvance(advanceTimeMs: number): void {
    if (LOGS_TIMERS_ENABLED) {
      console.log('[Orchestrator] Scheduling auto-advance in', advanceTimeMs, 'ms');
    }
    this.scheduleAdvanceAfterCorrectGuess(() => {
      if (LOGS_TIMERS_ENABLED) {
        console.log('[Orchestrator] Auto-advance timer fired');
      }
      // Advance to next round in state machine
      this.send({ type: GameAction.ADVANCE_ROUND });

      if (LOGS_TIMERS_ENABLED) {
        console.log('[Orchestrator] Calling onAutoAdvanceCallback');
      }
      // Notify component to start new round
      this.onAutoAdvanceCallback?.();
    }, advanceTimeMs);
  }


  // ========================================
  // Game Mode Configuration
  // ========================================

  /**
   * Set the game mode
   * @param mode - Game mode instance implementing IGameMode
   */
  setGameMode(mode: IGameMode): void {
    this.gameMode = mode;
  }

  /**
   * Create and set a new game mode by recreating the mode instance
   * Used when settings change or on reset
   * @param mode - The existing game mode instance to refresh
   */
  refreshGameMode(mode: IGameMode): void {
    this.gameMode = mode;
  }

  /**
   * Get the current game mode
   * @returns Current game mode or null
   */
  getGameMode(): IGameMode | null {
    return this.gameMode;
  }

  /**
   * Set the note filter configuration
   * @param filter - Note filter configuration
   */
  setNoteFilter(filter: NoteFilter): void {
    this.noteFilter = filter;
  }

  /**
   * Generate a new note for the current round
   * Uses the game mode's generateNote method with the configured filter
   * @returns Generated note or null if mode/filter not configured
   */
  generateNote(): NoteWithOctave | null {
    if (!this.gameMode || !this.noteFilter) {
      console.warn('[Orchestrator] Cannot generate note: mode or filter not configured');
      return null;
    }

    return this.gameMode.generateNote(this.noteFilter);
  }

  /**
   * Start a new round
   * Generates a note, updates game state, plays audio, and emits events
   */
  async startNewRound(): Promise<void> {
    if (!this.gameMode) {
      console.warn('[Orchestrator] Cannot start round: game mode not set');
      return;
    }

    // Generate new note
    const newNote = this.generateNote();
    if (!newNote) {
      console.warn('[Orchestrator] Failed to generate note');
      return;
    }

    // Update game state
    this.gameMode.onStartNewRound();
    this.currentNote = newNote;

    // Emit roundStart event
    const feedback = this.gameMode.getFeedbackMessage(true);
    this.emit('roundStart', { note: newNote, feedback });

    // Transition to WAITING_INPUT (which will trigger note playback)
    if (this.isIdle()) {
      this.startGame();
    }

    // Play the note
    await this.playCurrentNote(newNote);
  }

  // ========================================
  // Guess Handling
  // ========================================

  /**
   * Submit a guess for the current note
   * Validates the guess, updates game state, and emits events
   * @param guessedNote - The note the user guessed
   */
  submitGuess(guessedNote: NoteWithOctave): void {
    if (!this.gameMode) {
      console.warn('[Orchestrator] Cannot submit guess: game mode not set');
      return;
    }

    if (!this.currentNote) {
      console.warn('[Orchestrator] Cannot submit guess: no current note');
      return;
    }

    // Validate the guess
    const isCorrect = this.gameMode.validateGuess(guessedNote, this.currentNote);

    // Create attempt record
    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: this.currentNote,
      guessedNote: guessedNote,
      isCorrect: isCorrect,
    };

    // Emit guess attempt event
    this.emit('guessAttempt', attempt);

    // Send guess to state machine
    this.send({ type: GameAction.MAKE_GUESS, guessedNote: guessedNote.note });

    // Handle the guess result through game state
    const result = isCorrect
      ? this.gameMode.handleCorrectGuess()
      : this.gameMode.handleIncorrectGuess();

    // Send result to state machine
    this.send({
      type: isCorrect ? GameAction.CORRECT_GUESS : GameAction.INCORRECT_GUESS,
    });

    // Emit guess result event
    this.emit('guessResult', {
      isCorrect,
      feedback: result.feedback,
      shouldAdvance: result.shouldAdvance,
      gameCompleted: result.gameCompleted,
      stats: result.stats,
    });

    // Handle auto-advance if needed
    if (result.shouldAdvance && !result.gameCompleted) {
      // Calculate advance time based on game mode settings
      // For now, use a default of 1 second
      this.handleAutoAdvance(1000);
    }

    // Handle game completion
    if (result.gameCompleted && result.stats) {
      // Transition state machine to COMPLETED
      this.complete();

      this.emit('sessionComplete', {
        session: this.createGameSession(result.stats),
        stats: result.stats,
      });
    }
  }

  /**
   * Create a game session record
   * @param stats - Final game statistics
   * @returns Game session object
   */
  private createGameSession(stats: any): any {
    if (!this.gameMode) {
      return null;
    }

    return {
      mode: this.gameMode.getMode(),
      timestamp: new Date(),
      completionTime: stats.completionTime,
      accuracy: stats.accuracy,
      totalAttempts: stats.totalAttempts,
      settings: this.gameMode.getSessionSettings(),
      results: this.gameMode.getSessionResults(stats),
    };
  }

}
