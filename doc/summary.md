### 模块概述

本模块提供了一套基于 Promise 的 HTTP 请求封装，主要包含以下核心功能：

1. **基础请求处理**：支持常规请求和特殊表单提交
2. **自动错误处理**：内置统一错误捕获机制
3. **URL 参数处理**：自动解析 URL 参数和查询字符串
4. **响应格式标准化**：统一返回数据格式为 `{ code, data, msg }` 结构
5. **请求加载器**：支持通过 loader 函数预处理请求参数

### 核心方法

### `createAjax(config)`

```javascript
import createAjax from '@kne/axios-fetch';

const ajax = createAjax(options);
```

### 全局配置参数

| 参数名 | 类型 | 默认值 | 描述 |
|-------|------|--------|------|
| `baseUrl` | `String` | `''` | 基础请求路径 |
| `getDefaultHeaders` | `Function` | `() => ({})` | 获取默认请求头的函数 |
| `defaultError` | `String` | `'请求发生错误'` | 默认错误提示信息 |
| `showResponseError` | `Function` | `(response) => {...}` | 判断是否显示错误信息的函数 |
| `getResponseError` | `Function` | `(response) => {...}` | 从响应中提取错误信息的函数 |
| `errorHandler` | `Function` | `() => {}` | 全局错误处理函数 |
| `validateStatus` | `Function` | `() => true` | 验证响应状态的函数 |
| `registerInterceptors` | `Function` | `() => {}` | 注册拦截器的函数 |

### 配置函数详细说明

#### `showResponseError(response)`
判断是否应该显示错误信息

**参数**:
- `response`: 响应对象

**返回值**:
- `Boolean`: 是否显示错误

**默认逻辑**:
```javascript
response.status !== 200 || 
(Object.hasOwn(response.data, 'code') && 
 response.data.code !== 0 && 
 response.config.showError !== false)
```

#### `getResponseError(response)`
从响应中提取错误信息

**参数**:
- `response`: 响应对象

**返回值**:
- `String`: 错误信息

**查找顺序**:
1. `response.data.msg`
2. `response.data.error_msg.detail`
3. `response.data.error_msg`

### 使用示例

```javascript
// 初始化配置
const options = {
  baseUrl: 'https://api.example.com',
  getDefaultHeaders: () => ({
    'X-Requested-With': 'XMLHttpRequest'
  }),
  errorHandler: (error) => {
    console.error('请求错误:', error);
  }
};

// 应用配置
createAjax(options);
```

### 基础请求方法，支持两种调用方式：

#### 1. 使用 loader 函数
```javascript
ajax({
  loader: (params) => {
    // 预处理逻辑
    return processedData;
  }
}).then(response => {
  // 响应格式: { data: { code: 0, data: ... } }
});
```

**特性**：
- 自动包装 loader 返回值为标准响应格式
- 错误自动捕获（code 500）
- 支持默认错误处理器

#### 2. 常规请求
```javascript
ajax({
  url: '/api/endpoint',
  method: 'get',
  params: { id: 123 }
}).then(response => {
  // 标准响应格式
});
```

**自动处理**：
- URL 参数解析（通过 `parseUrlParams`）
- 基础路径自动拼接

### `ajax.postForm(config)`
专门的表单提交方法

```javascript
ajax.postForm({
  url: '/submit',
  params: { ref: 'web' },  // 转换为查询字符串
  data: { name: 'value' }  // 表单数据
});
```

**特性**：
- 自动将 `params` 转换为 URL 查询字符串
- 自动添加默认请求头
- 使用 `application/x-www-form-urlencoded` 格式提交

### 响应格式规范

所有请求返回统一格式：
```typescript
{
  data: {
    code: number,  // 0-成功, 非0-错误
    data: any,     // 响应数据
    msg?: string   // 错误信息
  }
}
```

### 错误处理

- **自动捕获**：所有 loader 函数和请求错误会自动捕获
- **错误码**：系统错误统一返回 code 500
- **错误消息**：优先使用错误对象的 message 属性

### 使用示例

#### 基础 GET 请求
```javascript
ajax({
  url: '/user',
  params: { id: 123 }
}).then(({ data }) => {
  if (data.code === 0) {
    console.log(data.data);
  }
});
```

#### 表单提交
```javascript
ajax.postForm({
  url: '/register',
  data: {
    username: 'test',
    password: '123456'
  }
});
```

#### 使用 loader 预处理
```javascript
ajax({
  loader: () => {
    return fetchSomeData();
  }
}).then(({ data }) => {
  // 处理标准化响应
});
```

### 注意事项

1. `baseUrl` 需要在模块引入前配置
2. 表单提交时不需要手动设置 `Content-Type`
3. 错误处理器可通过外部覆盖实现自定义