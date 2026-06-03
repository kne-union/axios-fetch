# axios-fetch

### 描述

一个axios的简单封装，支持loader和url params，和@kne/react-fetch保持统一

### 安装

```shell
npm i --save @kne/axios-fetch
```

### 概述

@kne/axios-fetch 是一个 axios 的轻量级封装库，提供了更便捷的 API 调用方式和更强大的功能扩展。该库与 @kne/react-fetch 保持接口统一，使得在 React 项目中能够无缝切换。

### 主要特性

1. **URL 参数模板**
   - 支持在 URL 中使用 `{paramName}` 语法
   - 自动替换 URL 中的参数占位符
   - 简化动态 URL 的构建

2. **统一的错误处理**
   - 集中式错误处理机制
   - 可自定义错误处理逻辑
   - 支持全局错误拦截
   - 单次请求可静默错误

3. **灵活的拦截器**
   - 支持请求和响应拦截器
   - 可自定义拦截器注册逻辑
   - 方便进行请求/响应的预处理和后处理

4. **默认请求头管理**
   - 支持动态设置默认请求头
   - 便于统一管理认证信息
   - SSE 连接自动将 headers 转为 URL 查询参数

5. **Loader 功能**
   - 支持数据模拟加载
   - 便于开发和测试
   - 无缝切换真实请求和模拟数据

6. **表单数据支持**
   - 提供 postForm 方法
   - 自动处理表单数据格式
   - 简化表单提交流程

7. **请求缓存**
   - 内置缓存机制，支持 TTL 和容量控制
   - 支持 localStorage 持久化
   - 支持缓存分组和强制刷新

8. **SSE 实时推送**
   - 基于 EventSource 的 SSE 客户端
   - 自动将认证信息转为 URL 参数
   - 支持 timeout 事件自动重连
   - 内置数据增量合并
   - 支持命名事件监听
   - 提供连接状态跟踪


### 示例

#### 示例代码

- 基础请求
- 创建 ajax 实例，发送 GET/POST 请求，使用 Loader 模拟数据，URL 参数替换
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
const { default: createAjax } = _AxiosFetch;
const { Button, Space, Card, message } = antd;

const ajax = createAjax({
  baseURL: 'https://jsonplaceholder.typicode.com',
  errorHandler: msg => message.error(msg),
  getDefaultHeaders: () => ({ 'X-Custom-Header': 'demo-value' })
});

