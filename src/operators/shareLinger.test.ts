import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareLinger } from './shareLinger';

describe('shareLinger', () => {
  it('keeps the connection alive across a subscriber gap shorter than the linger', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 1ms d 1ms e');
      const shared = source.pipe(shareLinger(5));

      expectObservable(shared, '3ms !').toBe('a 1ms b');
      // rejoins at 5ms — inside the linger window — so the session is still live
      expectObservable(shared, '5ms ^ 4ms !').toBe('6ms d 1ms e');
      // a single upstream subscription, torn down 5ms after the last unsubscribe at 10ms
      expectSubscriptions(source.subscriptions).toBe('^ 14ms !');
    });
  });

  it('disconnects once the linger elapses and restarts fresh for the next subscriber', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 1ms d 1ms e');
      const shared = source.pipe(shareLinger(5));

      expectObservable(shared, '3ms !').toBe('a 1ms b');
      expectObservable(shared, '5ms ^ 4ms !').toBe('6ms d 1ms e');
      // arrives at 20ms, well past the 15ms teardown — fresh session
      expectObservable(shared, '20ms ^ 3ms !').toBe('20ms a 1ms b');
      expectSubscriptions(source.subscriptions).toBe(['^ 14ms !', '20ms ^ 8ms !']);
    });
  });
});
