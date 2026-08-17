import type { Observable, Subscriber } from 'rxjs';
import { resubscribeLoop } from './resubscribeLoop';

/**
 * Resubscription engine triggered by source errors — completion passes
 * through. `attempt` is the 1-based count of errors so far; see
 * `resubscribeLoop` for the mechanics.
 */
export const retryLoop = <T>(
  source: Observable<T>,
  subscriber: Subscriber<T>,
  onError: (error: unknown, attempt: number, resubscribe: () => void) => void,
  resetAttemptsOnValue: boolean
): (() => void) => resubscribeLoop(source, subscriber, onError, null, resetAttemptsOnValue);
