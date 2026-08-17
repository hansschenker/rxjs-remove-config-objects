import { Observable, timer } from 'rxjs';
import type { MonoTypeOperatorFunction, Subscription } from 'rxjs';

/**
 * Emits the first value of a burst immediately, then the latest value
 * received when the `due`-millisecond window closes, reopening the window
 * after each trailing emission.
 *
 * This is one operator rather than `throttleLeading` piped into
 * `throttleTrailing` because both edges share a single throttle window —
 * piping would create two independent windows and different timing
 * (naming-scheme rule 6: non-composable keys form one named policy).
 * If the source completes while a value is pending, completion waits for
 * the window to flush it.
 */
export const throttleLeadingTrailing =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let windowSubscription: Subscription | null = null;
      let hasPending = false;
      let pending: T | undefined;
      let completed = false;

      const openWindow = (): void => {
        windowSubscription = timer(due).subscribe(() => {
          windowSubscription = null;
          if (hasPending) {
            const value = pending as T;
            hasPending = false;
            pending = undefined;
            subscriber.next(value);
            if (!completed) {
              openWindow();
            }
          }
          if (completed) {
            subscriber.complete();
          }
        });
      };

      const sourceSubscription = source.subscribe({
        next: (value) => {
          if (!windowSubscription) {
            subscriber.next(value);
            openWindow();
          } else {
            hasPending = true;
            pending = value;
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => {
          completed = true;
          if (!(windowSubscription && hasPending)) {
            subscriber.complete();
          }
        },
      });

      return () => {
        windowSubscription?.unsubscribe();
        sourceSubscription.unsubscribe();
      };
    });
