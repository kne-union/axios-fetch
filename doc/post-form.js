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
        message.success(`提交成功, ID: ${data.id}`);
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
        message.success(`带参数提交成功, ID: ${data.id}`);
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
