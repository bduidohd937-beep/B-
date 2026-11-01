// Verifies RE:ZERO's separate WebGL entry, not just the legacy start screen.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const address='http://127.0.0.1:4181/B-/rezero.html';
const proc=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4181','--strictPort'],{
  stdio:['ignore','pipe','pipe']
});
for(const stream of [proc.stdout,proc.stderr]){
  stream?.on('data',d=>process.stdout.write(String(d)));
}
let browser;
try {
  let ready=false;
  for(let attempt=0;attempt<80;attempt++){
    if(proc.exitCode!==null)throw new Error('Vite exited before launch');
    try { const r=await fetch(address); if(r.ok){ready=true;break;} }
    catch {}
    await sleep(300);
  }
  assert.ok(ready,'RE:ZERO HTML entry was not served');
  browser=await chromium.launch({
    channel:'chrome',headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
      '--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto(address,{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('heading',{name:'마지막 야간근무'}).waitFor({timeout:15000});
  assert.equal(await page.locator('#root canvas').count(),1,'3D canvas missing');
  await page.waitForTimeout(1800); // allow CCTV render targets to update
  await page.screenshot({path:'rezero-first-room.png'});
  await page.getByRole('button',{name:'근무 시작'}).click();
  await page.waitForTimeout(550);
  assert.equal(await page.locator('.start-overlay').count(),0,'start overlay remained after click');
  await page.keyboard.press('F3');
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.perf-debug').count(),1,'F3 debug absent');
  // Physical chair starts in front of the player, within interaction range.
  await page.keyboard.press('e');
  await page.locator('.console-ui').waitFor({state:'visible',timeout:7000});
  assert.equal(await page.locator('.console-title').count(),1,'Seated console never opened');
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Cursor remained locked while seated');

  await page.getByRole('button',{name:'CAM 01 확대'}).click();
  assert.equal(await page.getByRole('button',{name:'CAM 01 확대'}).getAttribute('class'),'selected');
  await page.getByRole('button',{name:'CAM 02 확대'}).click();
  await page.getByRole('button',{name:/L-07 점검등/}).click();
  await page.getByRole('button',{name:'영상 이상 기록'}).click();
  assert.ok((await page.locator('.console-feedback').innerText()).includes('근무일지'),'Camera evidence not recorded');
  await page.screenshot({path:'rezero-first-room.png'});
  await page.getByRole('button',{name:'의자에서 일어서기'}).click();
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.console-ui').count(),0,'Console did not close');
  assert.equal(await page.locator('.crosshair').count(),1,'Returned FPS HUD missing');

  assert.deepEqual(errors,[],'RE:ZERO JavaScript crash: '+errors.join('\n'));
  console.log('PASS: RE:ZERO WebGL, seated controls without ESC, CCTV selection, evidence, FPS exit and no JS errors');
} finally {
  if(browser)await browser.close();
  proc.kill('SIGTERM');
}
