import { timeout, TimeoutError } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { onTimeout } from './onTimeout';
import { timeoutEach } from './timeoutEach';
import { timeoutFirst } from './timeoutFirst';

describe('composed single-purpose operators vs timeout(config)', () => {
  it('timeoutFirst + timeoutEach + onTimeout reproduces timeout({ first, each, with })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('3ms a 2ms b 20ms c');
      const expected = '3ms a 2ms b 3ms x|';

      const composed = source.pipe(
        timeoutFirst(5),
        timeoutEach(4),
        onTimeout(() => cold('x|'))
      );
      const configured = source.pipe(
        timeout({ first: 5, each: 4, with: () => cold('x|') })
      );

      expectObservable(composed).toBe(expected);
      expectObservable(configured).toBe(expected);
    });
  });

  it('timeoutFirst(n) + timeoutEach(n) reproduces plain timeout(n)', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('3ms a 10ms b');
      const expected = '3ms a 4ms #';
      const error = new TimeoutError({ meta: null, lastValue: null, seen: 1 });

      expectObservable(source.pipe(timeoutFirst(5), timeoutEach(5))).toBe(
        expected,
        { a: 'a' },
        error
      );
      expectObservable(source.pipe(timeout(5))).toBe(expected, { a: 'a' }, error);
    });
  });
});
