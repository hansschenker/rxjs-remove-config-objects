import { race } from 'rxjs';
import type { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { timeoutSignal } from './internal/timeoutSignal';

/**
 * Errors with `TimeoutError` if the source has not emitted its first value
 * within `due` milliseconds of subscription. Inert after the first value —
 * gaps between later values are `timeoutEach`'s responsibility.
 */
export const timeoutFirst =
  <T>(due: number): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> =>
    race(source, timeoutSignal(due));
