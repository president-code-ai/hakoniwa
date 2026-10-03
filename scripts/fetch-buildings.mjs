import {writeFile} from 'node:fs/promises';
import {PMTiles} from 'pmtiles';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import polygonClipping from 'polygon-clipping';
import {CENTER,project,SIZE} from '../src/geo.js';
const source='https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles';
const pm=new PMTiles(source),z=16,n=2**z,half=SIZE/2;
const tileX=lon=>Math.floor((lon+180)/360*n);
const tileY=lat=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
const dLat=half/111320,dLon=half/(111320*Math.cos(CENTER.lat*Math.PI/180));
const bounds=[[[[-half,-half],[half,-half],[half,half],[-half,half],[-half,-half]]]];
const pieces=[],tiles=[];
for(let x=tileX(CENTER.lon-dLon);x<=tileX(CENTER.lon+dLon);x++) {
  for(let y=tileY(CENTER.lat+dLat);y<=tileY(CENTER.lat-dLat);y++) {
    const result=await pm.getZxy(z,x,y);if(!result)throw new Error(`Missing tile ${z}/${x}/${y}`);
    tiles.push({z,x,y});
    const tile=new VectorTile(new PbfReader(new Uint8Array(result.data)));
    const layer=tile.layers.BldA;if(!layer)throw new Error('GSI building layer missing');
    for(let i=0;i<layer.length;i++) {
      const feature=layer.feature(i).toGeoJSON(x,y,z);
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[];
      for(const rings of polygons) {
        const projected=rings.map(ring=>ring.map(([lon,lat])=>project({lon,lat})));
        const cut=polygonClipping.intersection([projected],bounds);
        if(cut.length)pieces.push(cut);
      }
    }
  }
}
// Union removes tile-buffer duplicates and restores footprints split at tile seams.
const merged=polygonClipping.union(...pieces);
const buildings=merged.map(rings=>({outline:rings[0].map(p=>p.map(v=>Math.round(v*100)/100)),holes:rings.slice(1).map(r=>r.map(p=>p.map(v=>Math.round(v*100)/100)))}));
await writeFile('data/buildings-gsi.json',JSON.stringify({center:CENTER,size:SIZE,fetchedAt:new Date().toISOString(),source,attribution:'国土地理院最適化ベクトルタイルを加工して作成',license:'https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html',coordinateSystem:'local metres: x east, z south, origin=center',tiles,buildings}));
console.log(JSON.stringify({tiles,buildingFootprints:buildings.length},null,2));
