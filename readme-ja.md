# Only API

Only API は、Cloudflare Workers + Pages にデプロイできる OpenAI 互換 API ゲートウェイです。Worker バックエンド、Pages フロントエンド、D1 データベース、ユーザーログイン、登録、API Key 配布、チャネル管理、モデル広場、利用統計、Workers 利用量監視、任意の Telegram / WxPusher 通知、任意の Umami 統計を含みます。

上流 API のサービス拠点が遠い場合やネットワーク経路が不安定な場合、直接呼び出すと遅延の増大や接続失敗が発生することがあります。Only API は Cloudflare 経由でリクエストを転送し、このような状況で接続性を改善できる場合があります。また、複数の OpenAI 互換プロバイダーを 1 つの API エンドポイントにまとめ、クライアントから 1 つのアドレスで異なるチャネルのモデルへアクセスできます。

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
- 登録、メールコード認証、メールドメイン検証、QQ メール数字プレフィックス検証、Turnstile は個別に切り替えでき、既定ではすべて無効です。
- 任意の Cloudflare Turnstile。フロントエンド Site Key は Pages 変数、バックエンド Secret Key は Worker 変数に設定します。
- ユーザー API Key は `oi-only-` プレフィックスを使い、完全表示、コピー、削除に対応します。
- OpenAI 互換 `/v1/*` 転送。
- ユーザーごとの利用上限は設定しません。
- チャネルごとのテストで複数の補完 URL を順に確認し、成功 URL と遅延を記録して、上流 `/models` からモデルを同期します。
- モデル広場は 1 行に 1 モデルを表示し、折りたたみ、表示名編集、チャネル単位の一括追加/削除、`-all` による全削除、残存モデル整理に対応します。
- 管理者はユーザーの状態と権限を変更して一般ユーザーを削除できます。現在のユーザーとスーパー管理者は削除できません。
- 3 時間、1 日、7 日、15 日、全期間の利用統計。
- Workers 利用量ページは使用済み割合と残り割合を表示します。
- Worker Cron Trigger の設定後、Workers 利用量は既定で 6 時間ごとに取得し、Telegram または WxPusher へ通知できます。
- Pages フロントエンドと Worker バックエンドを別々に Umami 統計へ接続できます。
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

`--keep-vars` が維持するのはダッシュボードの通常環境変数です。シークレットは Cloudflare が別に維持しますが、このオプションは D1 バインディングを宣言または保証しません。このリポジトリは Wrangler 設定ファイルを使わないため、常に同じ Worker 名へデプロイし、更新のたびに `DB` バインディングを確認してください。消えていた場合は新しいデータベースを作らず、既存の D1 を再バインドします。

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

初回設定に必須の Worker 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `ADMIN_SETUP_SECRET` | シークレット | 初回スーパー管理者作成用パスワード |

スーパー管理者作成後は設定フローが `ADMIN_SETUP_SECRET` を読まないため、削除または変更できます。

推奨 Worker 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `APP_ORIGIN` | 変数 | CORS を制限する Pages URL。未設定時は `*` |
| `API_PUBLIC_BASE_URL` | 変数 | フロントエンドに表示する公開 Worker URL |

任意のメール変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `RESEND_API_KEY` | シークレット | Resend API Key |
| `RESEND_FROM` | 変数 | 送信者、例 `Only API <noreply@example.com>` |

メール認証を有効にする場合は、この 2 つを両方設定する必要があります。

任意の Turnstile Worker 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | シークレット | Cloudflare Turnstile Secret Key |

Turnstile を有効にする場合は、この Worker シークレットと Pages 変数 `VITE_TURNSTILE_SITE_KEY` の両方が必要です。

任意の Workers 利用量変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | 変数 | Cloudflare アカウント ID |
| `CF_API_TOKEN` | シークレット | Workers 利用量を読み取れる API Token |
| `WORKERS_DAILY_REQUEST_LIMIT` | 変数 | 割合計算用の日次リクエスト上限。既定値は `100000` |

別名として `CLOUDFLARE_ACCOUNT_ID`、`CF_ACCOUNT_TAG`、`CLOUDFLARE_ACCOUNT_TAG`、`CF_ZONE_ID`、`CLOUDFLARE_ZONE_ID`、`CLOUDFLARE_API_TOKEN`、`CF_TOKEN`、`CLOUDFLARE_TOKEN` も使えます。

任意のバックエンド Umami 変数：

| 名前 | 種類 | 用途 |
| --- | --- | --- |
| `UMAMI_BACKEND_ENABLED` | 変数 | `true` にすると Worker バックエンド統計を有効化 |
| `UMAMI_BACKEND_HOST_URL` | 変数 | Umami のホスト URL。例 `https://cloud.umami.is` |
| `UMAMI_BACKEND_WEBSITE_ID` | 変数 | バックエンド統計用の Umami Website ID |
| `UMAMI_BACKEND_HOSTNAME` | 変数 | Umami に表示する任意のホスト名。例 `api.example.com` |

バックエンド Umami はシステム設定でも入力できます。Worker 変数はシステム設定より優先されます。

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

自動確認と自動通知に必要なスケジュールトリガー：

