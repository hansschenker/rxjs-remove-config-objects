import { Observable, timer, TimeoutError } from 'rxjs';
import type { MonoTypeOperatorFunction, Subscription } from 'rxjs';

/**
 * Errors with `TimeoutError` if the gap between consecutive values exceeds
 * `due` milliseconds. The gap timer only arms after the first value — the
 * window for the first value is `timeoutFirst`'s responsibility, which is
 * what makes `timeoutFirst(a), timeoutEach(b)` reproduce
 * `timeout({ first: a, each: b })` exactly.
 */
export const timeoutEach =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let gapTimer: Subscription | null = null;
      let seen = 0;
      const armGapTimer = (): void => {
        gapTimer = timer(due).subscribe(() =>
          subscriber.error(new TimeoutError({ meta: null, lastValue: null, seen }))
        );
      };
      const sourceSubscription = source.subscribe({
        next: (value) => {
          gapTimer?.unsubscribe();
          seen += 1;
          subscriber.next(value);
          if (!subscriber.closed) {
            armGapTimer();
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
      return () => {
        gapTimer?.unsubscribe();
        sourceSubscription.unsubscribe();
      };
    });
