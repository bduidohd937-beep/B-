import React, { useEffect, useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PILLARS,PARKED_CARS,GARAGE_HEIGHT,FLOOR_SIZE,LEAK,SERVICE_GRATE } from './garageLayout.js';
import { VEHICLES } from './vehiclePuzzle.js';
import InstancedCars from './InstancedCars.jsx';

const COLORS=['#36444a','#494d4b','#394842','#4b4b46'];
const Car=React.memo(function Car({x,z,index,identified=null,solved=false}){
 return <group position={[x,0,z]} rotation={[0,index%3===0?.06:index%3===1?-.04:0,0]}>
   <mesh position={[0,.6,0]}><boxGeometry args={[2.45,.95,4.45]}/><meshStandardMaterial color={identified?.correct?"#344b5b":identified?.id==="d09"?"#7b7f80":identified?.id==="c13"?"#343939":COLORS[index%COLORS.length]} roughness={.65} metalness={.17}/></mesh>
   <mesh position={[0,1.22,-.15]}><boxGeometry args={[2.14,.57,2.48]}/><meshStandardMaterial color="#1c292e" roughness={.32} metalness={.17}/></mesh>
   {[-1,1].flatMap(side=>[-1.48,1.48].map(v=><mesh key={side+':'+v} position={[side*1.23,.34,v]} rotation={[0,0,Math.PI/2]}>
     <cylinderGeometry args={[.33,.33,.16,9]}/><meshStandardMaterial color="#111719" roughness={.99}/>
   </mesh>))}
   {[-.75,.75].map(offset=><mesh key={offset} position={[offset,.72,2.23]}>
     <boxGeometry args={[.38,.19,.04]}/><meshBasicMaterial color="#6b302e"/>
   </mesh>)}
   {identified&&<group position={[0,.79,2.285]}>
      <mesh><boxGeometry args={[.81,.27,.035]}/><meshStandardMaterial color="#c0c5bd" roughness={.62}/></mesh>
      <Text position={[0,0,.025]} fontSize={.205} color="#252d2f" anchorX="center" anchorY="middle">{identified.plate}</Text>
   </group>}
   {identified?.correct&&solved&&<group>
     <mesh position={[0,1.34,2.31]} rotation={[-.45,0,0]}>
       <boxGeometry args={[2.2,.095,1.03]}/><meshStandardMaterial color="#344b5b" metalness={.17} roughness={.6}/>
     </mesh>
     <mesh position={[0,1.03,2.34]}><boxGeometry args={[1.65,.18,.045]}/><meshStandardMaterial color="#111a1e" roughness={.93}/></mesh>
     <Text position={[0,1.04,2.375]} fontSize={.115} color="#e1d4a8">SERVICE AUTH · 317</Text>
   </group>}
 </group>;
});
function RepeatedColumns(){
 const mesh=useRef();
 useEffect(()=>{
  if(!mesh.current)return;
  const helper=new THREE.Object3D();
  PILLARS.forEach(([x,z],i)=>{
    helper.position.set(x,GARAGE_HEIGHT/2,z);
    helper.scale.set(1,1,1);
    helper.rotation.set(0,0,0);
    helper.updateMatrix();
    mesh.current.setMatrixAt(i,helper.matrix);
  });
  mesh.current.instanceMatrix.needsUpdate=true;
 },[]);
 return <>
   <instancedMesh ref={mesh} args={[null,null,PILLARS.length]} frustumCulled={false}>
     <boxGeometry args={[1.6,GARAGE_HEIGHT,1.6]}/>
     <meshStandardMaterial color="#646d6c" roughness={.95}/>
   </instancedMesh>
   {PILLARS.filter((_,i)=>i%5===0).map(([x,z],i)=><group key={i} position={[x,0,z]}>
     <mesh position={[0,1.22,.815]}><boxGeometry args={[1.64,.70,.035]}/><meshStandardMaterial color="#a49655" roughness={.9}/></mesh>
     <Text position={[0,2.05,.84]} color="#171f20" fontSize={.34} maxWidth={1.4} anchorX="center">B2</Text>
   </group>)}
 </>;
}
function CeilingFixtures({flicker=false}){
 const positions=useMemo(()=>[-62,-46,-30,-14,2,18,34,50,66].flatMap(z=>[-37,-19,0,19,37].map(x=>[x,z])),[]);
 return <group>
   {positions.map(([x,z],i)=><group key={i} position={[x,GARAGE_HEIGHT-.18,z]}>
     <mesh><boxGeometry args={[.78,.11,3.6]}/><meshBasicMaterial color={i%11===0?'#353d3b':'#a8b7ad'} toneMapped={false}/></mesh>
     {i%7===0&&<mesh position={[0,-.09,0]}><boxGeometry args={[.82,.018,3.68]}/><meshBasicMaterial color="#d7dfd1" transparent opacity={.33}/></mesh>}
     {i%9===0&&<pointLight position={[0,-.5,0]} intensity={flicker&&i===18?.18:1.67} distance={22} color="#cbd9cb" decay={2}/>}
   </group>)}
 </group>;
}
function MaintenanceSurfaces(){
 const drip=useRef(),timer=useRef(0);
 useFrame((_,dt)=>{
   timer.current+=Math.min(dt,.05);
   if(drip.current)drip.current.scale.y=.08+Math.abs(Math.sin(timer.current*5.1))*.88;
 });
 return <group>
   {/* A burst overhead service pipe visibly causes the water underneath. */}
   <group position={[LEAK.x,0,LEAK.z]}>
     <mesh position={[0,.018,0]} rotation={[-Math.PI/2,0,0]}>
       <circleGeometry args={[1.85,22]}/>
       <meshStandardMaterial color="#243e45" metalness={.45} roughness={.27} transparent opacity={.8} depthWrite={false}/>
     </mesh>
     <mesh position={[0,GARAGE_HEIGHT-.63,.2]} rotation={[Math.PI/2,0,0]}>
       <cylinderGeometry args={[.15,.15,5.2,10]}/>
       <meshStandardMaterial color="#5d7575" metalness={.75} roughness={.38}/>
     </mesh>
     <mesh ref={drip} position={[0,GARAGE_HEIGHT/2,0]} scale={[1,.5,1]}>
       <cylinderGeometry args={[.022,.027,GARAGE_HEIGHT-1.4,6]}/>
       <meshBasicMaterial color="#82b2b7" transparent opacity={.24} depthWrite={false}/>
     </mesh>
   </group>
   {/* Metal grate is integrated into a labeled maintenance drain, not random floor plates. */}
   <group position={[SERVICE_GRATE.x,0,SERVICE_GRATE.z]}>
     <mesh position={[0,.02,0]} rotation={[-Math.PI/2,0,0]}>
       <planeGeometry args={[3.4,3]}/><meshStandardMaterial color="#343f43" metalness={.72} roughness={.75}/>
     </mesh>
     {Array.from({length:11},(_,i)=><mesh key={i} position={[-1.45+i*.29,.042,0]}>
       <boxGeometry args={[.074,.018,2.83]}/><meshStandardMaterial color="#707b7b" metalness={.8} roughness={.58}/>
     </mesh>)}
     <mesh position={[0,1.45,2.1]}><boxGeometry args={[2.6,.46,.16]}/><meshStandardMaterial color="#b99b4c" emissive="#46391b" emissiveIntensity={.28}/></mesh>
     <Text position={[0,1.45,2.19]} fontSize={.18} color="#101c21">MAINTENANCE DRAIN</Text>
     <mesh position={[0,GARAGE_HEIGHT-.50,0]}>
       <boxGeometry args={[4.7,.24,.48]}/><meshStandardMaterial color="#5d6967" metalness={.3}/>
     </mesh>
   </group>
 </group>;
}

