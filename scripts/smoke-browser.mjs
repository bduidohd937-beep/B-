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
  const errors=[];
  page.on('pageerror',error=>{errors.push(error.stack||error.message);});
  page.on('console',message=>{
    if(message.type()==='error')errors.push('console: '+message.text());
  });
  await page.goto(address,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(2600);
  const html=await page.locator('#root').innerHTML();
  const h1=await page.locator('.overlay h1').allTextContents();
  const screen=await page.screenshot({path:'/tmp/b-infinity-smoke.png'});
  console.log('Browser boot:',JSON.stringify({h1,rootLength:html.length,errors,screenBytes:screen.byteLength}));
  assert.ok(h1.length&&h1[0].trim().length>0,'React HUD/start overlay missing: black screen');
  assert.deepEqual(errors,[],'Uncaught browser JS error: '+errors.join('\n'));
  console.log('PASS: real Chrome displayed the B∞ start overlay with no runtime errors');
}finally{
  if(browser)await browser.close();
  proc.kill('SIGTERM');
}
