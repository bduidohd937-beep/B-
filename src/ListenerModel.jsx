import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// A unique procedural, eyeless creature: elongated limbs, exposed ribs, sealed
// eye sockets, splitting jaw, clawed hands and reactive searching animation.
// Meshes are low-poly to keep the prototype fast and easy to edit.
const flesh = '#646e6a';
const shadowFlesh = '#303c3c';
const deep = '#080d0e';
const bone = '#a7a99a';
const scar = '#251f21';

function Rib({ side, index }) {
  const sign = side === 'left' ? -1 : 1;
  return <group position={[sign * .24,.22-index*.15,.04]}>
    <mesh position={[sign*.14,0,.20]} rotation={[.1,0,sign*(.55+index*.05)]}>
      <capsuleGeometry args={[.038,.26,3,6]}/>
      <meshStandardMaterial color={bone} roughness={.89}/>
    </mesh>
    <mesh position={[sign*.20,-.075,.36]} rotation={[0,0,sign*.37]}>
      <capsuleGeometry args={[.025,.17,3,6]}/>
      <meshStandardMaterial color="#828d83" roughness={1}/>
    </mesh>
  </group>;
}

function Claws({ side }) {
  return [-.125,-.043,.045,.13].map((offset,i)=><mesh
    key={i} position={[offset,-1.49,.10+(i%2)*.035]}
    rotation={[.25,0,offset*.75]}>
    <coneGeometry args={[.036,.30+(i%3)*.085,5]}/>
    <meshStandardMaterial color={i%2?bone:'#7b8179'} roughness={.78}/>
  </mesh>);
}

function Arm({ side, armRef }) {
  const sign=side==='left'?-1:1;
  return <group ref={armRef} position={[sign*.47,2.04,.10]} rotation={[.15,0,sign*.18]}>
    <mesh position={[sign*.10,-.46,.10]} rotation={[0,0,sign*.12]}>
      <capsuleGeometry args={[.118,.72,5,9]}/>
      <meshStandardMaterial color={flesh} roughness={.96}/>
    </mesh>
    <mesh position={[sign*.18,-.94,.13]} rotation={[-.11,0,-sign*.11]}>
      <capsuleGeometry args={[.075,.71,5,8]}/>
      <meshStandardMaterial color={shadowFlesh} roughness={.99}/>
    </mesh>
    <mesh position={[sign*.17,-1.36,.16]} scale={[.15,.21,.105]}>
      <sphereGeometry args={[1,10,8]}/>
      <meshStandardMaterial color={flesh} roughness={1}/>
    </mesh>
    <Claws side={side}/>
  </group>;
}

function Leg({ side, legRef }) {
  const sign=side==='left'?-1:1;
  return <group ref={legRef} position={[sign*.25,1.18,.05]} rotation={[0,0,sign*.11]}>
    <mesh position={[sign*.055,-.37,.02]} rotation={[.07,0,sign*.13]}>
      <capsuleGeometry args={[.145,.5,4,8]}/>
      <meshStandardMaterial color={shadowFlesh} roughness={1}/>
    </mesh>
    <mesh position={[sign*.13,-.82,.15]} rotation={[-.17,0,-sign*.10]}>
      <capsuleGeometry args={[.10,.36,4,8]}/>
      <meshStandardMaterial color={flesh} roughness={1}/>
    </mesh>
    <mesh position={[sign*.13,-1.09,.34]} scale={[.22,.11,.38]}>
      <sphereGeometry args={[1,12,8]}/>
      <meshStandardMaterial color="#313b3b" roughness={1}/>
    </mesh>
    {[-.10,0,.10].map((x,i)=><mesh key={i}
      position={[sign*.13+x,-1.085,.68]} rotation={[Math.PI/2,0,0]}>
      <coneGeometry args={[.037,.20+i*.025,5]}/>
      <meshStandardMaterial color={bone} roughness={1}/>
    </mesh>)}
  </group>;
}

