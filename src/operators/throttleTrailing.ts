import { Observable, timer } from 'rxjs';
import type { MonoTypeOperatorFunction, Subscription } from 'rxjs';

/**
 * Opens a `due`-millisecond window when a value arrives and emits the
 * latest value received when the window closes, reopening the window after
 * each emission. The window-opening value itself is not emitted on arrival —
 * that is `throttleLeading`'s responsibility. If the source completes while
 * a value is pending, completion waits for the window to flush it.
 */
export const throttleTrailing =
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
          hasPending = true;
          pending = value;
          if (!windowSubscription) {
            openWindow();
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
