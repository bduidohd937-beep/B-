import * as THREE from 'three';

// Camera convention: the viewing direction is local -Z, unlike ordinary
// Object3D.lookAt which rotates its local +Z toward the target.
const cameraMatrix = new THREE.Matrix4();
const worldUp = new THREE.Vector3(0,1,0);

export const SEAT = Object.freeze({x:-.35,y:1.35,z:-.06});
export function monitorLookTarget(feedId) {
  switch(feedId) {
    case 'cam1': return [-.96,1.32,-1.887];
    case 'cam2': return [.32,1.32,-1.887];
    default: return [-.32,1.32,-1.887];
  }
}
export function aimCameraAt(eye,target,out) {
  cameraMatrix.lookAt(eye,target,worldUp);
  return out.setFromRotationMatrix(cameraMatrix);
}
