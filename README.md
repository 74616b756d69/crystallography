# 恐竜図鑑 野外記録 — Dinosaur Field Notes

文化祭展示用の恐竜図鑑です。手書き風の「野外調査ノート」デザインで 100 種の恐竜を一覧・検索でき、
写真・3D 骨格・産地マップ・外部データ要約を表示します。目玉は **Web カメラを使った非接触の
ジェスチャー操作**です。

## 構成

- frontend: Vite + TypeScript（Three.js で 3D 骨格、TensorFlow.js で手認識、Leaflet で地図）
- backend: Express + TypeScript
- data source: Wikidata / Wikimedia Commons / PaleoBioDB（無料の公開 API）
- runtime: Docker Compose

## 起動

### Docker（推奨）

1. Docker Desktop を起動する
2. ルートで `docker compose up --build` を実行する
3. ブラウザで http://localhost:5173 を開く

### ローカル単体起動

```bash
# backend
cd backend && npm install && npm run dev          # http://localhost:3000

# frontend（別ターミナル）
cd frontend && npm install
BACKEND_ORIGIN=http://localhost:3000 npm run dev   # http://localhost:5173
```

backend のヘルスチェックは http://localhost:3000/api/health です。

## できること

- 100 種の恐竜をカード一覧で表示（名前・体長・体重・時代・産地・分類）
- キーワード / 時代 / 大陸 / 食性 / 分類 / 体長で絞り込み検索
- 各カードの**写真**表示（Wikidata から自動取得、またはローカル差し替え）
- 詳細画面で**3D 骨格**をドラッグ回転（Smithsonian などの CC0 モデルを差し込み可能）
- 産地マップ、外部データ要約、文献導線
- 🖐️ **ジェスチャー操作**（非接触）: 人差し指でカーソル移動 / つまんで決定 / 手を開いて戻る

## 目玉: ジェスチャー操作

ヘッダーの「🖐️ ジェスチャー操作」ボタンで、Web カメラの手認識による非接触ナビに切り替わります。
初回のみ手認識モデルの読み込みにネット接続が必要（以降キャッシュ）。カメラが無い / 許可されない
環境では自動で案内を出して安全に無効化します。

> ブラウザのカメラ権限は `https://` か `http://localhost` でのみ許可されます。会場 PC は
> カメラ付き・HTTPS もしくは localhost で動かしてください。

## 写真・3D モデルの追加

写真も 3D モデルも「後からドロップインで足せる」仕組みです。手順は
[docs/ADDING_ASSETS.md](docs/ADDING_ASSETS.md) を参照してください。

- 画像優先順位: ローカル差し替え → Wikidata 自動取得 → プレースホルダー（分類別シルエット）
- 3D: ローカル manifest に `.glb` を登録。未登録時は手続き生成の骨格プレースホルダーを表示

## メモ

- 外部 API（Wikidata / Commons / PaleoBioDB）は無料公開。Wikimedia は説明的な `User-Agent` を要求するため
  backend で付与済み。API が不安定・ブロックされている場合もローカルのフォールバックで一覧と詳細は落ちません。
- 恐竜骨格素材の収集条件と記録表は [ASSET_LICENSE_TRACKER.md](ASSET_LICENSE_TRACKER.md) を参照
