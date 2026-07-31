/**
 * fetch 实现的 EventSource 兼容客户端。
 * 用于浏览器原生 EventSource 无法覆盖的场景：POST、自定义 headers、请求体。
 *
 * 兼容点：
 * - readyState / onopen / onmessage / onerror / addEventListener / close
 * - ajax.sse 会在构造后再挂 onmessage，因此启动需延迟到下一个 macrotask
 * - 流正常结束时补发 done 消息，便于上层结束 loading
 */

const DONE_PAYLOAD = JSON.stringify({ code: 0, data: true });

class FetchEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url, options = {}) {
    this.url = url;
    this.options = options || {};
    this.readyState = FetchEventSource.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this._listeners = {};
    this._controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this._gotDone = false;
    this._startTimer = setTimeout(() => this._start(), 0);
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    const list = this._listeners[type];
    if (!list) return;
    this._listeners[type] = list.filter(item => item !== handler);
  }

  _dispatch(type, event) {
    if (type === 'message' && typeof this.onmessage === 'function') {
      this.onmessage(event);
    }
    if (type === 'open' && typeof this.onopen === 'function') {
      this.onopen(event);
    }
    if (type === 'error' && typeof this.onerror === 'function') {
      this.onerror(event);
    }
    (this._listeners[type] || []).forEach(handler => handler(event));
  }

  close() {
    this.readyState = FetchEventSource.CLOSED;
    if (this._startTimer) {
      clearTimeout(this._startTimer);
      this._startTimer = null;
    }
    if (this._controller) {
      this._controller.abort();
    }
  }

  _emitDone() {
    if (this._gotDone || this.readyState === FetchEventSource.CLOSED) {
      return;
    }
    this._gotDone = true;
    this._dispatch('message', { type: 'message', data: DONE_PAYLOAD });
  }

  async _start() {
    this._startTimer = null;
    if (this.readyState === FetchEventSource.CLOSED) {
      return;
    }

    const { headers = {}, data, method = 'POST', body } = this.options;
    const requestHeaders = Object.assign({ Accept: 'text/event-stream' }, headers);
    let requestBody = body;
    if (requestBody == null && data != null) {
      if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
      requestBody = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const upperMethod = String(method || 'GET').toUpperCase();

    try {
      const response = await fetch(this.url, {
        method: upperMethod,
        headers: requestHeaders,
        body: upperMethod === 'GET' || upperMethod === 'HEAD' ? undefined : requestBody,
        signal: this._controller ? this._controller.signal : undefined
      });

      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status}`);
      }

      this.readyState = FetchEventSource.OPEN;
      this._dispatch('open', { type: 'open' });

      if (!response.body || typeof response.body.getReader !== 'function') {
        const text = await response.text();
        this._consumeBuffer(text);
        this._emitDone();
        this.readyState = FetchEventSource.CLOSED;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer) {
            this._consumeBuffer(buffer);
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || '';
        parts.forEach(block => this._emitBlock(block));
      }

      this._emitDone();
      this.readyState = FetchEventSource.CLOSED;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        this.readyState = FetchEventSource.CLOSED;
        return;
      }
      this.readyState = FetchEventSource.CLOSED;
      this._dispatch('error', { type: 'error', message: error?.message || 'SSE error', error });
    }
  }

  _consumeBuffer(text) {
    String(text || '')
      .split(/\r?\n\r?\n/)
      .forEach(block => this._emitBlock(block));
  }

  _emitBlock(block) {
    const lines = String(block || '')
      .split(/\r?\n/)
      .filter(Boolean);
    if (lines.length === 0) return;
    const dataLines = lines.filter(line => line.startsWith('data:')).map(line => line.replace(/^data:\s?/, ''));
    if (dataLines.length === 0) return;
    const data = dataLines.join('\n');
    if (data === DONE_PAYLOAD || data.includes('"data":true') || data.includes('"data": true')) {
      this._gotDone = true;
    }
    this._dispatch('message', { type: 'message', data });
  }
}

export const isFetchSseEnabled = (options = {}) => options.fetchSse === true;

export default FetchEventSource;
