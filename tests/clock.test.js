import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOCK_CYCLE_SECONDS,clockSnapshot,formatB2Time } from '../src/clockRules.js';
test('ordinary B2 stays minimally labeled 03:17, not real-world time',()=>{
  assert.deepEqual(clockSnapshot(0,1),{text:'03:17',anomaly:false,cycle:-1});
  assert.equal(clockSnapshot(7200,1).text,'03:17');
});
test('second B2 clock starts at 03:17:17 and moves normally at first',()=>{
  assert.equal(clockSnapshot(0,2).text,'03:17:17');
  assert.equal(clockSnapshot(10,2).text,'03:17:27');
});
test('clock visibly reverses for two seconds in a predictable cycle',()=>{
  assert.equal(clockSnapshot(11,2).text,'03:17:26');
  assert.equal(clockSnapshot(12,2).text,'03:17:25');
  assert.equal(clockSnapshot(13,2).text,'03:17:30');
  assert.equal(clockSnapshot(11,2).anomaly,true);
  assert.equal(clockSnapshot(12,2).anomaly,true);
  assert.equal(clockSnapshot(13,2).anomaly,false);
});
test('glitches repeat in the second B2 and cannot affect the first floor',()=>{
  assert.equal(clockSnapshot(CLOCK_CYCLE_SECONDS+11,2).anomaly,true);
  assert.equal(clockSnapshot(CLOCK_CYCLE_SECONDS+11,2).cycle,1);
  assert.equal(clockSnapshot(CLOCK_CYCLE_SECONDS+11,1).anomaly,false);
});
test('clock formatting handles minute/hour rollover without invalid numbers',()=>{
  assert.equal(formatB2Time(3*3600+18*60),'03:18:00');
  assert.equal(formatB2Time(-10),'00:00:00');
  assert.equal(formatB2Time(24*3600+2),'00:00:02');
});
test('nonfinite negative timestamps do not break the display',()=>{
  assert.equal(clockSnapshot(NaN,2).text,'03:17:17');
  assert.equal(clockSnapshot(-999,2).text,'03:17:17');
});
