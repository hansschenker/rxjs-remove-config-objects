import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareCached } from './shareCached';

describe('shareCached', () => {
  it('replays the last n values to late subscribers and keeps the source alive', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 1ms d 7ms e');
      const shared = source.pipe(shareCached(2));

      expectObservable(shared, '7ms !').toBe('a 1ms b 1ms c 1ms d');
      // joins at 9ms after everyone left: last two values replayed, then live
      expectObservable(shared, '9ms ^').toBe('9ms (cd) 1ms e');
      // the upstream subscription is never torn down
      expectSubscriptions(source.subscriptions).toBe('^');
    });
  });

  it('completion is final: late subscribers get the buffer plus complete without a restart', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms |');
      const shared = source.pipe(shareCached(1));

      expectObservable(shared).toBe('a 1ms b 1ms |');
      expectObservable(shared, '10ms ^').toBe('10ms (b|)');
      expectSubscriptions(source.subscriptions).toBe('^ 3ms !');
    });
  });

  it('errors are not cached: the next subscriber restarts the source', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const boom = new Error('boom');
      const source = cold('a 1ms #', undefined, boom);
      const shared = source.pipe(shareCached(1));

      expectObservable(shared).toBe('a 1ms #', undefined, boom);
      expectObservable(shared, '10ms ^').toBe('10ms a 1ms #', undefined, boom);
      expectSubscriptions(source.subscriptions).toBe(['^ 1ms !', '10ms ^ 1ms !']);
    });
  });
});
