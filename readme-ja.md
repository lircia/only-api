# Only API

Only API は Cloudflare Workers と Pages にデプロイできる OpenAI 互換 API ゲートウェイです。ログイン、登録、メール確認、API Key、チャンネル管理、モデル広場、利用統計、Workers 使用量確認、Telegram / WxPusher 通知に対応しています。

既定の英語版は [README.md](README.md) です。他の言語: [中国語](readme-zh.md) | [ドイツ語](readme-de.md) | [ロシア語](readme-ru.md) | [アラビア語](readme-ar.md) | [ギリシャ語](readme-el.md)

## プロジェクト構成

| 用途 | パス |
| --- | --- |
| Pages フロントエンド | `apps/web` |
| Worker バックエンド | `apps/api/src/index.ts` |
| D1 スキーマ SQL | `apps/api/migrations/0001_initial.sql` |
| 依存関係とスクリプト | `package.json` |

## 主な機能

- 初回セットアップでは `ADMIN_SETUP_SECRET` を使ってスーパー管理者を作成します。
- 個人利用モードではメール確認が既定で無効、複数ユーザーモードでは既定で有効です。
- 新しい API Key は `oi-only-` を使用します。以前に作成された Key も引き続き使えます。
- `/v1/models` はモデル広場で有効になっているモデル名を返します。
- モデル広場では表示名の編集、コピー、非表示ができます。
- メール確認登録は 13 桁の数字コードを使用します。有効期限は 13 分、入力は 3 回まで、再送には 67 秒の待機があります。
- メールドメイン確認と QQ メールの数字プレフィックス強制は、システム設定で切り替えでき、既定で有効です。
- 各チャンネルには個別のテストボタンがあり、テスト時に上流の `/models` を同期します。
- 利用統計は 3 時間、1 日、7 日、15 日、全期間を表示します。
- システム設定から Telegram と WxPusher のテスト通知を送れます。

## デプロイ 1: Worker バックエンド

Cloudflare Workers & Pages で Worker を作成し、この GitHub リポジトリを接続します。

| 設定 | 値 |
| --- | --- |
| ルートディレクトリ | 空欄または `/` |
| ビルドコマンド | `npm ci` |
| デプロイコマンド | `npx wrangler deploy apps/api/src/index.ts --name only-api-worker --compatibility-date 2024-12-01 --keep-vars` |

このプロジェクトでは `wrangler.toml` は不要です。

## デプロイ 2: D1 データベース

D1 データベースを作成します。新規作成時の推奨名:

```txt
only_api
```

別の D1 データベース名を使っていても問題ありません。Worker のバインド名だけは次の名前にしてください。

```txt
DB
```

D1 コンソールで次の SQL ファイルの内容をすべて実行します。

```txt
apps/api/migrations/0001_initial.sql
```

作成されるテーブル:

| テーブル | 用途 |
| --- | --- |
| `users` | ユーザーと管理者 |
| `email_verifications` | メール確認トークン |
| `sessions` | ログインセッション |
| `api_keys` | ユーザー API Key |
| `channels` | 上流チャンネル |
| `model_catalog` | モデル広場 |
| `usage_logs` | リクエスト利用ログ |
| `worker_usage_snapshots` | Workers 使用量スナップショット |
| `system_settings` | システム設定 |

## デプロイ 3: Worker のバインドと変数

Worker 設定で D1 をバインドします。

| 種類 | 名前 | 値 |
| --- | --- | --- |
| D1 データベース | `DB` | 作成した D1 データベース |

必須変数:

| 名前 | 種類 | 説明 |
| --- | --- | --- |
| `APP_ORIGIN` | Variable | Pages フロントエンドの URL |
| `ADMIN_SETUP_SECRET` | Secret | 初回セットアップ用の管理者キー |
| `JWT_SECRET` | Secret | 長いランダム文字列 |

推奨変数:

| 名前 | 種類 | 説明 |
| --- | --- | --- |
| `API_PUBLIC_BASE_URL` | Variable | フロントエンドに表示する公開 Worker URL |

任意変数:

| 名前 | 種類 | 説明 |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `RESEND_FROM` | Variable | メール送信元 |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile Secret Key |
| `CF_ACCOUNT_ID` | Variable | Cloudflare アカウント ID |
| `CF_API_TOKEN` | Secret | Workers 使用量を読むための Token |

