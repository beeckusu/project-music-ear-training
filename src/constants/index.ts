// String literal constants for improved type safety and maintainability

// Settings Tab Constants
export const SETTINGS_TABS = {
  MODES: 'modes',
  NOTES: 'notes',
  TIMING: 'timing',
  AUDIO: 'audio'
} as const;

export type SettingsTab = typeof SETTINGS_TABS[keyof typeof SETTINGS_TABS];

// Timer Direction Constants
export const TIMER_DIRECTION = {
  UP: 'up',
  DOWN: 'down'
} as const;

export type TimerDirection = typeof TIMER_DIRECTION[keyof typeof TIMER_DIRECTION];

// Game Mode Constants
export const GAME_MODES = {
  RUSH: 'rush',
  SURVIVAL: 'survival',
  SANDBOX: 'sandbox'
} as const;

export type GameMode = typeof GAME_MODES[keyof typeof GAME_MODES];

// CSS Class Name Constants
export const CSS_CLASSES = {
  PIANO: {
    WHITE_KEY: 'white-key',
    BLACK_KEY: 'black-key',
    HIGHLIGHTED: 'highlighted',
    CORRECT: 'correct'
  },
  BUTTONS: {
    PRIMARY: 'primary-button',
    SECONDARY: 'secondary-button'
  },
  LAYOUT: {
    APP: 'app',
    APP_HEADER: 'app-header',
    APP_MAIN: 'app-main',
    SCORE_SECTION: 'score-section'
  }
} as const;

// Feedback Message Constants
export const FEEDBACK_MESSAGES = {
  GAME_PAUSED: 'Game paused',
  START_PRACTICE: 'Click "Start Practice" to begin your ear training session'
} as const;

// LocalStorage Key Constants
export const STORAGE_KEYS = {
  GAME_HISTORY: 'music-practice-game-history'
} as const;

// Aria Label Constants
export const ARIA_LABELS = {
  PAUSE: 'Pause',
  RESUME: 'Resume',
  OPEN_SETTINGS: 'Open Settings'
} as const;