import { throttleTime } from 'rxjs';
import { describe, it } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { throttleLeading } from './throttleLeading';
import { throttleLeadingTrailing } from './throttleLeadingTrailing';
import { throttleTrailing } from './throttleTrailing';

describe('single-purpose throttle operators vs throttleTime(config)', () => {
  it('throttleLeading reproduces the throttleTime default', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('abcd 20ms e 2ms |');
      const expected = 'a 23ms e 2ms |';
      expectObservable(source.pipe(throttleLeading(5))).toBe(expected);
      expectObservable(source.pipe(throttleTime(5))).toBe(expected);
    });
  });

  it('throttleTrailing reproduces throttleTime({ leading: false, trailing: true })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('a 5ms b 10ms |');
      const expected = '5ms a 4ms b 6ms |';
      expectObservable(source.pipe(throttleTrailing(5))).toBe(expected);
      expectObservable(
        source.pipe(throttleTime(5, undefined, { leading: false, trailing: true }))
      ).toBe(expected);
    });
  });

  it('throttleLeadingTrailing reproduces throttleTime({ leading: true, trailing: true })', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('abcd 20ms |');
      const expected = 'a 4ms d 18ms |';
      expectObservable(source.pipe(throttleLeadingTrailing(5))).toBe(expected);
      expectObservable(
        source.pipe(throttleTime(5, undefined, { leading: true, trailing: true }))
      ).toBe(expected);
    });
  });
});
