import test from 'node:test';
import assert from 'node:assert/strict';
import {FRAME_WINDOW_SECONDS,HITCH_MS,freshFrameWindow,observeFrame,frameSummary} from '../src/performanceMetrics.js';
test('sampled FPS uses actual elapsed time instead of capped 250ms frames',()=>{
 const w=freshFrameWindow();
 for(let i=0;i<60;i++)observeFrame(w,1/60);
 const m=frameSummary(w);
 assert.equal(m.fps,60);
 assert.ok(Math.abs(m.p95Ms-16.7)<=.1);
 assert.ok(Math.abs(m.worstMs-16.7)<=.1);
 assert.equal(m.hitches,0);
});
test('hitch detection counts 34ms+ frames without inflating FPS',()=>{
 const w=freshFrameWindow();
 for(let i=0;i<45;i++)observeFrame(w,1/60);
 observeFrame(w,.18);
 const m=frameSummary(w);
 assert.ok(m.fps<60);
 assert.ok(m.worstMs>=180);
 assert.equal(m.hitches,1);
 assert.ok(m.p95Ms<=34);
 assert.ok(FRAME_WINDOW_SECONDS>0&&HITCH_MS>33);
});
test('finite fixed buffer and invalid frames avoid false metrics',()=>{
 const w=freshFrameWindow();
 assert.equal(observeFrame(w,Infinity),false);
 assert.equal(observeFrame(w,0),false);
 assert.equal(observeFrame(w,-1),false);
 assert.equal(w.frames,0);
 for(let i=0;i<220;i++)observeFrame(w,.004);
 assert.equal(w.samples.length,180);
 assert.equal(w.frames,220);
});
