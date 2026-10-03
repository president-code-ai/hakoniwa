import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.HAKONIWA_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('artifacts',{recursive:true});
const reports=[];
try {
  for(const [name,viewport,mobile] of [['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true]]) {
    const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const response=await page.goto(base,{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>window.hakoniwa?.getState().ready,{},{timeout:45000});
    await page.waitForTimeout(1100);
    let state=await page.evaluate(()=>window.hakoniwa.getState());
    assert.equal(state.center.lat,35.874232442659526);assert.equal(state.center.lon,139.61925691456358);
    assert.ok(state.buildings>0);assert.ok(state.cars>0);assert.ok(state.triangles>0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`artifacts/${name}-day.png`,fullPage:true});
    await page.locator('[data-view="top"]').click();await page.waitForTimeout(1000);
    assert.equal(await page.locator('[data-view="top"]').getAttribute('aria-pressed'),'true');
    await page.screenshot({path:`artifacts/${name}-top.png`,fullPage:true});
    await page.locator('[data-view="close"]').click();await page.waitForTimeout(1000);
    assert.ok((await page.evaluate(()=>window.hakoniwa.getState().zoom))>2);
    await page.locator('#zoom-out').click();assert.ok((await page.evaluate(()=>window.hakoniwa.getState().zoom))<2.35);
    await page.locator('[data-view="overview"]').click();await page.waitForTimeout(1000);
    await page.locator('#time').fill('100');await page.locator('#time').dispatchEvent('input');
    assert.equal(await page.locator('#time-label').textContent(),'夜の街');
    await page.screenshot({path:`artifacts/${name}-night.png`,fullPage:true});
    await page.locator('#motion').click();const stopped=await page.evaluate(()=>window.hakoniwa.getState().simTime);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.hakoniwa.getState().simTime),stopped);
    await page.locator('#rotate').click();assert.equal(await page.evaluate(()=>window.hakoniwa.getState().autoRotate),true);
    await page.locator('#rotate').click();await page.locator('#about-open').click();assert.equal(await page.locator('#about').evaluate(e=>e.open),true);
    assert.ok((await page.locator('#data-summary').textContent()).includes('件'));await page.locator('#about-close').click();
    assert.deepEqual(errors,[]);state=await page.evaluate(()=>window.hakoniwa.getState());
    reports.push({name,url:base,errors,state});await context.close();
  }
  await writeFile('artifacts/browser-check.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
} finally {await browser.close();}
