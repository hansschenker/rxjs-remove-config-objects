import { race } from 'rxjs';
import type { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { timeoutSignal } from './internal/timeoutSignal';

/**
 * Errors with `TimeoutError` if the source has not emitted its first value
 * by the absolute wall-clock `deadline`. Inert after the first value.
 */
export const timeoutAt =
  <T>(deadline: Date): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    race(source, timeoutSignal(deadline));
