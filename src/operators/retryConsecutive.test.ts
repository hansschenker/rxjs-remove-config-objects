import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { retryConsecutive } from './retryConsecutive';

describe('retryConsecutive', () => {
  it('resets the allowance whenever the source emits a value', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a#');
      // every attempt emits a value before failing, so it retries forever
      expectObservable(source.pipe(retryConsecutive(1)), '5ms !').toBe('aaaaa');
    });
  });

  it('gives up after count consecutive value-less failures', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('1ms #', undefined, boom);
      expectObservable(source.pipe(retryConsecutive(2))).toBe('3ms #', undefined, boom);
    });
  });
});
