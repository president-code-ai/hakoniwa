export const CENTER = { lat: 35.874232442659526, lon: 139.61925691456358 };
export const SIZE = 500;
export function project(point, center = CENTER) {
  return [(point.lon - center.lon) * 111320 * Math.cos(center.lat * Math.PI / 180), -(point.lat - center.lat) * 111320];
}
export function polygonArea(points) {
  return Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
}
export function clipPolygon(points, half = SIZE / 2) {
  let out = points;
  for (const [axis, bound, sign] of [[0, -half, -1], [0, half, 1], [1, -half, -1], [1, half, 1]]) {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length];
      const insideA = sign * (a[axis] - bound) <= 0, insideB = sign * (b[axis] - bound) <= 0;
      if (insideA) out.push(a);
      if (insideA !== insideB) { const t = (bound - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
  }
  return out;
}
export function clipSegment(a, b, half = SIZE / 2) {
  const delta = [b[0] - a[0], b[1] - a[1]];
  let start = 0, end = 1;
  for (let axis = 0; axis < 2; axis++) {
    if (Math.abs(delta[axis]) < 1e-10) { if (Math.abs(a[axis]) > half) return null; continue; }
    let t1 = (-half - a[axis]) / delta[axis], t2 = (half - a[axis]) / delta[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    start = Math.max(start, t1); end = Math.min(end, t2);
    if (start > end) return null;
  }
  return [[a[0] + start * delta[0], a[1] + start * delta[1]], [a[0] + end * delta[0], a[1] + end * delta[1]]];
}
export function readHeight(tags, area = 100) {
  const raw = String(tags.height || '').trim();
  const explicit = parseFloat(raw);
  if (Number.isFinite(explicit) && explicit > 0) return { value: /ft|feet|'/.test(raw) ? explicit * 0.3048 : explicit, estimated: false };
  const levels = parseFloat(tags['building:levels']);
  if (Number.isFinite(levels) && levels > 0) return { value: levels * 3, estimated: true, fromLevels: true };
  const tall = ['apartments', 'commercial', 'office', 'school'].includes(tags.building);
  return { value: tall ? 12 : area > 500 ? 9 : 6.5, estimated: true };
}
export function joinRings(members) {
  const pending = members.filter(m => m.geometry?.length > 1).map(m => m.geometry.map(p => [p.lon, p.lat]));
  const rings = [], same = (a, b) => Math.abs(a[0] - b[0]) < 1e-8 && Math.abs(a[1] - b[1]) < 1e-8;
  while (pending.length) {
    let ring = pending.shift(), found = true;
    while (!same(ring[0], ring.at(-1)) && found) {
      found = false;
      for (let i = 0; i < pending.length; i++) {
        const next = pending[i];
        if (same(ring.at(-1), next[0])) { ring.push(...next.slice(1)); found = true; }
        else if (same(ring.at(-1), next.at(-1))) { ring.push(...next.toReversed().slice(1)); found = true; }
        if (found) { pending.splice(i, 1); break; }
      }
    }
    if (ring.length >= 4 && same(ring[0], ring.at(-1))) rings.push(ring.slice(0, -1).map(([lon, lat]) => ({ lon, lat })));
  }
  return rings;
}
export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
