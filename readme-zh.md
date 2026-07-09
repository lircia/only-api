# Only API

Only API 是一个可部署到 Cloudflare Workers 和 Pages 的 OpenAI-compatible API 中转项目。它包含用户登录注册、邮箱验证开关、API Key 分发、渠道管理、模型广场、用量统计、Workers 用量监测，以及可选的 Telegram / WxPusher 推送。

默认英文文档在 [README.md](README.md)。其他语言： [日本語](readme-ja.md) | [Deutsch](readme-de.md) | [Русский](readme-ru.md) | [العربية](readme-ar.md) | [Ελληνικά](readme-el.md)

## 项目位置

| 用途 | 路径 |
| --- | --- |
| Pages 前端 | `apps/web` |
| Worker 后端 | `apps/api/src/index.ts` |
| D1 数据库 SQL | `apps/api/migrations/0001_initial.sql` |
| 依赖和脚本 | `package.json` |

## 主要功能

- 首次访问使用 `ADMIN_SETUP_SECRET` 创建超级管理员。
- 自用配置默认不需要邮箱验证，多人配置默认启用邮箱验证。
- API Key 新格式为 `oi-only-`，此前生成的旧 Key 仍兼容。
- `/v1/models` 返回模型广场中启用的模型名。
- 模型广场支持编辑显示名、复制和隐藏模型。
- 渠道支持单独测试和全量检测，测试时会同步上游 `/models`。
- 用量页显示 3 小时、1 日、7 日、15 日和总览统计。
- Workers 用量检测缺少变量时会提示需要配置变量。
- 系统设置支持 Telegram 和 WxPusher 测试消息。

## 部署 1：先部署 Worker 后端

在 Cloudflare Workers & Pages 中创建 Worker，并连接你的 GitHub 仓库。

| 设置 | 填写 |
| --- | --- |
| Root directory | 留空或 `/` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

本项目不需要 `wrangler.toml`。`--keep-vars` 用来尽量保留你在 Cloudflare 后台设置的变量和密钥。

## 部署 2：创建 D1 数据库

在 Cloudflare D1 中创建数据库。新部署推荐名称：

```txt
only_api
```

如果你之前已经用了其他 D1 数据库名称，也可以继续用。代码真正需要的是 Worker 绑定名：

```txt
DB
```

打开 D1 控制台，把下面文件里的 SQL 全部复制进去执行：

```txt
apps/api/migrations/0001_initial.sql
```

会创建这些表：

| 表名 | 用途 |
| --- | --- |
| `users` | 用户、管理员、超级管理员 |
| `email_verifications` | 邮箱验证令牌 |
| `sessions` | 登录会话 |
| `api_keys` | 用户 API Key |
| `channels` | 上游渠道 |
| `model_catalog` | 模型广场 |
| `usage_logs` | 请求记录和用量 |
| `worker_usage_snapshots` | Workers 用量快照 |
| `system_settings` | 系统设置 |

## 部署 3：绑定 Worker 资源和变量

在 Worker 设置中绑定 D1：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| D1 database | `DB` | 你的 D1 数据库 |

必要变量：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages 前端地址，例如 `https://xxx.pages.dev` |
| `ADMIN_SETUP_SECRET` | Secret | 首次创建超级管理员用的管理员密钥 |
| `JWT_SECRET` | Secret | 任意长随机字符串 |

推荐变量：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | 前端显示给用户的 Worker 地址 |

可选邮箱验证：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | 例如 `Only API <noreply@example.com>` |

可选人机验证：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile Secret Key |

可选 Workers 用量监测：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Variable | Cloudflare Account ID |
| `CF_API_TOKEN` | Secret | 可读取 Workers 用量的 Token |

推送必要变量：

Telegram 必要变量：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram 机器人 Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram 群组或聊天 ID |

WxPusher 必要变量：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher 用户 UID，多个用英文逗号分隔；未配置 `WXPUSHER_TOPIC_IDS` 时必填 |
| `WXPUSHER_TOPIC_IDS` | Variable | WxPusher Topic ID，多个用英文逗号分隔；未配置 `WXPUSHER_UIDS` 时必填 |

## 部署 4：部署 Pages 前端

在 Cloudflare Pages 中连接同一个 GitHub 仓库。

| 设置 | 填写 |
| --- | --- |
| Framework preset | `React (Vite)` |
| Root directory | 留空或 `/` |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `apps/web/dist` |
| Node.js version | `20` 或更高 |

Pages 必要环境变量：

```txt
VITE_API_BASE_URL=https://你的-worker域名
```

如果你使用自定义 Worker 域名，也填自定义域名。Pages 部署完成后，把 Worker 变量 `APP_ORIGIN` 改成 Pages 前端地址。

## 首次初始化

打开 Pages 前端地址，会出现创建超级管理员页面。填写：

- `ADMIN_SETUP_SECRET`
- 超级管理员邮箱
- 超级管理员密码
- 站点名称
- 自用配置或多人配置

创建完成后，初始化入口会关闭，以后从后台系统设置里修改配置。

## API 使用

客户端 Base URL：

```txt
https://你的-worker域名/v1
```

请求头：

```http
Authorization: Bearer oi-only-...
```

SillyTavern 推荐：

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://你的-worker域名/v1
API Key: 完整 oi-only-... key
Model: 从模型广场复制
```

渠道 Base URL 示例：

| 服务 | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| 其他兼容服务 | 通常是 `https://域名/v1` |

## 高级可选推送变量

下面这些不是普通部署必填变量，适合已经熟悉 Telegram 话题、消息格式、链接预览或 WxPusher 付费主题的人使用。

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`、`MarkdownV2` 或 `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Telegram 群组论坛话题 Thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram Direct Messages Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | 布尔值，静默通知 |
| `TELEGRAM_PROTECT_CONTENT` | Variable | 布尔值，保护内容不被转发/保存 |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | 布尔值，关闭链接预览 |
| `WXPUSHER_URL` | Variable | 消息原文链接 |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` 文字，`2` HTML，`3` Markdown，默认 `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` 不验证，`1` 只发付费用户，`2` 只发未订阅或过期用户 |

此仓库的维护为无限期不维护。
