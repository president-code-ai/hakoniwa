export const DAY_DURATION_MS = 180000;
export const wrapHour = hour => ((hour % 24) + 24) % 24;
export function formatHour(hour) {
  const minutes = Math.floor(wrapHour(hour) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
// Absolute elapsed time keeps a day at 180 seconds even when rendering is slow.
export class DayClock {
  constructor(now = 0, hour = 6, running = true) { this.anchor = now; this.hour = wrapHour(hour); this.running = running; }
  sample(now) { return wrapHour(this.hour + (this.running ? (now - this.anchor) / DAY_DURATION_MS * 24 : 0)); }
  seek(hour, now) { this.hour = wrapHour(hour); this.anchor = now; }
  setRunning(running, now) { this.seek(this.sample(now), now); this.running = running; }
}
const smooth = (a,b,v) => { const t = Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t); };
export function daylightAt(hour) {
  const h = wrapHour(hour), altitude = Math.sin((h - 6) / 12 * Math.PI);
  const daylight = smooth(-.12,.30,altitude);
  return {daylight,night:1-daylight,altitude,warmth:1-smooth(0,.75,altitude),label:h>=5&&h<9?'朝の街':h>=9&&h<16?'昼の街':h>=16&&h<19?'夕暮れの街':'夜の街'};
}
