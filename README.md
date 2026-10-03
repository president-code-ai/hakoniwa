# hakoniwa

実在する地点を中心にした、ブラウザで操作できる3D箱庭です。

**[箱庭を開く](https://president-code-ai.github.io/hakoniwa/)**

中心：**35.874232442659526, 139.61925691456358**（さいたま市中央区・上峰付近）

## できること

- 周囲約500m四方の道路・建物を模型風に表示
- PCのドラッグ／スマートフォンの指操作で回転、ホイール／ピンチで拡大縮小
- 斜め・真上・近接の3視点、北を上に戻す操作
- 朝→昼→夜→翌朝を実時間3分で自動循環。スライダーで時刻変更、一時停止も可能
- 道路を走る車、自動回転、動きの一時停止

画像や外部3Dモデルは使用せず、Three.jsで形状を生成しています。地図データとライブラリを同じサイトから配信し、閲覧時のAPIキーは不要です。

中央の「ことぶき」の外観と平置き駐車場は、ユーザー提供の写真を基に補正しています。詳細は [LOCAL_CORRECTIONS.md](LOCAL_CORRECTIONS.md) を参照してください。

## 再現範囲

道路・土地利用はOpenStreetMap、建物の輪郭は国土地理院最適化ベクトルタイルを基にしています。建物の高さは重なるOSM建物の記録値を優先し、記録がなければ階数（1階あたり3m）や用途から推定します。建物同士の照合は近似です。地面は平らです。高架の高さ、屋根の形・色、窓、植栽、車と交通量、時刻による光は演出で、現地の正確な再現ではありません。

未登録の建物は表示されません。固定地点の試作であり、任意の座標を画面から入力する機能はまだありません。
輪郭の結合により、接している建物が一体になる場合があります。画面の件数は厳密な棟数ではありません。

## ローカルで開く

Node.js 22.12以降（推奨：最新LTS）を使用します。

```sh
npm ci
npm run dev
```

表示されたローカルURLをブラウザで開いてください。自宅のスマホから開く場合だけ、`npm run dev -- --host 0.0.0.0` として同じWi-Fiから接続します。

## 検証と公開

```sh
npm test
npm run build
npm run preview -- --port 4173
# 別のターミナルで実行。Microsoft Edgeを利用するブラウザ確認。
npm run test:browser
```

`docs/` はGitHub Pages用のビルド済みファイルです。Pagesの配信元は `main` ブランチの `/docs` に設定します。変更時はビルド後の `docs/` もコミットしてpushします。`.nojekyll` はビルド時にコピーされます。

相対パスで出力しているため `/hakoniwa/` 配下でも動作します。
実機スマートフォンとLINE内ブラウザの挙動は、利用する端末で確認してください。

## 地図データ

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) / [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)

[国土地理院最適化ベクトルタイル](https://github.com/gsi-cyberjapan/optimal_bvmap)を加工して作成 / [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)

取得時のデータと出典は [`data/`](data/README.md) に保存しています。
ブラウザ確認のスクリーンショットと結果は、Git管理外の `artifacts/` に出力します。
