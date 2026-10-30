import React,{useEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {throwPoint,THROW_DURATION} from './throwRules.js';

// The projectile moves along EXACTLY the same arc exposed by the aim preview.
// Alarm clocks / radios / glowsticks are deployed only on ground impact.
export default React.memo(function ThrownCan({projectile,active,onImpact}){
 const model=useRef(),clock=useRef(0),impacted=useRef(false);
 useEffect(()=>{
   clock.current=0;impacted.current=false;
   if(projectile&&model.current){
     model.current.position.fromArray(projectile.start);
     model.current.rotation.set(0,0,0);
   }
 },[projectile?.id]);
 useFrame((_,delta)=>{
   if(!model.current||!projectile||!active)return;
   clock.current+=Math.min(.05,delta);
   const t=Math.min(1,clock.current/THROW_DURATION);
   const p=throwPoint(projectile.start,projectile.end,t);
   model.current.position.set(p[0],p[1],p[2]);
   model.current.rotation.set(
     t<1?clock.current*8:0,t<1?clock.current*5:0,t<1?clock.current*4:0
   );
   if(t>=1&&!impacted.current){
     impacted.current=true;
     onImpact(projectile.end,projectile.type||'can');
   }
 });
 if(!projectile)return null;
 const type=projectile.type||'can';
 return <group ref={model} position={projectile.start}>
   {type==='can'||type==='glow'?<mesh rotation={[Math.PI/2,0,0]}>
     <cylinderGeometry args={type==='can'?[.16,.16,.38,12]:[.06,.06,.51,8]}/>
     <meshStandardMaterial color={type==='can'?'#b3c2bc':'#728e81'}
       metalness={type==='can'?.68:.16} roughness={.52}/>
   </mesh>:<mesh>
     <boxGeometry args={type==='alarm'?[.51,.40,.20]:[.35,.45,.17]}/>
     <meshStandardMaterial color={type==='alarm'?'#a1a599':'#26353d'}
       metalness={.36} roughness={.52}/>
   </mesh>}
 </group>;
});
