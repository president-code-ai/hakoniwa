import {pointInPolygon} from './geo.js';
// User-confirmed surface parking. Preserve upstream data; apply local corrections at render time.
export const PARKING_OUTLINE = [[-45.44,27.98],[-22.57,8.15],[9.24,45.28],[-13.62,65.12],[-45.44,27.98]];
export const LANDMARK_HEIGHTS = {main:11,annex:6.2};
export function correctionFor(points) {
  if(pointInPolygon([-18,36],points))return 'parking';
  if(pointInPolygon([6.6,23.6],points)||pointInPolygon([11,21],points))return 'removed';
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
// Turn the main facade CCW as seen from above, fitting it to the surveyed footprint.
// The SE edge is shorter than the rear edge, and its furthest step is v=23.26.
export const FACADE_WIDTH = 24;
export const FACADE_DEPTH = 23.6;
export function facadeCoordinates(u,v) { return [v*FACADE_WIDTH/21,FACADE_DEPTH-u*FACADE_DEPTH/34]; }
