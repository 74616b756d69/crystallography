# 恐竜骨格素材 台帳

恐竜カードの骨格スケッチ枠に使う素材を、再利用条件つきで管理するための台帳です。

## 収集元の優先順位

1. Smithsonian Open Access
2. Wikimedia Commons
3. NHM Data Portal / 明示ライセンス付きの個別素材ページ

## 採用条件

- 採用するライセンスは Public Domain、CC0、CC BY、CC BY-SA のみ
- NC、ND、条件不明、出典不明は不採用
- 改変可能であること
- 背景除去、単色化、トリミング、縮小に耐える素材であること
- 外部 URL 直リンクではなく、採用後はローカル保存すること

## 確認手順

1. 収集元ページでライセンス表記を確認する
2. 素材ページ単位で著作者、ライセンス、改変可否、商用可否を確認する
3. この台帳に記録する
4. 採用可になった素材のみローカル保存する
5. クレジット表記先を確定する

## クレジット表記の方針

- 第一候補: README
- 第二候補: フッター
- 素材数が増えたら credits 用の別ページを作る

## 保存ルール

- 保存先候補: frontend/public/assets/skeletons/
- ファイル名: dinosaur-skeleton-<taxon>-<source>.png
- 加工後でも元の出典 URL とライセンス情報はこの台帳に残す

## 候補記録表

| 状態 | 素材名 | 恐竜名 | 収集元 | 素材ページURL | 画像URL | ライセンス | 著作者 | 帰属要否 | 改変可 | 商用可 | 加工予定 | 保存先 | クレジット表記先 | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 採用候補 | Naturalis-Trix-Trex-1.jpg | Tyrannosaurus rex | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Naturalis-Trix-Trex-1.jpg | https://upload.wikimedia.org/wikipedia/commons/e/ea/Naturalis-Trix-Trex-1.jpg | CC BY 4.0 | Hay Kranen | 要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-tyrannosaurus-trix-1.jpg | README | 全身骨格が素直に抜ける。正面寄りでカード向け。 |
| 予備候補 | Naturalis-Trix-Trex-2.jpg | Tyrannosaurus rex | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Naturalis-Trix-Trex-2.jpg | https://upload.wikimedia.org/wikipedia/commons/6/67/Naturalis-Trix-Trex-2.jpg | CC BY 4.0 | Hay Kranen | 要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-tyrannosaurus-trix-2.jpg | README | 同一標本の別角度。差し替え用バックアップ。 |
| 予備候補 | Naturalis-Trix-Trex-4.jpg | Tyrannosaurus rex | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Naturalis-Trix-Trex-4.jpg | https://upload.wikimedia.org/wikipedia/commons/0/01/Naturalis-Trix-Trex-4.jpg | CC BY 4.0 | Hay Kranen | 要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-tyrannosaurus-trix-4.jpg | README | 脚部の抜けが見やすい。縦長カード向け。 |
| 採用候補 | Chilantaisaurus tashuikouensis skeleton.jpg | Chilantaisaurus tashuikouensis | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Chilantaisaurus_tashuikouensis_skeleton.jpg | https://upload.wikimedia.org/wikipedia/commons/e/e3/Chilantaisaurus_tashuikouensis_skeleton.jpg | CC0 | Gary Todd | 不要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-chilantaisaurus-gary-todd.jpg | README | CC0。横長で加工しやすい。 |
| 採用候補 | Ankylosaurus Skeleton (31478253461).jpg | Ankylosaurus | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Ankylosaurus_Skeleton_(31478253461).jpg | https://upload.wikimedia.org/wikipedia/commons/0/09/Ankylosaurus_Skeleton_%2831478253461%29.jpg | CC0 | Gary Todd | 不要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-ankylosaurus-gary-todd-1.jpg | README | CC0。胴体ラインが見やすい。 |
| 予備候補 | Ankylosaurus Skeleton (31556851166).jpg | Ankylosaurus | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Ankylosaurus_Skeleton_(31556851166).jpg | https://upload.wikimedia.org/wikipedia/commons/6/64/Ankylosaurus_Skeleton_%2831556851166%29.jpg | CC0 | Gary Todd | 不要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-ankylosaurus-gary-todd-2.jpg | README | 同種の別角度。尾の形状確認用。 |
| 採用候補 | ROM-HadrosaurSkeleton.png | Hadrosauria | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:ROM-HadrosaurSkeleton.png | https://upload.wikimedia.org/wikipedia/commons/8/8f/ROM-HadrosaurSkeleton.png | CC BY-SA 3.0 | Keith Schengili-Roberts | 要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-hadrosaur-rom.png | README | 既に抜きに近い画像。ShareAlike 条件を維持する。 |
| 採用候補 | Brachiosaurus mount.jpg | Brachiosaurus altithorax | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Brachiosaurus_mount.jpg | https://upload.wikimedia.org/wikipedia/commons/e/ed/Brachiosaurus_mount.jpg | CC BY 3.0 | Matt Wedel | 要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-brachiosaurus-wedel.jpg | README | 長頸竜シルエット確保用。背景除去前提。 |
| 採用候補 | Parasaurolophus juvenile skeleton.png | Parasaurolophus | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Parasaurolophus_juvenile_skeleton.png | https://upload.wikimedia.org/wikipedia/commons/e/e3/Parasaurolophus_juvenile_skeleton.png | CC BY 4.0 | Andrew A. Farke, Derek J. Chok, Annisa Herrero, Brandon Scolieri, Sarah Werning | 要 | 可 | 可 | 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-parasaurolophus-juvenile.png | README | 図版寄りで切り抜き不要。学術図版として安定。 |
| 採用候補 | Stegosaurus Skeleton (36329568742).jpg | Stegosaurus | Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Stegosaurus_Skeleton_(36329568742).jpg | https://upload.wikimedia.org/wikipedia/commons/4/46/Stegosaurus_Skeleton_%2836329568742%29.jpg | CC0 | Gary Todd | 不要 | 可 | 可 | 背景除去 / 単色化 / トリミング | frontend/public/assets/skeletons/dinosaur-skeleton-stegosaurus-gary-todd.jpg | README | CC0。背板のシルエットが取りやすい。 |

## 判定メモ

- Public Domain / CC0: 最優先候補
- CC BY: クレジット表記を忘れない
- CC BY-SA: クレジットと継承条件を確認する
- 条件不明: 不採用
- ページ全体の利用規約と個別素材のライセンスが矛盾する場合は不採用