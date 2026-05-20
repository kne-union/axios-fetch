import axios from 'axios';
import Cache from './Cache';
import getRequestToken from './getRequestToken';

export const parseUrlParams = params => {
  if (typeof params.urlParams === 'object' && Object.keys(params.urlParams).length > 0 && typeof params.url === 'string') {
    params.url = params.url.replace(/{([\s\S]+?)}/g, (match, name) => {
      return params.urlParams.hasOwnProperty(name) ? params.urlParams[name] : match;
    });
  }
};

export const buildUrlWithParams = (url, params = {}) => {
  const query = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  if (!query) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
};

const createAjax = options => {
  const { cache, errorHandler, registerInterceptors, getDefaultHeaders, defaultError, showResponseError, getResponseError, ...axiosOptions } = {
    baseURL: '',
    getDefaultHeaders: () => ({}),
    defaultError: '请求发生错误',
    showResponseError: response => {
      if (response.config.showError === false) {
        return false;
      }
      return !(response.status >= 200 && response.status < 300) || (Object.hasOwn(response.data, 'code') && response.data.code !== 0);
    },
    getResponseError: response => {
      return response?.data?.msg || response?.data?.error_msg?.detail || response?.data?.error_msg;
    },
    errorHandler: () => {},
    validateStatus: function () {
      return true;
    },
    registerInterceptors: () => {},
    ...options
  };

  const cacheInstance = new Cache({ ttl: 1000 * 60 * 10, maxLength: 1000, isLocal: false, ...cache });

  const baseURL = axiosOptions.baseURL || axiosOptions.baseUrl || '';
  const { baseUrl, ...restAxiosOptions } = axiosOptions;
  const instance = axios.create({ ...restAxiosOptions, baseURL });

  typeof registerInterceptors === 'function' && registerInterceptors(instance.interceptors);

  instance.interceptors.request.use(async config => {
    config.headers = { ...getDefaultHeaders(), ...config.headers };
    if (config.method.toUpperCase() !== 'GET' && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  });

  instance.interceptors.response.use(
    response => {
      if (showResponseError(response)) {
        errorHandler(getResponseError(response) || defaultError);
      }
      return response;
    },
    error => {
      errorHandler(error.message || defaultError);
      return Promise.reject(error);
    }
  );

  const ajax = ({ cache, cacheOptions = {}, force, ...params }) => {
    let requestToken, cacheKey;
    if (cache) {
      requestToken = getRequestToken(params);
      cacheKey = (cache === true ? '' : cache) + requestToken;
      const cacheData = cacheInstance.get(cacheKey);
      if (!force && cacheData) {
        const p = Promise.resolve(cacheData);
        p._fromCache = true;
        return p;
      }
    }

    const recordCache = promise => {
      if (!cache) {
        return promise;
      }
      if (cacheOptions.isLocal) {
        promise = promise.then(data => {
          cacheInstance.put(cacheKey, data, cacheOptions);
          return data;
        });
      } else {
        cacheInstance.put(cacheKey, promise, cacheOptions);
      }
      return promise;
    };

    if (params.hasOwnProperty('loader') && typeof params.loader === 'function') {
      const { loader, ...loaderParams } = params;
      const p = recordCache(
        Promise.resolve(loader(loaderParams))
          .then(data => ({
            data: {
              code: 0,
              data
            }
          }))
          .catch(err => {
            errorHandler(err.message || defaultError);
            return { data: { code: 500, msg: err.message } };
          })
      );
      p._fromCache = false;
      return p;
    }
    parseUrlParams(params);
    const p = recordCache(instance(params));
    p._fromCache = false;
    return p;
  };

  ajax.postForm = config => {
    parseUrlParams(config);
    const { url, params, urlParams, data, method, ...options } = config;
    const searchParams = new URLSearchParams(params);

    const queryString = searchParams.toString();
    return instance.postForm(`${url}${queryString ? '?' + queryString : ''}`, data, { ...options });
  };
  ajax.sse = ({ url, headersToParams, params, onMessage, onOpen, onError, onData, events, mergeData, EventSource: CustomEventSource, ...options }) => {
    const EventSourceClass = CustomEventSource || (typeof window !== 'undefined' && window.EventSource);
    if (typeof EventSourceClass !== 'function') {
      return null;
    }

    const fullUrl = url.startsWith('http') ? url : baseURL + url;
    const headerParams = typeof headersToParams === 'function' ? headersToParams(getDefaultHeaders()) : getDefaultHeaders();
    const targetUrl = buildUrlWithParams(fullUrl, { ...headerParams, ...params });

    let data = null;
    let isConnected = false;
    let lastUpdatedAt = null;
    let eventSource = null;
    let closed = false;

    const parseData = event => {
      try {
        return JSON.parse(event.data);
      } catch (e) {
        return event.data;
      }
    };

    const merge =
      mergeData ||
      ((prev, next) => {
        if (prev && typeof prev === 'object' && !Array.isArray(prev) && next && typeof next === 'object' && !Array.isArray(next)) {
          return Object.assign({}, prev, next);
        }
        return next;
      });

    const connect = () => {
      eventSource = new EventSourceClass(targetUrl, options);

      eventSource.onopen = event => {
        isConnected = true;
        if (typeof onOpen === 'function') onOpen(event);
      };

      eventSource.onmessage = event => {
        const parsed = parseData(event);
        if (parsed !== null && parsed !== undefined) {
          data = merge(data, parsed);
          lastUpdatedAt = Date.now();
        }
        if (typeof onMessage === 'function') onMessage(parsed, event);
        if (typeof onData === 'function') onData(data, event);
      };

      eventSource.onerror = event => {
        isConnected = eventSource.readyState === EventSourceClass.OPEN;
        if (eventSource.readyState === EventSourceClass.CLOSED) {
          errorHandler(event.message || defaultError);
        }
        if (typeof onError === 'function') onError(event);
      };

      eventSource.addEventListener('timeout', () => {
        if (closed) return;
        eventSource.close();
        connect();
      });

      if (events && typeof events === 'object') {
        for (const [name, handler] of Object.entries(events)) {
          if (typeof handler === 'function') {
            eventSource.addEventListener(name, event => {
              const parsed = parseData(event);
              if (parsed !== null && parsed !== undefined) {
                data = merge(data, parsed);
                lastUpdatedAt = Date.now();
              }
              handler(parsed, event);
            });
          }
        }
      }
    };

    connect();

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
      close: () => {
        closed = true;
        eventSource.close();
      }
    };
  };
  ajax.baseURL = ajax.baseUrl = baseURL;
  ajax.parseUrlParams = parseUrlParams;
  ajax.getDefaultHeaders = getDefaultHeaders;
  ajax.buildUrlWithParams = buildUrlWithParams;
  return ajax;
};

export default createAjax;
