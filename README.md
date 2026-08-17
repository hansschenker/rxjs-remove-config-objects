# rxjs-remove-config-objects

Single-purpose, single-parameter RxJS operators that replace every config-object API in RxJS 7 — built on currying and partial application instead of option bags.

```ts
// before: one operator, four responsibilities, hidden defaults
source$.pipe(
  timeout({ first: 5000, each: 1000, with: () => fallback$ })
);

// after: each behavior named, combined by piping
source$.pipe(
  timeoutFirst(5000),
  timeoutEach(1000),
  onTimeout(() => fallback$),
);
```

Every operator takes **exactly one parameter**, its name states its **single responsibility**, and every replacement is pinned to the original config form by marble **equivalence tests** (90 tests total).

## The naming scheme

1. **One behavioral axis → one operator**, named `<operator><Axis>` with the config key in PascalCase: `first` → `timeoutFirst(ms)`, `each` → `timeoutEach(ms)`, `leading` → `throttleLeading(ms)`.
2. **A key that overloads two meanings splits by meaning, not by key**: `timeout({first: number})` → `timeoutFirst(ms)`, but `timeout({first: Date})` → `timeoutAt(date)` — a wall-clock deadline is a different concept than a relative window. Likewise `retry({delay: ms})` → `retryDelayed(ms)` vs `retry({delay: fn})` → `retryDelayedBy(policy)`.
3. **Recovery keys (`with`) become one `on<Event>` operator** placed after the signaling operators: `onTimeout(fallback)`. Never per-axis `...With` variants — that combinatorial explosion is exactly what the config object was hiding.
4. **Plumbing keys (`scheduler`, `meta`, deprecated keys) are dropped.**
5. **Combining behaviors = piping operators**, never adding parameters.
6. **Composability test before splitting**: only split keys that piping can reproduce. Keys that interact — retry's `count` + `delay` (nesting retries multiplies attempts), throttle's `leading` + `trailing` (both edges share one window) — form a single named policy (`throttleLeadingTrailing`) or fold into a policy *value* (see below).

### Suffix vocabulary

| Suffix | Meaning | Examples |
|---|---|---|
| axis name | the config key's behavior | `timeoutFirst`, `timeoutEach`, `throttleLeading`, `retryCount`, `repeatDelayed` |
| by meaning | when the key name lies | `timeoutAt` (absolute), `retryConsecutive` (= `resetOnSuccess`), `shareLinger`, `shareCached` |
| `By` | driven by a policy/factory function | `retryDelayedBy`, `repeatDelayedBy`, `shareLingerBy` |
| `Via` | through a conduit — a subject or injected implementation | `shareVia`, `connectVia`, `connectingVia`, `requestingVia` |
| `on<Event>` | react to an event | `onTimeout`, `onSocketOpen`, `onUnhandledError` |

### Folding: composition at the value level

When behaviors can't compose as operators, they compose as **values**:

- **Fold-to-stop**: a `RetryDelayPolicy` gives up by *rethrowing*; a `RepeatDelayPolicy` stops by *completing*.
  `retry({count: 3, delay: 1000})` → `retryDelayedBy((err, i) => i <= 3 ? timer(1000) : throwError(() => err))`
  `repeat({count: 3, delay: 1000})` → `repeatDelayedBy((i) => i < 3 ? timer(1000) : EMPTY)`
- **Booleans are degenerate policies**: `share({resetOnRefCountZero: false})` → `shareLingerBy(() => NEVER)`.
- **Connector-folding**: subject constructor parameters stay in the connector value, never in the API — `shareReplay({bufferSize: 1, windowTime: 5000})` → `shareCachedVia(() => new ReplaySubject(1, 5000))`.
- **Data is not configuration**: `headers` and `body` are payload records; passing them as objects is fine. The project eliminates behavior bags, not data.

### Beyond operators

- **Curried operator** — when a config decorates an operator with a primary parameter: `connect(selector, {connector})` → `connectVia(connector)(selector)`. Configuration stage first, so it partially applies: `const connectReplaying = connectVia(() => new ReplaySubject(1))`.
- **Spec/aspect pattern** — for creation functions (`webSocket`, `ajax`): a starter makes an immutable spec, each config key is a single-parameter aspect `spec → spec` composed with rxjs's own `pipe`, and a terminal executes it:

  ```ts
  const configure = pipe(
    usingProtocol('chat-v2'),
    deserializingBy((e) => parse(e.data)),
    onSocketOpen(() => console.log('connected')),
  );
  const socket = openSocket(configure(socketAt<Msg>('wss://host')));

  const asJsonApi = pipe(usingHeaders({ accept: 'application/json' }), expecting('json'));
  sendRequest<Item>(asJsonApi(requestAt('https://api/items/1')));
  ```

- **Named setters** — `GlobalConfig` becomes `onUnhandledError(fn)` and `onStoppedNotification(fn)`.

## Coverage

All ten config objects in RxJS 7:

| Config object | Replaced by |
|---|---|
| `TimeoutConfig` | `timeoutFirst`, `timeoutEach`, `timeoutAt`, `onTimeout` |
| `ThrottleConfig` | `throttleLeading`, `throttleTrailing`, `throttleLeadingTrailing` |
| `RetryConfig` | `retryCount`, `retryConsecutive`, `retryDelayed`, `retryDelayedBy` |
| `RepeatConfig` | `repeatCount`, `repeatDelayed`, `repeatDelayedBy` |
| `ShareConfig` | `shareVia`, `shareLinger`, `shareLingerBy` |
| `ShareReplayConfig` | `shareCached`, `shareCachedVia` — and `refCount: true` reduces to `shareVia(() => new ReplaySubject(n))` |
| `ConnectConfig` | `connectVia(connector)(selector)` |
| `WebSocketSubjectConfig` | `socketAt` + aspects (`usingProtocol`, `serializingBy`, `deserializingBy`, `onSocketOpen/Close/Closing`, `asBinary`, `connectingVia`) + `openSocket` |
| `AjaxConfig` | `requestAt` + aspects (`usingMethod`, `sending`, `usingHeaders`, `abortingAfter`, `expecting`, `sendingCredentials`, `requestingVia`) + `sendRequest` |
| `GlobalConfig` | `onUnhandledError`, `onStoppedNotification` |

Semantics contracts worth knowing:

- `timeoutEach` arms only **after** the first value — the first-value window belongs to `timeoutFirst`/`timeoutAt`. That is what makes `timeoutFirst(a), timeoutEach(b)` reproduce `timeout({first: a, each: b})` exactly.
- `throttleLeadingTrailing` is one operator because both edges share a single throttle window — piping the two would create two independent windows.
- `repeatCount(n)` counts total runs, `retryCount(n)` counts retries after the initial run — the same parity rxjs itself has.
- `shareCached` never caches errors: an error resets the session so the next subscriber retries.

## Development

```bash
npm install
npm test            # Vitest marble tests (TestScheduler)
npm test -- retry   # single test file by name
npm run typecheck   # tsc --noEmit (strict)
npm run build       # tsup → dist/ (ESM + CJS + d.ts)
```

rxjs `^7.8` is a peer dependency. The timeout, throttle, retry, and repeat operators are standalone implementations; the multicast family delegates to rxjs's `share(config)` internally (battle-tested lifecycle code — the config object still disappears from every call site, which is the point). Every family has an equivalence test suite proving the replacements marble-for-marble identical to their config-form originals.

## Status

A design exploration: what would RxJS look like if every config object were replaced with named, single-purpose, curry-friendly functions? The answer lives in `src/` — and the naming scheme above is reusable for any API that has grown an options bag.
