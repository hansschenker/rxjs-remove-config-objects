import { share } from 'rxjs';
import type { MonoTypeOperatorFunction, SubjectLike } from 'rxjs';

/**
 * Caches the source through a subject created by `connector`: the source
 * is subscribed on first demand and never torn down, completion is final
 * (late subscribers get the buffered values plus the completion), and
 * the subject's own parameters — buffer size, window time — are folded
 * into the connector value. Errors are deliberately not cached: an error
 * resets the session so the next subscriber restarts the source.
 */
export const shareCachedVia =
  <T>(connector: () => SubjectLike<T>): MonoTypeOperatorFunction<T> =>
    share({
      connector,
      resetOnError: true,
      resetOnComplete: false,
      resetOnRefCountZero: false,
    });
