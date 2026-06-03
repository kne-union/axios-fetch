import axios from 'axios';
import Cache from './Cache';
import getRequestToken from './getRequestToken';
import createSse, { normalizeHeaders } from './sse';

export const parseUrlParams = params => {
  if (!params || typeof params !== 'object') {
    return params;
  }
  const { urlParams } = params;
  if (urlParams && typeof urlParams === 'object' && Object.keys(urlParams).length > 0 && typeof params.url === 'string') {
    params.url = params.url.replace(/{([\s\S]+?)}/g, (match, name) => {
      return Object.prototype.hasOwnProperty.call(urlParams, name) ? encodeURIComponent(urlParams[name]) : match;
    });
  }
  return params;
};

export const buildUrlWithParams = (url, params = {}) => {
  const query = Object.keys(params || {})
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
      if (response?.config?.showError === false) {
        return false;
      }
      const data = response?.data;
      const hasCode = data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'code');
      return !(response?.status >= 200 && response.status < 300) || (hasCode && data.code !== 0);
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

  const cacheInstance = new Cache({ ttl: 1000 * 60 * 10, maxLength: 1000, isLocal: false, onError: errorHandler, ...cache });

  const baseURL = axiosOptions.baseURL || axiosOptions.baseUrl || '';
  const { baseUrl, ...restAxiosOptions } = axiosOptions;
  const instance = axios.create({ ...restAxiosOptions, baseURL });

  typeof registerInterceptors === 'function' && registerInterceptors(instance.interceptors);

  instance.interceptors.request.use(async config => {
    config.headers = { ...getDefaultHeaders(), ...normalizeHeaders(config.headers) };
    const method = (config.method || 'get').toUpperCase();
    const hasContentType = Object.keys(config.headers).some(key => key.toLowerCase() === 'content-type');
    if (method !== 'GET' && !hasContentType) {
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

  const ajax = ({ cache, cacheOptions = {}, force, ...params } = {}) => {
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

    if (Object.prototype.hasOwnProperty.call(params, 'loader') && typeof params.loader === 'function') {
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
  ajax.sse = createSse({ instance, baseURL, parseUrlParams, buildUrlWithParams, errorHandler, defaultError });
  ajax.cleanCache = () => cacheInstance.clean();
  ajax.delCache = key => cacheInstance.del(key);
  ajax.delCacheByName = cacheName => cacheInstance.delByCacheName(cacheName);
  ajax.baseURL = ajax.baseUrl = baseURL;
  ajax.parseUrlParams = parseUrlParams;
  ajax.getDefaultHeaders = getDefaultHeaders;
  ajax.buildUrlWithParams = buildUrlWithParams;
  return ajax;
};

export default createAjax;
