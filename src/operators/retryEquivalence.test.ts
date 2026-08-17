import { retry, throwError, timer } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { retryConsecutive } from './retryConsecutive';
import { retryCount } from './retryCount';
import { retryDelayed } from './retryDelayed';
import { retryDelayedBy } from './retryDelayedBy';

describe('single-purpose retry operators vs retry(config)', () => {
  it('retryCount reproduces retry(n) and retry({ count: n })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('ab#', undefined, boom);
      const expected = 'ababab#';
      expectObservable(source.pipe(retryCount(2))).toBe(expected, undefined, boom);
      expectObservable(source.pipe(retry(2))).toBe(expected, undefined, boom);
      expectObservable(source.pipe(retry({ count: 2 }))).toBe(expected, undefined, boom);
    });
  });

  it('retryConsecutive reproduces retry({ count, resetOnSuccess: true })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const resetting = cold('a#');
      expectObservable(resetting.pipe(retryConsecutive(1)), '5ms !').toBe('aaaaa');
      expectObservable(
        resetting.pipe(retry({ count: 1, resetOnSuccess: true })),
        '5ms !'
      ).toBe('aaaaa');

      const boom = new Error('boom');
      const failing = cold('1ms #', undefined, boom);
      expectObservable(failing.pipe(retryConsecutive(2))).toBe('3ms #', undefined, boom);
      expectObservable(failing.pipe(retry({ count: 2, resetOnSuccess: true }))).toBe(
        '3ms #',
        undefined,
        boom
      );
    });
  });

  it('retryDelayed reproduces retry({ delay: ms })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a#');
      const expected = 'a 5ms a 5ms a';
      expectObservable(source.pipe(retryDelayed(5)), '14ms !').toBe(expected);
      expectObservable(source.pipe(retry({ delay: 5 })), '14ms !').toBe(expected);
    });
  });

  it('retryDelayedBy with a folded limit reproduces retry({ count, delay }) and the delay-function form', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('#', undefined, boom);
      const expected = '2ms #';
      const limitToTwo = (error: unknown, attempt: number) =>
        attempt <= 2 ? timer(1) : throwError(() => error);

      expectObservable(source.pipe(retryDelayedBy(limitToTwo))).toBe(expected, undefined, boom);
      expectObservable(source.pipe(retry({ count: 2, delay: 1 }))).toBe(
        expected,
        undefined,
        boom
      );
      expectObservable(source.pipe(retry({ delay: limitToTwo }))).toBe(
        expected,
        undefined,
        boom
      );
    });
  });
});
