import { share } from 'rxjs';
import type { MonoTypeOperatorFunction, SubjectLike } from 'rxjs';

/**
 * Multicasts the source through a subject created by `connector` — e.g.
 * `() => new ReplaySubject(1)` to hand late subscribers the latest value.
 * The standard share lifecycle applies: the shared session resets on
 * error, on completion, and when the subscriber count drops to zero
 * (extending that last window is `shareLinger`'s responsibility).
 */
export const shareVia =
  <T>(connector: () => SubjectLike<T>): MonoTypeOperatorFunction<T> =>
    share({ connector });
