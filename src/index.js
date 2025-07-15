import axios from 'axios';
import omit from 'lodash/omit';
import Cache from './Cache';
import getRequestToken from './getRequestToken';

export const parseUrlParams = params => {
  if (typeof params.urlParams === 'object' && Object.keys(params.urlParams).length > 0 && typeof params.url === 'string') {
    params.url = params.url.replace(/{([\s\S]+?)}/g, (match, name) => {
      return params.urlParams.hasOwnProperty(name) ? params.urlParams[name] : match;
    });
  }
};

const createAjax = options => {
  const { cache, errorHandler, registerInterceptors, getDefaultHeaders, defaultError, showResponseError, getResponseError, ...axiosOptions } = Object.assign(
    {},
    {
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
      registerInterceptors: () => {}
    },
    options
  );

  const cacheInstance = new Cache(Object.assign({}, { ttl: 1000 * 60 * 10, maxLength: 1000, isLocal: false }, cache));

  const baseURL = axiosOptions.baseURL || axiosOptions.baseUrl || '';
  const instance = axios.create(Object.assign({}, axiosOptions, { baseURL }));

  typeof registerInterceptors === 'function' && registerInterceptors(instance.interceptors);

  instance.interceptors.request.use(async config => {
    config.headers = Object.assign({}, getDefaultHeaders(), config.headers);
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
        return Promise.resolve(cacheData);
      }
    }

    const recordCache = promise => {
      if (!cache) {
        return promise;
      }
      if (cacheOptions.isLocal) {
        promise.then(data => {
          cacheInstance.put(cacheKey, data, cacheOptions);
          return data;
        });
      } else {
        cacheInstance.put(cacheKey, promise, cacheOptions);
      }
      return promise;
    };

    if (params.hasOwnProperty('loader') && typeof params.loader === 'function') {
      return recordCache(
        Promise.resolve(params.loader(omit(params, ['loader'])))
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
    }
    parseUrlParams(params);
    return recordCache(instance(params));
  };

  ajax.postForm = config => {
    parseUrlParams(config);
    const { url, params, urlParams, data, method, ...options } = config;
    const searchParams = new URLSearchParams(params);

    const queryString = searchParams.toString();
    return instance.postForm(`${url}${queryString ? '?' + queryString : ''}`, data, Object.assign({}, options));
  };
  ajax.baseURL = ajax.baseUrl = baseURL;
  ajax.parseUrlParams = parseUrlParams;
  return ajax;
};

export default createAjax;
