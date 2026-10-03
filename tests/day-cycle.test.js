import test from 'node:test';
import assert from 'node:assert/strict';
import {DayClock,DAY_DURATION_MS,daylightAt,formatHour} from '../src/day-cycle.js';
test('one full day lasts exactly three real minutes, independent of frame rate',()=>{
  const clock=new DayClock(100,6);
  assert.equal(clock.sample(100+45000),12);
  assert.equal(clock.sample(100+90000),18);
  assert.equal(clock.sample(100+135000),0);
  assert.equal(clock.sample(100+DAY_DURATION_MS),6);
  assert.equal(clock.sample(100+DAY_DURATION_MS*20),6);
});
test('pause/resume and manual time changes have no clock jumps',()=>{
  const clock=new DayClock(0,6);clock.setRunning(false,45000);
  assert.equal(clock.sample(95000),12);clock.seek(23,95000);
  assert.equal(clock.sample(120000),23);clock.setRunning(true,120000);
  assert.equal(clock.sample(135000),1);
});
test('lighting is continuous across midnight and includes both dawn and dusk',()=>{
  assert.equal(daylightAt(0).daylight,daylightAt(24).daylight);
  assert.equal(daylightAt(12).daylight,1);assert.equal(daylightAt(0).daylight,0);
  assert.equal(daylightAt(7).label,'朝の街');assert.equal(daylightAt(17).label,'夕暮れの街');
  assert.equal(formatHour(24),'00:00');assert.equal(formatHour(6.5),'06:30');
});
