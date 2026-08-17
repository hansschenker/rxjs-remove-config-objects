import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { repeatDelayed } from './repeatDelayed';

describe('repeatDelayed', () => {
  it('waits the delay before each rerun, does not delay the first, and never stops', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a|');
      expectObservable(source.pipe(repeatDelayed(5)), '14ms !').toBe('a 5ms a 5ms a');
    });
  });

  it('propagates source errors unchanged', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a#', undefined, boom);
      expectObservable(source.pipe(repeatDelayed(5))).toBe('a#', undefined, boom);
    });
  });
});
