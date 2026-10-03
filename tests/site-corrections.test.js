import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {correctionFor,PARKING_OUTLINE,sitePoint,facadeCoordinates} from '../src/site-corrections.js';
import {pointInPolygon} from '../src/geo.js';
const data=JSON.parse(readFileSync(new URL('../data/buildings-gsi.json',import.meta.url)));
test('the supplied snapshot maps only the intended parking/hall/annex to overrides',()=>{
  const grouped={};data.buildings.forEach((b,i)=>{const key=correctionFor(b.outline);if(key)(grouped[key]??=[]).push(i);});
  assert.deepEqual(grouped,{parking:[420],annex:[448],main:[454],removed:[481,485]});
});
test('the corrected front faces southeast without moving the mapped footprint',()=>{
  const center=sitePoint(...facadeCoordinates(17,10.5));
  const front=sitePoint(...facadeCoordinates(0,10.5));
  assert.ok(front[0]>center[0]);assert.ok(front[1]>center[1]);
  assert.deepEqual(facadeCoordinates(0,0),[0,23.6]);
  assert.deepEqual(facadeCoordinates(34,21),[24,0]);
});
test('parking bays stay inside the surface parking boundary',()=>{
  for(const u of [-30.8,-21.1,-16,-6.3])for(const v of [2.5,44.9]) {
    assert.ok(pointInPolygon(sitePoint(u-2.35,v),PARKING_OUTLINE));
    assert.ok(pointInPolygon(sitePoint(u+2.35,v),PARKING_OUTLINE));
  }
});
