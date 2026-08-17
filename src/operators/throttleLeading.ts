import { Observable, timer } from 'rxjs';
import type { MonoTypeOperatorFunction, Subscription } from 'rxjs';

/**
 * Emits a value only when no throttle window is open, then opens a window
 * of `due` milliseconds during which every source value is dropped. Values
 * arriving inside the window are lost — surfacing the latest one at the
 * window's end is `throttleTrailing`'s responsibility.
 */
export const throttleLeading =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let windowSubscription: Subscription | null = null;
      const sourceSubscription = source.subscribe({
        next: (value) => {
          if (!windowSubscription) {
            subscriber.next(value);
            windowSubscription = timer(due).subscribe(() => {
              windowSubscription = null;
            });
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
      return () => {
        windowSubscription?.unsubscribe();
        sourceSubscription.unsubscribe();
      };
    });
