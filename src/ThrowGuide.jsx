import React,{useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {AIM_POINTS} from './throwRules.js';

// Cheap reusable GPU line with NO React state updates while mouse aiming.
// A gray dashed arc only exists while G is held on a throwable inventory item.
export default React.memo(function ThrowGuide({aimRef}){
 const geometry=useMemo(()=>{
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(AIM_POINTS*3),3));
   g.setDrawRange(0,AIM_POINTS);
   return g;
 },[]);
 const material=useMemo(()=>new THREE.LineDashedMaterial({
   color:'#bbc5b8',transparent:true,opacity:.55,depthTest:true,
   dashSize:.22,gapSize:.17,depthWrite:false
 }),[]);
 const line=useMemo(()=>new THREE.Line(geometry,material),[geometry,material]);
 const impact=useRef();
 useEffect(()=>()=>{
   geometry.dispose();material.dispose();
 },[geometry,material]);
 useFrame(()=>{
   const aim=aimRef?.current;
   const show=Boolean(aim?.active&&aim?.plan?.points?.length===AIM_POINTS);
   line.visible=show;
   if(impact.current)impact.current.visible=show;
   if(!show)return;
   const points=aim.plan.points,attr=geometry.getAttribute('position');
   for(let i=0;i<AIM_POINTS;i++){
     const p=points[i];attr.setXYZ(i,p[0],p[1],p[2]);
   }
   attr.needsUpdate=true;
   line.computeLineDistances();
   if(impact.current)impact.current.position.set(aim.plan.end[0],.045,aim.plan.end[2]);
 });
 return <group>
   <primitive object={line}/>
   <mesh ref={impact} visible={false} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.23,.28,18]}/>
      <meshBasicMaterial color="#aebbb1" transparent opacity={.50}
        depthWrite={false} side={THREE.DoubleSide}/>
   </mesh>
 </group>;
});
