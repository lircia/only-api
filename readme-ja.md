# Only API

Only API は、Cloudflare Workers + Pages にデプロイできる OpenAI 互換 API ゲートウェイです。Worker バックエンド、Pages フロントエンド、D1 データベース、ユーザーログイン、登録、API Key 配布、チャネル管理、モデル広場、利用統計、Workers 利用量監視、任意の Telegram / WxPusher 通知を含みます。

特定の事業者やプラットフォームの API を使いたいのに、その API エンドポイントのローカルからの遅延が大きい、または一部で接続できないと感じたことはありませんか。このプロジェクトは、Cloudflare 経由で API リクエストを転送することで、その問題の一部を軽減できます。

このプロジェクトは API Key や上流 API エンドポイントを提供しません。このプラットフォームは API 転送のためだけに使います。

速度を上げるために Cloudflare ドメイン優先ルートまたは優先 IP サービスを使うこともできます。フロントエンドは上流 API を直接呼び出さないため、通常フロントエンドのドメインは優先化不要です。優先化に関するリンクは Web 検索で探せます。

このリポジトリは GitHub ホスティングと Cloudflare ダッシュボードでのデプロイを想定しています。`wrangler.toml` は使いません。

## 言語

- [English](README.md)
- [中文](readme-zh.md)
- [Deutsch](readme-de.md)
- [Русский](readme-ru.md)
- [العربية](readme-ar.md)
- [Ελληνικά](readme-el.md)

## プロジェクトの場所

| 用途 | パス |
| --- | --- |
| Pages フロントエンド | `apps/web` |
| Worker バックエンド | `apps/api/src/index.ts` |
| D1 スキーマ SQL | `apps/api/migrations/0001_initial.sql` |
| 依存関係ファイル | `package.json` |

## 主な機能

- `ADMIN_SETUP_SECRET` による初回スーパー管理者作成。
- 個人利用モードと複数ユーザーモード。
- 登録の有効化、メールコード認証、確認パスワード、メールドメイン検証、QQ メールの数字プレフィックス検証。
- 任意の Cloudflare Turnstile。フロントエンド Site Key は Pages 変数、バックエンド Secret Key は Worker 変数に設定します。
- ユーザー API Key は `oi-only-` プレフィックスを使います。
- OpenAI 互換 `/v1/*` 転送。
- ユーザーごとの利用上限は設定しません。
- チャネルテストと上流 `/models` からのモデル同期。
- モデル広場は 1 行に 1 モデルを表示し、表示名の編集と非表示化ができます。
- 3 時間、1 日、7 日、15 日、全期間の利用統計。
- Workers 利用量ページは使用済み割合と残り割合を表示します。
- Workers 利用量は既定で 6 時間ごとに取得し、Telegram または WxPusher へ通知できます。
- フロントエンドの時刻表示は UTC+8 に補正されます。
- 黒白、淡い青白、黄紫、緑赤、ピンク橙のテーマ。
- 画像 URL によるフロントエンド背景画像。

## デプロイ 1：Worker をデプロイ

Cloudflare Workers & Pages で Worker プロジェクトを作成または開き、この GitHub リポジトリを接続します。

Worker のビルド設定：

| 設定 | 値 |
| --- | --- |
| ルートディレクトリ | 空欄または `/` |
| ビルドコマンド | `npm ci` |
| デプロイコマンド | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

`--keep-vars` は、Cloudflare ダッシュボードで設定した変数とシークレットを保持するための指定です。更新後に変数や D1 バインドが消えた場合は、新しい Worker ではなく同じ Worker を再デプロイしているか確認し、Worker のバインド画面をもう一度確認してください。

## デプロイ 2：D1 データベースを作成

Cloudflare ダッシュボードで D1 データベースを作成します。

推奨データベース名：

```txt
only_api
```

Worker のバインド名は必ず次の名前にします：

```txt
DB
```

D1 コンソールを開き、次のファイルの SQL をすべて実行します：

