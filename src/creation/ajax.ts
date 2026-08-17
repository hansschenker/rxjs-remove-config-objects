import { ajax } from 'rxjs/ajax';
import type { AjaxConfig, AjaxResponse } from 'rxjs/ajax';
import type { Observable } from 'rxjs';

/**
 * Immutable description of an HTTP request. Built with `requestAt`,
 * refined by aspect functions (compose them with rxjs `pipe`), executed
 * with `sendRequest`. The wrapped rxjs config is an implementation
 * detail — never write it as a literal. Note that `headers` and `body`
 * are data records, not configuration: passing them as objects is fine.
 */
export interface RequestSpec {
  readonly config: AjaxConfig;
}

/** A single-parameter refinement of a request spec. */
export type RequestAspect = (spec: RequestSpec) => RequestSpec;

const refine =
  (patch: Partial<AjaxConfig>): RequestAspect =>
  (spec) => ({ config: { ...spec.config, ...patch } });

/** Starts a request spec for the given URL: GET, async, expecting JSON. */
export const requestAt = (url: string): RequestSpec => ({ config: { url } });

/** Sets the HTTP method. */
export const usingMethod = (method: string): RequestAspect => refine({ method });

/** Sets the request body (objects are JSON-serialized by rxjs). */
export const sending = (body: unknown): RequestAspect => refine({ body });

/** Sets the request headers (a data record, merged as-is). */
export const usingHeaders = (headers: Readonly<Record<string, string>>): RequestAspect =>
  refine({ headers });

/** Aborts the request with a timeout error after `due` milliseconds. */
export const abortingAfter = (due: number): RequestAspect => refine({ timeout: due });

/** Sets the XHR response type the response body is decoded as. */
export const expecting = (responseType: NonNullable<AjaxConfig['responseType']>): RequestAspect =>
  refine({ responseType });

/** Sends cookies/authorization on cross-site requests when `enabled`. */
export const sendingCredentials = (enabled: boolean): RequestAspect =>
  refine({ withCredentials: enabled });

/**
 * Injects the XMLHttpRequest factory to send through — dependency
 * injection for non-browser runtimes and for tests.
 */
export const requestingVia = (createXHR: () => XMLHttpRequest): RequestAspect =>
  refine({ createXHR });

/**
 * Executes the described request on subscription: the terminal step of
 * the spec pipeline.
 *
 * ```ts
 * const asJson = pipe(usingHeaders({ accept: 'application/json' }), expecting('json'));
 * sendRequest<Item>(asJson(requestAt('https://api/items/1')));
 * ```
 */
export const sendRequest = <T>(spec: RequestSpec): Observable<AjaxResponse<T>> =>
  ajax<T>(spec.config);
