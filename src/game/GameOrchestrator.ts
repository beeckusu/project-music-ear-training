import { createActor, type Actor } from 'xstate';
import { gameStateMachine } from '../machines/gameStateMachine';
import type { GameMachineContext, GameEvent } from '../machines/types';
import { SessionState, RoundState, GameAction } from '../machines/types';
import { audioEngine } from '../utils/audioEngine';
import type { NoteWithOctave, NoteDuration } from '../types/music';
import { EventEmitter } from '../utils/EventEmitter';
import type { OrchestratorEvents } from './OrchestratorEvents';
import type { IGameMode } from './IGameMode';
import type { NoteFilter } from '../types/music';
import type { GuessAttempt } from '../types/game';
import type { UserAction, RoundContext } from '../types/orchestrator';
import { LOGS_STATE_ENABLED, LOGS_EVENTS_ENABLED, LOGS_TIMERS_ENABLED, LOGS_USER_ACTIONS_ENABLED } from '../config/logging';
import { createGameState } from './GameStateFactory';
import { modeRegistry } from './ModeRegistry';
import type { ModeStrategy } from './strategies/ModeStrategy';
import { EarTrainingStrategy } from './strategies/EarTrainingStrategy';
import { ChordTrainingStrategy } from './strategies/ChordTrainingStrategy';

/**
 * GameOrchestrator
 *
 * Coordinates game flow by bridging the UI component, state machine, and game logic.
 *
 * ## Core Responsibilities
 *
 * ### State Machine Management
 * - Creates and manages XState actor lifecycle (start/stop/subscribe)
 * - Dispatches actions to state machine (START_GAME, PAUSE, RESUME, etc.)
 * - Provides state queries (isPlaying, isPaused, isWaitingInput, etc.)
 * - Subscribes to state changes and emits events for UI
 *
 * ### Timer Management (Eliminates setTimeout Race Conditions)
 * - Centralized timer management via scheduleTimer() method
 * - Auto-cleanup of timers on state transitions (pause, reset, complete)
 * - Named timer keys prevent conflicts ('advance-after-correct', 'audio-resume', etc.)
 * - All timing logic lives here, NOT in components
 *
 * ### Game Flow Coordination (via Strategy Pattern)
 * - Delegates to mode-specific strategies for round management
 * - Strategies handle note generation, audio playback, and guess validation
 * - Validates guesses and updates game state through strategies
 * - Handles timeouts (treats as incorrect guess)
 * - Manages auto-advance logic after correct guesses
 * - Handles game completion and session creation
 *
 * ### Audio Playback
 * - Coordinates with AudioEngine for note playback
 * - Handles note replay requests
 * - Manages note duration settings
 *
 * ### Event Emission
 * Emits events for UI components to react to:
 * - roundStart: New round started with note
 * - guessAttempt: User made a guess
 * - guessResult: Guess was processed (correct/incorrect)
 * - sessionComplete: Game finished with stats
 * - feedbackUpdate: Feedback message changed
 * - stateChange: State machine state changed
 *
 * ## Architecture
 * ```
 * Component (UI) → Orchestrator (Logic) → State Machine (State)
 *                       ↓
 *                   Strategies (EarTraining/ChordTraining)
 *                       ↓
 *               Game State Classes (Rush/Survival/Sandbox)
 *                       ↓
 *               Audio Engine (ear-training modes only)
 * ```
 *
 * ## Usage Pattern
 * ```typescript
 * // 1. Create and start orchestrator
 * const orchestrator = new GameOrchestrator();
 * orchestrator.start();
 *
 * // 2. Subscribe to events
 * orchestrator.on('roundStart', ({ note, feedback }) => {
 *   setCurrentNote(note);
 *   setFeedback(feedback);
 * });
 *
 * // 3. Configure game mode and settings
 * orchestrator.setGameMode(gameState);
 * orchestrator.setNoteFilter(noteFilter);
 * orchestrator.setNoteDuration(noteDuration);
 *
 * // 4. Start a round
 * await orchestrator.startNewRound();
 *
 * // 5. Handle user actions (requires round context)
 * orchestrator.handleUserAction({ type: 'piano_click', note: guessedNote }, context);
 * orchestrator.handleUserAction({ type: 'submit' }, context);
 * orchestrator.pause();
 * orchestrator.resume();
 * ```
 *
 * ## Key Design Principles
 *
 * ### Single Source of Truth
 * - State machine context holds all game state
 * - Components derive state from orchestrator queries
 * - No duplicate state between component and orchestrator
 *
 * ### No Stale Closures
 * - All timers managed centrally with clearAllTimers()
 * - Event emission pattern prevents closure issues
 * - No refs needed for callbacks in components
 *
 * ### Clean Separation
 * - Component = UI rendering + event handlers
 * - Orchestrator = Game logic + coordination
 * - State Machine = State transitions + validation
 * - Game Classes = Mode-specific rules
 */
