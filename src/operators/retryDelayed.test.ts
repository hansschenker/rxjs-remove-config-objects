import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { retryDelayed } from './retryDelayed';

describe('retryDelayed', () => {
  it('waits the delay before each resubscription and never gives up', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a#');
      expectObservable(source.pipe(retryDelayed(5)), '14ms !').toBe('a 5ms a 5ms a');
    });
  });

  it('passes a completing source through untouched', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab|');
      expectObservable(source.pipe(retryDelayed(5))).toBe('ab|');
    });
  });
});
