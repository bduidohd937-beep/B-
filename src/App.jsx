import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';

const pillars = [];
for (let z = -28; z <= 18; z += 9) for (const x of [-10, 10]) pillars.push([x, z]);
const parkedCars = [[-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11]];
const clamp = THREE.MathUtils.clamp;

function Car({ x, z, color = '#303b3e' }) {
  return <group position={[x,0,z]}>
    <mesh position={[0,.58,0]} castShadow><boxGeometry args={[2.45,.95,4.5]}/><meshStandardMaterial color={color} roughness={.47} metalness={.33}/></mesh>
    <mesh position={[0,1.22,-.22]}><boxGeometry args={[2.16,.55,2.5]}/><meshStandardMaterial color="#18282d" metalness={.3} roughness={.23}/></mesh>
    {[-1,1].flatMap(s=>[-1.5,1.5].map(t=><mesh key={s+':'+t} position={[s*1.23,.38,t]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.35,.35,.16,12]}/><meshStandardMaterial color="#101417"/></mesh>))}
    {[-.8,.8].map(x=><mesh key={x} position={[x,.64,2.26]}><boxGeometry args={[.45,.2,.04]}/><meshBasicMaterial color="#842d2b"/></mesh>)}
  </group>;
}
function Garage({ altered }) {
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[42,92]}/><meshStandardMaterial color="#32383a" roughness={.97}/></mesh>
    <mesh position={[0,4.7,-4]} receiveShadow><boxGeometry args={[42,.45,92]}/><meshStandardMaterial color="#3a4042" roughness={1}/></mesh>
    {[-20,20].map(x=><mesh key={x} position={[x,2,-4]}><boxGeometry args={[.6,4.5,92]}/><meshStandardMaterial color="#535a5a"/></mesh>)}
    <mesh position={[0,2,-49]}><boxGeometry args={[42,4.5,.6]}/><meshStandardMaterial color="#50585a"/></mesh>
    {pillars.map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,2.15,0]} castShadow receiveShadow><boxGeometry args={[1.6,4.3,1.6]}/><meshStandardMaterial color="#687073" roughness={.98}/></mesh>
      <mesh position={[0,1.35,.81]}><boxGeometry args={[1.62,.57,.035]}/><meshStandardMaterial color={i%3===0?'#b59f53':'#5c6765'}/></mesh>
      <Text position={[0,2,.83]} fontSize={.3} color="#111c1e">B2</Text>
    </group>)}
    {parkedCars.map(([x,z],i)=><Car key={i} x={x} z={z} color={['#354149','#4b4942','#2e4541'][i%3]}/>)}
    {Array.from({length:10},(_,i)=><group key={i} position={[0,4.39,-42+i*8.2]}>
      <mesh><boxGeometry args={[1.1,.08,3.7]}/><meshBasicMaterial color={i===3 || i===7?'#3b4242':'#b2bcaf'} toneMapped={false}/></mesh>
      {(i===3||i===7)?null:<pointLight position={[0,-.65,0]} intensity={3.5} distance={14} decay={2} color="#dce8d5"/>}
    </group>)}
    {Array.from({length:12},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,.016,-41+i*7]}>
      <planeGeometry args={[.12,2.4]}/><meshBasicMaterial color="#858b77" transparent opacity={.65}/></mesh>)}
    <group position={[0,2.6,-34]}>
      <mesh><boxGeometry args={[4.3,1.15,.3]}/><meshStandardMaterial color={altered?'#662e30':'#24654e'} emissive={altered?'#681d20':'#176c46'} emissiveIntensity={1.5}/></mesh>
      <Text position={[0,0,.18]} fontSize={.56} color="#e6e8dd">{altered?'B ∞':'EXIT ↑'}</Text>
    </group>
    {altered && <mesh position={[0,1.8,-38]}><boxGeometry args={[7,3.6,.8]}/><meshStandardMaterial color="#596063"/></mesh>}
    <mesh position={[0,.05,-32]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5,5]}/><meshBasicMaterial color="#22272b" transparent opacity={.5}/></mesh>
  </group>;
}
function Watcher({ shifted }) {
  return <group position={shifted?[-8,0,-16]:[9,0,-16]}>
    <mesh position={[0,1.35,0]}><capsuleGeometry args={[.27,1.25,5,8]}/><meshStandardMaterial color="#080b0b" roughness={1}/></mesh>
    <mesh position={[0,2.38,.03]}><sphereGeometry args={[.26,12,12]}/><meshStandardMaterial color="#080b0b"/></mesh>
    {[-.16,.16].map(x=><mesh key={x} position={[x,.47,0]}><boxGeometry args={[.18,.95,.19]}/><meshStandardMaterial color="#090b0c"/></mesh>)}
    <mesh position={[0,2.32,.23]}><boxGeometry args={[.31,.04,.02]}/><meshBasicMaterial color="#3a4141"/></mesh>
  </group>;
}
function Player({ active, torch, onNear, onTurn }) {
  const { camera } = useThree();
  const keys = useRef({});
  const hadLooked = useRef(false);
  const forward = useMemo(()=>new THREE.Vector3(),[]);
  const right = useMemo(()=>new THREE.Vector3(),[]);
  const movement = useMemo(()=>new THREE.Vector3(),[]);
  const direction = useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    camera.position.set(0,1.7,17);
    const down=e=>{keys.current[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();};
    const up=e=>{keys.current[e.code]=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[camera]);
  useFrame((_,delta)=>{
    if(!active)return;
    camera.getWorldDirection(direction);
    forward.set(direction.x,0,direction.z).normalize();
    right.crossVectors(forward,camera.up).normalize();
    movement.set(0,0,0);
    if(keys.current.KeyW||keys.current.ArrowUp)movement.add(forward);
    if(keys.current.KeyS||keys.current.ArrowDown)movement.sub(forward);
    if(keys.current.KeyD||keys.current.ArrowRight)movement.add(right);
    if(keys.current.KeyA||keys.current.ArrowLeft)movement.sub(right);
    if(movement.lengthSq()>0){
      movement.normalize().multiplyScalar(Math.min(delta,.05)*(keys.current.ShiftLeft?6.5:3.4));
      let nx=clamp(camera.position.x+movement.x,-18.5,18.5);
      let nz=clamp(camera.position.z+movement.z,-46,39);
      const blocked=pillars.some(([x,z])=>Math.abs(nx-x)<1.15&&Math.abs(nz-z)<1.15) || parkedCars.some(([x,z])=>Math.abs(nx-x)<1.7&&Math.abs(nz-z)<2.7);
      if(!blocked){camera.position.x=nx;camera.position.z=nz;}
    }
    camera.position.y=1.7;
    if(camera.position.z < -10)onNear();
    if(camera.position.z < -10 && direction.z>0.45&&!hadLooked.current){hadLooked.current=true;onTurn();}
  });
  return <group><spotLight position={[0,0,0]} intensity={torch?18:0} distance={23} angle={.38} penumbra={.55} decay={2} color="#e7ecdf"/><primitive object={camera} /></group>;
}
function World({ active, torch, onNear, onTurn, altered }) {
  const {camera}=useThree();
  return <>
    <color attach="background" args={['#101719']}/>
    <fog attach="fog" args={['#101719',9,49]}/>
    <ambientLight intensity={.28} color="#9cadad"/>
    <Garage altered={altered}/>
    <Watcher shifted={altered}/>
    <Player active={active} torch={torch} onNear={onNear} onTurn={onTurn}/>
    <PointerLockControls makeDefault onLock={()=>{}} onUnlock={()=>{}} />
  </>;
}
export default function App(){
  const [started,setStarted]=useState(false);
  const [locked,setLocked]=useState(false);
  const [torch,setTorch]=useState(true);
  const [near,setNear]=useState(false);
  const [altered,setAltered]=useState(false);
  const [ending,setEnding]=useState(false);
  const onNear=useCallback(()=>setNear(true),[]);
  const onTurn=useCallback(()=>setAltered(true),[]);
  useEffect(()=>{
    const key=e=>{if(e.code==='KeyF'&&!e.repeat)setTorch(v=>!v);};
    const lock=()=>setLocked(document.pointerLockElement!==null);
    window.addEventListener('keydown',key);document.addEventListener('pointerlockchange',lock);
    return ()=>{window.removeEventListener('keydown',key);document.removeEventListener('pointerlockchange',lock);};
  },[]);
  useEffect(()=>{if(altered){const t=setTimeout(()=>setEnding(true),6500);return ()=>clearTimeout(t);}},[altered]);
  const begin=()=>{
    setStarted(true);
    const canvas=document.querySelector('canvas');
    canvas?.requestPointerLock?.();
  };
  return <>
    <Canvas shadows={false} camera={{fov:74,near:.08,far:90,position:[0,1.7,17]}} gl={{antialias:true,powerPreference:'high-performance'}}>
      <World active={started&&locked&&!ending} torch={torch} onNear={onNear} onTurn={onTurn} altered={altered}/>
    </Canvas>
    <div className="vignette"/>
    <div className="hud">
      <div className="top">B<span>∞</span> / B2 · 03:17</div>
      <div className="stamp">PROTOTYPE 0.1 / WORK IN PROGRESS</div>
      <div className="reticle"/>
      <div className="controls">WASD 이동 · 마우스 시점 · Shift 달리기 · F 손전등 · ESC 일시정지</div>
      {started&&locked&&!ending&&<div className="hint">{altered?'...방금 저기 출구가 있었는데.':near?'뒤에서 발소리가 들린다. 확인해 봐야 할까?':'출구를 찾아라. B2층 끝에 녹색 표시가 보인다.'}</div>}
    </div>
    {(!started||!locked||ending)&&<div className="overlay"><section className="panel">
      <div className="eyebrow">B∞ / THE ENDLESS PARKING GARAGE</div>
      <h1>{ending?'출구가 없다.':!started?'끝나지 않는 주차장':'일시정지'}</h1>
      <p>{ending?<>계단도, 출구도 사라졌다.<br/>조금 전 기둥 뒤의 사람은 지금 어디에 있을까?</>:!started?<>차를 찾으러 내려왔을 뿐이다.<br/>하지만 이곳에서 나가는 길은 보이지 않는다.</>:'마우스가 잠금 해제되었습니다. 다시 들어가려면 계속을 누르세요.'}</p>
      <button onClick={()=>{if(ending)window.location.reload();else begin();}}>{ending?'처음부터':'들어가기'}</button>
      {ending&&<p className="red">PROTOTYPE 0.1 — TO BE CONTINUED</p>}
    </section></div>}
  </>;
}
