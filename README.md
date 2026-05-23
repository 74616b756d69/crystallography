## Crystallography Explorer

3Dmol.js ベースの試作を、TypeScript と Mol* ベースの構成へ置き換えるための土台です。
結晶構造データは無料で公開されている COD を利用し、backend が COD の OPTIMADE API と CIF 配布 URL を扱います。

<<<<<<< Updated upstream
- ちなみに3Dmolは結晶構造の1ユニットセル（単位格子）だけが描画されるらしいからマジで表記してもつまらん
- 今GitHubに入っているcifファイルじゃ動かない　04369a.cifファイルは動きます。
--------
=======
### 構成

- frontend: Vite + TypeScript + Mol*
- backend: Express + TypeScript
- data source: Crystallography Open Database (COD)
- runtime: Docker Compose

### 起動

1. Docker Desktop を起動する
2. ルートで docker compose up --build を実行する
3. ブラウザで http://localhost:5173 を開く
>>>>>>> Stashed changes

backend のヘルスチェックは http://localhost:3000/api/health です。

### できること

- おすすめの結晶構造を一覧表示
- 化学式または元素記号で COD を検索
- COD の公開 CIF を Mol* で表示

### メモ

- COD は無料で公開されている結晶構造データベースです
- CIF の取得 URL は https://www.crystallography.net/cod/<COD_ID>.cif です
- まずは外部の無料 API を利用し、DynamoDB などの内部キャッシュは後段で追加する想定です
