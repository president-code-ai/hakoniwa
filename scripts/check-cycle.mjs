import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.clock.install();
  await page.goto(process.env.HAKONIWA_URL||'http://127.0.0.1:4173');
  await page.waitForFunction(()=>window.hakoniwa?.getState().ready);
  const samples=[];
  samples.push(await page.evaluate(()=>window.hakoniwa.getState().time));
  for(let step=0;step<4;step++){
    await page.clock.fastForward(45000);await page.waitForTimeout(50);
    samples.push(await page.evaluate(()=>window.hakoniwa.getState().time));
  }
  const advance=(a,b)=>(b-a+24)%24;
  for(let i=1;i<samples.length;i++)assert.ok(Math.abs(advance(samples[i-1],samples[i])-6)<.15,JSON.stringify(samples));
  assert.ok(Math.abs(samples.at(-1)-samples[0])<.3);
  await page.locator('#motion').click();const paused=await page.evaluate(()=>window.hakoniwa.getState().time);
  await page.clock.fastForward(90000);assert.equal(await page.evaluate(()=>window.hakoniwa.getState().time),paused);
  await page.locator('#time').fill('23.9');await page.locator('#time').dispatchEvent('input');
  await page.locator('#motion').click();await page.clock.fastForward(3000);await page.waitForTimeout(50);
  const wrapped=await page.evaluate(()=>window.hakoniwa.getState().time);assert.ok(wrapped>=.3&&wrapped<.5);
  await page.locator('#motion').click();
  await page.locator('[data-view="close"]').click();await page.clock.fastForward(1100);
  await page.locator('#time').fill('12');await page.locator('#time').dispatchEvent('input');
  await page.screenshot({path:'artifacts/landmark-noon.png'});
  await page.locator('#time').fill('21');await page.locator('#time').dispatchEvent('input');
  await page.screenshot({path:'artifacts/landmark-night.png'});
  await writeFile('artifacts/cycle-check.json',JSON.stringify({samples,paused,wrapped,dayDurationSeconds:180},null,2));
  console.log(JSON.stringify({samples,paused,wrapped,passed:true}));
}finally{await browser.close();}
