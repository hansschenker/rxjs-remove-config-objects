import { config, Observable } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { onStoppedNotification, onUnhandledError } from './globalHandlers';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('global handlers', () => {
  afterEach(() => {
    config.onUnhandledError = null;
    config.onStoppedNotification = null;
  });

  it('onUnhandledError installs the handler for errors no subscriber handles', async () => {
    const seen: unknown[] = [];
    onUnhandledError((error) => seen.push(error));

    const boom = new Error('boom');
    new Observable(() => {
      throw boom;
    }).subscribe({ next: () => {} });

    await tick();
    expect(seen).toEqual([boom]);
  });

  it('onStoppedNotification installs the handler for post-terminal notifications', async () => {
    const kinds: string[] = [];
    onStoppedNotification((notification) => kinds.push(notification.kind));

    new Observable<number>((subscriber) => {
      subscriber.complete();
      subscriber.next(1);
    }).subscribe();

    await tick();
    expect(kinds).toEqual(['N']);
  });
});
