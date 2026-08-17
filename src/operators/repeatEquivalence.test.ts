import { EMPTY, repeat, timer } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { repeatCount } from './repeatCount';
import { repeatDelayed } from './repeatDelayed';
import { repeatDelayedBy } from './repeatDelayedBy';

describe('single-purpose repeat operators vs repeat(config)', () => {
  it('repeatCount reproduces repeat(n) and repeat({ count: n })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab|');
      const expected = 'ababab|';
      expectObservable(source.pipe(repeatCount(3))).toBe(expected);
      expectObservable(source.pipe(repeat(3))).toBe(expected);
      expectObservable(source.pipe(repeat({ count: 3 }))).toBe(expected);
    });
  });

  it('repeatDelayed reproduces repeat({ delay: ms })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a|');
      const expected = 'a 5ms a 5ms a';
      expectObservable(source.pipe(repeatDelayed(5)), '14ms !').toBe(expected);
      expectObservable(source.pipe(repeat({ delay: 5 })), '14ms !').toBe(expected);
    });
  });

  it('repeatDelayedBy with a folded limit reproduces repeat({ count, delay }) and the delay-function form', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a|');
      const expected = 'a 1ms a 1ms a|';
      const threeRuns = (iteration: number) => (iteration < 3 ? timer(1) : EMPTY);

      expectObservable(source.pipe(repeatDelayedBy(threeRuns))).toBe(expected);
      expectObservable(source.pipe(repeat({ count: 3, delay: 1 }))).toBe(expected);
      expectObservable(source.pipe(repeat({ delay: threeRuns }))).toBe(expected);
    });
  });
});
