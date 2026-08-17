import { ReplaySubject } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareVia } from './shareVia';

describe('shareVia', () => {
  it('multicasts one source subscription through the connector subject', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 2ms |');
      const shared = source.pipe(shareVia(() => new ReplaySubject<string>(1)));

      // first subscriber sees everything live
      expectObservable(shared).toBe('a 1ms b 1ms c 2ms |');
      // a late subscriber gets the latest value replayed, then goes live
      expectObservable(shared, '3ms ^').toBe('3ms bc 2ms |');
      // one upstream subscription serves both
      expectSubscriptions(source.subscriptions).toBe('^ 6ms !');
    });
  });

  it('resets after completion so the next subscriber starts a fresh session', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 2ms |');
      const shared = source.pipe(shareVia(() => new ReplaySubject<string>(1)));

      expectObservable(shared).toBe('a 1ms b 1ms c 2ms |');
      expectObservable(shared, '10ms ^').toBe('10ms a 1ms b 1ms c 2ms |');
      expectSubscriptions(source.subscriptions).toBe(['^ 6ms !', '10ms ^ 6ms !']);
    });
  });
});
