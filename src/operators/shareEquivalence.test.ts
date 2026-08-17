import { NEVER, ReplaySubject, share, timer } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareLinger } from './shareLinger';
import { shareLingerBy } from './shareLingerBy';
import { shareVia } from './shareVia';

describe('single-purpose share operators vs share(config)', () => {
  it('shareVia reproduces share({ connector })', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const marbles = 'a 1ms b 1ms c 2ms |';
      const viaSource = cold(marbles);
      const configSource = cold(marbles);
      const via = viaSource.pipe(shareVia(() => new ReplaySubject<string>(1)));
      const configured = configSource.pipe(
        share({ connector: () => new ReplaySubject<string>(1) })
      );

      for (const shared of [via, configured]) {
        expectObservable(shared).toBe('a 1ms b 1ms c 2ms |');
        expectObservable(shared, '3ms ^').toBe('3ms bc 2ms |');
      }
      expectSubscriptions(viaSource.subscriptions).toBe('^ 6ms !');
      expectSubscriptions(configSource.subscriptions).toBe('^ 6ms !');
    });
  });

  it('shareLinger reproduces share({ resetOnRefCountZero: () => timer(ms) })', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const marbles = 'a 1ms b 1ms c 1ms d 1ms e';
      const lingerSource = cold(marbles);
      const configSource = cold(marbles);
      const linger = lingerSource.pipe(shareLinger(5));
      const configured = configSource.pipe(share({ resetOnRefCountZero: () => timer(5) }));

      for (const shared of [linger, configured]) {
        expectObservable(shared, '3ms !').toBe('a 1ms b');
        expectObservable(shared, '5ms ^ 4ms !').toBe('6ms d 1ms e');
      }
      expectSubscriptions(lingerSource.subscriptions).toBe('^ 14ms !');
      expectSubscriptions(configSource.subscriptions).toBe('^ 14ms !');
    });
  });

  it('shareLingerBy(() => NEVER) reproduces share({ resetOnRefCountZero: false })', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const marbles = 'a 1ms b 1ms c 1ms d 20ms e';
      const lingerSource = cold(marbles);
      const configSource = cold(marbles);
      const linger = lingerSource.pipe(shareLingerBy(() => NEVER));
      const configured = configSource.pipe(share({ resetOnRefCountZero: false }));

      for (const shared of [linger, configured]) {
        expectObservable(shared, '3ms !').toBe('a 1ms b');
        expectObservable(shared, '10ms ^ 20ms !').toBe('27ms e');
      }
      expectSubscriptions(lingerSource.subscriptions).toBe('^');
      expectSubscriptions(configSource.subscriptions).toBe('^');
    });
  });
});
