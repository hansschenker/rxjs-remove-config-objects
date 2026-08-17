import { from, Observable } from 'rxjs';
import type { MonoTypeOperatorFunction, ObservableInput, Subscription } from 'rxjs';
import { repeatLoop } from './internal/repeatLoop';

/**
 * Decides when — and whether — to repeat by asking a policy. `iteration`
 * is 1-based and counts completed runs so far.
 */
export type RepeatDelayPolicy = (iteration: number) => ObservableInput<unknown>;

/**
 * Resubscribes when the observable returned by `policy` emits a value;
 * if it completes without emitting, the output completes (which is how a
 * repeat limit is folded into the policy — return `EMPTY` to stop), and
 * an error thrown by the policy's observable propagates. Replaces the
 * function form of `RepeatConfig`'s `delay` key.
 */
export const repeatDelayedBy =
  <T>(policy: RepeatDelayPolicy): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let notifierSubscription: Subscription | null = null;
      const teardown = repeatLoop(source, subscriber, (iteration, resubscribe) => {
        notifierSubscription?.unsubscribe();
        let repeated = false;
        let notifier: Subscription | null = null;
        notifier = from(policy(iteration)).subscribe({
          next: () => {
            if (!repeated) {
              repeated = true;
              notifier?.unsubscribe();
              resubscribe();
            }
          },
          error: (notifierError) => subscriber.error(notifierError),
          complete: () => {
            if (!repeated) {
              subscriber.complete();
            }
          },
        });
        if (repeated) {
          notifier.unsubscribe();
        } else {
          notifierSubscription = notifier;
        }
      });
      return () => {
        notifierSubscription?.unsubscribe();
        teardown();
      };
    });
