import { TimeoutError } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { timeoutAt } from './timeoutAt';

const timeoutError = (): TimeoutError =>
  new TimeoutError({ meta: null, lastValue: null, seen: 0 });

describe('timeoutAt', () => {
  it('errors with TimeoutError at the deadline if no value has been seen', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('10ms a');
      expectObservable(source.pipe(timeoutAt(new Date(5)))).toBe('5ms #', undefined, timeoutError());
    });
  });

  it('is inert once the first value has arrived before the deadline', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('3ms a 20ms b 2ms |');
      expectObservable(source.pipe(timeoutAt(new Date(5)))).toBe('3ms a 20ms b 2ms |');
    });
  });

  it('completes untouched if the source completes empty before the deadline', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('2ms |');
      expectObservable(source.pipe(timeoutAt(new Date(5)))).toBe('2ms |');
    });
  });
});