```txt
apps/api/migrations/0001_initial.sql
```

作成されるテーブル：

| テーブル | 用途 |
| --- | --- |
| `users` | ユーザー、管理者、スーパー管理者 |
| `email_verifications` | 13 桁メール認証コード |
| `sessions` | ログインセッション |
| `api_keys` | ユーザー API Key |
| `channels` | 上流 API チャネル |
| `model_catalog` | モデル広場のモデル |
| `usage_logs` | API 転送の利用記録 |
| `worker_usage_snapshots` | Workers 利用量スナップショット |
| `system_settings` | システム設定 |

## デプロイ 3：Worker リソースと変数を設定

Worker 設定で D1 をバインドします：

| 種類 | 名前 | 値 |
| --- | --- | --- |
| D1 database | `DB` | 作成した D1 データベース |

必須 Worker 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `APP_ORIGIN` | 変数 | Pages フロントエンド URL |
| `ADMIN_SETUP_SECRET` | シークレット | 初回スーパー管理者作成用パスワード |
| `JWT_SECRET` | シークレット | セッション用の長いランダム文字列 |

推奨 Worker 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | 変数 | フロントエンドに表示する公開 Worker URL |

任意のメール変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `RESEND_API_KEY` | シークレット | Resend API Key |
| `RESEND_FROM` | 変数 | 送信者、例 `Only API <noreply@example.com>` |

任意の Turnstile Worker 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | シークレット | Cloudflare Turnstile Secret Key |

任意の Workers 利用量変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | 変数 | Cloudflare アカウント ID |
| `CF_API_TOKEN` | シークレット | Workers 利用量を読み取れる API Token |
| `WORKERS_DAILY_REQUEST_LIMIT` | 変数 | 割合計算用の日次リクエスト上限。既定値は `100000` |

別名として `CLOUDFLARE_ACCOUNT_ID`、`CF_ACCOUNT_TAG`、`CLOUDFLARE_ACCOUNT_TAG`、`CF_ZONE_ID`、`CLOUDFLARE_ZONE_ID`、`CLOUDFLARE_API_TOKEN`、`CF_TOKEN`、`CLOUDFLARE_TOKEN` も使えます。

Telegram 通知変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | シークレット | Telegram bot token |
| `TELEGRAM_CHAT_ID` | 変数 | Telegram のチャット、グループ、チャンネル ID |

WxPusher 通知変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `WXPUSHER_APP_TOKEN` | シークレット | WxPusher AppToken |
| `WXPUSHER_UIDS` | 変数 | カンマ区切り UID。Topic を使わない場合は必須 |
| `WXPUSHER_TOPIC_IDS` | 変数 | カンマ区切り Topic ID。UID を使わない場合は必須 |

任意のスケジュールトリガー：

Cloudflare ダッシュボードで Worker Cron Trigger を追加できます。例として 1 時間ごとに実行します。アプリ側は設定された間隔に達した場合だけ Workers 利用量を取得します。既定間隔は 360 分です。

## デプロイ 4：Pages フロントエンドをデプロイ

Cloudflare Pages で同じ GitHub リポジトリを接続します。

Pages のビルド設定：

| 設定 | 値 |
| --- | --- |
| フレームワーク | `React (Vite)` |
| ルートディレクトリ | 空欄または `/` |
| ビルドコマンド | `npm ci && npm run build:web` |
| ビルド出力ディレクトリ | `apps/web/dist` |
| Node.js バージョン | `20` 以上 |

必須 Pages 変数：

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

