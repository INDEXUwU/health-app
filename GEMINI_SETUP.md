# Google Gemini API の設定手順

## 1. APIキーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 既存のGoogle Cloudプロジェクトを選択するか、新規作成
5. 生成されたAPIキーをコピー

## 2. 環境変数の設定

### ローカル開発環境の場合

1. プロジェクトルートに `.env` ファイルを作成します：

```bash
# health-app/.env ファイル
GEMINI_API_KEY=your_actual_api_key_here
```

2. `.env.example` を参考に、他の環境変数も必要に応じて設定してください

### 本番環境（Render）の場合

1. Renderのダッシュボードにログイン
2. 該当するWebサービスを選択
3. 「Environment」タブを開く
4. 「Add Environment Variable」をクリック
5. 以下を追加：
   - Key: `GEMINI_API_KEY`
   - Value: Google AI Studioで取得したAPIキー
6. 「Save Changes」をクリック

## 3. 動作確認

サーバーを起動すると、以下のメッセージが表示されます：

- ✓ Gemini API が初期化されました → 正常に動作
- ⚠ GEMINI_API_KEY が設定されていません → `.env` ファイルを確認
- ⚠ Gemini API の初期化に失敗しました → APIキーが無効

## 注意事項

- APIキーは決してGitHubなどに公開しないでください
- `.env` ファイルは `.gitignore` に含まれています
- 無料利用枠は1日あたり1,500リクエストまでです
