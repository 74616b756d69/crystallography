# 素材の追加ガイド（画像 / 3D モデル）

恐竜図鑑の各カードには **写真** と **3D 骨格** を表示できます。
どちらも「後からドロップインで足せる」仕組みになっているので、当日までに
少しずつ充実させられます。

## 画像の優先順位

カード / 詳細に出る画像は次の順で決まります。

1. **ローカル差し替え** … `frontend/public/assets/images/manifest.json` に登録した画像
2. **Wikidata 自動取得** … バックエンドが学名から Wikidata(P18) → Wikimedia Commons の画像を自動取得
3. **プレースホルダー** … 上記が無いときは分類別のシルエットを表示

> Wikidata 自動取得は外部ネットワークが必要です（Wikimedia は説明的な `User-Agent`
> を要求するためバックエンドで付与済み）。社内プロキシや一部の会場ネットワークでは
> Wikimedia / PaleoBioDB がブロックされることがあります。その場合はローカル差し替え
> （下記）で確実に表示できます。

---

## 画像を追加する（ローカル差し替え）

1. **ライセンスを確認**して画像を入手する
   - 採用可能: Public Domain / CC0 / CC BY / CC BY-SA（改変可・商用可のもの）
   - 優先収集元: Smithsonian Open Access → Wikimedia Commons → 明示ライセンス付きページ
   - 収集条件の詳細は [`ASSET_LICENSE_TRACKER.md`](../ASSET_LICENSE_TRACKER.md) を参照
2. 画像ファイルを `frontend/public/assets/images/` に保存する
   - 例: `tyrannosaurus-rex.jpg`
3. `frontend/public/assets/images/manifest.json` の `"images"` に、
   **恐竜 id をキー**にして追記する

```json
{
  "images": {
    "tyrannosaurus-rex": {
      "file": "tyrannosaurus-rex.jpg",
      "credit": "撮影者名",
      "license": "CC BY 4.0",
      "source": "Wikimedia Commons",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
    }
  }
}
```

- `credit` / `license` は CC BY・CC BY-SA では**必須**（帰属表記のため画像右下に出ます）
- `file` 以外は任意

---

## 3D 骨格モデルを追加する

3D ビューアは、モデル未登録のときは手続き生成の骨格プレースホルダーを回します。
本物のスキャンを入れると一気に「すごい」展示になります。

1. **CC0 / オープンライセンスの glTF/GLB** を入手する
   - おすすめ: **Smithsonian Open Access（https://3d.si.edu/ ）** … 実物化石スキャンが CC0
2. `.glb` に変換し、**軽量化**する（会場で快適に回すため）
   - Blender で読み込み → glTF(.glb) でエクスポート
   - 面数が多い場合は Decimate で削減（目安: 5〜10 万ポリゴン以下）
3. `frontend/public/assets/models/` に保存する
   - 例: `triceratops-horridus.glb`
4. `frontend/public/assets/models/manifest.json` の `"models"` に、
   **恐竜 id をキー**にして追記する

```json
{
  "models": {
    "triceratops-horridus": {
      "file": "triceratops-horridus.glb",
      "credit": "Smithsonian Institution",
      "license": "CC0",
      "source": "Smithsonian Open Access",
      "sourceUrl": "https://3d.si.edu/",
      "autoRotate": true
    }
  }
}
```

- `autoRotate` を `false` にすると自動回転を止められます（既定は自動回転）

---

## 恐竜 id 一覧（manifest のキー）

manifest のキーは、バックエンドのシード id と一致させてください。

```
tyrannosaurus-rex brachiosaurus-altithorax triceratops-horridus iguanodon-bernissartensis
spinosaurus-aegyptiacus parasaurolophus-walkeri velociraptor-mongoliensis allosaurus-fragilis
carnotaurus-sastrei deinonychus-antirrhopus diplodocus-cnegii apatosaurus-louisae
argentinosaurus-huinculensis stegosaurus-stenops ankylosaurus-magniventris protoceratops-andrewsi
pachycephalosaurus-wyomingensis edmontosaurus-annectens giganotosaurus-carolinii ceratosaurus-nasicornis
acrocanthosaurus-atokensis megalosaurus-bucklandii coelophysis-bauri dilophosaurus-wetherilli
oviraptor-philoceratops troodon-formosus albertosaurus-sarcophagus tarbosaurus-bataar
concavenator-corcovatus majungasaurus-creanatissimus suchomimus-tenerensis baryonyx-walkeri
utahraptor-ostrommaysorum mononykus-olecranus therizinosaurus-cheloniformis compsognathus-longipes
camarasaurus-supremus saltasaurus-loricatus patagotitan-mayorum mamenchisaurus-youngi
amargasaurus-cazaui euhelopus-zdanskyi shunosaurus-lii opisthocoelicaudia-skarzynskii
dreadnoughtus-schrani plateosaurus-engelhardti dryosaurus-altus tenontosaurus-tilletti
leaellynasaura-amicagraphica ouranosaurus-nigeriensis lambeosaurus-lambei corythosaurus-casuaris
hadrosaurus-foulkii styracosaurus-albertensis centrosaurus-apertus torosaurus-latus
pentaceratops-sternbergii psittacosaurus-mongoliensis stegoceras-validum euoplocephalus-tutus
daspletosaurus-torosus carcharodontosaurus-saharicus sinraptor-dongi achillobator-giganticus
microraptor-gui deinocheirus-mirificus gallimimus-bullatus ornithomimus-velox
dromaeosaurus-albertensis cryolophosaurus-ellioti herrerasaurus-ischigualastensis eoraptor-lunensis
yangchuanosaurus-shangyouensis rugops-primus mapusaurus-roseae torvosaurus-tanneri
europasaurus-holgeri vulcanodon-karibaensis rapetosaurus-krausei alamosaurus-sanjuanensis
giraffatitan-brancai mussaurus-patagonicus isisaurus-colberti cedarosaurus-weiskopfae
kentrosaurus-aethiopicus huayangosaurus-taibaii miragaia-longicollum sauropelta-edwardsorum
borealopelta-markmitchelli nodosaurus-textilis chasmosaurus-belli kosmoceratops-richardsoni
einiosaurus-procurvicornis leptoceratops-gracilis prenocephale-prenes homalocephale-calathocercos
hypsilophodon-foxii lesothosaurus-diagnosticus maiasaura-peeblesorum gryposaurus-notabilis
```

---

## ジェスチャー操作について（目玉機能）

ヘッダーの **「🖐️ ジェスチャー操作」** ボタンで、Web カメラを使った非接触ナビに切り替わります。

- ☝️ 人差し指でカーソル移動
- 🤏 つまんで決定（カードを開く / ボタンを押す）
- 🖐️ 手を開いて戻る

初回だけ手認識モデルの読み込みにネット接続が必要です（以降はブラウザにキャッシュ）。
カメラが使えない・許可されない環境では自動的に案内を出して安全に無効化します。

会場 PC では **カメラ付き・HTTPS もしくは localhost** で動かしてください
（ブラウザのカメラ権限は `https://` か `http://localhost` でのみ許可されます）。
