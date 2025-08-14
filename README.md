# EdgeOne Pages Function 反代模板

使用 TypeScript，开发时支持类型补全。具体怎么使用，自由发挥。

## 部署

EdgeOne 支持 `.ts` 直接部署，无需编译成 `.js`。

如果不用反代根目录，删除 `functions/index.ts`。

编辑 `[[default]].ts` 中的相关代码，设置你的源站，默认为 `httpbin.org`。默认开启 CORS，可以按需删除。

编辑 `edgeone.json` 中的相关配置，增加响应头、缓存。

如果不用仓库，直接打包上传 `functions` 文件夹和 `edgeone.json`。

## 文档

路由、API：https://edgeone.ai/document/162227908259442688

Fetch API（回源配置）：https://edgeone.ai/document/52687

`edgeone.json`（修改缓存、重定向、加头）：https://edgeone.ai/document/162316940304400384
