import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { throttleTrailing } from './throttleTrailing';

describe('throttleTrailing', () => {
  it('emits the latest value received when the window closes', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab 10ms |');
      expectObservable(source.pipe(throttleTrailing(5))).toBe('5ms b 6ms |');
    });
  });

  it('reopens the window after a trailing emission', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 5ms b 10ms |');
      expectObservable(source.pipe(throttleTrailing(5))).toBe('5ms a 4ms b 6ms |');
    });
  });

  it('defers completion to flush a pending value', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 1ms |');
      expectObservable(source.pipe(throttleTrailing(5))).toBe('5ms (a|)');
    });
  });

  it('completes immediately when nothing is pending', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 10ms |');
      expectObservable(source.pipe(throttleTrailing(5))).toBe('5ms a 5ms |');
    });
  });

  it('propagates source errors unchanged', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a 2ms #', undefined, boom);
      expectObservable(source.pipe(throttleTrailing(5))).toBe('3ms #', undefined, boom);
    });
  });
});
