# API Relay Cloudflare

Cloudflare Workers + Pages API 中转站，支持用户注册登录、邮箱验证、API Key 分发、渠道管理、模型列表、用量统计、管理员配置、渠道健康检测、Workers 用量监测，以及 Telegram / WxPusher 可选推送。

这个项目适合直接上传到 GitHub，然后在 Cloudflare 控制台中连接 GitHub 仓库部署。你不需要编辑 `wrangler.toml`，本项目已经不使用 `wrangler.toml`。

## 项目位置

| 用途 | 路径 | 说明 |
| --- | --- | --- |
| 前端 Pages | `apps/web` | 管理后台、登录注册、统计页面 |
| 后端 Worker | `apps/api/src/index.ts` | API、鉴权、转发、定时任务 |
| D1 建表 SQL | `apps/api/migrations/0001_initial.sql` | 复制到 Cloudflare D1 控制台执行 |
| 依赖配置 | `package.json` | 仓库根目录 |

## 功能概览

- 首次访问使用 `ADMIN_SETUP_SECRET` 创建超级管理员。
- 超级管理员创建后，初始化入口自动关闭，管理员密钥失效。
- 默认自用配置，可切换多人配置。
- 用户注册、登录、邮箱验证。
- Resend 邮件验证支持。
- Cloudflare Turnstile 人机验证默认关闭，可在系统设置中开启。
- 用户 API Key 创建、展示、撤销。
- OpenAI-compatible `/v1/*` API 转发。
- 不做用户限额，不做模型用量限制，只做 Key 鉴权和统计记录。
- 渠道设置、优先级路由、渠道健康检测。
- 可用模型列表自动从渠道 `/models` 同步。
- Workers 用量监测，默认 1 小时一次，可在系统设置修改。
- Telegram / WxPusher 推送 Workers 用量，可选启用。
- D1 存储业务数据，KV 预留为缓存绑定。

## GitHub 仓库结构

```txt
.
├─ apps
│  ├─ api
│  │  ├─ migrations
│  │  │  └─ 0001_initial.sql
│  │  ├─ src
│  │  │  └─ index.ts
│  │  └─ .dev.vars.example
│  └─ web
│     ├─ public
│     │  └─ _redirects
│     ├─ src
│     │  ├─ main.tsx
│     │  └─ styles.css
│     ├─ index.html
│     └─ vite.config.ts
├─ .env.example
├─ package.json
├─ package-lock.json
├─ README.md
└─ tsconfig.json
```

## 第一步：创建 D1 数据库

在 Cloudflare 控制台里创建 D1 数据库：

```txt
数据库名称：api_relay
```

后端代码里需要的 D1 绑定名是：

```txt
DB
```

创建完成后，进入这个 D1 数据库的控制台，把下面这个文件里的 SQL 全部复制进去执行：

```txt
apps/api/migrations/0001_initial.sql
```

这一步会创建项目需要的表。

## D1 会创建的表

| 表名 | 用途 |
| --- | --- |
| `users` | 用户、管理员、超级管理员账号 |
| `email_verifications` | 注册邮箱验证令牌 |
| `sessions` | 登录会话 |
| `api_keys` | 用户 API Key |
| `channels` | 上游 API 渠道配置 |
| `model_catalog` | 可用模型列表 |
| `usage_logs` | API 转发请求、状态、延迟和 token 使用记录 |
| `worker_usage_snapshots` | Workers 用量采集快照 |
| `system_settings` | 系统设置，例如站点名、模式、检测间隔、人机验证开关 |

`system_settings` 会写入这些默认配置：

| 设置项 | 默认值 |
| --- | --- |
| `siteName` | `API Relay` |
| `appMode` | `self` |
| `registrationEnabled` | `true` |
| `captchaEnabled` | `false` |
| `captchaSiteKey` | 空字符串 |
| `healthCheckIntervalMinutes` | `60` |
| `workerUsageIntervalMinutes` | `60` |
| `lastHealthCheckAt` | 空字符串 |
| `lastWorkerUsageCheckAt` | 空字符串 |
| `defaultChannelStrategy` | `priority` |
| `notifyWorkerUsage` | `false` |

