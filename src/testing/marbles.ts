import { TestScheduler } from 'rxjs/testing';
import { expect } from 'vitest';

/**
 * Errors are compared by name, message, and (for TimeoutError) info —
 * never by stack, which would differ between the test file and the
 * operator that actually raised the error.
 */
const normalizeDeep = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...('info' in value ? { info: (value as { info?: unknown }).info } : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map(normalizeDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeDeep(entry)])
    );
  }
  return value;
};

export const makeScheduler = (): TestScheduler =>
  new TestScheduler((actual, expected) =>
    expect(normalizeDeep(actual)).toEqual(normalizeDeep(expected))
  );
