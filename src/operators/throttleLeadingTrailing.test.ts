import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { throttleLeadingTrailing } from './throttleLeadingTrailing';

describe('throttleLeadingTrailing', () => {
  it('emits the first value and the latest value of each burst', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('abcd 20ms |');
      expectObservable(source.pipe(throttleLeadingTrailing(5))).toBe('a 4ms d 18ms |');
    });
  });

  it('starts leading again once the reopened window has closed', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 1ms b 10ms c 5ms |');
      expectObservable(source.pipe(throttleLeadingTrailing(5))).toBe('a 4ms b 7ms c 5ms |');
    });
  });

  it('defers completion to flush the trailing value', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab|');
      expectObservable(source.pipe(throttleLeadingTrailing(5))).toBe('a 4ms (b|)');
    });
  });

  it('propagates source errors unchanged', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('ab 2ms #', undefined, boom);
      expectObservable(source.pipe(throttleLeadingTrailing(5))).toBe('a 3ms #', undefined, boom);
    });
  });
});
