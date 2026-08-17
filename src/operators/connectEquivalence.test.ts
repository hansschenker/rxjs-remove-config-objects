import { connect, merge, mergeMap, ReplaySubject, Subject, timer } from 'rxjs';
import type { Observable } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { connectVia } from './connectVia';

const lateJoin = (shared: Observable<string>) =>
  merge(shared, timer(5).pipe(mergeMap(() => shared)));

describe('connectVia vs connect(selector, config)', () => {
  it('with a Subject connector it reproduces plain connect and the config form', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const marbles = 'a 3ms b 3ms c 3ms |';
      const expected = 'a 3ms b 3ms (cc)|';

      expectObservable(
        cold(marbles).pipe(connectVia(() => new Subject<string>())(lateJoin))
      ).toBe(expected);
      expectObservable(cold(marbles).pipe(connect(lateJoin))).toBe(expected);
      expectObservable(
        cold(marbles).pipe(connect(lateJoin, { connector: () => new Subject<string>() }))
      ).toBe(expected);
    });
  });

  it('with a ReplaySubject connector it reproduces connect(selector, { connector })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const marbles = 'a 3ms b 3ms c 3ms |';
      const expected = 'a 3ms bb 2ms (cc)|';

      expectObservable(
        cold(marbles).pipe(connectVia(() => new ReplaySubject<string>(1))(lateJoin))
      ).toBe(expected);
      expectObservable(
        cold(marbles).pipe(
          connect(lateJoin, { connector: () => new ReplaySubject<string>(1) })
        )
      ).toBe(expected);
    });
  });
});
