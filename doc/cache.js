const { default: createAjax } = _AxiosFetch;
const { Button, Card, Space, Input, Switch, message, Tag, Alert } = antd;
const { useState, useRef, useCallback } = React;

const CacheExample = () => {
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheKey, setCacheKey] = useState('users');
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
      cache: cacheEnabled ? cacheKey : false,
      cacheOptions: { ttl: cacheTtl * 1000 }
    });
    setLastFromCache(p._fromCache);
    if (p._fromCache) {
      setCacheHitCount(prev => prev + 1);
    }
    p.then(({ data }) => {
      const cachedAt = new Date().toLocaleTimeString();
      message.success(`数据获取成功 (${cachedAt})`);
      console.log('响应数据:', data);
    });
  };

  const handleForceRequest = () => {
    const ajax = getAjax();
    setRequestCount(prev => prev + 1);
    const p = ajax({
      url: '/posts/1',
      cache: cacheKey,
      force: true,
      cacheOptions: { ttl: cacheTtl * 1000 }
    });
    setLastFromCache(p._fromCache);
    p.then(({ data }) => {
      message.success('强制刷新成功');
      console.log('强制刷新数据:', data);
    });
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="请求缓存" size="small">
        <Alert type="info" showIcon message="启用 cache 后，相同参数的请求在 TTL 内会直接返回缓存，不会重复发送网络请求。设置 force: true 可强制刷新。" style={{ marginBottom: 12 }} />
        <Space wrap>
          <span>缓存:</span>
          <Switch checked={cacheEnabled} onChange={setCacheEnabled} checkedChildren="开" unCheckedChildren="关" />
          <span>Cache Key:</span>
          <Input value={cacheKey} onChange={e => setCacheKey(e.target.value)} style={{ width: 120 }} size="small" />
          <span>TTL(秒):</span>
          <Input value={cacheTtl} onChange={e => setCacheTtl(Number(e.target.value))} style={{ width: 80 }} size="small" type="number" />
        </Space>
        <div style={{ marginTop: 12 }}>
          <Space>
            <Button type="primary" onClick={handleRequest}>发送请求</Button>
            <Button type="dashed" onClick={handleForceRequest}>强制刷新 (force)</Button>
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
