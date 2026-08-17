import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { throttleLeading } from './throttleLeading';

describe('throttleLeading', () => {
  it('emits the first value of a burst and drops values inside the window', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('abcd 20ms e 2ms |');
      expectObservable(source.pipe(throttleLeading(5))).toBe('a 23ms e 2ms |');
    });
  });

  it('re-arms on the first value after the window closes', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 2ms b 4ms c');
      expectObservable(source.pipe(throttleLeading(5))).toBe('a 7ms c');
    });
  });

  it('never surfaces values at the window end', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab 10ms |');
      expectObservable(source.pipe(throttleLeading(5))).toBe('a 11ms |');
    });
  });

  it('propagates source errors unchanged', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a 2ms #', undefined, boom);
      expectObservable(source.pipe(throttleLeading(5))).toBe('a 2ms #', undefined, boom);
    });
  });
});
