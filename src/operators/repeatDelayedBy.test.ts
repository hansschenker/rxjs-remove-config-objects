import { EMPTY, throwError, timer } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { repeatDelayedBy } from './repeatDelayedBy';

describe('repeatDelayedBy', () => {
  it('consults the policy with the 1-based iteration count', () => {
    const policy = vi.fn((iteration: number) => timer(iteration));
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a|');
      expectObservable(source.pipe(repeatDelayedBy(policy)), '10ms !').toBe(
        'a 1ms a 2ms a 3ms a'
      );
    });
    expect(policy.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('completes the output when the policy completes without emitting (folded repeat limit)', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a|');
      const threeRuns = (iteration: number) => (iteration < 3 ? timer(1) : EMPTY);
      expectObservable(source.pipe(repeatDelayedBy(threeRuns))).toBe('a 1ms a 1ms a|');
    });
  });

  it('propagates policy errors', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a|');
      expectObservable(source.pipe(repeatDelayedBy(() => throwError(() => boom)))).toBe(
        'a#',
        undefined,
        boom
      );
    });
  });
});
