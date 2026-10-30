import test from 'node:test';
import assert from 'node:assert/strict';
import {motionExposure,sightBlocked,tickObservation} from '../src/observerRules.js';
test('Observer is motion-only: standing still produces zero exposure',()=>{
 assert.equal(motionExposure({distance:4,dot:1,speed:0}),0);
 assert.equal(motionExposure({distance:4,dot:1,speed:.05}),0);
 assert.ok(motionExposure({distance:4,dot:1,speed:3})>0);
});
test('Being outside the vision cone, too far or occluded is safe',()=>{
 assert.equal(motionExposure({distance:30,dot:1,speed:6}),0);
 assert.equal(motionExposure({distance:5,dot:.2,speed:6}),0);
 assert.equal(motionExposure({distance:5,dot:1,speed:6,blocked:true}),0);
});
test('Crouching is harder to see, sprinting easier',()=>{
 const walk=motionExposure({distance:6,dot:.9,speed:3});
 assert.ok(motionExposure({distance:6,dot:.9,speed:3,crouched:true})<walk);
 assert.ok(motionExposure({distance:6,dot:.9,speed:6})>walk);
});
test('Sight occlusion rejects vehicles and columns',()=>{
 assert.equal(sightBlocked({x:0,z:0},{x:0,z:-10},[[0,-5]],[]),true);
 assert.equal(sightBlocked({x:0,z:0},{x:0,z:-10},[],[[0,-5]]),true);
 assert.equal(sightBlocked({x:0,z:0},{x:0,z:-10},[[8,-5]],[[9,-2]]),false);
});
test('Suspicion accumulates with movement but decays after stopping',()=>{
 let alert=0;
 for(let i=0;i<10;i++)alert=tickObservation(alert,1.25,.08);
 assert.ok(alert>=.99);
 for(let i=0;i<20;i++)alert=tickObservation(alert,0,.08);
 assert.ok(alert<.15);
});

test('security divider blocks observer vision until central shutter opens',()=>{
 const a={x:0,z:-31},b={x:0,z:-43};
 assert.equal(sightBlocked(a,b,[],[],false),true);
 assert.equal(sightBlocked(a,b,[],[],true),false);
 assert.equal(sightBlocked({x:10,z:-31},{x:10,z:-43},[],[],true),true);
});
