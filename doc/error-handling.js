const { default: createAjax } = _AxiosFetch;
const { Button, Card, Space, Input, Tag, message, Table, Alert } = antd;
const { useState, useRef } = React;

const ErrorHandlingExample = () => {
  const ajax = useRef(createAjax({
    baseURL: 'https://jsonplaceholder.typicode.com',
    defaultError: '请求失败了',
    errorHandler: msg => {
      message.error(`[全局错误处理] ${msg}`);
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
      addLog('response', `status=${status}, 显示错误: ${status >= 400}`);
    });
  };

  const handleSuppressError = () => {
    ajax({ url: '/not-exist-api', showError: false }).then(({ data, status }) => {
      addLog('suppressed', `status=${status}, 错误已静默 (showError: false)`);
    });
  };

  const handleLoaderError = () => {
    ajax({
      loader: async () => {
        throw new Error('模拟业务异常');
      }
    }).then(({ data }) => {
      addLog('loader-error', `loader 异常: code=${data.code}, msg=${data.msg}`);
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
