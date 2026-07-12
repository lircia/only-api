# Only API

Only API 是一个可部署到 Cloudflare Workers + Pages 的 OpenAI 兼容 API 中转项目。它包含 Worker 后端、Pages 前端、D1 数据库、用户登录、用户注册、API Key 分发、渠道管理、模型广场、用量统计、Workers 用量监测、可选的 Telegram / WxPusher 推送，以及可选的 Umami 统计。

当上游 API 的服务节点距离较远或网络连接不稳定时，直接调用可能出现延迟过高、连接失败等问题。Only API 可借助 Cloudflare 转发请求，在一定程度上改善访问体验。
同时，它可以将多个兼容 OpenAI 的厂商渠道集中到同一个 API 调用地址，让客户端通过一个地址访问不同渠道提供的模型。

我们不提供任何 API Key 与链接，该平台仅用于 API 的中转。

你也许可以使用 Cloudflare 域名优选服务来提升速度，前端并不进行调用所以可以不进行优选。优选的链接你可以通过进行网络查找。

本仓库适合 GitHub 托管和 Cloudflare 控制台部署，不需要使用 `wrangler.toml`。

## 语言

- [English](README.md)
- [日本語](readme-ja.md)
- [Deutsch](readme-de.md)
- [Русский](readme-ru.md)
- [العربية](readme-ar.md)
- [Ελληνικά](readme-el.md)

## 项目位置

| 用途 | 路径 |
| --- | --- |
| Pages 前端 | `apps/web` |
| Worker 后端 | `apps/api/src/index.ts` |
| D1 建表 SQL | `apps/api/migrations/0001_initial.sql` |
| 依赖文件 | `package.json` |

## 主要功能

- 使用 `ADMIN_SETUP_SECRET` 完成首次超级管理员初始化。
- 支持自用配置和多人配置。
- 支持开放注册、邮箱验证码注册、确认密码、邮箱后缀验证、QQ 邮箱数字前缀验证。
- 支持可选 Cloudflare Turnstile。前端 Site Key 填到 Pages 变量，后端 Secret Key 填到 Worker 变量。
- 用户 API Key 使用 `oi-only-` 前缀。
- 支持 OpenAI 兼容 `/v1/*` 转发。
- 不做用户额度限制。
- 支持渠道测试，并从上游 `/models` 同步模型。
- 模型广场一行显示一个模型，可修改显示名，也可隐藏模型。
- 支持 3 小时、1 日、7 日、15 日和总览用量统计。
- Workers 用量页显示已用百分比和剩余百分比。
- Workers 用量默认每 6 小时采集一次，并可推送到 Telegram 或 WxPusher。
- 支持前端 Pages 和后端 Worker 分别接入 Umami 统计。
- 前端时间统一按 UTC+8 显示。
- 内置黑白、浅蓝白、黄紫、绿红、粉橙主题。
- 支持通过图片 URL 设置前端背景图。

## 部署 1：部署 Worker 后端

在 Cloudflare Workers & Pages 中创建或打开 Worker 项目，并连接这个 GitHub 仓库。

Worker 构建设置：

| 设置 | 值 |
| --- | --- |
| 根目录 | 留空或 `/` |
| 构建命令 | `npm ci` |
| 部署命令 | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

`--keep-vars` 用来尽量保留你在控制台里设置的变量和密钥。如果更新后变量或 D1 绑定消失，请确认你部署的是同一个 Worker，而不是新建了另一个 Worker，然后到 Worker 绑定页面重新检查。

## 部署 2：创建 D1 数据库

在 Cloudflare 控制台创建 D1 数据库。

推荐数据库名称：

```txt
only_api
```

Worker 绑定名称必须是：

```txt
DB
```

打开 D1 控制台，执行这个文件中的全部 SQL：

```txt
apps/api/migrations/0001_initial.sql
```

SQL 会创建这些表：

| 表名 | 用途 |
| --- | --- |
| `users` | 用户、管理员、超级管理员 |
| `email_verifications` | 13 位邮箱验证码 |
| `sessions` | 登录会话 |
| `api_keys` | 用户 API Key |
| `channels` | 上游 API 渠道 |
| `model_catalog` | 模型广场模型 |
| `usage_logs` | API 转发用量记录 |
| `worker_usage_snapshots` | Workers 用量快照 |
| `system_settings` | 系统设置 |

