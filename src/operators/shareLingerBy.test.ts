import { NEVER } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { shareLingerBy } from './shareLingerBy';

describe('shareLingerBy', () => {
  it('with a never-emitting policy, the connection outlives every subscriber', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 1ms d 20ms e');
      const shared = source.pipe(shareLingerBy(() => NEVER));

      expectObservable(shared, '3ms !').toBe('a 1ms b');
      // rejoins long after everyone left — same session, still running
      expectObservable(shared, '10ms ^ 20ms !').toBe('27ms e');
      // the upstream subscription is never torn down
      expectSubscriptions(source.subscriptions).toBe('^');
    });
  });

  it('disconnects when the policy emits, and a returning subscriber cancels it', () => {
    makeScheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold('a 1ms b 1ms c 1ms d 1ms e');
      const shared = source.pipe(shareLingerBy(() => cold('5ms x')));

      expectObservable(shared, '3ms !').toBe('a 1ms b');
      expectObservable(shared, '5ms ^ 4ms !').toBe('6ms d 1ms e');
      expectSubscriptions(source.subscriptions).toBe('^ 14ms !');
    });
  });
});
