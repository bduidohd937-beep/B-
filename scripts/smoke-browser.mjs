// A browser-level boot regression test: npm test / Vite build can pass while
// React throws and the user sees a black canvas with no HUD.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';

const address='http://127.0.0.1:4179/B-/';
const proc=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4179','--strictPort'],{
  stdio:['ignore','pipe','pipe'],env:process.env
});
const output=[];
for(const channel of [proc.stdout,proc.stderr]){
  channel?.on('data',c=>{
    const msg=String(c);output.push(msg);
    process.stdout.write(msg);
  });
}
let browser;
try{
  let ready=false;
  for(let attempt=0;attempt<70;attempt++){
    if(proc.exitCode!==null)throw Error('Vite quit before browser startup');
    try{
      const response=await fetch(address);
      if(response.ok){ready=true;break;}
    }catch{}
    await sleep(350);
  }
  assert.ok(ready,'Vite did not become ready at '+address);
  browser=await chromium.launch({
    channel:'chrome',headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
      '--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.setDefaultTimeout(12000);
  const errors=[];
  page.on('pageerror',error=>{errors.push(error.stack||error.message);});
  page.on('console',message=>{
    // Missing favicon is harmless and does not indicate failed React startup.
    // Actual uncaught JS failures are captured by pageerror above.
    if(message.type()==='error'&&!message.text().includes('Failed to load resource: the server responded with a status of 404'))
      errors.push('console: '+message.text());
  });
  await page.goto(address,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(900);
  const html=await page.locator('#root').innerHTML();
  const h1=await page.locator('.overlay h1').allTextContents();
  console.log('Browser boot:',JSON.stringify({h1,rootLength:html.length,errors}));
  assert.ok(h1.length&&h1[0].trim().length>0,'React HUD/start overlay missing: black screen');
  assert.deepEqual(errors,[],'Uncaught browser JS error: '+errors.join('\n'));
  // F3 exercises the exact feature that previously brought down <World>.
  await page.keyboard.press('F3');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.performance-debug').count(),1,'F3 performance readout not mounted');
  assert.ok(await page.locator('#root').innerHTML()!=='','F3 caused a blank React root');
  assert.deepEqual(errors,[],'Runtime crash after F3: '+errors.join('\n'));
  console.log('PASS: real Chrome displayed B∞ start overlay and F3 metrics with no runtime error');
}finally{
  if(browser)await browser.close();
  proc.kill('SIGTERM');
}