通知に必要な変数:

| 名前 | 種類 | 説明 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram ボット Token |
| `TELEGRAM_CHAT_ID` | Variable | Telegram チャットまたはグループ ID |
| `WXPUSHER_APP_TOKEN` | Secret | WxPusher AppToken |
| `WXPUSHER_UIDS` | Variable | WxPusher UID。`WXPUSHER_TOPIC_IDS` を使わない場合は必須 |
| `WXPUSHER_TOPIC_IDS` | Variable | WxPusher Topic ID。`WXPUSHER_UIDS` を使わない場合は必須 |

## デプロイ 4: Pages フロントエンド

同じ GitHub リポジトリから Cloudflare Pages プロジェクトを作成します。

| 設定 | 値 |
| --- | --- |
| フレームワークプリセット | `React (Vite)` |
| ルートディレクトリ | 空欄または `/` |
| ビルドコマンド | `npm ci && npm run build:web` |
| ビルド出力ディレクトリ | `apps/web/dist` |
| Node.js バージョン | `20` 以上 |

Pages に必要な環境変数:

```txt
VITE_API_BASE_URL=https://your-worker-domain
```

Pages のデプロイ後、Worker 変数 `APP_ORIGIN` を Pages の URL に設定します。

## 初回セットアップと API 利用

Pages の URL を開き、`ADMIN_SETUP_SECRET`、メール、パスワード、サイト名、個人利用または複数ユーザーモードを入力します。

## 登録メール確認

メール確認が有効な場合、登録では確認リンクではなく 13 桁の数字コードをメールで送信します。

- コードは 13 分間有効です。
- 1 つのコードにつき入力できるのは 3 回までです。
- コード入力画面には「届かない場合は再送」ボタンがあります。
- 再送には 67 秒のクールダウンがあります。
- 登録フォームには確認用パスワード入力があります。
- メールドメイン確認は既定で有効で、`qq.com`、`163.com`、`gmail.com`、`outlook.com`、`yeah.net`、`hotmail.com`、`126.com` などの一般的なメールに対応します。
- QQ メールは既定で数字の QQ 番号プレフィックスが必要です。
- 管理者はシステム設定でメールドメイン確認と QQ 数字プレフィックス強制を無効化できます。

クライアント Base URL:

```txt
https://your-worker-domain/v1
```

認証ヘッダー:

```http
Authorization: Bearer oi-only-...
```

SillyTavern 推奨設定:

```txt
API type: OpenAI Compatible / Custom OpenAI-compatible
API Base URL: https://your-worker-domain/v1
API Key: 完全な oi-only-... key
Model: モデル広場からコピー
```

チャンネル Base URL の例:

| 提供元 | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## 高度な任意プッシュ変数

通常のデプロイでは不要です。Telegram のトピック、メッセージ形式、リンクプレビュー、または WxPusher の有料トピック動作を理解している利用者向けです。

| 名前 | 種類 | 説明 |
| --- | --- | --- |
| `TELEGRAM_PARSE_MODE` | Variable | `HTML`、`MarkdownV2`、`Markdown` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Variable | Telegram フォーラムトピックの Thread ID |
| `TELEGRAM_DIRECT_MESSAGES_TOPIC_ID` | Variable | Telegram Direct Messages Topic ID |
| `TELEGRAM_DISABLE_NOTIFICATION` | Variable | 真偽値、サイレント通知 |
| `TELEGRAM_PROTECT_CONTENT` | Variable | 真偽値、転送や保存から内容を保護 |
| `TELEGRAM_LINK_PREVIEW_DISABLED` | Variable | 真偽値、リンクプレビューを無効化 |
| `WXPUSHER_URL` | Variable | メッセージに付けるリンク |
| `WXPUSHER_CONTENT_TYPE` | Variable | `1` テキスト、`2` HTML、`3` Markdown。既定値は `1` |
| `WXPUSHER_VERIFY_PAY_TYPE` | Variable | `0` 確認しない、`1` 有料ユーザーのみ、`2` 未購読または期限切れユーザーのみ |

このリポジトリは無期限にメンテナンスされません。
