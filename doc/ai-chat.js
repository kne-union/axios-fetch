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
