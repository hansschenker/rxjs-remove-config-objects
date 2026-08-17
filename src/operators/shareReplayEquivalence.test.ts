import { ReplaySubject, shareReplay } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareCached } from './shareCached';
import { shareVia } from './shareVia';

describe('single-purpose cache operators vs shareReplay(config)', () => {
  it('shareCached reproduces shareReplay(n) and shareReplay({ bufferSize, refCount: false })', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const marbles = 'a 1ms b 1ms |';
      const sources = [cold(marbles), cold(marbles), cold(marbles)];
      const variants = [
        sources[0]!.pipe(shareCached(1)),
        sources[1]!.pipe(shareReplay(1)),
        sources[2]!.pipe(shareReplay({ bufferSize: 1, refCount: false })),
      ];

      for (const shared of variants) {
        expectObservable(shared).toBe('a 1ms b 1ms |');
        expectObservable(shared, '10ms ^').toBe('10ms (b|)');
      }
      for (const source of sources) {
        expectSubscriptions(source.subscriptions).toBe('^ 3ms !');
      }
    });
  });

  it('shareReplay({ refCount: true }) reduces to shareVia(() => new ReplaySubject(n)) — no new operator', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const marbles = 'a 1ms b 1ms c 1ms d 1ms e';
      const viaSource = cold(marbles);
      const configSource = cold(marbles);
      const via = viaSource.pipe(shareVia(() => new ReplaySubject<string>(1)));
      const configured = configSource.pipe(shareReplay({ bufferSize: 1, refCount: true }));

      for (const shared of [via, configured]) {
        expectObservable(shared, '3ms !').toBe('a 1ms b');
        // fresh session after the idle reset at 3ms
        expectObservable(shared, '6ms ^ 3ms !').toBe('6ms a 1ms b');
        // a joiner during the second session gets the buffered value replayed
        expectObservable(shared, '7ms ^ 2ms !').toBe('7ms ab');
      }
      expectSubscriptions(viaSource.subscriptions).toBe(['^ 2ms !', '6ms ^ 3ms !']);
      expectSubscriptions(configSource.subscriptions).toBe(['^ 2ms !', '6ms ^ 3ms !']);
    });
  });
});
