### createAjax(options)

创建一个 axios 实例的封装。

#### 参数

| 属性                 | 类型     | 默认值           | 描述                                                    |
| -------------------- | -------- | ---------------- | ------------------------------------------------------- |
| baseURL / baseUrl    | String   | `''`             | API 的基础 URL，兼容两种写法                            |
| errorHandler         | Function | `() => {}`       | 全局错误处理函数，接收错误信息字符串                    |
| registerInterceptors | Function | `() => {}`       | 注册拦截器的函数，接收 `interceptors` 对象              |
| getDefaultHeaders    | Function | `() => ({})`     | 获取默认请求头的函数，返回对象                          |
| defaultError         | String   | `'请求发生错误'` | 默认错误信息                                            |
| showResponseError    | Function | 见下方           | 判断是否显示响应错误的函数，接收 response，返回 boolean |
| getResponseError     | Function | 见下方           | 获取响应错误信息的函数，接收 response，返回 string      |
| validateStatus       | Function | `() => true`     | axios 状态码校验                                        |
| cache                | Object   | 见下方           | 缓存配置，传给 Cache 实例                               |

`showResponseError` 默认逻辑：当 `config.showError === false` 时不显示；非 2xx 状态码或 `data.code !== 0` 时显示。

`getResponseError` 默认逻辑：依次尝试 `data.msg`、`data.error_msg.detail`、`data.error_msg`。

`cache` 支持 `{ ttl, maxLength, isLocal, localName, onError }`。当 `isLocal` 或 `localName` 开启时，未在单次请求里显式设置 `cacheOptions.isLocal` 的缓存也会默认持久化到 `localStorage`。

#### 返回值

返回 `ajax` 函数，具有以下方法与属性：

### ajax(params)

发送请求的主函数。

| 属性         | 类型           | 默认值  | 描述                                                                  |
| ------------ | -------------- | ------- | --------------------------------------------------------------------- |
| url          | String         | -       | 请求 URL                                                              |
| method       | String         | `'GET'` | 请求方法                                                              |
| data         | Object         | -       | 请求数据                                                              |
| params       | Object         | -       | URL 查询参数                                                          |
| urlParams    | Object         | -       | URL 路径参数替换                                                      |
| loader       | Function       | -       | 数据加载函数，替代真实请求                                            |
| cache        | Boolean/String | `false` | 缓存开关或缓存 key 前缀，字符串会参与最终缓存 key                     |
| cacheOptions | Object         | `{}`    | 缓存选项 `{ ttl, isLocal, cacheName }`，其中 `cacheName` 用于分组失效 |
| force        | Boolean        | `false` | 强制刷新缓存                                                          |
| showError    | Boolean        | `true`  | 设为 false 时静默本次请求错误                                         |

### ajax.postForm(config)

发送表单数据。

| 属性      | 类型   | 默认值 | 描述             |
| --------- | ------ | ------ | ---------------- |
| url       | String | -      | 请求 URL         |
| data      | Object | -      | 表单数据         |
| params    | Object | -      | URL 查询参数     |
| urlParams | Object | -      | URL 路径参数替换 |

### ajax.sse(config)

建立 SSE（Server-Sent Events）连接。该方法为异步函数，会在 request interceptors 执行完成并创建 EventSource 后返回 client。

| 属性            | 类型     | 默认值               | 描述                                                                                              |
| --------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| url             | String   | -                    | 请求 URL（支持绝对路径和相对路径）                                                                |
| params          | Object   | -                    | 追加到 URL 的查询参数                                                                             |
| headersToParams | Function | -                    | 自定义 headers 转 params 的函数，接收 request interceptors 处理后的最终 headers，默认直接作为参数 |
| onMessage       | Function | -                    | 收到默认 message 事件的回调 `(parsed, rawEvent) => {}`                                            |
| onData          | Function | -                    | 默认 message 事件数据合并更新后的回调 `(mergedData, rawEvent) => {}`                              |
| onOpen          | Function | -                    | 连接建立的回调 `(event) => {}`                                                                    |
| onError         | Function | -                    | 连接错误的回调 `(event) => {}`                                                                    |
| events          | Object   | -                    | 命名事件监听 `{ eventName: (parsed, rawEvent) => {} }`                                            |
| mergeData       | Function | 默认浅合并           | 自定义数据合并函数 `(prev, next) => merged`                                                       |
| EventSource     | Function | `window.EventSource` | 自定义 EventSource 实现，常用于测试或 Mock                                                        |
| ...options      | Object   | -                    | 透传给 EventSource 构造函数的配置，如 `{ withCredentials: true }`                                 |

**SSE 返回值**：`Promise<{ data, isConnected, lastUpdatedAt, eventSource, close } | null>`

| 属性          | 类型             | 描述                  |
| ------------- | ---------------- | --------------------- |
| data          | any (getter)     | 累计合并后的数据      |
| isConnected   | boolean (getter) | 当前连接状态          |
| lastUpdatedAt | number (getter)  | 最后更新时间戳        |
| eventSource   | EventSource      | 原始 EventSource 实例 |
| close         | Function         | 关闭连接              |

**SSE 特性**：

- 建连前会执行 request interceptors，再将最终 headers 转为 URL 查询参数
- 收到 `timeout` 命名事件时自动关闭并重新连接
- 手动调用 `close()` 后不再重连
- 非 `CLOSED` 状态的 `onerror` 不会触发 `errorHandler`（浏览器正在自动重连）
- 非浏览器环境或无 `EventSource` 时返回 `null`
- 浏览器原生 EventSource 不支持直接设置请求头，本方法通过 query params 透传认证信息，敏感 token 建议使用短期有效值或通过 `headersToParams` 做最小化转换

### 静态导出

| 导出                            | 描述                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| parseUrlParams(params)          | URL 路径参数替换函数，将 `{paramName}` 替换为 urlParams 对应值，会修改传入对象并对替换值进行 URL 编码 |
| buildUrlWithParams(url, params) | 构建带查询参数的 URL，自动处理 `?`/`&` 连接符，过滤空值                                               |

### ajax 属性

| 属性                        | 类型     | 描述                                     |
| --------------------------- | -------- | ---------------------------------------- |
| ajax.baseURL / ajax.baseUrl | String   | 基础 URL                                 |
| ajax.parseUrlParams         | Function | URL 参数解析函数                         |
| ajax.getDefaultHeaders      | Function | 获取默认请求头函数                       |
| ajax.buildUrlWithParams     | Function | URL 参数构建函数                         |
| ajax.cleanCache             | Function | 清空当前 ajax 实例的缓存                 |
| ajax.delCache               | Function | 删除指定内部缓存 key                     |
| ajax.delCacheByName         | Function | 按 `cacheOptions.cacheName` 删除分组缓存 |
