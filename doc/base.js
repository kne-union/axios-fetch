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
      message.success(`获取成功: ${data.title}`);
    });
  };

  const handlePost = () => {
    ajax({
      url: '/posts',
      method: 'POST',
      data: { title: '测试标题', body: '测试内容', userId: 1 }
    }).then(({ data }) => {
      console.log('POST 响应:', data);
      message.success(`创建成功, ID: ${data.id}`);
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
      message.success(`模拟数据: ${data.data.name}`);
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
