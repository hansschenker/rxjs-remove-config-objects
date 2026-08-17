import { Observable } from 'rxjs';
import type { MonoTypeOperatorFunction } from 'rxjs';
import { retryLoop } from './internal/retryLoop';

/**
 * Resubscribes immediately on error, giving up only after `count`
 * consecutive failures: every value the source emits resets the
 * allowance. This is `RetryConfig`'s `resetOnSuccess: true`, named for
 * what it does rather than for the flag.
 */
export const retryConsecutive =
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
        true
      )
    );
