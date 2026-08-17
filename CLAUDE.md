# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A library of single-purpose RxJS operators that replace RxJS's config-object APIs. The founding principles are in `docs/project-plan.md`: use currying/partial application instead of option bags, every operator takes exactly **one** parameter, and each operator's name states its single behavior. All ten config objects listed in `docs/rxjs-config-objects.md` are replaced: `TimeoutConfig`, `ThrottleConfig`, `RetryConfig`, `RepeatConfig`, `ShareConfig`, `ShareReplayConfig`, `ConnectConfig` (operators), `WebSocketSubjectConfig`, `AjaxConfig` (creation-function specs in `src/creation/`), and `GlobalConfig` (setters in `src/globals/`).

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
- rxjs is a peerDependency; import everything (operators included) from the `rxjs` root — except the creation specs, which use `rxjs/webSocket` and `rxjs/ajax`.
- `src/creation/` holds the webSocket and ajax spec pipelines (one file per family — many small aspect functions are cohesive, unlike operators); `src/globals/` holds the GlobalConfig setters.

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

### ShareReplayConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `shareReplay(n)` / `shareReplay({bufferSize: n, refCount: false})` | `shareCached(n)` |
| `shareReplay({bufferSize: n, windowTime: ms, refCount: false})` | `shareCachedVia(() => new ReplaySubject(n, ms))` |
| `shareReplay({bufferSize: n, refCount: true})` | `shareVia(() => new ReplaySubject(n))` — no new operator |

The cache lifecycle (`shareCached`/`shareCachedVia`) is: connect on first demand, never disconnect, completion final, errors **not** cached (an error resets so the next subscriber retries — a cache that permanently serves an error would be a footgun, which is also why `ShareConfig`'s `resetOnError: false` stays deliberately unrepresented). The `refCount: true` form needs no operator because after completion every subscriber auto-unsubscribes, making `resetOnComplete: false` unobservable next to the refcount-zero reset — `shareReplayEquivalence.test.ts` proves the reduction against `shareVia`. **Connector-folding** is the new playbook entry: subject constructor parameters (`windowTime`, and the scheduler it needs for virtual time) are value-level concerns folded into the connector factory, never operator parameters. Note: `ReplaySubject` ages `windowTime` values with `Date.now()` unless the scheduler is passed to its constructor — marble tests must pass the `TestScheduler` instance into the connector.

### ConnectConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `connect(selector)` | unchanged (no config) |
| `connect(selector, {connector: fn})` | `connectVia(fn)(selector)` |

The playbook entry here is the **curried operator**: when a config decorates an operator that has a primary non-config parameter (`connect`'s selector), the replacement is curried — configuration stage first (so it can be partially applied: `const connectReplaying = connectVia(() => new ReplaySubject(1))`), primary parameter second. Every stage still takes exactly one parameter.

### WebSocketSubjectConfig & AjaxConfig — the spec/aspect pattern (implemented)

Creation-function configs use a different shape: a **starter** creates an opaque immutable spec, each config key becomes a single-parameter **aspect** (`spec → spec`) composed with rxjs's own `pipe`, and a **terminal** turns the spec into the live thing. The wrapped config object survives internally but never appears in user code.

| Original | Replacement |
|---|---|
| `webSocket({url, ...})` | `openSocket(configure(socketAt<T>(url)))` where `configure = pipe(aspects...)` |
| `protocol`, `serializer`, `deserializer` | `usingProtocol(p)`, `serializingBy(fn)`, `deserializingBy(fn)` |
| `openObserver`/`closeObserver`/`closingObserver` | `onSocketOpen(fn)` / `onSocketClose(fn)` / `onSocketClosing(fn)` |
| `binaryType`, `WebSocketCtor` | `asBinary(t)`, `connectingVia(Ctor)` |
| `ajax({url, ...})` | `sendRequest<T>(configure(requestAt(url)))` |
| `method`, `body`, `headers` | `usingMethod(m)`, `sending(body)`, `usingHeaders(h)` |
| `timeout`, `responseType`, `withCredentials`, `createXHR` | `abortingAfter(ms)`, `expecting(t)`, `sendingCredentials(b)`, `requestingVia(f)` |

Remaining AjaxConfig keys (`queryParams`, `user`/`password`, xsrf, progress flags) follow the same aspect pattern — add them as needed. Boundary note: `headers` and `body` are **data records, not configuration** — an object holding payload data is fine; the project only eliminates behavior bags. The DI keys get `Via` names and are also how the tests work: inject a fake `WebSocketCtor`/`createXHR` and assert on the fake — no network, no jsdom (fabricated events are cast plain objects, since Node lacks `CloseEvent`). Partial application is the payoff: `const asJsonApi = pipe(usingHeaders({accept: 'application/json'}), expecting('json'))` is a reusable client configuration.

### GlobalConfig mapping (implemented)

| Original | Replacement |
|---|---|
| `config.onUnhandledError = fn` | `onUnhandledError(fn)` (in `src/globals/globalHandlers.ts`) |
| `config.onStoppedNotification = fn` | `onStoppedNotification(fn)` |
| deprecated keys (`Promise`, `useDeprecated*`) | dropped, no replacement |

Named single-purpose setters with `on<Event>` names; `null` restores the default. Both rxjs handlers fire via a real `setTimeout`, so tests await a tick and must reset `config` in `afterEach` (it's global mutable state).

## Notes

- Not a git repository yet.
- Timers must be rxjs `timer(...)`, never raw `setTimeout` — `TestScheduler.run()` virtualizes rxjs schedulers only.