## 部署 3：绑定 Worker 资源和变量

在 Worker 设置中绑定 D1：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| D1 数据库 | `DB` | 你的 D1 数据库 |

Worker 必要变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `APP_ORIGIN` | 变量 | Pages 前端地址 |
| `ADMIN_SETUP_SECRET` | 密钥 | 首次创建超级管理员的密码 |
| `JWT_SECRET` | 密钥 | 登录会话使用的长随机字符串 |

推荐 Worker 变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | 变量 | 前端显示的 Worker 公共地址 |

可选邮箱变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `RESEND_API_KEY` | 密钥 | Resend API Key |
| `RESEND_FROM` | 变量 | 发件人，例如 `Only API <noreply@example.com>` |

可选 Turnstile 后端变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | 密钥 | Cloudflare Turnstile Secret Key |

可选 Workers 用量变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | 变量 | Cloudflare 账户 ID |
| `CF_API_TOKEN` | 密钥 | 可读取 Workers 用量的 API Token |
| `WORKERS_DAILY_REQUEST_LIMIT` | 变量 | 计算百分比用的每日请求额度，默认 `100000` |

也支持这些别名：`CLOUDFLARE_ACCOUNT_ID`、`CF_ACCOUNT_TAG`、`CLOUDFLARE_ACCOUNT_TAG`、`CF_ZONE_ID`、`CLOUDFLARE_ZONE_ID`、`CLOUDFLARE_API_TOKEN`、`CF_TOKEN`、`CLOUDFLARE_TOKEN`。

