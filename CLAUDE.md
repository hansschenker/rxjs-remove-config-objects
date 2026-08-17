# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A library of single-purpose RxJS operators that replace RxJS's config-object APIs. The founding principles are in `docs/project-plan.md`: use currying/partial application instead of option bags, every operator takes exactly **one** parameter, and each operator's name states its single behavior. `docs/rxjs-config-objects.md` lists the config objects still to be replaced (ShareReplayConfig, ConnectConfig, ...); `TimeoutConfig`, `ThrottleConfig`, `RetryConfig`, `RepeatConfig`, and `ShareConfig` are done.

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

### RetryConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `retry(n)` / `retry({count: n})` | `retryCount(n)` |
| `retry({count: n, resetOnSuccess: true})` | `retryConsecutive(n)` |
| `retry({delay: ms})` | `retryDelayed(ms)` |
| `retry({delay: (err, i) => notifier})` | `retryDelayedBy((err, i) => notifier)` |
| `retry({count: n, delay: ms})` | `retryDelayedBy((err, i) => (i <= n ? timer(ms) : throwError(() => err)))` |

Rule 2 twice: `resetOnSuccess` is named for its behavior (`Consecutive` — give up only after n consecutive value-less failures), and the function form of `delay` is a different concept than the number form, so it gets `DelayedBy` (the `...By` suffix = "driven by a factory/policy"). The `count + delay` combination is rule 6 resolved at the **value level**: retries can't nest (piping two retry operators multiplies attempts), so the limit folds into the `RetryDelayPolicy` function itself — rethrow to give up, complete to complete the output. `retryEquivalence.test.ts` proves the folded policy identical to `retry({count, delay})`.

### RepeatConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `repeat(n)` / `repeat({count: n})` | `repeatCount(n)` |
| `repeat({delay: ms})` | `repeatDelayed(ms)` |
| `repeat({delay: (i) => notifier})` | `repeatDelayedBy((i) => notifier)` |
| `repeat({count: n, delay: ms})` | `repeatDelayedBy((i) => (i < n ? timer(ms) : EMPTY))` |

RetryConfig's mirror image with error and complete swapped. The fold-to-stop move swaps accordingly: a `RetryDelayPolicy` gives up by **rethrowing**, a `RepeatDelayPolicy` stops by **completing** (return `EMPTY`). Config parity carried over deliberately: `repeatCount(n)` counts total runs while `retryCount(n)` counts retries after the initial run, and `repeatCount(0)` is empty without subscribing. All retry/repeat operators share `src/operators/internal/resubscribeLoop.ts` (which also handles sources that terminate synchronously during subscribe) via the thin `retryLoop`/`repeatLoop` adapters.

### ShareConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `share({connector: fn})` | `shareVia(fn)` |
| `share({resetOnRefCountZero: () => timer(ms)})` | `shareLinger(ms)` |
| `share({resetOnRefCountZero: () => obs})` | `shareLingerBy(() => obs)` |
| `share({resetOnRefCountZero: false})` | `shareLingerBy(() => NEVER)` |
| `share({resetOnError: false})`, `share({resetOnComplete: false})` | deferred — see below |

Two additions to the playbook. First, **booleans fold into policies as degenerate values**: every ShareConfig reset key is `boolean \| (() => Observable)`, and `false ≡ () => NEVER` (never reset) while `true` is the default needing no operator — so the boolean forms need no operators of their own. Second, the share operators **delegate to rxjs's `share(config)` internally** (unlike timeout/throttle/retry/repeat, which are standalone): multicast lifecycle is subtle, battle-tested code, and reimplementing it adds risk without adding API clarity — the config object still disappears from every call site, which is the goal. Share operators cannot combine with each other (one shared connection — rule 6); the multi-key combinations people actually use (`connector: ReplaySubject` + `resetOnComplete: false` + `resetOnRefCountZero: false`) are exactly `shareReplay`, so `resetOnError`/`resetOnComplete` non-defaults are deferred to the ShareReplayConfig round. Share tests use multiple `expectObservable(shared, subscriptionMarble)` calls against one shared instance plus `expectSubscriptions` on the source to prove single-connection behavior — subtle detail: in a subscription marble like `'5ms ^ 4ms !'` the `^` occupies a frame, so `!` lands at frame 10, not 9.

## Notes

- Not a git repository yet.
- Timers must be rxjs `timer(...)`, never raw `setTimeout` — `TestScheduler.run()` virtualizes rxjs schedulers only.
