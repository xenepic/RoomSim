# RoomSim

賃貸物件の間取りシミュレーター。間取り画像を背景に家具を配置・サイズ調整・回転できるブラウザアプリです。

## 機能

- 間取り画像のアップロード
- 縮尺設定（実測 / 畳数推定）
- 家具プリセット＋カスタム家具の追加
- 家具のドラッグ移動・リサイズ・回転
- グリッドスナップ（磁石式、最近傍エッジ吸着）
- Delete キーで削除 / Ctrl+C でコピー
- プロジェクトの保存・読み込み・リセット（localStorage）

## ローカル起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動（http://localhost:5173）
npm run dev

# プロダクションビルド
npm run build

# ビルド結果をローカルでプレビュー
npm run preview
```

**動作要件:** Node.js 18 以上

## Vercel へのデプロイ

### 初回デプロイ（GUI）

1. [vercel.com](https://vercel.com) にログイン
2. **Add New → Project** をクリック
3. GitHub リポジトリをインポート
4. 以下の設定を確認（Vite の自動検出で通常デフォルト設定のまま OK）
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. **Deploy** をクリック

### 初回デプロイ（Vercel CLI）

```bash
# Vercel CLI のインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ（プロジェクトルートで実行）
vercel

# プロダクションへのデプロイ
vercel --prod
```

### 以降のデプロイ

GitHub リポジトリと連携済みの場合、`main` ブランチへの push で自動デプロイされます。

## GitHub へのプッシュ

```bash
# リモートリポジトリを追加（GitHub で先にリポジトリを作成しておく）
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git

# main ブランチへプッシュ
git branch -M main
git push -u origin main
```

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite 6 |
| キャンバス | Konva / react-konva |
| 状態管理 | Zustand v5 |