可选后端 Umami 变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | 变量 | 填 `true` 后启用 Worker 后端统计 |
| `UMAMI_BACKEND_HOST_URL` | 变量 | Umami 地址，例如 `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | 变量 | 后端统计使用的 Umami Website ID |
| `UMAMI_BACKEND_HOSTNAME` | 变量 | Umami 中显示的后端域名，例如 `api.example.com` |

后端 Umami 也可以在系统设置里填写。Worker 变量会覆盖系统设置。

Telegram 推送变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | 密钥 | Telegram 机器人 Token |
| `TELEGRAM_CHAT_ID` | 变量 | Telegram 聊天、群组或频道 ID |

WxPusher 推送变量：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | 密钥 | WxPusher AppToken |
| `WXPUSHER_UIDS` | 变量 | 用英文逗号分隔的 UID，未使用 Topic 时必填 |
| `WXPUSHER_TOPIC_IDS` | 变量 | 用英文逗号分隔的 Topic ID，未使用 UID 时必填 |

可选定时触发器：

可以在 Cloudflare 控制台给 Worker 添加 Cron Trigger，例如每小时运行一次。项目会自己判断是否到达设置的采集间隔，默认间隔是 360 分钟。

## 部署 4：部署 Pages 前端

在 Cloudflare Pages 中连接同一个 GitHub 仓库。

Pages 构建设置：

| 设置 | 值 |
| --- | --- |
| 框架预设 | `React (Vite)` |
| 根目录 | 留空或 `/` |
| 构建命令 | `npm ci && npm run build:web` |
| 构建输出目录 | `apps/web/dist` |
| Node.js 版本 | `20` 或更高 |

Pages 必要变量：

```txt
VITE_API_BASE_URL=https://你的-worker域名.workers.dev
```

Pages 可选变量：

```txt
VITE_TURNSTILE_SITE_KEY=你的-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_UMAMI_WEBSITE_ID=你的前端-umami-website-id
VITE_UMAMI_HOST_URL=https://cloud.umami.is
```

Pages 部署完成后，把 Worker 变量 `APP_ORIGIN` 设置为 Pages 前端地址。

## 首次初始化

打开 Pages 前端地址。首次访问会显示初始化页面。

需要填写：

- `ADMIN_SETUP_SECRET`
- 超级管理员邮箱
- 超级管理员密码
- 站点名称
- 自用配置或多人配置

超级管理员创建完成后，初始化页面会关闭，前端初始化流程不再使用管理员密钥。

## 注册验证

开启邮箱验证后，注册不再发送验证链接，而是发送 13 位数字验证码。

- 验证码有效期 13 分钟。
- 每个验证码最多输入 3 次。
- 重新发送冷却时间 67 秒。
- 自用配置默认关闭邮箱验证。
- 多人配置默认开启邮箱验证。
- 邮箱后缀验证和 QQ 邮箱数字前缀验证默认开启。

## Umami 统计

前端 Umami 用于统计 Pages 控制台访问。可以在系统设置中填写，也可以使用 Pages 变量 `VITE_UMAMI_SCRIPT_URL`、`VITE_UMAMI_WEBSITE_ID`、`VITE_UMAMI_HOST_URL`。

后端 Umami 用于统计 Worker 请求，会发送 `backend_request` 事件。可以在系统设置中填写，也可以使用 Worker 变量 `UMAMI_BACKEND_ENABLED`、`UMAMI_BACKEND_HOST_URL`、`UMAMI_BACKEND_WEBSITE_ID`、`UMAMI_BACKEND_HOSTNAME`。

后端统计不会发送用户邮箱、API Key 或请求正文，只发送路径类别、请求方法、状态码和耗时。

## Workers 用量和推送

Workers 用量监测需要 Cloudflare 账号 ID 和 API Token 变量。缺少变量时，前端会显示配置提示。

页面会显示：

- 当前已用百分比
- 当前剩余百分比
- 每日请求额度
- 快照统计时间范围

百分比按最近 24 小时 Worker 请求量除以 `WORKERS_DAILY_REQUEST_LIMIT` 计算。默认额度是 `100000`。

自动采集默认每 6 小时一次。点击“立即采集”时，如果已经配置 Telegram 或 WxPusher 变量，也会立即同步推送。

## API 使用

客户端 Base URL：

```txt
https://你的-worker域名.workers.dev/v1
```

请求头：

```http
Authorization: Bearer oi-only-...
```

SillyTavern 推荐设置：

```txt
API 类型：OpenAI Compatible / Custom OpenAI-compatible
API Base URL：https://你的-worker域名.workers.dev/v1
API Key：完整的 oi-only-... 密钥
模型：从模型广场复制模型名
```

## 渠道 Base URL

渠道地址填写上游 API 的版本根路径。

| 服务 | 渠道 Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| 其他兼容服务 | 通常是 `https://domain/v1` |

后端会自动修正常见后缀，例如 `/v1`、`/v1/`、`/v1/chat`、`/v1/chat/completions`。

## 排错

如果前端连不上后端：

1. 检查 Pages 变量 `VITE_API_BASE_URL`。
2. 确认它填写的是 Worker 地址，不是 Pages 地址。
3. 修改 Pages 变量后重新部署 Pages。
4. 检查 Worker 绑定 `DB`。
5. 检查 Worker 变量 `APP_ORIGIN`、`ADMIN_SETUP_SECRET`、`JWT_SECRET`。

如果 SillyTavern 显示 Unauthorized：

1. 使用完整密钥，不要只复制前缀。
2. 使用 OpenAI Compatible 或 Custom OpenAI-compatible 模式。
3. 确认密钥前后没有空格。
4. 确认选择的模型名存在于模型广场。

## 专业可选变量

这些变量不是正常部署必须项。

| 名称 | 用途 |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`、`MarkdownV2` 或 `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram 论坛主题 Thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram 私聊主题 ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Telegram 静默推送 |
| `TELEGRAM_PROTECT_CONTENT` | 保护 Telegram 消息不被转发或保存 |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | 关闭 Telegram 链接预览 |
| `WXPUSHER_URL` | WxPusher 消息携带的链接 |
| `WXPUSHER_CONTENT_TYPE` | `1` 文本，`2` HTML，`3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | WxPusher 付费用户过滤 |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | 每日请求额度别名 |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | 每日请求额度别名 |

免责声明：本项目只是 API 中转工具。上游 API Key、服务商规则、费用和合法合规责任均由使用者自行承担。
此仓库的维护为无限期不维护。
