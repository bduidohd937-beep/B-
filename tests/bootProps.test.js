import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('React World must RECEIVE both F3 profiler props, not just reference them',()=>{
 const signature=app.match(/function World\(\{([^]*?)\}\)\s*\{/);
 assert.ok(signature,'World component signature is present');
 assert.match(signature[1],/\bperfVisible\b/);
 assert.match(signature[1],/\bonPerformance\b/);
 assert.match(app,/<PerformanceSampler enabled=\{perfVisible\} onSample=\{onPerformance\}/);
});
test('App explicitly supplies profiler props to World',()=>{
 assert.match(app,/<World active=/);
 assert.match(app,/throwAimRef=\{throwAimRef\}\s+perfVisible=\{perfVisible\}\s+onPerformance=\{onPerformance\}/);
});
