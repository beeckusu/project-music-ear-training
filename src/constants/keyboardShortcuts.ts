/**
 * Keyboard Shortcuts Configuration
 *
 * Defines keyboard shortcuts for ear training and chord training modes.
 * Shortcuts are grouped by action type for easy reference.
 */

export interface KeyboardShortcut {
  key: string;
  code?: string;
  description: string;
  label: string; // Short label for button hints
}

/**
 * Core game action shortcuts
 */
export const SHORTCUTS = {
  // Playback controls
  REPLAY: { key: ' ', code: 'Space', description: 'Replay note/chord', label: 'Space' },

  // Navigation
  NEXT: { key: 'n', description: 'Skip to next note/chord', label: 'N' },

  // Actions
  SUBMIT: { key: 'Enter', description: 'Submit answer', label: 'Enter' },
  CLEAR: { key: 'c', description: 'Clear selection', label: 'C' },

  // Game controls
  START: { key: 's', description: 'Start practice', label: 'S' },
  PLAY_AGAIN: { key: 'r', description: 'Play again / Restart', label: 'R' },
} as const;

/**
 * Check if an element is a text input element
 */
export function isTextInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }

  // Check for contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Get display text for a shortcut key
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  return shortcut.label;
}
