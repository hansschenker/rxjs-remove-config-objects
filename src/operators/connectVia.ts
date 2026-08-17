import { connect } from 'rxjs';
import type {
  Observable,
  ObservableInput,
  ObservedValueOf,
  OperatorFunction,
  SubjectLike,
} from 'rxjs';

/**
 * Curried `connect`: fix the subject the source is multicast through,
 * then apply the selector that uses the shared observable. Currying puts
 * the configuration stage first so it can be partially applied — e.g.
 * `const connectReplaying = connectVia(() => new ReplaySubject(1))` —
 * and the primary parameter (the selector) second.
 */
export const connectVia =
  <T>(
    connector: () => SubjectLike<T>
  ): (<O extends ObservableInput<unknown>>(
    selector: (shared: Observable<T>) => O
  ) => OperatorFunction<T, ObservedValueOf<O>>) =>
  (selector) =>
    connect(selector, { connector });
