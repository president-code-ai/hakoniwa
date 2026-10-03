# 地図データ

`map.json` は OpenStreetMap から Overpass API を通じて取得した地図データです。

- 中心：35.874232442659526, 139.61925691456358
- 表示範囲：約500m四方（取得範囲には境界処理用の余白を含む）
- 取得日時・取得元・元データの時刻：JSON 内の `fetchedAt`, `source`, `osm.osm3s.timestamp_osm_base`
- 帰属：© OpenStreetMap contributors
- ライセンス：[Open Data Commons Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
- 詳細：[OpenStreetMap copyright](https://www.openstreetmap.org/copyright)

このOSMデータとそこから派生する地図データにはODbLが適用されます。画面にも帰属とライセンスへのリンクを表示しています。
道路・建物の登録状況は場所により異なります。未登録の建物を架空の建物で埋める処理は行いません。

再取得：`npm run data:fetch`。取得後は差分を確認し、`npm test`、`npm run build`で表示を再生成してください。
ページを閲覧するたびに外部地図APIへアクセスする構成ではありません。

## 国土地理院の建物輪郭

`buildings-gsi.json` は[国土地理院最適化ベクトルタイル](https://github.com/gsi-cyberjapan/optimal_bvmap)のBldAレイヤーを加工して作成しました。

- 出典URL・取得日時・取得タイル番号はJSON内に保存しています。
- [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)（公共データ利用規約 第1.0版）に従って利用します。
- 中心を原点とするローカル座標（メートル、xが東、zが南）へ変換し、500m四方に切り抜いています。
- タイル境界の重複を除去するため輪郭を結合しています。接している建物が一体になる場合があります。件数は厳密な棟数ではありません。
- 再取得は `node scripts/fetch-buildings.mjs`。必要な4タイルだけをHTTP Rangeリクエストで取得します。
- 建物の高さは含まれていません。表示時に重なるOSM建物の階数等を参照し、記録がなければ推定します。照合も近似のため厳密な住所単位の対応を保証しません。

両データの原典はこのディレクトリ内で分けて保持しています。配信する模型はこれらを組み合わせた派生表示です。
