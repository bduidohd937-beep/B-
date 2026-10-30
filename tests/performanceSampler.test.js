import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('F3 sampler remains opt-in and reports real 1-second interval metrics',()=>{
 const code=readFileSync(new URL('../src/PerformanceSampler.jsx',import.meta.url),'utf8');
 assert.match(code,/if\(!enabled\)/);
 assert.match(code,/observeFrame\(w,delta\)/);
 assert.match(code,/frameSummary\(w\)/);
 assert.match(code,/gl\.info\.render\.calls/);
 assert.match(code,/onSample\?\./);
 assert.doesNotMatch(code,/if\(!enabled\)\{clock\.current=\{/);
});
