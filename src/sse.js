import FetchEventSource, { isFetchSseEnabled } from './FetchEventSource';

export const normalizeHeaders = headers => {
  if (!headers) return {};
  if (typeof headers.toJSON === 'function') return headers.toJSON();
  return { ...headers };
};

const applyRequestInterceptors = (instance, config) => {
  const handlers = instance.interceptors.request.handlers || [];
  return handlers
    .filter(handler => handler && (!handler.runWhen || handler.runWhen(config) !== false))
    .reverse()
    .reduce((promise, handler) => promise.then(handler.fulfilled, handler.rejected), Promise.resolve(config));
};

const getTargetUrl = ({ instance, buildUrlWithParams }, config, { passHeadersToQuery }) => {
  const headers = normalizeHeaders(config.headers);
  const headerParams = passHeadersToQuery ? (typeof config.headersToParams === 'function' ? config.headersToParams(headers) : headers) : typeof config.headersToParams === 'function' ? config.headersToParams(headers) : {};
  const { params, headersToParams, ...uriConfig } = config;
  return buildUrlWithParams(instance.getUri({ ...uriConfig, params: undefined }), { ...headerParams, ...params });
};

const parseData = event => {
  try {
    return JSON.parse(event.data);
  } catch (e) {
    return event.data;
  }
};

const defaultMergeData = (prev, next) => {
  if (prev && typeof prev === 'object' && !Array.isArray(prev) && next && typeof next === 'object' && !Array.isArray(next)) {
    return Object.assign({}, prev, next);
  }
  return next;
};

const resolveEventSourceClass = (CustomEventSource, useFetchSse) => {
  if (typeof CustomEventSource === 'function') {
    return CustomEventSource;
  }
  if (useFetchSse) {
    return FetchEventSource;
  }
  if (typeof window !== 'undefined' && typeof window.EventSource === 'function') {
    return window.EventSource;
  }
  return null;
};

const createClient = ({ EventSourceClass, targetUrl, eventSourceOptions, handlers, errorHandler, defaultError }) => {
  const { onMessage, onOpen, onError, onData, events, mergeData } = handlers;
  let data = null;
  let isConnected = false;
  let lastUpdatedAt = null;
  let eventSource = null;
  let closed = false;
  const merge = mergeData || defaultMergeData;

  const updateData = (parsed, event) => {
    if (parsed !== null && parsed !== undefined) {
      data = merge(data, parsed);
      lastUpdatedAt = Date.now();
    }
    return data;
  };

  const close = () => {
    closed = true;
    isConnected = false;
    eventSource && eventSource.close();
  };

  const connect = url => {
    if (closed) return;
    eventSource = new EventSourceClass(url, eventSourceOptions);

    eventSource.onopen = event => {
      isConnected = true;
      if (typeof onOpen === 'function') onOpen(event);
    };

    eventSource.onmessage = event => {
      const parsed = parseData(event);
      updateData(parsed, event);
      if (typeof onMessage === 'function') onMessage(parsed, event);
      if (typeof onData === 'function') onData(data, event);
    };

    eventSource.onerror = event => {
      isConnected = eventSource.readyState === EventSourceClass.OPEN;
      if (eventSource.readyState === EventSourceClass.CLOSED) {
        close();
        errorHandler(event.message || defaultError);
      }
      if (typeof onError === 'function') onError(event);
    };

    eventSource.addEventListener('timeout', () => {
      if (closed) return;
      eventSource.close();
      connect(url);
    });

    if (events && typeof events === 'object') {
      Object.entries(events).forEach(([name, handler]) => {
        if (typeof handler === 'function') {
          eventSource.addEventListener(name, event => {
            const parsed = parseData(event);
            updateData(parsed, event);
            handler(parsed, event);
          });
        }
      });
    }
  };

  connect(targetUrl);

  return {
    get data() {
      return data;
    },
    get isConnected() {
      return isConnected;
    },
    get lastUpdatedAt() {
      return lastUpdatedAt;
    },
    get eventSource() {
      return eventSource;
    },
    close
  };
};

const createSse = ({ instance, baseURL, parseUrlParams, buildUrlWithParams, errorHandler, defaultError }) => {
  return async ({ url, headersToParams, params, onMessage, onOpen, onError, onData, events, mergeData, EventSource: CustomEventSource, fetchSse = false, ...options }) => {
    const useFetchSse = fetchSse === true || CustomEventSource === FetchEventSource;
    const EventSourceClass = resolveEventSourceClass(CustomEventSource, useFetchSse);
    if (typeof EventSourceClass !== 'function') {
      return null;
    }

    const requestConfig = {
      ...options,
      url,
      baseURL,
      method: options.method || (useFetchSse ? 'post' : 'get'),
      params,
      headersToParams,
      data: options.data,
      headers: options.headers,
      fetchSse: useFetchSse
    };
    parseUrlParams(requestConfig);

    try {
      const config = await applyRequestInterceptors(instance, requestConfig);
      const targetUrl = getTargetUrl({ instance, buildUrlWithParams }, config, {
        // fetchSse：headers 走请求头；原生 EventSource：headers 默认转 query
        passHeadersToQuery: !useFetchSse
      });
      const headers = normalizeHeaders(config.headers);
      const eventSourceOptions = useFetchSse
        ? {
            ...options,
            method: config.method || options.method || 'POST',
            headers: Object.assign({}, headers, normalizeHeaders(options.headers)),
            data: options.data !== undefined ? options.data : config.data,
            body: options.body
          }
        : options;

      return createClient({
        EventSourceClass,
        targetUrl,
        eventSourceOptions,
        handlers: { onMessage, onOpen, onError, onData, events, mergeData },
        errorHandler,
        defaultError
      });
    } catch (error) {
      errorHandler(error.message || defaultError);
      if (typeof onError === 'function') onError(error);
      return null;
    }
  };
};

export { FetchEventSource, isFetchSseEnabled };
export default createSse;