export class GameOrchestrator extends EventEmitter<OrchestratorEvents> {
  private actor: Actor<typeof gameStateMachine>;
  private subscriptions: Array<() => void> = [];
  private currentNote: NoteWithOctave | null = null;
  private noteDuration: NoteDuration = '2n';

  // Game mode and settings
  private gameMode: IGameMode | null = null;
  private noteFilter: NoteFilter | null = null;
  private selectedMode: string | null = null;
  private modeSettings: any = null;

  // Strategy pattern for mode-specific logic
  private currentStrategy: ModeStrategy | null = null; // Null only during initialization

  // Pause state tracking
  private wasInIntermissionWhenPaused: boolean = false;

  // Round configuration (set once, used for all rounds)
  private responseTimeLimit: number | null = null;
  private autoAdvanceSpeed: number = 2;
  private onTimerUpdate: ((time: number) => void) | null = null;
  private onSessionTimerUpdate: ((time: number) => void) | null = null;

  // Timer management - eliminates setTimeout race conditions
  private activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private timerCallbacks: Map<string, () => void> = new Map();

  constructor() {
    super();

    // Create the state machine actor with default timers
    this.actor = createActor(gameStateMachine, {
      input: {
        timerConfig: {
          initialTime: 0,
          direction: 'up',
        },
        roundTimerConfig: {
          initialTime: 3, // Default 3 seconds for round timer
          direction: 'down',
        },
      },
    });
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
    console.log('[Orchestrator] start() called, creating actor subscription');
    console.log('[Orchestrator] Actor status before start:', this.actor.getSnapshot().status);
    this.actor.start();
    console.log('[Orchestrator] Actor status after start:', this.actor.getSnapshot().status);
    console.log('[Orchestrator] Initial state:', this.actor.getSnapshot().value);

    // Track previous state to detect transitions
    let previousState: string | null = null;
    let previousRoundTimeRemaining: number | undefined = undefined;
    let previousElapsedTime: number | undefined = undefined;

    // Subscribe to context updates to sync elapsedTime to game mode and call timer callbacks
    console.log('[Orchestrator] Setting up subscription...');
    console.log('[Orchestrator] About to call this.actor.subscribe(), actor status:', this.actor.getSnapshot().status);

    try {
      const subscription = this.actor.subscribe((snapshot) => {
        console.log('[Orchestrator] ⚡ Subscription callback fired, snapshot.value:', snapshot.value);

        try {
          if (this.gameMode && snapshot.context.elapsedTime !== undefined) {
            this.gameMode.elapsedTime = snapshot.context.elapsedTime;

            // Call session timer callback only if elapsedTime changed
            if (this.onSessionTimerUpdate && snapshot.context.elapsedTime !== previousElapsedTime) {
              this.onSessionTimerUpdate(snapshot.context.elapsedTime);
              previousElapsedTime = snapshot.context.elapsedTime;
            }
          }

          // Call round timer callback only if roundTimeRemaining changed
          if (this.onTimerUpdate && snapshot.context.roundTimeRemaining !== undefined &&
              snapshot.context.roundTimeRemaining !== previousRoundTimeRemaining) {
            this.onTimerUpdate(snapshot.context.roundTimeRemaining);
            previousRoundTimeRemaining = snapshot.context.roundTimeRemaining;
          }

          // Handle round timeout (when round timer reaches 0)
          // Detect transition from WAITING_INPUT to TIMEOUT_INTERMISSION with no user guess
          const currentState = JSON.stringify(snapshot.value);
          const isInIntermission = snapshot.matches({ [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION });
          const wasInWaitingInput = previousState?.includes(RoundState.WAITING_INPUT);

          if (isInIntermission && wasInWaitingInput && !snapshot.context.userGuess && this.currentNote) {
            this.handleTimeout(this.autoAdvanceSpeed);
          }

          // Emit stateChange event when state changes
          if (currentState !== previousState) {
            const sessionState = Object.keys(snapshot.value)[0] as SessionState;
            const roundState = snapshot.matches(SessionState.PLAYING)
              ? (snapshot.value as any)[SessionState.PLAYING] as RoundState
              : undefined;

            console.log('[Orchestrator] State changed:', { sessionState, roundState, previousState, currentState });
            this.emit('stateChange', { sessionState, roundState });
          }

          previousState = currentState;

          // Handle automatic session completion (e.g., Sandbox timer expiration)
          if (snapshot.matches(SessionState.COMPLETED) && this.gameMode && !this.gameMode.isCompleted) {
            console.log('[GameOrchestrator] Detected COMPLETED state - calling handleExternalCompletion');
            this.handleExternalCompletion();
          }
        } catch (error) {
          console.error('[Orchestrator] Subscription callback error:', error);
        }
      });
      console.log('[Orchestrator] Subscription object created:', typeof subscription, subscription);
      console.log('[Orchestrator] Adding subscription to subscriptions array');
      this.subscriptions.push(() => subscription.unsubscribe());
      console.log('[Orchestrator] Subscriptions count:', this.subscriptions.length);
    } catch (error) {
      console.error('[Orchestrator] Error during subscription setup:', error);
    }
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
  //
  // All game timers are managed here to prevent race conditions.
  // Key benefits:
  // - Automatic cleanup on state transitions (pause, reset, complete)
  // - Named keys prevent conflicts and enable selective clearing
  // - Centralized logging for debugging timing issues
  //
  // Timer Keys:
  // - 'advance-after-timeout': Auto-advance after timeout intermission
  // - 'advance-after-correct': Auto-advance after correct guess
  // - 'feedback-update': Delayed feedback message updates
  // - 'audio-resume': Resume game timer after audio replay
  // - 'play-again-delay': Short delay before starting new game

  /**
   * Schedule a timer with automatic cleanup
   * Replaces direct setTimeout usage to prevent race conditions
   *
   * @param key - Unique identifier for this timer (enables selective clearing)
   * @param callback - Function to call when timer fires
   * @param delay - Delay in milliseconds
   *
   * @example
   * // Schedule auto-advance after correct guess
   * this.scheduleTimer('advance-after-correct', () => {
   *   this.send({ type: GameAction.ADVANCE_ROUND });
   *   this.emit('advanceToNextRound', undefined);
   * }, 1000);
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
    const currentState = this.actor.getSnapshot();
    console.log('[Orchestrator] After send, state is:', currentState.value, 'matches:', currentState.matches);
  }

  // ========================================
  // State Queries
  // ========================================

  /**
   * Check if game is in IDLE session state
   */
  isIdle(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return true; // Default to idle if not started
    }
    return snapshot.matches(SessionState.IDLE);
  }

  /**
   * Check if game is in PLAYING session state
   */
  isPlaying(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return false;
    }
    return snapshot.matches(SessionState.PLAYING);
  }

