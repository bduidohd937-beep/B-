import React, {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {panelPosition,GATE_Z} from './puzzle.js';
import {GARAGE_HEIGHT} from './garageLayout.js';
import {sirenPulse} from './alarmRules.js';
import {SECURITY_KEY_READER} from './exitAuthorization.js';

const locations=[[0,-14],[-15,-25],[15,-25],[0,GATE_Z+.9],[-26,-9],[26,-9]];
function Beacon({x,z,refIndex,lights,lit=false}){
 return <group position={[x,GARAGE_HEIGHT-.42,z]}>
   <mesh><boxGeometry args={[1,.22,1]}/><meshStandardMaterial color="#2b3336" metalness={.65}/></mesh>
   <mesh position={[0,-.21,0]}><cylinderGeometry args={[.35,.40,.23,12]}/><meshBasicMaterial color="#a32130" toneMapped={false}/></mesh>
   {lit&&<pointLight ref={node=>{lights.current[refIndex]=node}} position={[0,-.6,0]}
      color="#f52a32" intensity={.4} distance={21} decay={2}/>}
 </group>;
}
export default React.memo(function EmergencyAlarm({active=false,floor=1,reducedEffects=false}){
 const lights=useRef([]),clock=useRef(0),flash=useRef();
 const panel=floor===2?[SECURITY_KEY_READER[0],SECURITY_KEY_READER[2]]:panelPosition(floor);
 useFrame((_,dt)=>{
   if(!active){clock.current=0;return;}
   clock.current+=Math.min(.06,dt);
   const pulse=sirenPulse(clock.current,true,reducedEffects);
   for(const light of lights.current)if(light)light.intensity=2.1+pulse*5.9;
   if(flash.current)flash.current.material.opacity=.045+pulse*.12;
 });
 if(!active)return null;
 return <group>
   {/* Colored covers remain visible everywhere; only 3 nearby lights incur
       real GPU point-light shading work instead of 7 simultaneous sources. */}
   {locations.map(([x,z],i)=><Beacon key={i} x={x} z={z} refIndex={i}
      lights={lights} lit={i===0||i===3}/>)}
   <Beacon x={panel[0]} z={panel[1]} refIndex={locations.length} lights={lights} lit/>
   {/* Only a restrained tint, no full-screen flashing or epileptogenic strobe. */}
   <mesh ref={flash} position={[0,GARAGE_HEIGHT-.015,-8]} rotation={[-Math.PI/2,0,0]}>
     <planeGeometry args={[64,83]}/>
     <meshBasicMaterial color="#be2637" transparent opacity={.05} depthWrite={false} toneMapped={false}/>
   </mesh>
 </group>;
});