function GarageWorld({altered=false,flicker=false,canPosition=null,floor=1,vehicleSolved=false}){
 return <group>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
     <planeGeometry args={FLOOR_SIZE}/><meshStandardMaterial color="#303738" roughness={.98}/>
   </mesh>
   <mesh position={[0,GARAGE_HEIGHT+.2,0]}>
     <boxGeometry args={[FLOOR_SIZE[0],.35,FLOOR_SIZE[1]]}/>
     <meshStandardMaterial color="#3b4140" roughness={1}/>
   </mesh>
   {/* The basement has NO visible perimeter walls. Fog hides edges; repeated rows imply continuation. */}
   <RepeatedColumns/>
   {/* Most identical cars are now GPU-instanced. The three investigation
       vehicles remain independent so their plates/trunk can show clues. */}
   <InstancedCars floor={floor}/>
   {floor===2&&VEHICLES.map(v=>{
     const index=PARKED_CARS.findIndex(([x,z])=>x===v.position[0]&&z===v.position[1]);
     return <Car key={v.id} x={v.position[0]} z={v.position[1]}
       index={index} identified={v} solved={vehicleSolved}/>;
   })}
   <CeilingFixtures flicker={flicker}/>
   {Array.from({length:36},(_,i)=><mesh key={i} position={[i%2===0?-19:19,.017,-66+i*3.8]} rotation={[-Math.PI/2,0,0]}>
     <planeGeometry args={[.095,2.7]}/><meshBasicMaterial color="#8b8b71" transparent opacity={.54}/>
   </mesh>)}
   {[-56,-40,-24,-8,8,24,40,56,72].map((z,i)=><group key={z}>
      {[-15,15,-47,47].map((x,j)=><mesh key={x} position={[x,.015,z+(i%2)*2]} rotation={[-Math.PI/2,0,0]}>
         <planeGeometry args={[3.5,.11]}/><meshBasicMaterial color={j%2===0?'#777c70':'#a9a17b'} transparent opacity={.44}/>
      </mesh>)}
   </group>)}
   <MaintenanceSurfaces/>
   <group position={[0,4.93,-32.3]}>
     <mesh><boxGeometry args={[4.25,1.04,.26]}/><meshStandardMaterial color={altered?'#5e272f':'#225a47'} emissive={altered?'#63212b':'#185b43'} emissiveIntensity={1.15}/></mesh>
     <Text position={[0,0,.17]} fontSize={.47} color="#e4eadd">{altered?'B ∞':'EXIT ↑'}</Text>
   </group>
   {canPosition&&<group position={canPosition} rotation={[0,0,-.12]}>
      <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.16,.16,.38,12]}/><meshStandardMaterial color="#bdc9c7" roughness={.36} metalness={.68}/></mesh>
      <mesh position={[0,0,.012]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.163,.163,.12,12]}/><meshStandardMaterial color="#b44e42"/></mesh>
   </group>}
 </group>;
}
export default React.memo(GarageWorld);
