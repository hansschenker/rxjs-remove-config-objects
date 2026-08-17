# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A library of single-purpose RxJS operators that replace RxJS's config-object APIs. The founding principles are in `docs/project-plan.md`: use currying/partial application instead of option bags, every operator takes exactly **one** parameter, and each operator's name states its single behavior. `docs/rxjs-config-objects.md` lists the config objects still to be replaced (ShareConfig, RetryConfig, ...); `TimeoutConfig` and `ThrottleConfig` are done.

## Commands

- `npm test` — run all Vitest tests once
- `npm test -- timeoutEach` — run a single test file (matches on file name)
- `npm run test:watch` — Vitest watch mode
- `npm run typecheck` — `tsc --noEmit`; tsup does **not** typecheck, so run this before considering a change done
- `npm run build` — tsup → `dist/` (ESM + CJS + `.d.ts`)

## Architecture

- One operator per file in `src/operators/<name>.ts`, re-exported from `src/index.ts` (the only tsup entry). Shared non-public helpers go in `src/operators/internal/`.
- Tests are co-located as `src/operators/<name>.test.ts`, using marble syntax via `makeScheduler()` from `src/testing/marbles.ts`. That helper exists because Vitest's `toEqual` compares Error stacks; it normalizes errors to `{name, message, info}` — always use it, never construct a raw `TestScheduler`.
- `src/operators/timeoutEquivalence.test.ts` proves that composed single-purpose operators reproduce the original config-object operator marble-for-marble, including the `TimeoutError.info` shape. Every future config-object replacement should get an equivalence test like this.
- rxjs is a peerDependency; import everything (operators included) from the `rxjs` root.

## The naming scheme (applies to every config object)

1. **One behavioral axis → one operator**, named `<operator><Axis>` with the config key in PascalCase: `first` → `timeoutFirst(ms)`, `each` → `timeoutEach(ms)`.
2. **A key that overloads two meanings splits by meaning, not by key**: `first: number` → `timeoutFirst(ms)`, but `first: Date` → `timeoutAt(date)` (an absolute deadline is a different concept than a relative window).
3. **Recovery keys (`with`) become one `on<Event>` operator** placed after the signaling operators in the pipe: `onTimeout(fallbackFactory)`. Never create `<op>With` variants per axis — that reintroduces the combinatorial explosion the config object was hiding.
4. **Plumbing keys (`scheduler`, `meta`) are dropped.**
5. **Combining behaviors = piping operators**, never adding parameters; every operator keeps exactly one parameter.
6. **Composability test before splitting**: only split keys that piping can actually reproduce. Keys that interact (e.g. RetryConfig's `count` + `delay` — piping two retries multiplies attempts) are parameters of one policy; name the policy instead.

### TimeoutConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `timeout(ms)` / `timeout({each: ms})` | `timeoutFirst(ms), timeoutEach(ms)` — the config's implicit `first := each` default made explicit |
| `timeout({first: ms})` | `timeoutFirst(ms)` |
| `timeout({first: date})` | `timeoutAt(date)` |
| `timeout({first, each})` | `timeoutFirst(first), timeoutEach(each)` |
| `... with: () => f$` | append `onTimeout(() => f$)` |

The semantic contract that makes composition exact: `timeoutEach` arms its gap timer only **after** the first value — the first-value window belongs exclusively to `timeoutFirst`/`timeoutAt`. All three raise rxjs's own `TimeoutError` with the same `info` shape rxjs produces, so `onTimeout` also catches timeouts from rxjs's native `timeout` operator.

### ThrottleConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `throttleTime(ms)` (default `{leading: true, trailing: false}`) | `throttleLeading(ms)` |
| `throttleTime(ms, s, {leading: false, trailing: true})` | `throttleTrailing(ms)` |
| `throttleTime(ms, s, {leading: true, trailing: true})` | `throttleLeadingTrailing(ms)` |

`throttleLeadingTrailing` is rule 6 in action: both edges share a **single** throttle window, so piping `throttleLeading` into `throttleTrailing` would create two independent windows and different timing — the combination is one named policy, not a composition. `{leading: false, trailing: false}` emits nothing and is deliberately unrepresentable. The duration-selector variant `throttle(durationSelector, config)` is not covered yet; when it is, it should follow the same scheme (e.g. a `...By(durationSelector)` suffix).

## Notes

- Not a git repository yet.
- Timers must be rxjs `timer(...)`, never raw `setTimeout` — `TestScheduler.run()` virtualizes rxjs schedulers only.
