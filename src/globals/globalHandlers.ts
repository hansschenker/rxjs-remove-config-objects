import { config } from 'rxjs';
import type { ObservableNotification, Subscriber } from 'rxjs';

/**
 * Installs the library-wide handler for errors no subscriber handles —
 * `GlobalConfig.onUnhandledError` without the settings bag. Pass `null`
 * to restore the default (rethrow on a timeout).
 */
export const onUnhandledError = (handler: ((error: unknown) => void) | null): void => {
  config.onUnhandledError = handler;
};

/**
 * Installs the library-wide handler for notifications that arrive after
 * a subscriber has stopped — `GlobalConfig.onStoppedNotification`
 * without the settings bag. Pass `null` to restore the default (drop
 * them silently). The deprecated GlobalConfig keys have no replacement.
 */
export const onStoppedNotification = (
  handler:
    | ((notification: ObservableNotification<unknown>, subscriber: Subscriber<unknown>) => void)
    | null
): void => {
  config.onStoppedNotification = handler;
};
