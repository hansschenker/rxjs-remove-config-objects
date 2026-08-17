import type { Observable, Subscriber, Subscription } from 'rxjs';

/**
 * Shared resubscription engine for the retry operators. On each source
 * error, `onError` decides what happens: call `resubscribe` (immediately
 * or later) to retry, or push the error/completion to the subscriber
 * itself. `attempt` is 1-based and counts errors so far; when
 * `resetAttemptsOnValue` is set it restarts at every source value, giving
 * consecutive-failure counting. Returns the teardown for the inner
 * subscription; callers add their own teardown for any pending notifier.
 *
 * Handles the synchronous-error case: a source that errors during
 * `subscribe` retries via a flag-and-loop instead of clobbering the
 * subscription reference.
 */
export const retryLoop = <T>(
  source: Observable<T>,
  subscriber: Subscriber<T>,
  onError: (error: unknown, attempt: number, resubscribe: () => void) => void,
  resetAttemptsOnValue: boolean
): (() => void) => {
  let attempts = 0;
  let innerSubscription: Subscription | null = null;
  let resubscribeSync = false;

  const resubscribe = (): void => {
    if (innerSubscription) {
      innerSubscription.unsubscribe();
      innerSubscription = null;
      subscribeToSource();
    } else {
      resubscribeSync = true;
    }
  };

  const subscribeToSource = (): void => {
    innerSubscription = source.subscribe({
      next: (value) => {
        if (resetAttemptsOnValue) {
          attempts = 0;
        }
        subscriber.next(value);
      },
      error: (error) => {
        attempts += 1;
        onError(error, attempts, resubscribe);
      },
      complete: () => subscriber.complete(),
    });
    if (resubscribeSync) {
      resubscribeSync = false;
      innerSubscription.unsubscribe();
      innerSubscription = null;
      subscribeToSource();
    }
  };

  subscribeToSource();
  return () => {
    innerSubscription?.unsubscribe();
  };
};
