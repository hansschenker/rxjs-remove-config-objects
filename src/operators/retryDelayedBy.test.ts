import { EMPTY, throwError, timer } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { retryDelayedBy } from './retryDelayedBy';

describe('retryDelayedBy', () => {
  it('consults the policy with the error and the 1-based attempt number', () => {
    const boom = new Error('boom');
    const policy = vi.fn((_error: unknown, attempt: number) => timer(attempt));
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a#', undefined, boom);
      expectObservable(source.pipe(retryDelayedBy(policy)), '10ms !').toBe(
        'a 1ms a 2ms a 3ms a'
      );
    });
    expect(policy.mock.calls).toEqual([
      [boom, 1],
      [boom, 2],
      [boom, 3],
    ]);
  });

  it('propagates the error when the policy rethrows (folded retry limit)', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('#', undefined, boom);
      const limitToTwo = (error: unknown, attempt: number) =>
        attempt <= 2 ? timer(1) : throwError(() => error);
      expectObservable(source.pipe(retryDelayedBy(limitToTwo))).toBe('2ms #', undefined, boom);
    });
  });

  it('completes the output when the policy completes without emitting', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a#');
      expectObservable(source.pipe(retryDelayedBy(() => EMPTY))).toBe('a|');
    });
  });
});
