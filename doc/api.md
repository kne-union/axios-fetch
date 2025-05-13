| 方法/属性 | 类型 | 描述 | 参数 | 返回值 | 示例 |
|----------|------|------|------|--------|------|
| **ajax(config)** | `Function` | 基础请求方法 | `config: Object`:<br>- `url?: String`<br>- `method?: String`<br>- `params?: Object`<br>- `loader?: Function` | `Promise<{data: {code: number, data: any, msg?: string}}>` | ```js<br>ajax({<br>  url: '/api',<br>  method: 'get'<br>})<br>``` |
| **ajax.postForm(config)** | `Function` | 表单提交方法 | `config: Object`:<br>- `url: String`<br>- `params?: Object`<br>- `data: Object` | `Promise<AxiosResponse>` | ```js<br>ajax.postForm({<br>  url: '/submit',<br>  data: {key: 'value'}<br>})<br>``` |

## Config 参数详情

| 参数 | 类型 | 必填 | 描述 | 适用方法 |
|------|------|------|------|----------|
| `url` | `String` | 是* | 请求地址（*loader方式可选） | 全部 |
| `method` | `String` | 否 | HTTP 方法 | ajax() |
| `params` | `Object` | 否 | URL 查询参数 | 全部 |
| `data` | `Object` | 是 | 请求体数据 | postForm() |
| `loader` | `Function` | 否 | 数据预处理函数 | ajax() |