任意の Pages 変数：

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
```

Pages のデプロイ後、Worker 変数 `APP_ORIGIN` を Pages URL に設定します。

## 初回設定

Pages フロントエンド URL を開くと、初回のみ設定ページが表示されます。

必要なもの：

- `ADMIN_SETUP_SECRET`
- スーパー管理者メールアドレス
- スーパー管理者パスワード
- サイト名
- 個人利用モードまたは複数ユーザーモード

スーパー管理者作成後、設定ページは閉じられ、フロントエンドの初期設定フローでは管理者シークレットを使わなくなります。

## 登録認証

メール認証を有効にすると、登録時にリンクではなく 13 桁の数字コードを送信します。

- コードの有効期限は 13 分です。
- 1 つのコードにつき 3 回まで入力できます。
- 再送信の待ち時間は 67 秒です。
- 個人利用モードではメール認証は既定で無効です。
- 複数ユーザーモードではメール認証は既定で有効です。
- メールドメイン検証と QQ メール数字プレフィックス検証は既定で有効です。

## Workers 利用量と通知

Workers 利用量監視には Cloudflare アカウント ID と API Token 変数が必要です。足りない場合、フロントエンドに設定メッセージが表示されます。

表示項目：

- 現在の使用済み割合
- 現在の残り割合
- 日次リクエスト上限
- スナップショットの集計範囲

割合は、直近 24 時間の Worker リクエスト数を `WORKERS_DAILY_REQUEST_LIMIT` で割って計算します。既定値は `100000` です。

自動取得は既定で 6 時間ごとです。「今すぐ取得」をクリックすると、Telegram または WxPusher 変数が設定されている場合はすぐに通知も送信します。

## API の使い方

クライアント Base URL：

```txt
https://your-worker-domain.workers.dev/v1
```

ヘッダー：

```http
Authorization: Bearer oi-only-...
```

SillyTavern 推奨設定：

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain.workers.dev/v1
API Key: 完全な oi-only-... キー
Model: モデル広場からコピーしたモデル名
```

## チャネル Base URL

チャネルには上流 API のバージョンルートを入力します。

| サービス | チャネル Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| その他の互換サービス | 通常は `https://domain/v1` |

バックエンドは `/v1`、`/v1/`、`/v1/chat`、`/v1/chat/completions` などの一般的な末尾を自動補正します。

## トラブルシューティング

フロントエンドがバックエンドへ接続できない場合：

1. Pages 変数 `VITE_API_BASE_URL` を確認します。
2. Pages URL ではなく Worker URL を指定しているか確認します。
3. Pages 変数を変更した後は Pages を再デプロイします。
4. Worker バインド `DB` を確認します。
5. Worker 変数 `APP_ORIGIN`、`ADMIN_SETUP_SECRET`、`JWT_SECRET` を確認します。

SillyTavern が Unauthorized を表示する場合：

1. 表示されるプレフィックスではなく完全なキーを使います。
2. OpenAI Compatible または Custom OpenAI-compatible モードを使います。
3. キーの前後に空白がないか確認します。
4. 選択したモデル名がモデル広場に存在するか確認します。

## 上級者向け任意変数

通常のデプロイには不要です。

| 名前 | 用途 |
| --- | --- |
| `TELEGRAM_PARSE_MODE` | `HTML`、`MarkdownV2`、または `Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Telegram フォーラムトピック Thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Telegram ダイレクトメッセージ Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Telegram のサイレント通知 |
| `TELEGRAM_PROTECT_CONTENT` | Telegram メッセージの転送や保存を保護 |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Telegram リンクプレビューを無効化 |
| `WXPUSHER_URL` | WxPusher メッセージに付けるリンク |
| `WXPUSHER_CONTENT_TYPE` | `1` テキスト、`2` HTML、`3` Markdown |
| `WXPUSHER_VERIFY_PAY_TYPE` | WxPusher の有料ユーザーフィルター |
| `CF_WORKERS_DAILY_REQUEST_LIMIT` | 日次リクエスト上限の別名 |
| `CLOUDFLARE_WORKERS_DAILY_REQUEST_LIMIT` | 日次リクエスト上限の別名 |

免責事項：このプロジェクトは API 転送ツールにすぎません。上流 API Key、提供元の規約、費用、法令遵守は利用者自身の責任です。
このリポジトリは無期限にメンテナンスされません。