  /**
   * Check if game is in PAUSED session state
   */
  isPaused(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return false;
    }
    return snapshot.matches(SessionState.PAUSED);
  }

  /**
   * Check if game is in COMPLETED session state
   */
  isCompleted(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return false;
    }
    return snapshot.matches(SessionState.COMPLETED);
  }

  /**
   * Check if waiting for user input (WAITING_INPUT round state)
   */
  isWaitingInput(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return false;
    }
    return snapshot.matches({
      [SessionState.PLAYING]: RoundState.WAITING_INPUT
    });
  }

  /**
   * Check if processing a guess (PROCESSING_GUESS round state)
   */
  isProcessingGuess(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return false;
    }
    return snapshot.matches({
      [SessionState.PLAYING]: RoundState.PROCESSING_GUESS
    });
  }

  /**
   * Check if in intermission between rounds (TIMEOUT_INTERMISSION round state)
   */
  isInIntermission(): boolean {
    const snapshot = this.actor.getSnapshot();
    if (!snapshot || typeof snapshot.matches !== 'function') {
      return false;
    }
    return snapshot.matches({
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
   * Get the current round context for strategy callbacks
   * Converts GameMachineContext to RoundContext format
   */
  getRoundContext(): import('../types/orchestrator').RoundContext {
    const context = this.getContext();
    return {
      startTime: new Date(Date.now() - context.elapsedTime * 1000),
      elapsedTime: context.elapsedTime,
      note: this.currentNote || undefined,
    };
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

    // Emit events for UI to react
    this.emit('gameReset', undefined);
    this.emit('feedbackUpdate', 'Click "Start Practice" to begin your ear training session');
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
  // Round Flow Management
  // ========================================
  //
  // These methods coordinate the flow of a round:
  // 1. startNewRound(): Generate note, play audio, emit events
  // 2. submitGuess(): Validate, update stats, emit events, handle auto-advance
  // 3. handleTimeout(): Treat as incorrect guess, schedule auto-advance
  //
  // All methods emit events for the UI to react to.
  // All methods update the state machine appropriately.
  // All methods use centralized timer management.

  /**
   * Handle timeout event
   * Treats timeout as an incorrect guess with no user input
   *
   * Flow:
   * 1. Create attempt record with null guess
   * 2. Send TIMEOUT event to state machine
   * 3. Handle as incorrect guess through game mode
   * 4. Emit guessResult event with timeout-specific feedback
   * 5. If game complete, emit sessionComplete and transition to COMPLETED
   * 6. Otherwise, schedule auto-advance to next round
   *
   * @param autoAdvanceSpeed - Delay in seconds before advancing to next round (max 2s)
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

    // Send timeout event to state machine ONLY if not already in intermission
    // (Round timer timeout already transitions to TIMEOUT_INTERMISSION)
    if (!this.isInIntermission()) {
      this.send({ type: GameAction.TIMEOUT });
    }

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

      // Emit event to tell component to start new round
      this.emit('advanceToNextRound', undefined);
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
        console.log('[Orchestrator] Emitting advanceToNextRound event');
      }
      // Emit event to tell component to start new round
      this.emit('advanceToNextRound', undefined);
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

    // Initialize strategy based on mode type
    this.currentStrategy = this.createStrategy(mode);

    // Set completion callback for modes that need it (e.g., Sandbox mode timer expiration)
    if (mode.setCompletionCallback) {
      mode.setCompletionCallback(() => {
        this.handleExternalCompletion();
      });
    }
  }

  /**
   * Create a strategy instance based on the game mode's strategy type
   *
   * @param mode - The game mode to create a strategy for
   * @returns Strategy instance
   * @throws Error if mode metadata not found or strategy type unknown
   */
  private createStrategy(mode: IGameMode): ModeStrategy {
    const modeType = mode.getMode() as import('../types/game').ModeType;
    const metadata = modeRegistry.get(modeType);

    if (!metadata) {
      throw new Error(`[Orchestrator] Mode metadata not found for: ${modeType}`);
    }

    const strategyType = metadata.strategyType;

    switch (strategyType) {
      case 'ear-training':
        return new EarTrainingStrategy(audioEngine, this.noteDuration);
      case 'chord-training':
        return new ChordTrainingStrategy();
      default:
        throw new Error(`[Orchestrator] Unknown strategy type: ${strategyType}`);
    }
  }

  /**
   * Create and set a new game mode by recreating the mode instance
   * Used when settings change or on reset
   * @param mode - The existing game mode instance to refresh
   */
  refreshGameMode(mode: IGameMode): void {
    this.gameMode = mode;

    // Initialize strategy based on mode type
    this.currentStrategy = this.createStrategy(mode);

    // Set completion callback for modes that need it
    if (mode.setCompletionCallback) {
      mode.setCompletionCallback(() => {
        this.handleExternalCompletion();
      });
    }
  }

  /**
   * Handle external completion (e.g., timer expiration in Sandbox mode)
   * This is called by the game mode when it completes externally
   */
  private handleExternalCompletion(): void {
    console.log('[GameOrchestrator] handleExternalCompletion called - gameMode.isCompleted:', this.gameMode?.isCompleted);
    if (this.gameMode?.isCompleted) {
      console.log('[GameOrchestrator] Game mode already completed, returning');
      return; // Already completed
    }

    // Mark game mode as completed FIRST to prevent infinite loop
    if (this.gameMode) {
      (this.gameMode as any).isCompleted = true;
    }

    // Get final stats from game mode
    const gameMode = this.gameMode as any;
    console.log('[GameOrchestrator] Getting final stats from game mode');
    let stats;

    if (gameMode.getFinalStats && gameMode.getFinalStats()) {
      stats = gameMode.getFinalStats();
    } else {
      // Fallback stats calculation
      const correctAttempts = gameMode.correctAttempts || 0;
      stats = {
        completionTime: gameMode.elapsedTime || 0,
        accuracy: gameMode.totalAttempts > 0 ? (correctAttempts / gameMode.totalAttempts) * 100 : 0,
        averageTimePerNote: correctAttempts > 0 ? (gameMode.elapsedTime || 0) / correctAttempts : 0,
        longestStreak: gameMode.longestStreak || 0,
        totalAttempts: gameMode.totalAttempts || 0,
        correctAttempts: correctAttempts
      };
    }

    // Don't call complete() if we're already in COMPLETED state (arrived via TIMEOUT)
    // This prevents triggering the subscription again
    if (!this.isCompleted()) {
      this.complete();
    }

    // Emit sessionComplete event
    this.emit('sessionComplete', {
      session: this.createGameSession(stats),
      stats: stats,
    });
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
   * Delegates to strategy to generate note, update game state, and handle audio
   *
   * Flow:
   * 1. Delegate to strategy's startNewRound method
   * 2. Update current note from strategy context
   * 3. Get feedback from game mode
   * 4. Emit roundStart event with context and feedback
   * 5. Transition to PLAYING.WAITING_INPUT if in IDLE
   *
   * The component should:
   * - Listen to roundStart event to update UI (setCurrentNote, setFeedback)
   * - Initialize round timer with handleTimeUp callback
   * - Enable piano keyboard for input
   *
   * @returns Promise that resolves when round setup is complete
   * @throws Error if no strategy available or note filter not set
   */
  async startNewRound(): Promise<void> {
    if (!this.gameMode) {
      console.warn('[Orchestrator] Cannot start round: game mode not set');
      return;
    }

    if (!this.currentStrategy) {
      throw new Error('[Orchestrator] No strategy available for starting round');
    }

    if (!this.noteFilter) {
      throw new Error('[Orchestrator] Cannot start round: note filter not set');
    }

    const context = await this.currentStrategy.startNewRound(this.gameMode, this.noteFilter);

    // Update current note from context
    this.currentNote = context.note || null;

    // Get feedback from game mode
    const feedback = this.gameMode.getFeedbackMessage(true);

    // Emit roundStart event with both context (new) and note (backward compatibility)
    this.emit('roundStart', { context, note: context.note, feedback });

    // Transition to WAITING_INPUT if in IDLE
    if (this.isIdle()) {
      this.startGame();
    }
  }

  // ========================================
  // Guess Handling
  // ========================================

  /**
   * Unified entry point for handling user actions
   * Delegates to the current strategy for processing
   *
   * @param action - The user action to handle
   * @param context - Current round context (required for strategy-based flow)
   * @throws Error if no strategy available or context not provided
   */
  handleUserAction(action: UserAction, context?: RoundContext): void {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[Orchestrator] handleUserAction:', action.type);
    }

    if (!this.currentStrategy) {
      throw new Error('[Orchestrator] No strategy available for handling user action');
    }

    if (!context) {
      throw new Error('[Orchestrator] Round context required for handling user action');
    }

    switch (action.type) {
        case 'piano_click':
          if (this.currentStrategy.handlePianoKeyClick) {
            this.currentStrategy.handlePianoKeyClick(action.note, context);

            // Send MAKE_GUESS event to state machine
            this.send({ type: GameAction.MAKE_GUESS, guessedNote: action.note.note });

            // For strategies with auto-submit (like ear training), validate and advance
            const result = this.currentStrategy.validateAndAdvance(context);

            // Send result to state machine
            this.send({
              type: result.isCorrect ? GameAction.CORRECT_GUESS : GameAction.INCORRECT_GUESS,
            });

            this.emit('guessResult', result);

            // Handle auto-advance if needed
            if (result.shouldAdvance && !result.gameCompleted) {
              this.handleAutoAdvance(1000);
            }

            // Handle game completion
            if (result.gameCompleted && result.stats) {
              this.complete();
              this.emit('sessionComplete', {
                session: this.createGameSession(result.stats),
                stats: result.stats,
              });
            }
          }
          break;
        case 'submit':
          if (this.currentStrategy.handleSubmitClick) {
            this.currentStrategy.handleSubmitClick(context);

            // Validate and advance after submit
            const result = this.currentStrategy.validateAndAdvance(context);

            // Send result to state machine
            this.send({
              type: result.isCorrect ? GameAction.CORRECT_GUESS : GameAction.INCORRECT_GUESS,
            });

            this.emit('guessResult', result);

            // Handle auto-advance if needed
            if (result.shouldAdvance && !result.gameCompleted) {
              this.handleAutoAdvance(1000);
            }

            // Handle game completion
            if (result.gameCompleted && result.stats) {
              this.complete();
              this.emit('sessionComplete', {
                session: this.createGameSession(result.stats),
                stats: result.stats,
              });
            }
          }
          break;
    }
  }

  /**
   * Submit a guess for the current note (backward compatibility wrapper)
   *
   * This is a convenience method that wraps handleUserAction() for backward compatibility
   * with existing tests and components. New code should use handleUserAction() directly.
   *
   * @param guessedNote - The note the user guessed
   * @deprecated Use handleUserAction() with proper context instead
   */
  submitGuess(guessedNote: NoteWithOctave): void {
    if (!guessedNote) {
      console.warn('[Orchestrator] Cannot submit guess: guessedNote is null');
      return;
    }

    if (!this.currentNote) {
      console.warn('[Orchestrator] Cannot submit guess: no current note');
      return;
    }

    if (!this.gameMode) {
      console.warn('[Orchestrator] Cannot submit guess: game mode not set');
      return;
    }

    // Validate the guess
    const isCorrect = this.gameMode.validateGuess(guessedNote, this.currentNote);

    // Create attempt record and emit guessAttempt event (for backward compatibility)
    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: this.currentNote,
      guessedNote: guessedNote,
      isCorrect: isCorrect,
    };

    this.emit('guessAttempt', attempt);

    // Create a minimal context for backward compatibility
    const context: RoundContext = {
      startTime: new Date(),
      elapsedTime: this.getContext().elapsedTime || 0,
      note: this.currentNote,
      noteHighlights: []
    };

    // Delegate to handleUserAction
    this.handleUserAction({ type: 'piano_click', note: guessedNote }, context);
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

  // ========================================
  // Public Action Methods (Called by Component)
  // ========================================

  /**
   * User action: Skip current note (count as incorrect/timeout)
   */
  skipNote(): void {
    // Guards: Can only skip if game is active and has a current note
    if (this.isCompleted() || !this.getCurrentNote() || !this.gameMode) {
      return;
    }

    // Game logic: Count as timeout/skip
    this.handleTimeout(0);
  }

  /**
   * User action: Replay the current note
   */
  async replayNoteAction(): Promise<void> {
    // Guards: Can only replay if there's a current note
    if (!this.getCurrentNote()) {
      return;
    }

    // Game logic: Replay the note
    await this.replayNote();
  }

  /**
   * User action: Play again after game completion
   */
  playAgain(): void {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[Orchestrator] User clicked Play Again');
    }

    // Clear all timers first
    this.clearAllTimers();

    // Game logic: Create fresh game state and reconfigure
    if (this.selectedMode && this.modeSettings) {
      const newGameState = createGameState(this.selectedMode, this.modeSettings);
      this.refreshGameMode(newGameState);
      if (this.noteFilter) {
        this.setNoteFilter(this.noteFilter);
      }
    }

    // Reset current note
    this.currentNote = null;

    // Send PLAY_AGAIN action to state machine (COMPLETED → PLAYING)
    this.send({ type: GameAction.PLAY_AGAIN });

    // Emit events for UI to react
    this.emit('gameReset', undefined);
    this.emit('feedbackUpdate', 'Click "Start Practice" to begin your ear training session');

    // Schedule new round after short delay
    this.schedulePlayAgainDelay(() => {
      this.emit('advanceToNextRound', undefined);
    }, 100);
  }

  /**
   * User action: Reset the game
   */
  userReset(): void {
    this.resetGame();
  }

  /**
   * Apply new settings from settings context
   */
  applySettings(
    selectedMode: string,
    modeSettings: any,
    noteFilter: any,
    noteDuration: any,
    responseTimeLimit: number | null,
    autoAdvanceSpeed: number,
    onTimerUpdate: (time: number) => void,
    onSessionTimerUpdate?: (time: number) => void
  ): void {
    // Store settings for future use (Play Again, etc.)
    this.selectedMode = selectedMode;
    this.modeSettings = modeSettings;
    this.responseTimeLimit = responseTimeLimit;
    this.autoAdvanceSpeed = autoAdvanceSpeed;
    this.onTimerUpdate = onTimerUpdate;
    this.onSessionTimerUpdate = onSessionTimerUpdate || null;

    // Determine timer configuration based on game mode
    // Sandbox mode counts down from sessionDuration, others count up from 0
    const isSandboxMode = selectedMode === 'sandbox';
    // Convert sessionDuration from minutes to seconds
    const sessionDuration = isSandboxMode ? (modeSettings.sandbox?.sessionDuration ?? 1) * 60 : 0;

    const timerConfig = {
      initialTime: isSandboxMode ? sessionDuration : 0,
      direction: isSandboxMode ? 'down' as const : 'up' as const,
    };

    const roundTimerConfig = {
      // When responseTimeLimit is null (unlimited), use a very large number so timer never expires
      initialTime: responseTimeLimit ?? Number.MAX_SAFE_INTEGER,
      direction: 'down' as const,
    };

    // Recreate actor with new timer configuration
    const wasStarted = this.actor.getSnapshot().status === 'active';
    const currentSnapshot = this.actor.getSnapshot();

    // Stop and clean up old actor
    if (wasStarted) {
      this.actor.stop();
    }

    // Clean up old subscriptions (they're tied to the old actor)
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Create new actor with correct timer configuration
    this.actor = createActor(gameStateMachine, {
      input: {
        timerConfig,
        roundTimerConfig,
      },
    });

    // Restart actor and re-establish subscriptions if it was running
    if (wasStarted) {
      this.actor.start();

      // Track previous state to detect transitions
      let previousState: string | null = null;
      let previousRoundTimeRemaining: number | undefined = undefined;
      let previousElapsedTime: number | undefined = undefined;

      // Re-subscribe to context updates
      const subscription = this.actor.subscribe((snapshot) => {
        if (this.gameMode && snapshot.context.elapsedTime !== undefined) {
          this.gameMode.elapsedTime = snapshot.context.elapsedTime;

          // Call session timer callback only if elapsedTime changed
          if (this.onSessionTimerUpdate && snapshot.context.elapsedTime !== previousElapsedTime) {
            this.onSessionTimerUpdate(snapshot.context.elapsedTime);
            previousElapsedTime = snapshot.context.elapsedTime;
          }
        }

        // Call round timer callback only if roundTimeRemaining changed
        if (this.onTimerUpdate && snapshot.context.roundTimeRemaining !== undefined &&
            snapshot.context.roundTimeRemaining !== previousRoundTimeRemaining) {
          this.onTimerUpdate(snapshot.context.roundTimeRemaining);
          previousRoundTimeRemaining = snapshot.context.roundTimeRemaining;
        }

        // Handle round timeout (when round timer reaches 0)
        // Detect transition from WAITING_INPUT to TIMEOUT_INTERMISSION with no user guess
        const currentState = JSON.stringify(snapshot.value);
        const isInIntermission = snapshot.matches({ [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION });
        const wasInWaitingInput = previousState?.includes(RoundState.WAITING_INPUT);

        if (isInIntermission && wasInWaitingInput && !snapshot.context.userGuess && this.currentNote) {
          this.handleTimeout(this.autoAdvanceSpeed);
        }

        // Emit stateChange event when state changes
        if (currentState !== previousState) {
          const sessionState = Object.keys(snapshot.value)[0] as SessionState;
          const roundState = snapshot.matches(SessionState.PLAYING)
            ? (snapshot.value as any)[SessionState.PLAYING] as RoundState
            : undefined;

          console.log('[Orchestrator] State changed (applySettings subscription):', { sessionState, roundState, previousState, currentState });
          this.emit('stateChange', { sessionState, roundState });
        }

        previousState = currentState;

        // Handle automatic session completion (e.g., Sandbox timer expiration)
        if (snapshot.matches(SessionState.COMPLETED) && this.gameMode && !this.gameMode.isCompleted) {
          console.log('[GameOrchestrator] Detected COMPLETED state (applySettings) - calling handleExternalCompletion');
          this.handleExternalCompletion();
        }
      });
      this.subscriptions.push(() => subscription.unsubscribe());
    }

    // Apply new settings
    try {
      this.setNoteDuration(noteDuration);

      const newGameState = createGameState(selectedMode, modeSettings);
      this.setGameMode(newGameState);
      this.setNoteFilter(noteFilter);
    } catch (error) {
      console.error('Failed to apply settings:', error);
    }
  }

  /**
   * User action: Pause the game
   */
  pauseGame(): void {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[Orchestrator] User pressed pause');
    }

    const inIntermission = this.isInIntermission();

    // Store whether we're in intermission for resume logic
    this.wasInIntermissionWhenPaused = inIntermission;

    if (inIntermission) {
      // During intermission, clear timers only
      this.clearAllTimers();
    } else {
      // Normal pause: transition state machine
      this.pause();
    }

    // Emit pause event for UI
    this.emit('gamePaused', undefined);
  }

  /**
   * User action: Resume the game
   */
  resumeGame(): void {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[Orchestrator] User pressed unpause');
    }

    const wasPaused = this.isPaused();
    const inIntermission = this.isInIntermission();
    const wasInIntermission = this.wasInIntermissionWhenPaused;

    // Only resume state machine if it was actually paused
    if (wasPaused) {
      this.resume();
    }

    // If resuming during intermission, reschedule auto-advance
    if (wasInIntermission && inIntermission) {
      this.scheduleAdvanceAfterTimeout(() => {
        this.send({ type: GameAction.ADVANCE_ROUND });
        this.emit('advanceToNextRound', undefined);
      }, 100);
    }

    // Reset the flag
    this.wasInIntermissionWhenPaused = false;

    // Emit resume event for UI
    this.emit('gameResumed', undefined);
  }

  /**
   * User action: Start practice
   * Checks if first-time setup is needed, otherwise starts a round
   * @param hasCompletedSetup - Whether the user has completed first-time setup
   * @param isPaused - Whether the game is currently paused
   */
  startPractice(hasCompletedSetup: boolean, isPaused: boolean = false): void {
    if (!hasCompletedSetup) {
      // Emit event for component to handle UI flow (first-time setup)
      this.emit('requestFirstTimeSetup', undefined);
    } else {
      // Start a new round
      this.beginNewRound(isPaused);
    }
  }

  /**
   * User action: Begin a new round
   * Initializes timer and starts a new round. This is the entry point for starting rounds.
   * Uses settings configured via applySettings().
   * @param isPaused - Whether the game is currently paused (only for user-initiated rounds)
   */
  beginNewRound(isPaused: boolean = false): void {
    // Guards
    if (this.isCompleted() || !this.gameMode || !this.onTimerUpdate) {
      return;
    }

    // Timer is now managed by state machine, no need to initialize it here

    // Start the round
    this.startNewRound();
  }

}
