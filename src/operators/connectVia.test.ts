import { map, merge, mergeMap, ReplaySubject, Subject, timer } from 'rxjs';
import type { Observable } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { connectVia } from './connectVia';

describe('connectVia', () => {
  it('multicasts one source subscription across every use inside the selector', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 3ms b 3ms c 3ms |');
      const result = source.pipe(
        connectVia(() => new Subject<string>())((shared) =>
          merge(shared.pipe(map((value) => value.toUpperCase())), shared)
        )
      );

      expectObservable(result).toBe('(Aa)(Bb)(Cc)|', {
        a: 'a',
        b: 'b',
        c: 'c',
        A: 'A',
        B: 'B',
        C: 'C',
      });
      expectSubscriptions(source.subscriptions).toBe('^ 11ms !');
    });
  });

  it('the connector decides what a late use of the shared observable sees', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const lateJoin = (shared: Observable<string>) =>
        merge(shared, timer(5).pipe(mergeMap(() => shared)));

      // ReplaySubject connector: the inner subscription at 5ms gets b replayed
      const replaySource = cold('a 3ms b 3ms c 3ms |');
      expectObservable(
        replaySource.pipe(connectVia(() => new ReplaySubject<string>(1))(lateJoin))
      ).toBe('a 3ms bb 2ms (cc)|');

      // default-style Subject connector: the late subscription sees nothing old
      const plainSource = cold('a 3ms b 3ms c 3ms |');
      expectObservable(
        plainSource.pipe(connectVia(() => new Subject<string>())(lateJoin))
      ).toBe('a 3ms b 3ms (cc)|');
    });
  });

  it('partial application yields a reusable configured connect', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const connectReplaying = connectVia(() => new ReplaySubject<string>(1));

      const first = cold('a 1ms |');
      const second = cold('b 1ms |');
      expectObservable(first.pipe(connectReplaying((shared) => shared))).toBe('a 1ms |');
      expectObservable(second.pipe(connectReplaying((shared) => shared))).toBe('b 1ms |');
    });
  });
});
