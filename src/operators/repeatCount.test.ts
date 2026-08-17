import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { repeatCount } from './repeatCount';

describe('repeatCount', () => {
  it('runs the source count times in total, then completes', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('ab|');
      expectObservable(source.pipe(repeatCount(3))).toBe('ababab|');
    });
  });

  it('completes empty for a count of zero without subscribing', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('ab|');
      expectObservable(source.pipe(repeatCount(0))).toBe('|');
      expectSubscriptions(source.subscriptions).toBe([]);
    });
  });

  it('propagates source errors unchanged and stops repeating', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const boom = new Error('boom');
      const source = cold('a#', undefined, boom);
      expectObservable(source.pipe(repeatCount(3))).toBe('a#', undefined, boom);
    });
  });
});
