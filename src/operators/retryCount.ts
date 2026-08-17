import { Observable } from 'rxjs';
import type { MonoTypeOperatorFunction } from 'rxjs';
import { retryLoop } from './internal/retryLoop';

/**
 * Resubscribes immediately on error, up to `count` times, counting every
 * failure regardless of values emitted in between. The `count + 1`-th
 * error propagates. Counting only consecutive failures is
 * `retryConsecutive`'s responsibility.
 */
export const retryCount =
  <T>(count: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) =>
      retryLoop(
        source,
        subscriber,
        (error, attempt, resubscribe) => {
          if (attempt <= count) {
            resubscribe();
          } else {
            subscriber.error(error);
          }
        },
        false
      )
    );
