import { ReplaySubject } from 'rxjs';
import type { MonoTypeOperatorFunction } from 'rxjs';
import { shareCachedVia } from './shareCachedVia';

/**
 * Caches the last `bufferSize` values for every current and future
 * subscriber: the source is subscribed on first demand and stays alive,
 * completion is final, and errors are not cached (the next subscriber
 * restarts the source). This is `shareReplay(n)` without the config
 * object; the disconnect-when-idle variant is `shareVia(() => new
 * ReplaySubject(n))`, and expiring buffers are `shareCachedVia`'s
 * responsibility.
 */
export const shareCached =
  <T>(bufferSize: number): MonoTypeOperatorFunction<T> =>
    shareCachedVia<T>(() => new ReplaySubject<T>(bufferSize));
