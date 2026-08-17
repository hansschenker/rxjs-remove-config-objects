import { EMPTY, Observable } from 'rxjs';
import type { MonoTypeOperatorFunction } from 'rxjs';
import { repeatLoop } from './internal/repeatLoop';

/**
 * Runs the source `count` times in total, resubscribing each time it
 * completes; the last completion passes through, and a count of zero
 * yields an empty observable without ever subscribing. Config parity:
 * `repeatCount(n)` counts total runs (like `repeat(n)`), whereas
 * `retryCount(n)` counts retries after the initial run.
 */
export const repeatCount =
  <T>(count: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    count <= 0
      ? EMPTY
      : new Observable<T>((subscriber) =>
          repeatLoop(source, subscriber, (iteration, resubscribe) => {
            if (iteration < count) {
              resubscribe();
            } else {
              subscriber.complete();
            }
          })
        );
