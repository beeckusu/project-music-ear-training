import { expect } from 'vitest';

/**
 * Generic test utilities that can be used across different test suites
 * Extracted from chord and MIDI tests for reusability
 */

/**
 * Assert that a value is within a reasonable percentage of an expected value
 * Useful for distribution and randomness testing
 */
export function assertWithinRange(
  value: number,
  expected: number,
  tolerancePercent: number,
  label?: string
): void {
  const min = expected * (1 - tolerancePercent / 100);
  const max = expected * (1 + tolerancePercent / 100);
  const withinRange = value >= min && value <= max;

  expect(withinRange).toBe(
    true,
    `${label || 'Value'} ${value} is not within ${tolerancePercent}% of ${expected} (range: ${min.toFixed(2)}-${max.toFixed(2)})`
  );
}

/**
 * Assert that a set of items has sufficient variety/distribution
 * Can optionally specify both minimum and maximum unique counts
 */
export function assertDistribution<T>(
  items: T[],
  extractor: (item: T) => string | number,
  minUniqueCount: number,
  maxUniqueCount?: number,
  label: string = 'items'
): void {
  const seen = new Set(items.map(extractor));

  expect(seen.size).toBeGreaterThanOrEqual(
    minUniqueCount,
    `Expected at least ${minUniqueCount} different ${label}, but saw ${seen.size}`
  );

  if (maxUniqueCount !== undefined) {
    expect(seen.size).toBeLessThanOrEqual(
      maxUniqueCount,
      `Expected at most ${maxUniqueCount} different ${label}, but saw ${seen.size}`
    );
  }
}

/**
 * Measure performance of a function and assert it completes within a time limit
 * Returns the actual elapsed time in milliseconds
 */
export function measurePerformance(
  fn: () => void,
  maxMs: number,
  label?: string
): number {
  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(
    maxMs,
    `${label || 'Operation'} took ${elapsed.toFixed(2)}ms, expected < ${maxMs}ms`
  );

  return elapsed;
}

/**
 * Generate a range of numbers for parameterized testing
 * @param start - Starting number (inclusive)
 * @param end - Ending number (inclusive)
 * @param step - Step size (default 1)
 */
export function generateRange(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Create cartesian product of arrays for comprehensive parameterized testing
 * @example
 * cartesianProduct([1, 2], ['a', 'b']) // [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
 */
export function cartesianProduct<T extends any[]>(
  ...arrays: { [K in keyof T]: T[K][] }
): T[] {
  if (arrays.length === 0) return [] as any;
  if (arrays.length === 1) return arrays[0].map(x => [x] as any);

  return arrays.reduce(
    (acc: any[], array) => acc.flatMap(x => array.map(y => [...(Array.isArray(x) ? x : [x]), y])),
    [[]]
  ) as T[];
}

/**
 * Assert that a function throws an error with a specific message pattern
 */
export function assertThrowsWithMessage(
  fn: () => void,
  messagePattern: string | RegExp,
  label?: string
): void {
  expect(fn).toThrow(messagePattern);
}

/**
 * Check if a value is within a range (inclusive)
 */
export function isWithinRange(
  value: number,
  expected: number,
  tolerancePercent: number
): boolean {
  const min = expected * (1 - tolerancePercent / 100);
  const max = expected * (1 + tolerancePercent / 100);
  return value >= min && value <= max;
}

/**
 * Generate all combinations of values from multiple arrays
 * Returns objects with named properties
 * @example
 * generateCombinations({ note: ['C', 'D'], octave: [4, 5] })
 * // [{ note: 'C', octave: 4 }, { note: 'C', octave: 5 }, { note: 'D', octave: 4 }, { note: 'D', octave: 5 }]
 */
export function generateCombinations<T extends Record<string, any>>(
  params: { [K in keyof T]: T[K][] }
): T[] {
  const keys = Object.keys(params) as (keyof T)[];
  const values = keys.map(key => params[key]);

  const product = cartesianProduct(...values);

  return product.map(combination => {
    const result = {} as T;
    keys.forEach((key, index) => {
      result[key] = combination[index];
    });
    return result;
  });
}

/**
 * Collect statistics about a set of values
 */
export function collectStats<T>(
  items: T[],
  extractors: { [key: string]: (item: T) => any }
): {
  total: number;
  uniqueCounts: { [key: string]: number };
  valueCounts: { [key: string]: Map<any, number> };
} {
  const valueCounts: { [key: string]: Map<any, number> } = {};

  // Initialize maps for each extractor
  Object.keys(extractors).forEach(key => {
    valueCounts[key] = new Map();
  });

  // Collect counts
  items.forEach(item => {
    Object.entries(extractors).forEach(([key, extractor]) => {
      const value = extractor(item);
      const map = valueCounts[key];
      map.set(value, (map.get(value) || 0) + 1);
    });
  });

  // Calculate unique counts
  const uniqueCounts: { [key: string]: number } = {};
  Object.entries(valueCounts).forEach(([key, map]) => {
    uniqueCounts[key] = map.size;
  });

  return {
    total: items.length,
    uniqueCounts,
    valueCounts
  };
}
