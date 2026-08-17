import { from, share } from 'rxjs';
import type { MonoTypeOperatorFunction, ObservableInput } from 'rxjs';

/**
 * Decides how long a shared connection outlives its last subscriber: the
 * policy's observable is subscribed when the count drops to zero, and
 * its first emission disconnects the source.
 */
export type ShareLingerPolicy = () => ObservableInput<unknown>;

/**
 * Shares the source, disconnecting after the last subscriber leaves only
 * when the observable returned by `policy` emits; a subscriber arriving
 * first cancels the pending disconnect. `() => NEVER` lingers forever —
 * the fold for `resetOnRefCountZero: false`. The fixed-duration case is
 * `shareLinger`'s responsibility.
 */
export const shareLingerBy =
  <T>(policy: ShareLingerPolicy): MonoTypeOperatorFunction<T> =>
    share({ resetOnRefCountZero: () => from(policy()) });
