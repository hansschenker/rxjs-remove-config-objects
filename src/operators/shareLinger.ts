import { share, timer } from 'rxjs';
import type { MonoTypeOperatorFunction } from 'rxjs';

/**
 * Shares the source but keeps the upstream connection alive for `due`
 * milliseconds after the last subscriber leaves; a subscriber arriving
 * within that window joins the still-running session instead of
 * restarting the source. Once the window elapses with no subscribers,
 * the connection resets and the next subscriber starts fresh.
 */
export const shareLinger =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
    share({ resetOnRefCountZero: () => timer(due) });
