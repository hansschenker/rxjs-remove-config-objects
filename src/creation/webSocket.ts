import { webSocket } from 'rxjs/webSocket';
import type { WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';

/** What a serializer may hand to the underlying socket. */
export type SocketMessage = string | ArrayBuffer | Blob | ArrayBufferView;

/**
 * Immutable description of a WebSocket connection. Built with `socketAt`,
 * refined by aspect functions (compose them with rxjs `pipe`), opened with
 * `openSocket`. The wrapped rxjs config is an implementation detail —
 * never write it as a literal.
 */
export interface SocketSpec<T> {
  readonly config: WebSocketSubjectConfig<T>;
}

/** A single-parameter refinement of a socket spec. */
export type SocketAspect<T> = (spec: SocketSpec<T>) => SocketSpec<T>;

const refine =
  <T>(patch: Partial<WebSocketSubjectConfig<T>>): SocketAspect<T> =>
  (spec) => ({ config: { ...spec.config, ...patch } });

/** Starts a socket spec for the given URL, with JSON codec defaults. */
export const socketAt = <T>(url: string): SocketSpec<T> => ({ config: { url } });

/** Requests the given WebSocket subprotocol(s) during the handshake. */
export const usingProtocol = <T>(protocol: string | ReadonlyArray<string>): SocketAspect<T> =>
  refine({ protocol: protocol as string | Array<string> });

/** Serializes outgoing values with `serialize` instead of JSON.stringify. */
export const serializingBy = <T>(serialize: (value: T) => SocketMessage): SocketAspect<T> =>
  refine({ serializer: serialize });

/** Deserializes incoming message events with `deserialize` instead of JSON.parse. */
export const deserializingBy = <T>(deserialize: (event: MessageEvent) => T): SocketAspect<T> =>
  refine({ deserializer: deserialize });

/** Runs `handler` when the underlying socket connection opens. */
export const onSocketOpen = <T>(handler: (event: Event) => void): SocketAspect<T> =>
  refine({ openObserver: { next: handler } });

/** Runs `handler` when the underlying socket connection closes. */
export const onSocketClose = <T>(handler: (event: CloseEvent) => void): SocketAspect<T> =>
  refine({ closeObserver: { next: handler } });

/** Runs `handler` just before the socket connection is closed by this side. */
export const onSocketClosing = <T>(handler: () => void): SocketAspect<T> =>
  refine({ closingObserver: { next: handler } });

/** Sets the binary type incoming binary frames are delivered as. */
export const asBinary = <T>(binaryType: 'blob' | 'arraybuffer'): SocketAspect<T> =>
  refine({ binaryType });

/**
 * Injects the WebSocket implementation to connect through — dependency
 * injection for non-browser runtimes and for tests.
 */
export const connectingVia = <T>(
  WebSocketCtor: WebSocketSubjectConfig<T>['WebSocketCtor']
): SocketAspect<T> => refine({ WebSocketCtor });

/**
 * Opens the described socket: the terminal step of the spec pipeline.
 *
 * ```ts
 * const configure = pipe(deserializingBy(parse), onSocketOpen(log));
 * const socket = openSocket(configure(socketAt<Msg>('wss://host')));
 * ```
 */
export const openSocket = <T>(spec: SocketSpec<T>): WebSocketSubject<T> =>
  webSocket(spec.config);
