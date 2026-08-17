import { from, Observable } from 'rxjs';
import type { MonoTypeOperatorFunction, ObservableInput, Subscription } from 'rxjs';
import { retryLoop } from './internal/retryLoop';

/**
 * Decides when — and whether — to retry by asking a policy. `attempt` is
 * 1-based and counts errors so far.
 */
export type RetryDelayPolicy = (error: unknown, attempt: number) => ObservableInput<unknown>;

/**
 * Resubscribes when the observable returned by `policy` emits a value;
 * an error thrown by the policy's observable propagates (which is how a
 * retry limit is folded into the policy), and if it completes without
 * emitting, the output completes. Replaces the function form of
 * `RetryConfig`'s `delay` key.
 */
export const retryDelayedBy =
  <T>(policy: RetryDelayPolicy): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let notifierSubscription: Subscription | null = null;
      const teardown = retryLoop(
        source,
        subscriber,
        (error, attempt, resubscribe) => {
          notifierSubscription?.unsubscribe();
          let retried = false;
          let notifier: Subscription | null = null;
          notifier = from(policy(error, attempt)).subscribe({
            next: () => {
              if (!retried) {
                retried = true;
                notifier?.unsubscribe();
                resubscribe();
              }
            },
            error: (notifierError) => subscriber.error(notifierError),
            complete: () => {
              if (!retried) {
                subscriber.complete();
              }
            },
          });
          if (retried) {
            notifier.unsubscribe();
          } else {
            notifierSubscription = notifier;
          }
        },
        false
      );
      return () => {
        notifierSubscription?.unsubscribe();
        teardown();
      };
    });
