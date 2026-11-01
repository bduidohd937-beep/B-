import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';

const address='http://127.0.0.1:4189/B-/survive.html';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4189','--strictPort'],{
  stdio:['ignore','pipe','pipe']
});
for(const stream of [server.stdout,server.stderr])stream?.on('data',d=>process.stdout.write(String(d)));
let browser;
try{
  let ready=false;
  for(let n=0;n<90;n++){
    if(server.exitCode!==null)throw new Error('Vite exited before map route boot');
    try{const r=await fetch(address);if(r.ok){ready=true;break;}}catch{}
    await sleep(300);
  }
  assert.ok(ready,'V0.5-A survive.html is not served');
  browser=await chromium.launch({
    channel:'chrome',headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
      '--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto(address,{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('heading',{name:'마지막 야간근무'}).waitFor({timeout:12000});
  assert.equal(await page.locator('#root canvas').count(),1);
  await page.getByRole('button',{name:'야간근무 시작'}).click();
  await page.locator('.start-screen').waitFor({state:'detached',timeout:12000});
  await page.waitForTimeout(1400);
  await page.keyboard.press('m');
  await page.locator('.map-panel').waitFor({state:'visible',timeout:4000});
  assert.ok((await page.locator('.map-panel').innerText()).includes('시설 개요도'));
  await page.screenshot({path:'survive-map-v05a.png'});
  await page.keyboard.press('m');
  await page.locator('.map-panel').waitFor({state:'detached',timeout:4000});
  await page.keyboard.press('F3');
  await page.locator('.performance').waitFor({state:'visible',timeout:4000});
  assert.deepEqual(errors,[],'Survive 3D runtime exception: '+errors.join('\n'));
  console.log('PASS: separate underground map rendered, start/map toggle/debug controls work without JS errors');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
