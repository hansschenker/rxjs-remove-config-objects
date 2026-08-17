import type { Observable, Subscriber, Subscription } from 'rxjs';

/**
 * Shared resubscription engine for the retry and repeat operators. One of
 * the two terminal events triggers the loop: pass `onError` to resubscribe
 * on errors (retry), `onComplete` to resubscribe on completion (repeat);
 * the null one passes through to the subscriber untouched. The handler
 * decides what happens: call `resubscribe` (immediately or later), or push
 * the terminal event to the subscriber itself. `occurrence` is 1-based and
 * counts trigger events so far; when `resetCountOnValue` is set it restarts
 * at every source value, giving consecutive counting. Returns the teardown
 * for the inner subscription; callers add their own teardown for any
 * pending notifier.
 *
 * Handles the synchronous case: a source that errors or completes during
 * `subscribe` re-runs via a flag-and-loop instead of clobbering the
 * subscription reference.
 */
export const resubscribeLoop = <T>(
  source: Observable<T>,
  subscriber: Subscriber<T>,
  onError: ((error: unknown, occurrence: number, resubscribe: () => void) => void) | null,
  onComplete: ((occurrence: number, resubscribe: () => void) => void) | null,
  resetCountOnValue: boolean
): (() => void) => {
  let occurrences = 0;
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
        if (resetCountOnValue) {
          occurrences = 0;
        }
        subscriber.next(value);
      },
      error: (error) => {
        if (onError) {
          occurrences += 1;
          onError(error, occurrences, resubscribe);
        } else {
          subscriber.error(error);
        }
      },
      complete: () => {
        if (onComplete) {
          occurrences += 1;
          onComplete(occurrences, resubscribe);
        } else {
          subscriber.complete();
        }
      },
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
