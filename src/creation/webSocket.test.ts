import { pipe } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import type { WebSocketSubjectConfig } from 'rxjs/webSocket';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  asBinary,
  connectingVia,
  deserializingBy,
  onSocketClose,
  onSocketOpen,
  openSocket,
  serializingBy,
  socketAt,
  usingProtocol,
} from './webSocket';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  binaryType: 'blob' | 'arraybuffer' = 'blob';
  readyState = 0;
  sent: unknown[] = [];
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(
    public url: string,
    public protocols?: string | string[]
  ) {
    FakeWebSocket.instances.push(this);
  }

  send(data: unknown): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }
}

type Msg = { text: string };
const fakeCtor = FakeWebSocket as unknown as NonNullable<
  WebSocketSubjectConfig<Msg>['WebSocketCtor']
>;

describe('webSocket spec pipeline', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it('aspects configure the connection, codec, and lifecycle taps end to end', () => {
    const openEvents: Event[] = [];
    const received: Msg[] = [];
    const configure = pipe(
      usingProtocol<Msg>('chat-v2'),
      asBinary<Msg>('arraybuffer'),
      serializingBy<Msg>((message) => `out:${message.text}`),
      deserializingBy<Msg>((event) => ({ text: `in:${String(event.data)}` })),
      onSocketOpen<Msg>((event) => openEvents.push(event)),
      connectingVia<Msg>(fakeCtor)
    );
    const socket = openSocket(configure(socketAt<Msg>('wss://example.test/socket')));

    socket.subscribe({ next: (message) => received.push(message) });
    const fake = FakeWebSocket.instances[0]!;
    expect(fake.url).toBe('wss://example.test/socket');
    expect(fake.protocols).toBe('chat-v2');
    expect(fake.binaryType).toBe('arraybuffer');

    socket.next({ text: 'hello' });
    fake.readyState = 1;
    fake.onopen!({} as Event);
    expect(openEvents).toHaveLength(1);
    expect(fake.sent).toEqual(['out:hello']);

    fake.onmessage!({ data: 'pong' } as MessageEvent);
    expect(received).toEqual([{ text: 'in:pong' }]);
  });

  it('a clean close reaches the close tap and completes subscribers', () => {
    const closes: CloseEvent[] = [];
    let completed = false;
    const configure = pipe(
      onSocketClose<Msg>((event) => closes.push(event)),
      connectingVia<Msg>(fakeCtor)
    );
    const socket = openSocket(configure(socketAt<Msg>('wss://example.test/socket')));

    socket.subscribe({ complete: () => (completed = true) });
    const fake = FakeWebSocket.instances[0]!;
    fake.readyState = 1;
    fake.onopen!({} as Event);
    fake.onclose!({ wasClean: true } as CloseEvent);

    expect(closes).toHaveLength(1);
    expect(completed).toBe(true);
  });

  it('specs are immutable values: aspects return new specs', () => {
    const base = socketAt<Msg>('wss://example.test/socket');
    const refined = usingProtocol<Msg>('chat-v2')(base);

    expect(refined).not.toBe(base);
    expect(base.config.protocol).toBeUndefined();
    expect(refined.config.protocol).toBe('chat-v2');
  });

  it('the spec-built socket matches webSocket(config) interaction for interaction', () => {
    for (const socket of [
      openSocket(
        pipe(
          serializingBy<Msg>((message) => `out:${message.text}`),
          connectingVia<Msg>(fakeCtor)
        )(socketAt<Msg>('wss://example.test/socket'))
      ),
      webSocket<Msg>({
        url: 'wss://example.test/socket',
        serializer: (message) => `out:${message.text}`,
        WebSocketCtor: fakeCtor,
      }),
    ]) {
      socket.subscribe();
      socket.next({ text: 'hi' });
      const fake = FakeWebSocket.instances.at(-1)!;
      fake.readyState = 1;
      fake.onopen!({} as Event);
      expect(fake.url).toBe('wss://example.test/socket');
      expect(fake.sent).toEqual(['out:hi']);
    }
  });
});
