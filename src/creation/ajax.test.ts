import { pipe } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import type { AjaxResponse } from 'rxjs/ajax';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  abortingAfter,
  expecting,
  requestAt,
  requestingVia,
  sending,
  sendingCredentials,
  sendRequest,
  usingHeaders,
  usingMethod,
} from './ajax';

class FakeXHR {
  static instances: FakeXHR[] = [];
  private listeners = new Map<string, Array<(event: unknown) => void>>();
  requestHeaders: Record<string, string> = {};
  opened: { method: string; url: string; async: boolean } | null = null;
  sentBody: unknown;
  timeout = 0;
  responseType: XMLHttpRequestResponseType = '';
  withCredentials = false;
  readyState = 0;
  status = 0;
  response: unknown;

  constructor() {
    FakeXHR.instances.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  open(method: string, url: string, async: boolean): void {
    this.opened = { method, url, async };
  }

  setRequestHeader(key: string, value: string): void {
    this.requestHeaders[key] = value;
  }

  send(body?: unknown): void {
    this.sentBody = body;
  }

  abort(): void {}

  getAllResponseHeaders(): string {
    return '';
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const viaFake = requestingVia(() => new FakeXHR() as unknown as XMLHttpRequest);

describe('ajax request spec pipeline', () => {
  beforeEach(() => {
    FakeXHR.instances = [];
  });

  it('aspects configure the request end to end', () => {
    const responses: AjaxResponse<{ ok: boolean }>[] = [];
    let completed = false;
    const configure = pipe(
      usingMethod('PUT'),
      sending({ name: 'hans' }),
      usingHeaders({ 'X-Custom': 'yes' }),
      abortingAfter(2500),
      expecting('json'),
      sendingCredentials(true),
      viaFake
    );

    sendRequest<{ ok: boolean }>(configure(requestAt('https://api.test/items/1'))).subscribe({
      next: (response) => responses.push(response),
      complete: () => (completed = true),
    });

    const xhr = FakeXHR.instances[0]!;
    expect(xhr.opened).toEqual({ method: 'PUT', url: 'https://api.test/items/1', async: true });
    expect(xhr.timeout).toBe(2500);
    expect(xhr.responseType).toBe('json');
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.requestHeaders).toEqual({
      'x-custom': 'yes',
      'x-requested-with': 'XMLHttpRequest',
      'content-type': 'application/json;charset=utf-8',
    });
    expect(xhr.sentBody).toBe(JSON.stringify({ name: 'hans' }));

    xhr.status = 200;
    xhr.readyState = 4;
    xhr.response = { ok: true };
    xhr.emit('load', { type: 'load', loaded: 7, total: 7 });

    expect(responses).toHaveLength(1);
    expect(responses[0]!.status).toBe(200);
    expect(responses[0]!.response).toEqual({ ok: true });
    expect(completed).toBe(true);
  });

  it('a partially applied configuration is reusable across requests', () => {
    const asJsonApi = pipe(usingHeaders({ accept: 'application/json' }), expecting('json'), viaFake);

    sendRequest(asJsonApi(requestAt('https://api.test/a'))).subscribe();
    sendRequest(asJsonApi(requestAt('https://api.test/b'))).subscribe();

    expect(FakeXHR.instances.map((xhr) => xhr.opened?.url)).toEqual([
      'https://api.test/a',
      'https://api.test/b',
    ]);
    for (const xhr of FakeXHR.instances) {
      expect(xhr.opened?.method).toBe('GET');
      expect(xhr.requestHeaders['accept']).toBe('application/json');
    }
  });

  it('the spec-built request matches ajax(config) field for field', () => {
    const configure = pipe(usingMethod('POST'), sending({ a: 1 }), abortingAfter(1000), viaFake);
    sendRequest(configure(requestAt('https://api.test/x'))).subscribe();
    ajax({
      url: 'https://api.test/x',
      method: 'POST',
      body: { a: 1 },
      timeout: 1000,
      createXHR: () => new FakeXHR() as unknown as XMLHttpRequest,
    }).subscribe();

    const [specXhr, configXhr] = FakeXHR.instances;
    expect(specXhr!.opened).toEqual(configXhr!.opened);
    expect(specXhr!.requestHeaders).toEqual(configXhr!.requestHeaders);
    expect(specXhr!.timeout).toBe(configXhr!.timeout);
    expect(specXhr!.sentBody).toBe(configXhr!.sentBody);
  });
});
