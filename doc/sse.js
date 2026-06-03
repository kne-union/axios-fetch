const { default: createAjax } = _AxiosFetch;
const { Button, Card, Tag, Space, message } = antd;
const { useState, useEffect, useRef } = React;

const ajax = createAjax({
  baseURL: 'https://api.example.com',
  getDefaultHeaders: () => ({ 'X-Token': 'test-token-123', appName: 'demo-app', env: 'test' }),
  registerInterceptors: interceptors => {
    interceptors.request.use(config => {
      config.baseURL = `${config.baseURL}/${config.headers.appName}/${config.headers.env}`;
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
      onMessage: (parsed, event) => addLog('message', `收到消息: ${JSON.stringify(parsed)}`),
      onData: data => addLog('data', `累计数据更新`),
      onError: event => addLog('error', `连接错误: readyState=${event.target?.readyState}`),
      events: {
        update: parsed => addLog('event', `[update事件] ${JSON.stringify(parsed)}`),
        timeout: () => addLog('timeout', '收到 timeout 事件，将自动重连')
      }
    });
    if (!client) {
      addLog('error', '当前环境不支持 EventSource');
      return;
    }
    clientRef.current = client;
    addLog('info', `实际连接地址: ${client.eventSource.url}`);
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
    message.info(`isConnected: ${client.isConnected}, lastUpdatedAt: ${client.lastUpdatedAt ? new Date(client.lastUpdatedAt).toLocaleTimeString() : '无'}`);
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
