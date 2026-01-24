import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchKeyEvent = (key: string, code?: string, target?: EventTarget) => {
    const event = new KeyboardEvent('keydown', {
      key,
      code: code || key,
      bubbles: true,
    });
    if (target) {
      Object.defineProperty(event, 'target', { value: target });
    }
    document.dispatchEvent(event);
    return event;
  };

  it('should register keydown event listener on mount', () => {
    renderHook(() => useKeyboardShortcuts([]));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts([]));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call handler when matching key is pressed', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler },
    ]));

    dispatchKeyEvent('n');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should call handler for Space key using code', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: ' ', code: 'Space', handler },
    ]));

    dispatchKeyEvent(' ', 'Space');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should match keys case-insensitively', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler },
    ]));

    dispatchKeyEvent('N');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when shortcut is disabled', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler, enabled: false },
    ]));

    dispatchKeyEvent('n');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not call handler when globally disabled', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler },
    ], { enabled: false }));

    dispatchKeyEvent('n');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not call handler when focused on input element', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler },
    ]));

    const input = document.createElement('input');
    dispatchKeyEvent('n', 'KeyN', input);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not call handler when focused on textarea element', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler },
    ]));

    const textarea = document.createElement('textarea');
    dispatchKeyEvent('n', 'KeyN', textarea);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should call handler in text inputs when allowInTextInputs is true', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler },
    ], { allowInTextInputs: true }));

    const input = document.createElement('input');
    dispatchKeyEvent('n', 'KeyN', input);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple shortcuts', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler: handler1 },
      { key: ' ', code: 'Space', handler: handler2 },
      { key: 'Enter', handler: handler3 },
    ]));

    dispatchKeyEvent('n');
    expect(handler1).toHaveBeenCalledTimes(1);

    dispatchKeyEvent(' ', 'Space');
    expect(handler2).toHaveBeenCalledTimes(1);

    dispatchKeyEvent('Enter');
    expect(handler3).toHaveBeenCalledTimes(1);
  });

  it('should not call unmatched handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler: handler1 },
      { key: 's', handler: handler2 },
    ]));

    dispatchKeyEvent('n');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should handle Enter key', () => {
    const handler = vi.fn();

    renderHook(() => useKeyboardShortcuts([
      { key: 'Enter', handler },
    ]));

    dispatchKeyEvent('Enter');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle shortcuts dynamically changing enabled state', () => {
    const handler = vi.fn();
    let enabled = true;

    const { rerender } = renderHook(() => useKeyboardShortcuts([
      { key: 'n', handler, enabled },
    ]));

    dispatchKeyEvent('n');
    expect(handler).toHaveBeenCalledTimes(1);

    // Disable the shortcut
    enabled = false;
    rerender();

    dispatchKeyEvent('n');
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again

    // Re-enable the shortcut
    enabled = true;
    rerender();

    dispatchKeyEvent('n');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should handle global enabled state changing dynamically', () => {
    const handler = vi.fn();
    let enabled = true;

    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts([
        { key: 'n', handler },
      ], { enabled }),
      { initialProps: { enabled } }
    );

    dispatchKeyEvent('n');
    expect(handler).toHaveBeenCalledTimes(1);

    // Disable globally
    rerender({ enabled: false });

    dispatchKeyEvent('n');
    expect(handler).toHaveBeenCalledTimes(1); // Still 1

    // Re-enable globally
    rerender({ enabled: true });

    dispatchKeyEvent('n');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
