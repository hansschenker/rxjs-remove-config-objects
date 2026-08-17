import { ReplaySubject } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareCachedVia } from './shareCachedVia';

describe('shareCachedVia', () => {
  it('folds windowTime (and the scheduler it needs) into the connector value', () => {
    const scheduler = makeScheduler();
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 6ms b');
      const shared = source.pipe(
        shareCachedVia(() => new ReplaySubject<string>(Infinity, 5, scheduler))
      );

      expectObservable(shared, '8ms !').toBe('a 6ms b');
      // at 10ms, a (age 10) has expired from the 5ms window; b (age 3) replays
      expectObservable(shared, '10ms ^ 5ms !').toBe('10ms b');
      expectSubscriptions(source.subscriptions).toBe('^');
    });
  });
});
