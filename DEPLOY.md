# 部署到腾讯云 EdgeOne Pages

## 一、项目已经配好的部分

- 移除了 `kimi-plugin-inspect-react`（开发期调试插件，不该进生产构建）
- `vite.config.ts` 新增 `build.rollupOptions.manualChunks`，把 `lightweight-charts`
  和 React 运行时拆成独立 chunk，首屏不用等图表库
- 根目录新增 `edgeone.json`，构建参数和响应头都在里面，控制台不用手动填
- `package.json` 加了 `engines: node >= 20`

`edgeone.json` 里的 `nodeVersion` 填的是 `20.18.0` —— 这是 EdgeOne 构建环境的预装版本之一
（可选：14.21.3 / 16.20.2 / 18.20.4 / 20.18.0 / 22.11.0），填别的版本号可能导致部署失败。

## 二、部署步骤

1. 把代码推到 GitHub 或 Gitee（EdgeOne 两个都支持）
2. 登录腾讯云控制台 → 搜索 **EdgeOne** → 左侧导航选 **Pages** → 创建项目
3. 选「通过代码仓库创建」，授权后选中这个仓库
4. 构建配置会被 `edgeone.json` 覆盖，控制台里显示什么都不用改
5. 部署完成后拿到一个 `xxx.edgeone.app` 之类的二级域名，**这个免备案，可以直接公开**

之后每次 push 会自动触发重新构建。

## 三、绑自定义域名（www.w11nb.com）

⚠️ 腾讯云中国站要求：**自定义域名必须先完成 ICP 备案**，备案周期通常 2–3 周。
在备案下来之前，就先用平台送的二级域名。

备案完成后：
1. EdgeOne Pages 项目 → 域名管理 → 添加自定义域名
2. 去域名 DNS 服务商加一条 CNAME 记录，指向 EdgeOne 给的目标地址
3. 回控制台点一下验证，然后配 HTTPS 证书（可以申请免费证书）

**apex 域名跳转**：如果 `w11nb.com`（不带 www）也想能访问，在 `edgeone.json` 里加：

```json
"redirects": [
  {
    "source": "https://w11nb.com/:path*",
    "destination": "https://www.w11nb.com/:path*",
    "statusCode": 301
  }
]
```

这条只对已绑定的自定义域名生效，二级域名阶段加了没用。

## 四、几个注意点

**SPA 路由**：项目目前只有 `/` 一个路由，不需要配 fallback。
以后如果加了 `/about` 这类前端路由，要在 `edgeone.json` 里补 rewrites，
否则直接访问子路径会 404。

**行情接口**：`qt.gtimg.cn` / `ifzq.gtimg.cn` / `smartbox.gtimg.cn` 都是浏览器直连，
不经过服务端，所以不用配代理，也不受平台限制。但这几个是腾讯的非官方公开接口，
公开站点长期跑有被限流的风险。

**首次构建**：因为改了 `package.json` 和 `package-lock.json`，本地先跑一次
`npm install` 让 lock 文件同步，再提交。

## 五、还没做、可选

- 复盘/基本面数据仍是编译期常量，改数据要重新构建。挪到 `public/data/*.json`
  运行时加载的话，跑完 `update_review.py` 直接替换 JSON 就能生效
- `recharts` / `zod` / `next-themes` 等未使用依赖仍在 `package.json` 里
  （删的话要连对应的 `src/components/ui/*.tsx` 一起删，否则 `tsc -b` 报错）
