import { TimeoutError } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { timeoutEach } from './timeoutEach';

const timeoutError = (seen: number): TimeoutError =>
  new TimeoutError({ meta: null, lastValue: null, seen });

describe('timeoutEach', () => {
  it('does not constrain the first value', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('10ms a 2ms |');
      expectObservable(source.pipe(timeoutEach(5))).toBe('10ms a 2ms |');
    });
  });

  it('errors with TimeoutError when the gap between values exceeds the window', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 10ms b');
      expectObservable(source.pipe(timeoutEach(5))).toBe('a 4ms #', undefined, timeoutError(1));
    });
  });

  it('re-arms the gap timer on every value', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 3ms b 3ms c');
      expectObservable(source.pipe(timeoutEach(5))).toBe(
        'a 3ms b 3ms c 4ms #',
        { a: 'a', b: 'b', c: 'c' },
        timeoutError(3)
      );
    });
  });

  it('completes untouched when the source completes before the gap elapses', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 2ms |');
      expectObservable(source.pipe(timeoutEach(5))).toBe('a 2ms |');
    });
  });

  it('propagates source errors unchanged', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a 2ms #', undefined, boom);
      expectObservable(source.pipe(timeoutEach(5))).toBe('a 2ms #', undefined, boom);
    });
  });

  it('unsubscribes from the source when the gap timeout fires', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 20ms b');
      expectObservable(source.pipe(timeoutEach(5))).toBe('a 4ms #', undefined, timeoutError(1));
      expectSubscriptions(source.subscriptions).toBe('^ 4ms !');
    });
  });
});
