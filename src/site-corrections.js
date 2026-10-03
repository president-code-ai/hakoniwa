import {pointInPolygon} from './geo.js';
// User-confirmed surface parking. Preserve upstream data; apply local corrections at render time.
export const PARKING_OUTLINE = [[-45.44,27.98],[-22.57,8.15],[9.24,45.28],[-13.62,65.12],[-45.44,27.98]];
export const LANDMARK_HEIGHTS = {main:11,annex:6.2};
export function correctionFor(points) {
  if(pointInPolygon([-18,36],points))return 'parking';
  if(pointInPolygon([0,0],points))return 'main';
  if(pointInPolygon([-12,-9],points))return 'annex';
  return null;
}
// Local building axes: u points along the long wall toward NE; v points toward the bypass.
export const SITE_ORIGIN = [-20.03,5.48];
export const SITE_ANGLE = Math.atan2(22.01,26.25);
export function sitePoint(u,v) {
  const c=Math.cos(SITE_ANGLE),s=Math.sin(SITE_ANGLE);
  return [SITE_ORIGIN[0]+c*u+s*v,SITE_ORIGIN[1]-s*u+c*v];
}
