import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOE_SURFACES,shoeFootstep} from '../src/footstepFoley.js';
import {footstepLoudness} from '../src/stealth.js';
test('every contact has heel then delayed sole instead of looping bass notes',()=>{
 for(const surface of SHOE_SURFACES)for(const mode of ['walk','sprint','crouch']){
  const c=shoeFootstep(mode,surface,0);
  assert.ok(c.heelHz>300&&c.heelHz<3000);
  assert.ok(c.dragHz>c.heelHz);
  assert.ok(c.dragDelay>0&&c.dragDelay<.16);
  assert.ok(c.dragDuration>=.05&&c.dragDuration<.13);
  assert.ok(c.heelVolume>.001&&c.heelVolume<.6);
 }
});
test('left/right heel differ, footsteps stay tied to movement types',()=>{
 const left=shoeFootstep('walk','concrete',0),right=shoeFootstep('walk','concrete',1);
 assert.notEqual(left.heelHz,right.heelHz);
 assert.equal(shoeFootstep('walk','concrete',2).heelHz,left.heelHz);
 assert.ok(shoeFootstep('sprint','concrete').heelVolume>left.heelVolume);
 assert.ok(left.heelVolume>shoeFootstep('crouch','concrete').heelVolume);
});
test('materials do not stack separate metal or splash on top of concrete',()=>{
 assert.notEqual(shoeFootstep('walk','metal').heelHz,shoeFootstep('walk','concrete').heelHz);
 assert.notEqual(shoeFootstep('walk','water').dragHz,shoeFootstep('walk','concrete').dragHz);
 assert.equal(shoeFootstep('walk','fake').surface,'concrete');
 assert.equal(footstepLoudness('walk','concrete'),35);
 assert.equal(footstepLoudness('sprint','concrete'),90);
 assert.equal(footstepLoudness('crouch','concrete'),8);
});
