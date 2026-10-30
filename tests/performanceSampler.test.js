import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('performance diagnostics only sample when F3 toggles them on',()=>{
 const code=readFileSync(new URL('../src/PerformanceSampler.jsx',import.meta.url),'utf8');
 assert.match(code,/if\(!enabled\)/);
 assert.match(code,/c\.seconds>=\.8/);
 assert.match(code,/gl\.info\.render\.calls/);
 assert.match(code,/onSample\?\./);
});
