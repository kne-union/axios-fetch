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
          <div style={{ fontSize: 12, color: '#666' }}>urlParams: {`{ userId: '1', postId: '42' }`}</div>
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
