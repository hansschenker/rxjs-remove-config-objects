import { TimeoutError } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { timeoutFirst } from './timeoutFirst';

const timeoutError = (): TimeoutError =>
  new TimeoutError({ meta: null, lastValue: null, seen: 0 });

describe('timeoutFirst', () => {
  it('errors with TimeoutError if the first value does not arrive in time', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('10ms a');
      expectObservable(source.pipe(timeoutFirst(5))).toBe('5ms #', undefined, timeoutError());
    });
  });

  it('is inert after the first value, regardless of later gaps', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('3ms a 20ms b 5ms |');
      expectObservable(source.pipe(timeoutFirst(5))).toBe('3ms a 20ms b 5ms |');
    });
  });

  it('completes untouched if the source completes empty within the window', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('2ms |');
      expectObservable(source.pipe(timeoutFirst(5))).toBe('2ms |');
    });
  });

  it('propagates source errors unchanged', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('2ms #', undefined, boom);
      expectObservable(source.pipe(timeoutFirst(5))).toBe('2ms #', undefined, boom);
    });
  });

  it('unsubscribes from the source when the timeout fires', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('10ms a');
      expectObservable(source.pipe(timeoutFirst(5))).toBe('5ms #', undefined, timeoutError());
      expectSubscriptions(source.subscriptions).toBe('^ 4ms !');
    });
  });
});
