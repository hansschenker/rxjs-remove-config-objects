import { Observable, timer } from 'rxjs';
import type { MonoTypeOperatorFunction, Subscription } from 'rxjs';
import { repeatLoop } from './internal/repeatLoop';

/**
 * Resubscribes after every completion, without limit, waiting `due`
 * milliseconds before each run; the first subscription is not delayed.
 * Limiting the number of runs is `repeatCount`'s responsibility — or
 * fold a limit into a `repeatDelayedBy` policy when both are needed at
 * once.
 */
export const repeatDelayed =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let notifierSubscription: Subscription | null = null;
      const teardown = repeatLoop(source, subscriber, (_iteration, resubscribe) => {
        notifierSubscription = timer(due).subscribe(() => resubscribe());
      });
      return () => {
        notifierSubscription?.unsubscribe();
        teardown();
      };
    });
