import { of, timeout, TimeoutError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { makeScheduler } from '../testing/marbles';
import { onTimeout } from './onTimeout';
import { timeoutFirst } from './timeoutFirst';

describe('onTimeout', () => {
  it('switches to the fallback when the source fails with TimeoutError', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('2ms #', undefined, new TimeoutError());
      expectObservable(source.pipe(onTimeout(() => cold('x|')))).toBe('2ms x|');
    });
  });

  it('rethrows other errors and never subscribes the fallback', () => {
    const boom = new Error('boom');
    const fallback = vi.fn(() => of('x'));
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('2ms #', undefined, boom);
      expectObservable(source.pipe(onTimeout(fallback))).toBe('2ms #', undefined, boom);
    });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('recovers from a timeoutFirst failure', () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('10ms a');
      const result = source.pipe(
        timeoutFirst(4),
        onTimeout(() => cold('x|'))
      );
      expectObservable(result).toBe('4ms x|');
    });
  });

  it("also catches TimeoutError raised by rxjs's own timeout operator", () => {
    makeScheduler().run(({ cold, expectObservable }) => {
      const source = cold('10ms a');
      const result = source.pipe(
        timeout({ first: 3 }),
        onTimeout(() => cold('x|'))
      );
      expectObservable(result).toBe('3ms x|');
    });
  });
});
