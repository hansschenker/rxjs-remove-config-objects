import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { retryCount } from './retryCount';

describe('retryCount', () => {
  it('resubscribes on error up to count times, then propagates', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('ab#', undefined, boom);
      expectObservable(source.pipe(retryCount(2))).toBe('ababab#', undefined, boom);
    });
  });

  it('counts every failure, even when values arrive in between', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a#', undefined, boom);
      expectObservable(source.pipe(retryCount(1))).toBe('aa#', undefined, boom);
    });
  });

  it('passes a completing source through untouched', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab|');
      expectObservable(source.pipe(retryCount(2))).toBe('ab|');
    });
  });
});
