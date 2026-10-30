import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {GARAGE_HEIGHT} from './garageLayout.js';

// The V0.12.3 fixture/paint implementation allocated 100+ meshes with
// individual materials and geometries. The same coordinates are now batched
// into reusable instanced draws without removing the atmospheric details.
const TUBES=Object.freeze([-62,-46,-30,-14,2,18,34,50,66].flatMap(
 z=>[-37,-19,0,19,37].map(x=>[x,z])
));
const BRIGHT=TUBES.filter((_,i)=>i%11!==0);
const DEAD=TUBES.filter((_,i)=>i%11===0);
const DIFFUSERS=TUBES.filter((_,i)=>i%7===0);
const CENTER_LINES=Object.freeze(Array.from({length:36},(_,i)=>[
 i%2===0?-19:19,-66+i*3.8
]));
const BAYS=Object.freeze([-56,-40,-24,-8,8,24,40,56,72].flatMap((z,i)=>
 [-15,15,-47,47].map((x,j)=>({x,z:z+(i%2)*2,kind:j%2===0?'white':'yellow'}))
));
const WHITE_BAYS=BAYS.filter(v=>v.kind==='white');
const YELLOW_BAYS=BAYS.filter(v=>v.kind==='yellow');
const matrixHelper=new THREE.Object3D();
function fillMatrices(mesh,items,mapper){
 if(!mesh)return;
 for(let i=0;i<items.length;i++){
  const {position,rotation}=mapper(items[i],i);
  matrixHelper.position.set(...position);
  matrixHelper.rotation.set(...(rotation||[0,0,0]));
  matrixHelper.scale.set(1,1,1);
  matrixHelper.updateMatrix();
  mesh.setMatrixAt(i,matrixHelper.matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingSphere();
}
function InstancedFixtures({flicker=false}){
 const bright=useRef(),dead=useRef(),diffusers=useRef();
 useEffect(()=>{
  const map=(p)=>({position:[p[0],GARAGE_HEIGHT-.18,p[1]]});
  fillMatrices(bright.current,BRIGHT,map);
  fillMatrices(dead.current,DEAD,map);
  fillMatrices(diffusers.current,DIFFUSERS,p=>({
   position:[p[0],GARAGE_HEIGHT-.27,p[1]]
  }));
 },[]);
 return <>
  <instancedMesh ref={bright} args={[null,null,BRIGHT.length]}>
   <boxGeometry args={[.78,.11,3.6]}/>
   <meshBasicMaterial color="#a8b7ad" toneMapped={false}/>
  </instancedMesh>
  <instancedMesh ref={dead} args={[null,null,DEAD.length]}>
   <boxGeometry args={[.78,.11,3.6]}/>
   <meshBasicMaterial color="#353d3b" toneMapped={false}/>
  </instancedMesh>
  <instancedMesh ref={diffusers} args={[null,null,DIFFUSERS.length]}>
   <boxGeometry args={[.82,.018,3.68]}/>
   <meshBasicMaterial color="#d7dfd1" transparent opacity={.33}/>
  </instancedMesh>
  {/* Keep existing five true local fluorescent lights; save draw calls for
      housings without globally darkening the navigable garage. */}
  {TUBES.map(([x,z],i)=>i%9===0?
   <pointLight key={i} position={[x,GARAGE_HEIGHT-.68,z]} intensity={flicker&&i===18?.18:1.67}
    distance={22} color="#cbd9cb" decay={2}/>:null)}
 </>;
}
function InstancedPaint(){
 const center=useRef(),white=useRef(),yellow=useRef();
 useEffect(()=>{
  const horizontal=[-Math.PI/2,0,0];
  fillMatrices(center.current,CENTER_LINES,p=>({position:[p[0],.017,p[1]],rotation:horizontal}));
  fillMatrices(white.current,WHITE_BAYS,p=>({position:[p.x,.015,p.z],rotation:horizontal}));
  fillMatrices(yellow.current,YELLOW_BAYS,p=>({position:[p.x,.015,p.z],rotation:horizontal}));
 },[]);
 return <>
  <instancedMesh ref={center} args={[null,null,CENTER_LINES.length]}>
    <planeGeometry args={[.095,2.7]}/>
    <meshBasicMaterial color="#8b8b71" transparent opacity={.54} depthWrite={false}/>
  </instancedMesh>
  <instancedMesh ref={white} args={[null,null,WHITE_BAYS.length]}>
    <planeGeometry args={[3.5,.11]}/>
    <meshBasicMaterial color="#777c70" transparent opacity={.44} depthWrite={false}/>
  </instancedMesh>
  <instancedMesh ref={yellow} args={[null,null,YELLOW_BAYS.length]}>
    <planeGeometry args={[3.5,.11]}/>
    <meshBasicMaterial color="#a9a17b" transparent opacity={.44} depthWrite={false}/>
  </instancedMesh>
 </>;
}
export default React.memo(function GarageFixtures({flicker=false}){
 return <>
  <InstancedFixtures flicker={flicker}/>
  <InstancedPaint/>
 </>;
});
export const fixtureCounts=Object.freeze({
 tube:TUBES.length,diffusers:DIFFUSERS.length,
 laneMarks:CENTER_LINES.length,bayMarks:BAYS.length
});
