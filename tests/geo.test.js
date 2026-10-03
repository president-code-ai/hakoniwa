import test from 'node:test';
import assert from 'node:assert/strict';
import {CENTER, project, clipPolygon, clipSegment, polygonArea, readHeight, joinRings} from '../src/geo.js';
test('projection keeps the requested center at zero and north above the model', () => {
  assert.deepEqual(project(CENTER), [0, -0]);
  assert.ok(project({lat: CENTER.lat + .001, lon: CENTER.lon})[1] < 0);
  assert.ok(project({lat: CENTER.lat, lon: CENTER.lon + .001})[0] > 0);
});
test('crossing roads are clipped even when both endpoints are outside', () => {
  assert.deepEqual(clipSegment([-400, 0], [400, 0]), [[-250, 0], [250, 0]]);
  assert.equal(clipSegment([-400, 300], [400, 300]), null);
});
test('building polygons remain inside the 500m tile', () => {
  const polygon = clipPolygon([[-300, -300], [300, -300], [300, 300], [-300, 300]]);
  assert.equal(polygonArea(polygon), 250000);
  assert.ok(polygon.every(p => p.every(v => Math.abs(v) <= 250)));
});
test('height provenance distinguishes recorded heights from estimates', () => {
  assert.deepEqual(readHeight({height: '10 m'}), {value: 10, estimated: false});
  assert.equal(readHeight({height: '30 ft'}).value, 9.144);
  assert.equal(readHeight({'building:levels':'4'}).value, 12);
  assert.equal(readHeight({}).estimated, true);
});
test('multipolygon members join even when a segment is reversed', () => {
  const p = (lon,lat) => ({lon,lat});
  const rings = joinRings([{geometry:[p(0,0),p(1,0),p(1,1)]},{geometry:[p(0,0),p(0,1),p(1,1)]}]);
  assert.equal(rings.length, 1); assert.equal(rings[0].length, 4);
});
