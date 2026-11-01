import * as THREE from 'three';

// WASD always follows the player's actual camera orientation.
// Three cameras look along local -Z and use local +X as screen-right.
// At spawn the camera faces world +Z, so the right key is world -X.
export function cameraMovement(quaternion, strafe, forwardInput, out=new THREE.Vector3()) {
  const heading=new THREE.Vector3(0,0,-1).applyQuaternion(quaternion);
  heading.y=0;
  heading.normalize();
  const right=new THREE.Vector3(1,0,0).applyQuaternion(quaternion);
  right.y=0;
  right.normalize();
  const length=Math.hypot(strafe,forwardInput);
  if(!length)return out.set(0,0,0);
  out.set(
    (heading.x*forwardInput + right.x*strafe)/length,
    0,
    (heading.z*forwardInput + right.z*strafe)/length
  );
  return out;
}
