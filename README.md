## Crystallography Explorer

3Dmol.js ベースの試作を、TypeScript と Mol* ベースの構成へ置き換えるための土台です。
結晶構造データは無料で公開されている COD を利用し、backend が COD の OPTIMADE API と CIF 配布 URL を扱います。


### 構成

- frontend: Vite + TypeScript + Mol*
- backend: Express + TypeScript
- data source: Crystallography Open Database (COD)
- runtime: Docker Compose

### 起動

1. Docker Desktop を起動する
2. ルートで docker compose up --build を実行する
3. ブラウザで http://localhost:5173 を開く

backend のヘルスチェックは http://localhost:3000/api/health です。

### できること

- おすすめの結晶構造を一覧表示
- 化学式または元素記号で COD を検索
- COD の公開 CIF を Mol* で表示

### メモ

- COD は無料で公開されている結晶構造データベースです
- CIF の取得 URL は https://www.crystallography.net/cod/<COD_ID>.cif です
- まずは外部の無料 API を利用し、DynamoDB などの内部キャッシュは後段で追加する想定です

### 恐竜図鑑のデータ取得

- 出典は日本語版/英語版 Wikipedia、Wikimedia Commons、Wikidata、PaleoBioDB
- 起動時に `backend/data/dinosaur-cache.json` を読み込み、バックグラウンドで再取得する
  （会場のネットワークが落ちても前回取得できた内容を表示できる）
- 取得状況は `GET /api/status`、手動再取得は `POST /api/refresh`
- 図鑑データの一括取得は `GET /api/dinosaurs/all`

環境変数（いずれも省略可）

| 変数 | 既定値 | 用途 |
| --- | --- | --- |
| `EXTERNAL_USER_AGENT` | `DinosaurArchiveExhibit/1.0 (...)` | Wikimedia が要求する User-Agent |
| `EXTERNAL_CONCURRENCY` | `4` | 外部 API への同時リクエスト数 |
| `REFRESH_INTERVAL_MS` | `21600000` | 再取得の間隔（既定 6 時間） |
| `DINO_CACHE_PATH` | `data/dinosaur-cache.json` | キャッシュの保存先 |
| `WIKIPEDIA_BASE` / `WIKIDATA_BASE` / `PBDB_BASE` / `COMMONS_BASE` | 各公式ホスト | 検証用にモックへ差し替える |
| `API_PROXY_TARGET`（frontend） | `http://backend:3000` | ローカル直起動時のプロキシ先 |

### 素材管理

- 恐竜骨格素材の収集条件と記録表は [ASSET_LICENSE_TRACKER.md](ASSET_LICENSE_TRACKER.md) を参照
