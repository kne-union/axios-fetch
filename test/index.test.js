const axiosFetch = require('../dist/index.js');

const createAjax = axiosFetch.default || axiosFetch;
const { buildUrlWithParams, parseUrlParams } = axiosFetch;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

const createStorage = () => {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear()
  };
};

describe('@kne/axios-fetch', () => {
  test('builds query strings and parses URL params safely', () => {
    expect(parseUrlParams(null)).toBeNull();

    const urlParams = Object.create(null);
    urlParams.id = 'a b';
    const config = { url: '/users/{id}', urlParams };
    parseUrlParams(config);
    expect(config.url).toBe('/users/a%20b');

    expect(buildUrlWithParams('/api', { a: 1, b: '', c: null, d: undefined, e: 'ok' })).toBe('/api?a=1&e=ok');
  });

  test('uses stable cache keys and invalidates grouped cache', async () => {
    global.window = { localStorage: createStorage() };

    let loaderCount = 0;
    const ajax = createAjax({
      cache: { isLocal: true, localName: 'TEST_CACHE' },
      errorHandler: error => {
        throw new Error(error);
      }
    });

    const first = ajax({
      url: '/mock',
      params: { b: 2, a: 1 },
      cache: true,
      cacheOptions: { cacheName: 'list' },
      loader: () => ++loaderCount
    });
    expect(first._fromCache).toBe(false);
    await expect(first).resolves.toMatchObject({ data: { data: 1 } });

    const second = ajax({
      url: '/mock',
      params: { a: 1, b: 2 },
      cache: true,
      cacheOptions: { cacheName: 'list' },
      loader: () => ++loaderCount
    });
    expect(second._fromCache).toBe(true);
    await expect(second).resolves.toMatchObject({ data: { data: 1 } });

    ajax.delCacheByName('list');
    const third = ajax({
      url: '/mock',
      params: { a: 1, b: 2 },
      cache: true,
      cacheOptions: { cacheName: 'list' },
      loader: () => ++loaderCount
    });
    expect(third._fromCache).toBe(false);
    await expect(third).resolves.toMatchObject({ data: { data: 2 } });

    await nextTick();
    expect(window.localStorage.getItem('TEST_CACHE')).toMatch(/"cacheName":"list"/);
  });

  test('creates SSE clients after applying request interceptors', async () => {
    const instances = [];
    class MockEventSource {
      static OPEN = 1;
      static CLOSED = 2;

      constructor(url, options) {
        this.url = url;
        this.options = options;
        this.readyState = MockEventSource.OPEN;
        this.listeners = {};
        instances.push(this);
      }

      addEventListener(name, handler) {
        this.listeners[name] = this.listeners[name] || [];
        this.listeners[name].push(handler);
      }

      dispatch(name, data = '') {
        (this.listeners[name] || []).forEach(handler => handler({ type: name, data }));
      }

      close() {
        this.readyState = MockEventSource.CLOSED;
      }
    }

    const ajax = createAjax({
      baseURL: 'https://api.example.com',
      getDefaultHeaders: () => ({
        'X-Token': 'token',
        appName: 'demo',
        env: 'test'
      }),
      registerInterceptors: interceptors => {
        interceptors.request.use(async config => {
          config.baseURL = `${config.baseURL}/${config.headers.appName}/${config.headers.env}`;
          delete config.headers.appName;
          delete config.headers.env;
          return config;
        });
      }
    });

    const client = await ajax.sse({
      url: '/stream/{id}',
      urlParams: { id: 'a b' },
      params: { q: 'hello', empty: '' },
      EventSource: MockEventSource,
      withCredentials: true
    });

    expect(client).toBeTruthy();
    const eventSource = client.eventSource;
    expect(eventSource.options.withCredentials).toBe(true);
    expect(eventSource.url).toBe('https://api.example.com/demo/test/stream/a%20b?X-Token=token&q=hello');
    expect(eventSource.url).not.toContain('appName');
    expect(eventSource.url).not.toContain('env=');
    expect(eventSource.url).not.toContain('empty=');

    eventSource.onopen({});
    expect(client.isConnected).toBe(true);

    eventSource.dispatch('timeout');
    expect(instances).toHaveLength(2);
    expect(instances[1].url).toBe(eventSource.url);

    client.close();
    expect(client.isConnected).toBe(false);
  });
});