export default function ListenerModel({ motionRef }) {
  const torso=useRef();
  const head=useRef();
  const mouth=useRef();
  const leftArm=useRef();
  const rightArm=useRef();
  const leftLeg=useRef();
  const rightLeg=useRef();
  const last=useRef(0);
  const offset=useMemo(()=>Math.random()*6.28,[]);

  useFrame((state,rawDt)=>{
    const dt=Math.min(rawDt,.05);
    const motion=motionRef.current || {};
    const movement=motion.state==='investigate'||motion.state==='return';
    const speed=movement?(motion.speed||0):0;
    last.current+=dt;
    const t=last.current;
    const gait=t*(2.3+Math.min(5.7,speed)*1.6);
    const swing=movement?Math.min(1,speed/4):.11;
    const alert=motion.state==='investigate';
    const listening=motion.state==='listen'||motion.state==='search';

    if(torso.current){
      torso.current.rotation.x=.24 + Math.sin(t*2.4+offset)*.042 + (alert?.07:0);
      torso.current.rotation.z=Math.sin(t*1.9)*.055 + (alert?Math.sin(gait)*.058:0);
      torso.current.position.y=1.79 + Math.sin(t*2.7)*.025 + Math.abs(Math.sin(gait))*.055*swing;
    }
    if(head.current){
      const aim=listening?Math.sin(t*2.8)*.86:alert?Math.sin(gait*.32)*.18:Math.sin(t*.72)*.17;
      head.current.rotation.y=THREE.MathUtils.damp(head.current.rotation.y,aim,listening?6:2,dt);
      head.current.rotation.z=THREE.MathUtils.damp(head.current.rotation.z,listening?.28*Math.sin(t*1.7):-.12+Math.sin(t*.8)*.08,3.2,dt);
      head.current.rotation.x=THREE.MathUtils.damp(head.current.rotation.x,alert?-.31:.22,2.8,dt);
    }
    if(mouth.current){
      const opening=alert?.45+Math.abs(Math.sin(t*7.3))*.42:.14+Math.abs(Math.sin(t*2.0))*.22;
      mouth.current.scale.y=THREE.MathUtils.damp(mouth.current.scale.y,opening,8,dt);
    }
    if(leftArm.current)leftArm.current.rotation.x=.12+Math.sin(gait)*.62*swing;
    if(rightArm.current)rightArm.current.rotation.x=.12-Math.sin(gait)*.62*swing;
    if(leftLeg.current)leftLeg.current.rotation.x=-Math.sin(gait)*.43*swing;
    if(rightLeg.current)rightLeg.current.rotation.x=Math.sin(gait)*.43*swing;
  });

  return <group>
    <group ref={torso} position={[0,1.79,0]} rotation={[.24,0,0]}>
      {/* Gaunt torso, narrow waist and dark negative space under ribs. */}
      <mesh scale={[.44,.80,.30]} rotation={[0,0,-.08]}>
        <sphereGeometry args={[1,14,14]}/>
        <meshStandardMaterial color={flesh} roughness={.99}/>
      </mesh>
      <mesh position={[0,-.47,-.07]} scale={[.23,.43,.24]}>
        <sphereGeometry args={[1,12,10]}/>
        <meshStandardMaterial color="#353f3e" roughness={1}/>
      </mesh>
      <mesh position={[0,.09,.26]} scale={[.25,.50,.09]}>
        <sphereGeometry args={[1,12,12]}/>
        <meshStandardMaterial color={deep} roughness={1}/>
      </mesh>
      {['left','right'].flatMap(side=>[0,1,2,3].map(i=><Rib key={side+i} side={side} index={i}/>))}
      {/* Unnatural backbone protrusions at shoulders. */}
      {[-.26,-.06,.14,.34,.54].map((y,i)=><mesh key={i} position={[0,y,-.32]} rotation={[Math.PI/2,0,0]}>
        <coneGeometry args={[.055,.24+i*.014,5]}/>
        <meshStandardMaterial color={bone} roughness={1}/>
      </mesh>)}
      <group ref={head} position={[0,.67,.17]}>
        <mesh position={[0,.01,0]} scale={[.38,.62,.36]}>
          <sphereGeometry args={[1,16,16]}/>
          <meshStandardMaterial color="#7a837d" roughness={1}/>
        </mesh>
        {/* Socket cavities with overgrown scar tissue; absolutely no eyes. */}
        {[-1,1].map(side=><group key={side}>
          <mesh position={[side*.17,.14,.304]} rotation={[0,side*.17,0]} scale={[.135,.19,.052]}>
            <sphereGeometry args={[1,10,9]}/>
            <meshStandardMaterial color={deep} roughness={1}/>
          </mesh>
          {[-.06,.035,.12].map((v,i)=><mesh key={i}
            position={[side*.17+v,.14+(i-1)*.06,.362]} rotation={[0,0,-side*.22]}>
            <boxGeometry args={[.016,.11,.013]}/>
            <meshStandardMaterial color={bone} roughness={.96}/>
          </mesh>)}
          {/* Ragged asymmetrical ears amplify the sense of hearing. */}
          <mesh position={[side*.43,.15,.015]} rotation={[.18,0,-side*.4]} scale={[.19,.53,.135]}>
            <sphereGeometry args={[1,10,12]}/>
            <meshStandardMaterial color="#596762" roughness={1} side={THREE.DoubleSide}/>
          </mesh>
          <mesh position={[side*.47,.16,.113]} rotation={[.12,0,-side*.38]} scale={[.10,.33,.032]}>
            <sphereGeometry args={[1,10,10]}/>
            <meshStandardMaterial color="#1d2929" roughness={1}/>
          </mesh>
        </group>)}
        <mesh position={[0,-.12,.28]} scale={[.17,.31,.15]}>
          <sphereGeometry args={[1,10,10]}/>
          <meshStandardMaterial color={scar} roughness={1}/>
        </mesh>
        {/* A long torn mouth, animated jaw and rows of uneven pale teeth. */}
        <mesh position={[0,-.37,.335]} scale={[.22,.32,.055]}>
          <sphereGeometry args={[1,16,12]}/>
          <meshStandardMaterial color="#080708" roughness={.6}/>
        </mesh>
        <group ref={mouth} position={[0,-.53,.38]}>
          <mesh position={[0,-.07,0]} scale={[.26,.16,.13]}>
            <sphereGeometry args={[1,12,10]}/>
            <meshStandardMaterial color="#5b625e" roughness={1}/>
          </mesh>
          {[-.16,-.08,0,.08,.16].map((x,i)=><mesh key={i}
            position={[x,.045,.105]} rotation={[Math.PI,0,0]}>
            <coneGeometry args={[.033,.17+(i%2)*.05,5]}/>
            <meshStandardMaterial color="#b6b5a5" roughness={.92}/>
          </mesh>)}
        </group>
        {[-.16,-.08,0,.08,.16].map((x,i)=><mesh key={i}
          position={[x,-.27,.408]}>
          <coneGeometry args={[.025,.16+(i%3)*.045,5]}/>
          <meshStandardMaterial color="#bdbdaf" roughness={.91}/>
        </mesh>)}
      </group>
    </group>
    <Arm side="left" armRef={leftArm}/>
    <Arm side="right" armRef={rightArm}/>
    <Leg side="left" legRef={leftLeg}/>
    <Leg side="right" legRef={rightLeg}/>
    {/* Floor contact shadow grounds the model in the fluorescent garage. */}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.035,0]}>
      <circleGeometry args={[.66,20]}/>
      <meshBasicMaterial color="#030606" transparent opacity={.48} depthWrite={false}/>
    </mesh>
  </group>;
}
