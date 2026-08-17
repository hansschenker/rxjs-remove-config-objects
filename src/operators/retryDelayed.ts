import { Observable, timer } from 'rxjs';
import type { MonoTypeOperatorFunction, Subscription } from 'rxjs';
import { retryLoop } from './internal/retryLoop';

/**
 * Resubscribes after every error, without limit, waiting `due`
 * milliseconds before each attempt. Limiting the number of attempts is
 * `retryCount`'s responsibility — or fold a limit into a
 * `retryDelayedBy` policy when both are needed at once.
 */
export const retryDelayed =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let notifierSubscription: Subscription | null = null;
      const teardown = retryLoop(
        source,
        subscriber,
        (_error, _attempt, resubscribe) => {
          notifierSubscription = timer(due).subscribe(() => resubscribe());
        },
        false
      );
      return () => {
        notifierSubscription?.unsubscribe();
        teardown();
      };
    });