## 第二步：部署后端 Worker

在 Cloudflare 控制台中：

1. 进入 Workers & Pages。
2. 创建 Worker。
3. 选择连接 GitHub 仓库。
4. 选择这个仓库。
5. 构建设置按下面填写。

| 配置项 | 值 |
| --- | --- |
| Root directory | 留空或 `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name api-relay-worker --compatibility-date 2024-12-01` |

这个命令只告诉 Cloudflare 部署哪个后端入口文件，不需要 `wrangler.toml`。

## 第三步：给 Worker 绑定 D1、KV、变量

Worker 创建后，进入这个 Worker 的设置页面，找到 Bindings / Variables。

必须绑定：

| 类型 | 变量名 | 选择 |
| --- | --- | --- |
| D1 database | `DB` | `api_relay` |

可选绑定：

| 类型 | 变量名 | 用途 |
| --- | --- | --- |
| KV namespace | `CACHE` | 预留缓存 |

必须添加的变量或密钥：

| 名称 | 建议类型 | 说明 |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages 前端域名，例如 `https://xxx.pages.dev` |
| `ADMIN_SETUP_SECRET` | Secret | 首次创建超级管理员用的管理员密钥 |
| `JWT_SECRET` | Secret | 随机长字符串，用于会话安全 |
| `API_PUBLIC_BASE_URL` | Variable | Worker 后端地址，例如 `https://api-relay-worker.xxx.workers.dev` |

邮件验证可选：

| 名称 | 建议类型 | 说明 |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | 发件人，例如 `API Relay <noreply@example.com>` |

人机验证可选：

| 名称 | 建议类型 | 说明 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

Workers 用量监测可选：

| 名称 | 建议类型 | 说明 |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare 账户 ID |
| `CF_API_TOKEN` | Secret | 用于读取 Workers 用量的 Cloudflare API Token |

Telegram 推送可选：

| 名称 | 建议类型 | 说明 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram 机器人 Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram 群组或用户 Chat ID |

WxPusher 推送可选：

| 名称 | 建议类型 | 说明 |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher 用户 ID，多个用英文逗号分隔 |

## 第四步：部署前端 Pages

在 Cloudflare Pages 中：

1. 创建 Pages 项目。
2. 连接同一个 GitHub 仓库。
3. 构建设置按下面填写。

| 配置项 | 值 |
| --- | --- |
| Framework preset | `None` 或 `Vite` |
| Root directory | 留空或 `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` 或更高 |

Pages 需要添加环境变量：

```txt
VITE_API_BASE_URL=https://你的-worker域名.workers.dev
```

如果你给 Worker 绑定了自定义域名，也可以填自定义域名：

```txt
VITE_API_BASE_URL=https://api.example.com
```

## 第五步：首次初始化

部署完成后，打开 Pages 前端域名。

第一次访问会显示初始化页面，需要输入：

- 管理员密钥：`ADMIN_SETUP_SECRET`
- 超级管理员邮箱
- 超级管理员密码
- 站点名称
- 自用配置或多人配置

超级管理员创建成功后：

- 初始化页面不再显示
- `ADMIN_SETUP_SECRET` 不再用于前端初始化
- 后续配置通过管理员界面完成

## API 中转地址

客户端 Base URL：

```txt
https://你的-worker域名.workers.dev/v1
```

请求头：

```http
Authorization: Bearer sk-relay-...
```

用户在前端控制台生成自己的 API Key 后即可使用。

## 本地可选命令

如果你只想用 Cloudflare 网页部署，可以忽略这一节。

```bash
npm ci
npm run typecheck
npm run build:web
```

如果你会用命令行，也可以用下面的命令部署后端，但不是必须：

```bash
npm run deploy:api
```