const BaseExample = () => {
  const handleGet = () => {
    ajax({ url: '/posts/1' }).then(({ data }) => {
      console.log('GET 响应:', data);
      message.success(&#96;获取成功: ${data.title}&#96;);
    });
  };

  const handlePost = () => {
    ajax({
      url: '/posts',
      method: 'POST',
      data: { title: '测试标题', body: '测试内容', userId: 1 }
    }).then(({ data }) => {
      console.log('POST 响应:', data);
      message.success(&#96;创建成功, ID: ${data.id}&#96;);
    });
  };

  const handleLoader = () => {
    ajax({
      loader: async () => {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { name: '张三', age: 28, role: 'admin' };
      }
    }).then(({ data }) => {
      console.log('Loader 响应:', data);
      message.success(&#96;模拟数据: ${data.data.name}&#96;);
    });
  };

  const handleUrlParams = () => {
    ajax({
      url: '/users/{userId}/posts/{postId}',
      urlParams: { userId: 1, postId: 42 }
    }).then(({ data }) => {
      console.log('URL 参数替换:', data);
    });
    message.info('请求 /users/1/posts/42 (urlParams 替换)');
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="基础请求" size="small">
        <Space>
          <Button type="primary" onClick={handleGet}>GET 请求</Button>
          <Button onClick={handlePost}>POST 请求</Button>
        </Space>
      </Card>
      <Card title="Loader 模拟" size="small">
        <Button type="dashed" onClick={handleLoader}>使用 Loader 模拟数据</Button>
      </Card>
      <Card title="URL 参数替换" size="small">
        <Button onClick={handleUrlParams}>urlParams 替换</Button>
      </Card>
    </Space>
  );
};

render(<BaseExample />);

```

- SSE 实时推送
- 使用 ajax.sse 建立 SSE 连接，支持 onMessage/onData/onOpen/onError 回调、命名事件监听、timeout 自动重连、数据增量合并
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
const { default: createAjax } = _AxiosFetch;
const { Button, Card, Tag, Space, message } = antd;
const { useState, useEffect, useRef } = React;

const ajax = createAjax({
  baseURL: 'https://api.example.com',
  getDefaultHeaders: () => ({ 'X-Token': 'test-token-123', appName: 'demo-app', env: 'test' }),
  registerInterceptors: interceptors => {
    interceptors.request.use(config => {
      config.baseURL = &#96;${config.baseURL}/${config.headers.appName}/${config.headers.env}&#96;;
      delete config.headers.appName;
      delete config.headers.env;
      return config;
    });
  }
});

// Mock EventSource 实现
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this._listeners = {};
    this._timer = null;
    this._msgIndex = 0;

    // 模拟连接延迟后打开
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (typeof this.onopen === 'function') {
        this.onopen({ type: 'open' });
      }
      this._startMockMessages();
    }, 300);
  }

  _startMockMessages() {
    // 模拟定时推送消息
    const mockMessages = [
      { type: 'message', data: JSON.stringify({ id: 1, status: 'started', progress: 0 }) },
      { type: 'update', data: JSON.stringify({ progress: 25, message: '处理中...' }) },
      { type: 'message', data: JSON.stringify({ id: 1, status: 'processing', progress: 25 }) },
      { type: 'update', data: JSON.stringify({ progress: 50, message: '已完成一半' }) },
      { type: 'message', data: JSON.stringify({ id: 1, status: 'processing', progress: 50 }) },
      { type: 'update', data: JSON.stringify({ progress: 75, message: '即将完成' }) },
      { type: 'message', data: JSON.stringify({ id: 1, status: 'processing', progress: 75 }) },
      { type: 'message', data: JSON.stringify({ id: 1, status: 'completed', progress: 100 }) }
    ];

    this._timer = setInterval(() => {
      if (this.readyState !== MockEventSource.OPEN) return;
      if (this._msgIndex >= mockMessages.length) {
        // 所有消息发送完毕，触发 timeout 事件模拟重连
        this._dispatchEvent('timeout', '');
        this._msgIndex = 0; // 重置以便重连后继续
        return;
      }

      const msg = mockMessages[this._msgIndex++];
      this._dispatchEvent(msg.type, msg.data);
    }, 1500);
  }

  _dispatchEvent(type, data) {
    const event = { type, data };

    if (type === 'message' && typeof this.onmessage === 'function') {
      this.onmessage(event);
    }

    if (this._listeners[type]) {
      this._listeners[type].forEach(handler => handler(event));
    }
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(h => h !== handler);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

MockEventSource.CONNECTING = 0;
MockEventSource.OPEN = 1;
MockEventSource.CLOSED = 2;

const SseExample = () => {
  const [logList, setLogList] = useState([]);
  const clientRef = useRef(null);
  const logEndRef = useRef(null);

  const addLog = (type, text) => {
    setLogList(prev => [...prev.slice(-20), { type, text, time: new Date().toLocaleTimeString() }]);
  };

  const handleConnect = async () => {
    if (clientRef.current) {
      message.warning('连接已存在，请先关闭');
      return;
    }
    addLog('info', '正在连接...(Mock模式)');
    const client = await ajax.sse({
      url: '/sse-demo',
      params: { interval: 3 },
      EventSource: MockEventSource, // 传入自定义 EventSource 实现
      onOpen: () => addLog('open', 'SSE 连接已建立'),
      onMessage: (parsed, event) => addLog('message', &#96;收到消息: ${JSON.stringify(parsed)}&#96;),
      onData: data => addLog('data', &#96;累计数据更新&#96;),
      onError: event => addLog('error', &#96;连接错误: readyState=${event.target?.readyState}&#96;),
      events: {
        update: parsed => addLog('event', &#96;[update事件] ${JSON.stringify(parsed)}&#96;),
        timeout: () => addLog('timeout', '收到 timeout 事件，将自动重连')
      }
    });
    if (!client) {
      addLog('error', '当前环境不支持 EventSource');
      return;
    }
    clientRef.current = client;
    addLog('info', &#96;实际连接地址: ${client.eventSource.url}&#96;);
  };

  const handleClose = () => {
    if (clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
      addLog('close', '连接已关闭');
    }
  };

  const handleStatus = () => {
    const client = clientRef.current;
    if (!client) {
      message.info('当前无连接');
      return;
    }
    message.info(&#96;isConnected: ${client.isConnected}, lastUpdatedAt: ${client.lastUpdatedAt ? new Date(client.lastUpdatedAt).toLocaleTimeString() : '无'}&#96;);
  };

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.close();
      }
    };
  }, []);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="SSE 实时推送 (Mock模式)" size="small" extra={<Tag color={clientRef.current?.isConnected ? 'green' : 'default'}>{clientRef.current?.isConnected ? '已连接' : '未连接'}</Tag>}>
        <Space>
          <Button type="primary" onClick={handleConnect}>
            建立连接
          </Button>
          <Button danger onClick={handleClose}>
            关闭连接
          </Button>
          <Button onClick={handleStatus}>查看状态</Button>
        </Space>
      </Card>
      <Card title="事件日志" size="small" style={{ maxHeight: 300, overflow: 'auto' }}>
        {logList.length === 0 ? (
          <div style={{ color: '#999' }}>暂无日志</div>
        ) : (
          logList.map((log, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: '20px', borderBottom: '1px solid #f5f5f5', padding: '4px 0' }}>
              <Tag color={{ open: 'green', message: 'blue', data: 'purple', event: 'cyan', error: 'red', close: 'orange', timeout: 'gold', info: 'default' }[log.type]} style={{ fontSize: 11 }}>
                {log.type}
              </Tag>
              <span style={{ color: '#999', marginRight: 8 }}>{log.time}</span>
              {log.text}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </Card>
    </Space>
  );
};

render(<SseExample />);

```

- 工具函数
- buildUrlWithParams 构建 URL 查询参数、parseUrlParams 路径参数替换、SSE headersToParams 自定义参数转换
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
const { buildUrlWithParams, parseUrlParams } = _AxiosFetch;
const { Button, Card, Space, Input, message } = antd;
const { useState } = React;

const UtilsExample = () => {
  const [urlInput, setUrlInput] = useState('https://api.example.com/users');
  const [paramsInput, setParamsInput] = useState('token=abc123&interval=5');
  const [builtUrl, setBuiltUrl] = useState('');
  const [urlTemplate, setUrlTemplate] = useState('/users/{userId}/posts/{postId}');
  const [resolvedUrl, setResolvedUrl] = useState('');

  const handleBuildUrl = () => {
    const params = {};
    if (paramsInput.trim()) {
      paramsInput.split('&').forEach(pair => {
        const [key, ...rest] = pair.split('=');
        if (key) params[key] = rest.join('=');
      });
    }
    const result = buildUrlWithParams(urlInput, params);
    setBuiltUrl(result);
    message.success('构建完成');
  };

  const handleParseUrl = () => {
    const params = { userId: '1', postId: '42' };
    const target = { url: urlTemplate, urlParams: params };
    parseUrlParams(target);
    setResolvedUrl(target.url);
    message.success('替换完成');
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="buildUrlWithParams" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="基础 URL" />
          <Input value={paramsInput} onChange={e => setParamsInput(e.target.value)} placeholder="参数 (key=value&key2=value2)" />
          <Button type="primary" onClick={handleBuildUrl}>
            构建 URL
          </Button>
          {builtUrl && <div style={{ padding: 8, background: '#f5f5f5', borderRadius: 4, wordBreak: 'break-all', fontSize: 13 }}>{builtUrl}</div>}
        </Space>
      </Card>
      <Card title="parseUrlParams" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input value={urlTemplate} onChange={e => setUrlTemplate(e.target.value)} placeholder="URL 模板，使用 {paramName}" />
          <div style={{ fontSize: 12, color: '#666' }}>urlParams: {&#96;{ userId: '1', postId: '42' }&#96;}</div>
          <Button type="primary" onClick={handleParseUrl}>
            替换参数
          </Button>
          {resolvedUrl && <div style={{ padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 13 }}>{resolvedUrl}</div>}
        </Space>
      </Card>
    </Space>
  );
};

render(<UtilsExample />);

```

- 请求缓存
- 启用 cache 缓存请求结果，设置 TTL 和 cacheKey，强制刷新缓存
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
const { default: createAjax } = _AxiosFetch;
const { Button, Card, Space, Input, Switch, message, Tag, Alert } = antd;
const { useState, useRef, useCallback } = React;

const CacheExample = () => {
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheName, setCacheName] = useState('posts-detail');
  const [cacheTtl, setCacheTtl] = useState(10);
  const [requestCount, setRequestCount] = useState(0);
  const [cacheHitCount, setCacheHitCount] = useState(0);
  const [lastFromCache, setLastFromCache] = useState(null);
  const ajaxRef = useRef(null);

  const getAjax = useCallback(() => {
    if (!ajaxRef.current) {
      ajaxRef.current = createAjax({
        baseURL: 'https://jsonplaceholder.typicode.com',
        errorHandler: msg => message.error(msg)
      });
    }
    return ajaxRef.current;
  }, []);

  const handleRequest = () => {
    const ajax = getAjax();
    setRequestCount(prev => prev + 1);
    const p = ajax({
      url: '/posts/1',
      cache: cacheEnabled,
      cacheOptions: { ttl: cacheTtl * 1000, cacheName }
    });
    setLastFromCache(p._fromCache);
    if (p._fromCache) {
      setCacheHitCount(prev => prev + 1);
    }
    p.then(({ data }) => {
      const cachedAt = new Date().toLocaleTimeString();
      message.success(&#96;数据获取成功 (${cachedAt})&#96;);
      console.log('响应数据:', data);
    });
  };

  const handleForceRequest = () => {
    const ajax = getAjax();
    setRequestCount(prev => prev + 1);
    const p = ajax({
      url: '/posts/1',
      cache: true,
      force: true,
      cacheOptions: { ttl: cacheTtl * 1000, cacheName }
    });
    setLastFromCache(p._fromCache);
    p.then(({ data }) => {
      message.success('强制刷新成功');
      console.log('强制刷新数据:', data);
    });
  };

  const handleClearByName = () => {
    getAjax().delCacheByName(cacheName);
    message.success(&#96;已清除分组缓存: ${cacheName}&#96;);
    setLastFromCache(null);
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="请求缓存" size="small">
        <Alert type="info" showIcon message="启用 cache 后，相同参数的请求在 TTL 内会直接返回缓存，不会重复发送网络请求。cacheOptions.cacheName 用于分组失效，force: true 可强制刷新。" style={{ marginBottom: 12 }} />
        <Space wrap>
          <span>缓存:</span>
          <Switch checked={cacheEnabled} onChange={setCacheEnabled} checkedChildren="开" unCheckedChildren="关" />
          <span>Cache Name:</span>
          <Input value={cacheName} onChange={e => setCacheName(e.target.value)} style={{ width: 140 }} size="small" />
          <span>TTL(秒):</span>
          <Input value={cacheTtl} onChange={e => setCacheTtl(Number(e.target.value))} style={{ width: 80 }} size="small" type="number" />
        </Space>
        <div style={{ marginTop: 12 }}>
          <Space>
            <Button type="primary" onClick={handleRequest}>
              发送请求
            </Button>
            <Button type="dashed" onClick={handleForceRequest}>
              强制刷新 (force)
            </Button>
            <Button onClick={handleClearByName}>清除分组缓存</Button>
            <Tag>请求次数: {requestCount}</Tag>
            <Tag color="green">缓存命中: {cacheHitCount}</Tag>
            <Tag color={lastFromCache === null ? 'default' : lastFromCache ? 'green' : 'orange'}>{lastFromCache === null ? '未请求' : lastFromCache ? '命中缓存' : '未命中缓存'}</Tag>
          </Space>
        </div>
      </Card>
    </Space>
  );
};

render(<CacheExample />);

```

- 表单提交
- 使用 ajax.postForm 提交表单数据，支持查询参数和 URL 路径参数
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
const { default: createAjax } = _AxiosFetch;
const { Button, Card, Space, Input, message } = antd;
const { useState, useRef } = React;

const PostFormExample = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const ajax = useRef(
    createAjax({
      baseURL: 'https://jsonplaceholder.typicode.com',
      errorHandler: msg => message.error(msg)
    })
  ).current;

  const handleSubmit = () => {
    ajax
      .postForm({
        url: '/posts',
        data: { title, body, userId: 1 }
      })
      .then(({ data }) => {
        message.success(&#96;提交成功, ID: ${data.id}&#96;);
        console.log('postForm 响应:', data);
      });
  };

  const handleSubmitWithParams = () => {
    ajax
      .postForm({
        url: '/posts',
        params: { verbose: 'true', source: 'form' },
        data: { title, body, userId: 1 }
      })
      .then(({ data }) => {
        message.success(&#96;带参数提交成功, ID: ${data.id}&#96;);
        console.log('postForm 带查询参数:', data);
      });
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="postForm 表单提交" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题" />
          <Input value={body} onChange={e => setBody(e.target.value)} placeholder="内容" />
          <Space>
            <Button type="primary" onClick={handleSubmit}>
              提交表单
            </Button>
            <Button onClick={handleSubmitWithParams}>带查询参数提交</Button>
          </Space>
        </Space>
      </Card>
    </Space>
  );
};

render(<PostFormExample />);

```

- 错误处理
- 自定义 errorHandler / showResponseError / getResponseError，静默单次请求错误，Loader 异常处理
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
const { default: createAjax } = _AxiosFetch;
const { Button, Card, Space, Input, Tag, message, Table, Alert } = antd;
const { useState, useRef } = React;

const ErrorHandlingExample = () => {
  const ajax = useRef(createAjax({
    baseURL: 'https://jsonplaceholder.typicode.com',
    defaultError: '请求失败了',
    errorHandler: msg => {
      message.error(&#96;[全局错误处理] ${msg}&#96;);
    },
    showResponseError: response => {
      if (response.config.showError === false) return false;
      return response.status >= 400;
    },
    getResponseError: response => {
      return response?.data?.message || response?.data?.error || '未知错误';
    }
  })).current;

  const [logList, setLogList] = useState([]);
  const addLog = (type, text) => setLogList(prev => [...prev.slice(-15), { type, text, time: new Date().toLocaleTimeString() }]);

  const handle404 = () => {
    ajax({ url: '/not-exist-api' }).then(({ data, status }) => {
      addLog('response', &#96;status=${status}, 显示错误: ${status >= 400}&#96;);
    });
  };

  const handleSuppressError = () => {
    ajax({ url: '/not-exist-api', showError: false }).then(({ data, status }) => {
      addLog('suppressed', &#96;status=${status}, 错误已静默 (showError: false)&#96;);
    });
  };

  const handleLoaderError = () => {
    ajax({
      loader: async () => {
        throw new Error('模拟业务异常');
      }
    }).then(({ data }) => {
      addLog('loader-error', &#96;loader 异常: code=${data.code}, msg=${data.msg}&#96;);
    });
  };

  const columns = [
    { title: '时间', dataIndex: 'time', width: 100 },
    { title: '类型', dataIndex: 'type', width: 100, render: v => <Tag color={{ response: 'blue', suppressed: 'green', 'loader-error': 'orange' }[v]}>{v}</Tag> },
    { title: '内容', dataIndex: 'text' }
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="错误处理" size="small">
        <Alert type="info" showIcon message="createAjax 支持自定义 errorHandler / showResponseError / getResponseError，统一管理请求错误。设置 showError: false 可静默单次请求错误。" style={{ marginBottom: 12 }} />
        <Space>
          <Button type="primary" danger onClick={handle404}>触发 404</Button>
          <Button onClick={handleSuppressError}>静默错误 (showError: false)</Button>
          <Button onClick={handleLoaderError}>Loader 异常</Button>
        </Space>
      </Card>
      <Card title="请求日志" size="small">
        <Table columns={columns} dataSource={logList} rowKey={(_, i) => i} size="small" pagination={false} />
      </Card>
    </Space>
  );
};

render(<ErrorHandlingExample />);

```

- AI 对话
- 基于 ajax.sse 流式输出和 @ant-design/x 构建智能对话界面，使用 MockEventSource 模拟 AI 流式回复
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd),AntdX(@ant-design/x)

```jsx
const { default: createAjax } = _AxiosFetch;
const { Bubble, Sender } = AntdX;
const { Card, Tag, Flex, Avatar } = antd;
const { useState, useRef, useCallback } = React;

const ajax = createAjax({
  baseURL: 'https://jsonplaceholder.typicode.com',
  errorHandler: () => {}
});

// Mock AI 回复数据
var mockResponses = {
  你好: '你好！我是 AI 助手，有什么可以帮助你的吗？',
  '介绍一下 axios-fetch':
    'axios-fetch 是一个 axios 的轻量级封装库，主要特性包括：1. URL 参数模板 - 支持 {paramName} 语法自动替换。2. 统一错误处理 - 集中式错误处理机制。3. 灵活的拦截器 - 支持请求和响应拦截器。4. Loader 功能 - 支持数据模拟加载。5. 请求缓存 - 内置缓存机制，支持 TTL。6. SSE 实时推送 - 基于 EventSource 的 SSE 客户端。7. 表单数据支持 - 提供 postForm 方法。',
  写一段代码: '好的，这是一个简单的示例：const ajax = createAjax({ baseURL: "https://api.example.com", getDefaultHeaders: () => ({ Authorization: "Bearer token" }) }); ajax({ url: "/users/1" }).then(({ data }) => { console.log(data); });'
};
var defaultReply = '这是一个很好的问题！让我来为你详细解答。在实际开发中，我们可以结合 axios-fetch 的各种特性来构建高效的数据请求层。如果你有更具体的问题，欢迎继续提问！';

// 创建 Mock EventSource：模拟 SSE 流式输出
function createMockEventSource(fullText) {
  let index = 0;
  let timer = null;
  const listeners = {};

  const MockES = function (url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;

    // 模拟连接建立
    setTimeout(() => {
      this.readyState = 1;
      if (typeof this.onopen === 'function') {
        this.onopen({ type: 'open' });
      }
      // 开始流式推送
      timer = setInterval(() => {
        if (this.readyState !== 1) return;
        if (index >= fullText.length) {
          clearInterval(timer);
          timer = null;
          // 发送结束标记
          this._dispatch('message', JSON.stringify({ done: true }));
          this.readyState = 2;
          return;
        }
        const chunkSize = Math.floor(Math.random() * 3) + 1;
        const chunk = fullText.slice(index, index + chunkSize);
        index += chunkSize;
        this._dispatch('message', JSON.stringify({ text: chunk, done: false }));
      }, 30);
    }, 200);
  };

  MockES.CONNECTING = 0;
  MockES.OPEN = 1;
  MockES.CLOSED = 2;

  MockES.prototype.addEventListener = function (type, handler) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(handler);
  };

  MockES.prototype.removeEventListener = function (type, handler) {
    if (!listeners[type]) return;
    listeners[type] = listeners[type].filter(function (h) {
      return h !== handler;
    });
  };

  MockES.prototype._dispatch = function (type, data) {
    var event = { type: type, data: data };
    if (type === 'message' && typeof this.onmessage === 'function') {
      this.onmessage(event);
    }
    if (listeners[type]) {
      listeners[type].forEach(function (handler) {
        handler(event);
      });
    }
  };

  MockES.prototype.close = function () {
    this.readyState = 2;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return MockES;
}

// 匹配 mock 回复
function getMockReply(input) {
  var matchedKey = Object.keys(mockResponses).find(function (k) {
    return input.includes(k);
  });
  return matchedKey ? mockResponses[matchedKey] : defaultReply;
}

const AiChatExample = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const sseRef = useRef(null);
  const accumulatedRef = useRef('');

  const handleSubmit = useCallback(
    async msg => {
      const content = msg || inputValue;
      if (!content.trim() || loading) return;

      // 添加用户消息
      setMessages(prev => [...prev, { key: 'user-' + Date.now(), role: 'user', content }]);
      setInputValue('');
      setLoading(true);
      setStreamingText('');
      accumulatedRef.current = '';

      // 获取 mock 回复文本
      const replyText = getMockReply(content);
      // 创建对应的 MockEventSource
      const MockES = createMockEventSource(replyText);

      // 使用 ajax.sse 接入流式输出
      const client = await ajax.sse({
        url: '/ai-chat',
        params: { prompt: content },
        EventSource: MockES,
        onMessage: function (parsed) {
          if (parsed && parsed.done) return;
          if (parsed && parsed.text) {
            accumulatedRef.current += parsed.text;
            setStreamingText(accumulatedRef.current);
          }
        },
        onError: function () {
          setLoading(false);
          setStreamingText('');
          accumulatedRef.current = '';
        }
      });

      if (!client) {
        setLoading(false);
        setStreamingText('');
        return;
      }

      sseRef.current = client;

      // 轮询检测流式结束
      var checkDone = setInterval(function () {
        if (client.data && client.data.done) {
          clearInterval(checkDone);
          var finalText = accumulatedRef.current || replyText;
          setMessages(prev => [...prev, { key: 'ai-' + Date.now(), role: 'ai', content: finalText }]);
          setStreamingText('');
          setLoading(false);
          accumulatedRef.current = '';
          client.close();
          sseRef.current = null;
        }
      }, 100);
    },
    [inputValue, loading]
  );

  const handleCancel = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (accumulatedRef.current) {
      setMessages(prev => [...prev, { key: 'ai-' + Date.now(), role: 'ai', content: accumulatedRef.current }]);
    }
    setStreamingText('');
    accumulatedRef.current = '';
    setLoading(false);
  }, []);

  // 构建气泡列表数据
  const bubbleItems = messages
    .map(function (msg) {
      var isUser = msg.role === 'user';
      return {
        key: msg.key,
        role: msg.role,
        content: msg.content,
        placement: isUser ? 'end' : 'start',
        variant: isUser ? 'filled' : 'outlined',
        shape: 'round',
        avatar: isUser ? <Avatar style={{ backgroundColor: '#1677ff' }}>U</Avatar> : <Avatar style={{ backgroundColor: '#52c41a' }}>AI</Avatar>
      };
    })
    .concat(
      loading && streamingText
        ? [
            {
              key: 'streaming',
              role: 'ai',
              content: streamingText,
              streaming: true,
              placement: 'start',
              variant: 'outlined',
              shape: 'round',
              avatar: <Avatar style={{ backgroundColor: '#52c41a' }}>AI</Avatar>
            }
          ]
        : []
    );

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Card title="AI 对话 (基于 ajax.sse 流式输出)" size="small" extra={<Tag color={loading ? 'processing' : 'default'}>{loading ? '输出中...' : '就绪'}</Tag>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {bubbleItems.length === 0 ? (
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>{'发送消息开始对话，试试输入"你好"、"介绍一下 axios-fetch"、"写一段代码"'}</div>
          ) : (
            <Bubble.List items={bubbleItems} autoScroll style={{ maxHeight: '100%', height: 420 }} />
          )}
          <Sender value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} loading={loading} onCancel={handleCancel} placeholder={'输入消息，试试"你好"、"介绍一下 axios-fetch"...'} style={{ flexShrink: 0 }} />
        </div>
      </Card>
    </Flex>
  );
};

render(<AiChatExample />);

```

### API

### createAjax(options)

创建一个 axios 实例的封装。

#### 参数

| 属性                 | 类型     | 默认值           | 描述                                                    |
| -------------------- | -------- | ---------------- | ------------------------------------------------------- |
| baseURL / baseUrl    | String   | `''`             | API 的基础 URL，兼容两种写法                            |
| errorHandler         | Function | `() => {}`       | 全局错误处理函数，接收错误信息字符串                    |
| registerInterceptors | Function | `() => {}`       | 注册拦截器的函数，接收 `interceptors` 对象              |
| getDefaultHeaders    | Function | `() => ({})`     | 获取默认请求头的函数，返回对象                          |
| defaultError         | String   | `'请求发生错误'` | 默认错误信息                                            |
| showResponseError    | Function | 见下方           | 判断是否显示响应错误的函数，接收 response，返回 boolean |
| getResponseError     | Function | 见下方           | 获取响应错误信息的函数，接收 response，返回 string      |
| validateStatus       | Function | `() => true`     | axios 状态码校验                                        |
| cache                | Object   | 见下方           | 缓存配置，传给 Cache 实例                               |

`showResponseError` 默认逻辑：当 `config.showError === false` 时不显示；非 2xx 状态码或 `data.code !== 0` 时显示。

`getResponseError` 默认逻辑：依次尝试 `data.msg`、`data.error_msg.detail`、`data.error_msg`。

`cache` 支持 `{ ttl, maxLength, isLocal, localName, onError }`。当 `isLocal` 或 `localName` 开启时，未在单次请求里显式设置 `cacheOptions.isLocal` 的缓存也会默认持久化到 `localStorage`。

#### 返回值

返回 `ajax` 函数，具有以下方法与属性：

### ajax(params)

发送请求的主函数。

| 属性         | 类型           | 默认值  | 描述                                                                  |
| ------------ | -------------- | ------- | --------------------------------------------------------------------- |
| url          | String         | -       | 请求 URL                                                              |
| method       | String         | `'GET'` | 请求方法                                                              |
| data         | Object         | -       | 请求数据                                                              |
| params       | Object         | -       | URL 查询参数                                                          |
| urlParams    | Object         | -       | URL 路径参数替换                                                      |
| loader       | Function       | -       | 数据加载函数，替代真实请求                                            |
| cache        | Boolean/String | `false` | 缓存开关或缓存 key 前缀，字符串会参与最终缓存 key                     |
| cacheOptions | Object         | `{}`    | 缓存选项 `{ ttl, isLocal, cacheName }`，其中 `cacheName` 用于分组失效 |
| force        | Boolean        | `false` | 强制刷新缓存                                                          |
| showError    | Boolean        | `true`  | 设为 false 时静默本次请求错误                                         |

### ajax.postForm(config)

发送表单数据。

| 属性      | 类型   | 默认值 | 描述             |
| --------- | ------ | ------ | ---------------- |
| url       | String | -      | 请求 URL         |
| data      | Object | -      | 表单数据         |
| params    | Object | -      | URL 查询参数     |
| urlParams | Object | -      | URL 路径参数替换 |

### ajax.sse(config)

建立 SSE（Server-Sent Events）连接。该方法为异步函数，会在 request interceptors 执行完成并创建 EventSource 后返回 client。

| 属性            | 类型     | 默认值               | 描述                                                                                              |
| --------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| url             | String   | -                    | 请求 URL（支持绝对路径和相对路径）                                                                |
| params          | Object   | -                    | 追加到 URL 的查询参数                                                                             |
| headersToParams | Function | -                    | 自定义 headers 转 params 的函数，接收 request interceptors 处理后的最终 headers，默认直接作为参数 |
| onMessage       | Function | -                    | 收到默认 message 事件的回调 `(parsed, rawEvent) => {}`                                            |
| onData          | Function | -                    | 默认 message 事件数据合并更新后的回调 `(mergedData, rawEvent) => {}`                              |
| onOpen          | Function | -                    | 连接建立的回调 `(event) => {}`                                                                    |
| onError         | Function | -                    | 连接错误的回调 `(event) => {}`                                                                    |
| events          | Object   | -                    | 命名事件监听 `{ eventName: (parsed, rawEvent) => {} }`                                            |
| mergeData       | Function | 默认浅合并           | 自定义数据合并函数 `(prev, next) => merged`                                                       |
| EventSource     | Function | `window.EventSource` | 自定义 EventSource 实现，常用于测试或 Mock                                                        |
| ...options      | Object   | -                    | 透传给 EventSource 构造函数的配置，如 `{ withCredentials: true }`                                 |

**SSE 返回值**：`Promise<{ data, isConnected, lastUpdatedAt, eventSource, close } | null>`

| 属性          | 类型             | 描述                  |
| ------------- | ---------------- | --------------------- |
| data          | any (getter)     | 累计合并后的数据      |
| isConnected   | boolean (getter) | 当前连接状态          |
| lastUpdatedAt | number (getter)  | 最后更新时间戳        |
| eventSource   | EventSource      | 原始 EventSource 实例 |
| close         | Function         | 关闭连接              |

**SSE 特性**：

- 建连前会执行 request interceptors，再将最终 headers 转为 URL 查询参数
- 收到 `timeout` 命名事件时自动关闭并重新连接
- 手动调用 `close()` 后不再重连
- 非 `CLOSED` 状态的 `onerror` 不会触发 `errorHandler`（浏览器正在自动重连）
- 非浏览器环境或无 `EventSource` 时返回 `null`
- 浏览器原生 EventSource 不支持直接设置请求头，本方法通过 query params 透传认证信息，敏感 token 建议使用短期有效值或通过 `headersToParams` 做最小化转换

### 静态导出

| 导出                            | 描述                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| parseUrlParams(params)          | URL 路径参数替换函数，将 `{paramName}` 替换为 urlParams 对应值，会修改传入对象并对替换值进行 URL 编码 |
| buildUrlWithParams(url, params) | 构建带查询参数的 URL，自动处理 `?`/`&` 连接符，过滤空值                                               |

### ajax 属性

| 属性                        | 类型     | 描述                                     |
| --------------------------- | -------- | ---------------------------------------- |
| ajax.baseURL / ajax.baseUrl | String   | 基础 URL                                 |
| ajax.parseUrlParams         | Function | URL 参数解析函数                         |
| ajax.getDefaultHeaders      | Function | 获取默认请求头函数                       |
| ajax.buildUrlWithParams     | Function | URL 参数构建函数                         |
| ajax.cleanCache             | Function | 清空当前 ajax 实例的缓存                 |
| ajax.delCache               | Function | 删除指定内部缓存 key                     |
| ajax.delCacheByName         | Function | 按 `cacheOptions.cacheName` 删除分组缓存 |
