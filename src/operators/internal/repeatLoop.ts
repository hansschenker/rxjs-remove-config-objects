import type { Observable, Subscriber } from 'rxjs';
import { resubscribeLoop } from './resubscribeLoop';

/**
 * Resubscription engine triggered by source completion — errors pass
 * through. `iteration` is the 1-based count of completed runs; see
 * `resubscribeLoop` for the mechanics.
 */
export const repeatLoop = <T>(
  source: Observable<T>,
  subscriber: Subscriber<T>,
  onComplete: (iteration: number, resubscribe: () => void) => void
): (() => void) => resubscribeLoop(source, subscriber, null, onComplete, false);