チャネルの自動確認、Workers 利用量の自動取得、自動通知を使う場合は、Cloudflare ダッシュボードで Worker Cron Trigger を追加する必要があります。推奨式は `0 * * * *`（毎時）です。トリガーは Worker を起動し、アプリが設定間隔を確認します。チャネル確認は既定 60 分、Workers 利用量取得は既定 360 分です。自動通知には「Workers 利用量を通知」を有効にし、Telegram または WxPusher の設定も必要です。

## デプロイ 4：Pages フロントエンドをデプロイ

Cloudflare Pages で同じ GitHub リポジトリを接続します。

Pages のビルド設定：

| 設定 | 値 |
| --- | --- |
| フレームワーク | `React (Vite)` |
| ルートディレクトリ | 空欄または `/` |
| ビルドコマンド | `npm ci && npm run build:web` |
| ビルド出力ディレクトリ | `apps/web/dist` |

Cloudflare で Node.js ビルドバージョンの指定が必要な場合は、Pages ビルド変数 `NODE_VERSION=20` を追加します。

必須 Pages 変数：

```txt
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

任意の Pages 変数：

```txt
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_BACKGROUND_IMAGE_URL=https://example.com/background.jpg
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_UMAMI_WEBSITE_ID=your-frontend-umami-website-id
VITE_UMAMI_HOST_URL=https://cloud.umami.is
```

Pages のデプロイ後、Worker 変数 `APP_ORIGIN` を Pages URL に設定します。

## 初回設定

Pages フロントエンド URL を開くと、初回のみ設定ページが表示されます。

必要なもの：

- `ADMIN_SETUP_SECRET`
- スーパー管理者メールアドレス
- スーパー管理者パスワード
- サイト名

スーパー管理者作成後、設定ページは閉じられ、初期設定フローでは管理者シークレットを使わなくなります。登録、メール認証、メールドメイン検証、QQ メール数字プレフィックス検証、Turnstile、Workers 利用量通知、Umami は既定ですべて無効です。

## 登録認証

メール認証を有効にすると、登録時にリンクではなく 13 桁の数字コードを送信します。

- コードの有効期限は 13 分です。
- 1 つのコードにつき 3 回まで入力できます。
- 再送信の待ち時間は 67 秒です。
- 登録、メール認証、メールドメイン検証、QQ メール数字プレフィックス検証は既定ですべて無効です。
- ドメイン検証を有効にすると、`qq.com`、`163.com`、`gmail.com`、`outlook.com`、`yeah.net`、`hotmail.com`、`126.com`、`foxmail.com`、`icloud.com`、`yahoo.com`、`sina.com`、`live.com` のみ許可されます。
- QQ 数字プレフィックス検証を有効にすると、`qq.com` の `@` より前は数字だけである必要があります。

## Umami 統計

フロントエンド Umami は Pages コンソールへのアクセスを計測します。システム設定で入力するか、Pages 変数 `VITE_UMAMI_SCRIPT_URL`、`VITE_UMAMI_WEBSITE_ID`、`VITE_UMAMI_HOST_URL` を使います。

バックエンド Umami は公式 `POST /api/send` へ `backend_request` イベントを送信します。システム設定または Worker 変数で設定でき、有効時は Website ID が必須です。システム設定の保存・テストボタンは `umami_test` イベントを送信します。

バックエンド統計はユーザーのメール、API Key、リクエスト本文を送信しません。送信するのはルート分類、メソッド、ステータスコード、処理時間だけです。

## Workers 利用量と通知

Workers 利用量監視には Cloudflare アカウント ID と API Token 変数が必要です。足りない場合、フロントエンドに設定メッセージが表示されます。

表示項目：

- 現在の使用済み割合
- 現在の残り割合
- 日次リクエスト上限
- スナップショットの集計範囲

割合は、直近 24 時間の Worker リクエスト数を `WORKERS_DAILY_REQUEST_LIMIT` で割って計算します。既定値は `100000` です。

自動取得は既定で 6 時間ごとで、前述の Worker Cron Trigger が必要です。自動通知には「Workers 利用量を通知」の有効化も必要です。「今すぐ取得」は自動通知が無効でも、Telegram または WxPusher が設定済みなら直ちに通知します。

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

チャネルテストは標準 `/v1/chat/completions` を作成した後、一般的な末尾の組み合わせと最後に元 URL を試します。成功した完全 URL と遅延を保存し、以後の補完リクエストで利用します。モデル同期は引き続き Base URL と `/v1/models` を使います。

モデル広場では、選択した 1 チャネルに対してモデルを一括追加または非表示化できます。一括削除で `-all` を入力すると、そのチャネルの全モデルを非表示にします。名前を一括追加すれば再び有効化できます。残存モデル整理は削除済みチャネルのモデル記録を削除します。

新しい API Key は完全表示され、コピーと削除ができます。旧版で平文を保存していない Key は復元できないため、プレフィックスしか表示されない場合は新しい Key を作成してください。管理者は一般ユーザーを削除できますが、現在のアカウントとスーパー管理者は削除できません。

## トラブルシューティング

フロントエンドがバックエンドへ接続できない場合：

1. Pages 変数 `VITE_API_BASE_URL` を確認します。
2. Pages URL ではなく Worker URL を指定しているか確認します。
3. Pages 変数を変更した後は Pages を再デプロイします。
4. Worker バインド `DB` を確認します。
5. Worker の `DB` バインディングと `APP_ORIGIN` を確認します。初回設定時は `ADMIN_SETUP_SECRET` も確認します。

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
