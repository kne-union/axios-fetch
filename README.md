
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

3. **灵活的拦截器**
   - 支持请求和响应拦截器
   - 可自定义拦截器注册逻辑
   - 方便进行请求/响应的预处理和后处理

4. **默认请求头管理**
   - 支持动态设置默认请求头
   - 便于统一管理认证信息
   - 灵活的请求头配置机制

5. **Loader 功能**
   - 支持数据模拟加载
   - 便于开发和测试
   - 无缝切换真实请求和模拟数据

6. **表单数据支持**
   - 提供 postForm 方法
   - 自动处理表单数据格式
   - 简化表单提交流程


### 使用场景

1. 需要统一管理 API 请求的项目
2. 需要处理复杂 URL 参数的场景
3. 需要统一错误处理的应用
4. 需要灵活配置请求/响应拦截的系统
5. 需要支持数据模拟的开发环境
6. 需要处理表单提交的应用



### 示例


#### 示例样式

```scss
.ant-card {
  border-color: black;
  text-align: center;
  width: 200px;
}
```

#### 示例代码

- 这里填写示例标题
- 这里填写示例说明
- _AxiosFetch(@kne/current-lib_axios-fetch)[import * as _AxiosFetch from "@kne/axios-fetch"],antd(antd)

```jsx
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

```


### API

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

