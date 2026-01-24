import { useEffect, useCallback, useRef } from 'react';
import { isTextInputElement } from '../constants/keyboardShortcuts';

export interface ShortcutHandler {
  key: string;
  code?: string;
  handler: () => void;
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are globally enabled */
  enabled?: boolean;
  /** Whether to prevent default browser behavior for matched shortcuts */
  preventDefault?: boolean;
  /** Whether to stop propagation for matched shortcuts */
  stopPropagation?: boolean;
  /** Allow shortcuts even when focused on text inputs */
  allowInTextInputs?: boolean;
}

/**
 * Hook for handling keyboard shortcuts in game components.
 *
 * @param shortcuts - Array of shortcut handlers to register
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: ' ', handler: handleReplay, enabled: isPlaying },
 *   { key: 'n', handler: handleNext, enabled: canAdvance },
 *   { key: 'Enter', handler: handleSubmit, enabled: canSubmit },
 * ], { enabled: !isPaused && !isModalOpen });
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    allowInTextInputs = false,
  } = options;

  // Use ref to avoid recreating event listener on every render
  const shortcutsRef = useRef(shortcuts);
  const optionsRef = useRef({ enabled, preventDefault, stopPropagation, allowInTextInputs });

  // Update refs when dependencies change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
    optionsRef.current = { enabled, preventDefault, stopPropagation, allowInTextInputs };
  }, [shortcuts, enabled, preventDefault, stopPropagation, allowInTextInputs]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const opts = optionsRef.current;

    // Skip if globally disabled
    if (!opts.enabled) return;

    // Skip if focused on text input (unless explicitly allowed)
    if (!opts.allowInTextInputs && isTextInputElement(event.target)) {
      return;
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      // Skip if this specific shortcut is disabled
      if (shortcut.enabled === false) return false;

      // Match by key (case-insensitive for letters)
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                       event.key === shortcut.key;

      // Also match by code if provided (for special keys like Space)
      const codeMatch = shortcut.code && event.code === shortcut.code;

      return keyMatch || codeMatch;
    });

    if (matchingShortcut) {
      if (opts.preventDefault) {
        event.preventDefault();
      }
      if (opts.stopPropagation) {
        event.stopPropagation();
      }
      matchingShortcut.handler();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
