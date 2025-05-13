const { default: axiosFetch } = _AxiosFetch;
const { Button } = antd;

const ajax = axiosFetch();

const BaseExample = () => {
  return (
    <div>
      <Button
        onClick={() => {
          ajax({
            loader: async () => {
              return await new Promise(resolve => {
                setTimeout(() => {
                  resolve('请求成功');
                }, 1000);
              });
            }
          }).then(({data}) => {
            console.log(data);
            alert(data.data);
          });
        }}>
        点击发送请求
      </Button>
    </div>
  );
};

render(<BaseExample />);
