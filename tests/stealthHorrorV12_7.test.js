import test from 'node:test';
import assert from 'node:assert/strict';
import {canOperatePanel,POWER_PANEL} from '../src/puzzle.js';
import {terrainBlocked} from '../src/garageLayout.js';
import {chooseClearStep,FIRST_GUARD_LISTEN_SECONDS,FIRST_GUARD_STUCK_SECONDS} from '../src/firstFloorThreat.js';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const listener=readFileSync(new URL('../src/Listener.jsx',import.meta.url),'utf8');

test('breaker E prompt is impossible from behind, sideways, or while looking away',()=>{
 const [x,z]=POWER_PANEL;
 assert.equal(canOperatePanel([x,1.7,z+1.5],[0,-.6,-1]),true);
 assert.equal(canOperatePanel([x,1.7,z-1.2],[0,-.6,1]),false);
 assert.equal(canOperatePanel([x,1.7,z+1.5],[0,0,1]),false);
 assert.equal(canOperatePanel([x+2.1,1.7,z+1],[0,-.2,-1]),false);
 assert.equal(canOperatePanel([0,1.7,17],[0,0,-1]),false);
 assert.equal(canOperatePanel([x,1.7,z+1.5],[0,0,0]),false);
});
test('cabinet has real collision but standing in front remains physically possible',()=>{
 const [x,z]=POWER_PANEL;
 assert.equal(terrainBlocked(x,z,false),true);
 assert.equal(terrainBlocked(x,z-.40,false),true);
 assert.equal(terrainBlocked(x,z+1.5,false),false);
});
test('same front+gaze test controls E prompt, starting and HOLDING the breaker',()=>{
 assert.match(app,/canOperatePanel\(eye,looking,1\)/);
 assert.match(app,/const nearPanel=floorRef\.current===1&&\s*canOperatePanel\(camera\.position\.toArray\(\),direction\.toArray\(\),1\)/);
 assert.match(app,/!poweredRef\.current && nearPanel && keys\.current\.KeyE/);
 assert.match(app,/panelHeld\.current=false;panelTime\.current=0;onPanelProgress\(0\)/);
});
test('blocked path sidesteps and a stalled Listener triggers replan, never phase through walls',()=>{
 const blocked=(x,z)=>x>0;
 assert.deepEqual(chooseClearStep(0,0,1,0,blocked),[0,1]);
 assert.deepEqual(chooseClearStep(0,0,0,-1,()=>true),[0,0]);
 assert.ok(FIRST_GUARD_LISTEN_SECONDS>=1);
 assert.ok(FIRST_GUARD_STUCK_SECONDS>=.4);
 assert.match(listener,/stuckTime\.current>=FIRST_GUARD_STUCK_SECONDS/);
 assert.match(listener,/route\.current=\[\];routeTime\.current=0;stuckTime\.current=0/);
 assert.match(listener,/state\.current='watch'/);
});
test('portable CCTV memo and exact 317 solution are absent from game HUD',()=>{
 assert.doesNotMatch(app,/setMemoOpen|memoOpen|KeyJ/);
 assert.doesNotMatch(app,/317번 차량 출입키 획득 · 중앙 셔터/);
 const exit=readFileSync(new URL('../src/EscapePuzzle.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(exit,/RFID KEY REQUIRED|TURN KEY — HOLD E/);
});
