import { catchError, throwError, TimeoutError } from 'rxjs';
import type { Observable, ObservableInput, ObservedValueOf, OperatorFunction } from 'rxjs';

/**
 * Catches `TimeoutError` — and only `TimeoutError` — and switches to the
 * fallback. Every other error is rethrown untouched. Place it after the
 * timeout operators in the pipe; it replaces the `with:` key of
 * `TimeoutConfig`, and also catches timeouts raised by rxjs's own
 * `timeout` operator.
 */
export const onTimeout =
  <T, F extends ObservableInput<unknown>>(
    fallback: () => F
  ): OperatorFunction<T, T | ObservedValueOf<F>> =>
  (source: Observable<T>): Observable<T | ObservedValueOf<F>> =>
    source.pipe(
      catchError((error: unknown) =>
        error instanceof TimeoutError ? fallback() : throwError(() => error)
      )
    );
