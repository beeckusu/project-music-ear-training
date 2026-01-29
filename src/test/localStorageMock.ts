import { vi } from 'vitest';

export interface LocalStorageMock {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  /** Get the current store contents (for debugging) */
  _getStore: () => Record<string, string>;
}

/**
 * Creates a mock localStorage instance with vitest spies.
 *
 * @param initialStore - Optional initial data to populate the store
 * @returns A mock localStorage object with spy functions
 *
 * @example
 * ```ts
 * const mock = createLocalStorageMock();
 * vi.stubGlobal('localStorage', mock);
 *
 * // With initial data
 * const mock = createLocalStorageMock({ 'my-key': JSON.stringify({ foo: 'bar' }) });
 * ```
 */
export function createLocalStorageMock(initialStore: Record<string, string> = {}): LocalStorageMock {
  let store: Record<string, string> = { ...initialStore };

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
}

/**
 * Sets up localStorage mock for testing.
 * Call this in beforeEach to ensure clean state.
 *
 * @param initialData - Optional initial localStorage data
 * @returns The mock instance for assertions
 *
 * @example
 * ```ts
 * describe('my tests', () => {
 *   let localStorageMock: LocalStorageMock;
 *
 *   beforeEach(() => {
 *     localStorageMock = setupLocalStorageMock();
 *   });
 *
 *   afterEach(() => {
 *     vi.unstubAllGlobals();
 *   });
 *
 *   it('should save to localStorage', () => {
 *     // ... test code ...
 *     expect(localStorageMock.setItem).toHaveBeenCalledWith('key', 'value');
 *   });
 * });
 * ```
 */
export function setupLocalStorageMock(initialData?: Record<string, string>): LocalStorageMock {
  vi.unstubAllGlobals();
  const mock = createLocalStorageMock(initialData);
  vi.stubGlobal('localStorage', mock);
  return mock;
}

/**
 * Helper to get parsed JSON from a localStorage setItem call.
 *
 * @param mock - The localStorage mock
 * @param key - The storage key to find
 * @param callIndex - Which call to check (default: 0 for first call)
 * @returns The parsed JSON data, or undefined if not found
 *
 * @example
 * ```ts
 * const savedData = getStoredJSON(localStorageMock, 'my-storage-key');
 * expect(savedData.someField).toBe('expectedValue');
 * ```
 */
export function getStoredJSON<T = unknown>(
  mock: LocalStorageMock,
  key: string,
  callIndex?: number
): T | undefined {
  const calls = mock.setItem.mock.calls.filter((call) => call[0] === key);
  const targetCall = callIndex !== undefined ? calls[callIndex] : calls[calls.length - 1];

  if (!targetCall) return undefined;

  try {
    return JSON.parse(targetCall[1]) as T;
  } catch {
    return undefined;
  }
}
