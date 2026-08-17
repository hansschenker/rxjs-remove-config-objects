import { mergeMap, throwError, timer, TimeoutError } from 'rxjs';
import type { Observable } from 'rxjs';

/**
 * Never emits; errors with rxjs's `TimeoutError` once `due` elapses.
 * The `info` shape matches what rxjs's own `timeout` produces for a
 * first-value timeout, so downstream consumers cannot tell the two apart.
 */
export const timeoutSignal = (due: number | Date): Observable<never> =>
  timer(due).pipe(
    mergeMap(() =>
      throwError(() => new TimeoutError({ meta: null, lastValue: null, seen: 0 }))
    )
  );
