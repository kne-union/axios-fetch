# @kne/axios-fetch API 文档

## 安装

```bash
npm install @kne/axios-fetch axios
```

## 基本用法

```javascript
import createAjax from '@kne/axios-fetch';

const ajax = createAjax({
  baseURL: 'https://api.example.com',
  errorHandler: (error) => {
    console.error(error);
  }
});
```

## API 参考

### createAjax(options)

创建一个 axios 实例的封装。

#### 参数

- `options`: Object
  - `baseURL`: String - API 的基础 URL
  - `errorHandler`: Function - 错误处理函数
  - `registerInterceptors`: Function - 注册拦截器的函数
  - `getDefaultHeaders`: Function - 获取默认请求头的函数
  - `defaultError`: String - 默认错误信息
  - `showResponseError`: Function - 判断是否显示响应错误的函数
  - `getResponseError`: Function - 获取响应错误信息的函数
  - `...axiosOptions` - 其他 axios 配置选项

#### 返回值

返回一个封装后的 ajax 函数，具有以下特性：

- `ajax(params)`: 发送请求的主函数
  - `params.loader`: Function - 可选的数据加载函数
  - `params.urlParams`: Object - URL 参数对象
  - `params.url`: String - 请求 URL
  - 其他 axios 请求配置

- `ajax.postForm(config)`: 发送表单数据的便捷方法
  - `config.url`: String - 请求 URL
  - `config.params`: Object - 查询参数
  - `config.data`: Object - 表单数据
  - `config.urlParams`: Object - URL 参数对象
  - 其他 axios 请求配置

- `ajax.baseURL`: String - 基础 URL
- `ajax.parseUrlParams`: Function - URL 参数解析函数

### URL 参数替换

支持在 URL 中使用 `{paramName}` 语法，这些参数将被 `urlParams` 对象中的对应值替换：

```javascript
ajax({
  url: '/users/{userId}/posts/{postId}',
  urlParams: {
    userId: '123',
    postId: '456'
  }
});
// 将请求 /users/123/posts/456
```

### Loader 功能

支持使用 loader 函数来模拟请求：

```javascript
ajax({
  loader: () => {
    return new Promise((resolve) => {
      resolve({ name: 'John' });
    });
  }
});
// 返回 { data: { code: 0, data: { name: 'John' } } }
```

### 错误处理

默认的错误处理逻辑：
- 非 200 状态码
- 响应数据中 code 不为 0
- 请求发生错误

可以通过 `showResponseError` 和 `getResponseError` 选项自定义错误处理逻辑。
