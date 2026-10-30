import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { createSoundEngine } from './sound.js';
import Listener from './Listener.jsx';
import ThrownCan from './ThrownCan.jsx';
import NoiseHUD from './NoiseHUD.jsx';
import EscapePuzzle from './EscapePuzzle.jsx';
import DeathCamera from './DeathCamera.jsx';
import { tickFootsteps, footstepLoudness } from './stealth.js';
import { POWER_PANEL, POWER_HOLD_SECONDS, canUsePanel, isNearGate, gateBlocksPlayer, objectiveText } from './puzzle.js';

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
function Garage({ altered, flicker, canPosition }) {
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
      <mesh><boxGeometry args={[1.1,.08,3.7]}/><meshBasicMaterial color={i===3 || i===7 || (flicker&&i===5)?'#3b4242':'#b2bcaf'} toneMapped={false}/></mesh>
      {(i===3||i===7)?null:<pointLight position={[0,-.65,0]} intensity={flicker&&i===5?.4:3.5} distance={17} decay={2} color="#dce8d5"/>}
    </group>)}
    {Array.from({length:12},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,.016,-41+i*7]}>
      <planeGeometry args={[.12,2.4]}/><meshBasicMaterial color="#858b77" transparent opacity={.65}/></mesh>)}
    <group position={[0,2.6,-34]}>
      <mesh><boxGeometry args={[4.3,1.15,.3]}/><meshStandardMaterial color={altered?'#662e30':'#24654e'} emissive={altered?'#681d20':'#176c46'} emissiveIntensity={1.5}/></mesh>
      <Text position={[0,0,.18]} fontSize={.56} color="#e6e8dd">{altered?'B ∞':'EXIT ↑'}</Text>
    </group>

    {Array.from({length:10},(_,i)=><mesh key={'bay'+i} position={[i%2===0?-13.7:13.7,.018,-35+i*6]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.11,4.8]}/><meshBasicMaterial color="#9c9b76" transparent opacity={.48}/></mesh>)}
    <mesh position={[0,.023,-6]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5,5]}/><meshStandardMaterial color="#657176" metalness={.72}/></mesh>
    <mesh position={[2,.028,-14]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5,3]}/><meshStandardMaterial color="#273f46" metalness={.62}/></mesh>
    {canPosition&&<group position={canPosition} rotation={[0,0,-.12]}>
      <mesh rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[.16,.16,.38,16]}/>
        <meshStandardMaterial color="#c6d0cd" roughness={.3} metalness={.7}/>
      </mesh>
      <mesh position={[0,0,.012]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[.163,.163,.12,16]}/>
        <meshStandardMaterial color="#b44e42" roughness={.5}/>
      </mesh>
    </group>}
    <mesh position={[0,.05,-32]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5,5]}/><meshBasicMaterial color="#22272b" transparent opacity={.5}/></mesh>
  </group>;
}
function Watcher({ shifted }) {
  return <group position={shifted?[-8,0,-8]:[9,0,-16]}>
    <mesh position={[0,1.35,0]}><capsuleGeometry args={[.27,1.25,5,8]}/><meshStandardMaterial color="#080b0b" roughness={1}/></mesh>
    <mesh position={[0,2.38,.03]}><sphereGeometry args={[.26,12,12]}/><meshStandardMaterial color="#080b0b"/></mesh>
    {[-.16,.16].map(x=><mesh key={x} position={[x,.47,0]}><boxGeometry args={[.18,.95,.19]}/><meshStandardMaterial color="#090b0c"/></mesh>)}
    <mesh position={[0,2.32,.23]}><boxGeometry args={[.31,.04,.02]}/><meshBasicMaterial color="#3a4141"/></mesh>
  </group>;
}
function Flashlight({ enabled }) {
  const { camera, scene } = useThree();
  const lamp=useRef();
  const target=useMemo(()=>new THREE.Object3D(),[]);
  const origin=useMemo(()=>new THREE.Vector3(),[]);
  const aim=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{scene.add(target);return ()=>scene.remove(target)},[scene,target]);
  useFrame(()=>{
    if(!lamp.current)return;
    camera.getWorldPosition(origin);
    camera.getWorldDirection(aim);
    lamp.current.position.copy(origin).addScaledVector(aim,.22).add(new THREE.Vector3(0,-.12,0));
    target.position.copy(origin).addScaledVector(aim,14);
    target.updateMatrixWorld();
  });
  return <spotLight ref={lamp} target={target} intensity={enabled?100:0}
    angle={Math.PI/6} penumbra={.65} distance={32} decay={1.6} color="#f2f0d8"/>;
}

function Player({ active, torch, onNear, onTurn, onWatcherShift, altered, powered, onFinish, onNoise, onMoveMode, playerRef, respawnSignal, canCollected, canPosition, onPickCan, onThrowCan, onCheckpoint, checkpoint, onPuzzleProximity, onPanelAttempt, onPanelProgress, onPowerRestored }) {
  const { camera } = useThree();
  const keys = useRef({});
  const hadLooked = useRef(false);
  const sawWatcher = useRef(false);
  const unseenTime = useRef(0);
  const shiftedOnce = useRef(false);
  const crouchToggle = useRef(false);
  const vertical = useRef(0);
  const velocityY = useRef(0);
  const stepMeter = useRef({meters:0,elapsed:1,moving:false});
  const bobClock = useRef(0);
  const jumpQueued = useRef(false);
  const crouchAlpha = useRef(0);
  const lastMode = useRef('walk');
  const lastActive = useRef(false);
  const canRef=useRef(false);
  canRef.current=canCollected;
  const groundCanRef=useRef(null);
  groundCanRef.current=canPosition;
  const activeRef=useRef(false);
  activeRef.current=active;
  const alteredRef=useRef(false);
  alteredRef.current=altered;
  const checkSet=useRef(false);
  const panelHeld=useRef(false);
  const panelTime=useRef(0);
  const panelUpdate=useRef(0);
  const poweredRef=useRef(powered);
  poweredRef.current=powered;
  const forward = useMemo(()=>new THREE.Vector3(),[]);
  const right = useMemo(()=>new THREE.Vector3(),[]);
  const movement = useMemo(()=>new THREE.Vector3(),[]);
  const direction = useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    if(respawnSignal===0)return;
    camera.position.set(0,1.7,checkpoint?8:17);
    camera.rotation.set(0,0,0);
    vertical.current=0;velocityY.current=0;
    stepMeter.current={meters:0,elapsed:1,moving:false};
    crouchToggle.current=false;
    panelHeld.current=false;panelTime.current=0;panelUpdate.current=0;
    onPanelProgress(0);
  },[respawnSignal,camera,checkpoint,onPanelProgress]);
  useEffect(()=>{
    camera.position.set(0,1.7,17);
    const down=e=>{
      if(!activeRef.current)return;
      if(e.code==='KeyC'&&!e.repeat)crouchToggle.current=!crouchToggle.current;
      if(e.code==='Space'&&!e.repeat)jumpQueued.current=true;
      if(e.code==='KeyE'&&!e.repeat&&!canRef.current&&groundCanRef.current){
        const ground=groundCanRef.current;
        if(Math.hypot(camera.position.x-ground[0],camera.position.z-ground[2])<2.5){
          canRef.current=true;
          groundCanRef.current=null;
          onPickCan();
        }
      }
      if(e.code==='KeyG'&&!e.repeat&&canRef.current){
        canRef.current=false;const look=new THREE.Vector3();camera.getWorldDirection(look);
        const flat = new THREE.Vector3(look.x, 0, look.z);
        if (flat.lengthSq()<.001) flat.set(0,0,-1);
        flat.normalize();
        let range=clamp(8-look.y*4,4,11);
        let endX,endZ;
        while(range>2.5){
          endX=clamp(camera.position.x+flat.x*range,-18,18);
          endZ=clamp(camera.position.z+flat.z*range,-44,38);
          const obstacle=pillars.some(([x,z])=>Math.abs(endX-x)<1.3&&Math.abs(endZ-z)<1.3)
            || parkedCars.some(([x,z])=>Math.abs(endX-x)<1.85&&Math.abs(endZ-z)<2.85)
            || gateBlocksPlayer(endX,endZ,poweredRef.current);
          if(!obstacle)break;
          range-=.5;
        }
        const end=[endX,.18,endZ];
        const origin=camera.position.clone().addScaledVector(look,.6);
        onThrowCan({start:[origin.x,Math.max(.95,origin.y-.15),origin.z],end});
      }
      keys.current[e.code]=true;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    };
    const up=e=>{keys.current[e.code]=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[camera]);
  useFrame((_,delta)=>{
    if(!active){
      lastActive.current=false;
      stepMeter.current.moving=false;
      if(panelHeld.current){panelHeld.current=false;panelTime.current=0;onPanelProgress(0);}
      return;
    }
    if(!lastActive.current){keys.current={};jumpQueued.current=false;lastActive.current=true;}
    camera.getWorldDirection(direction);
    forward.set(direction.x,0,direction.z).normalize();
    right.crossVectors(forward,camera.up).normalize();
    movement.set(0,0,0);
    if(keys.current.KeyW||keys.current.ArrowUp)movement.add(forward);
    if(keys.current.KeyS||keys.current.ArrowDown)movement.sub(forward);
    if(keys.current.KeyD||keys.current.ArrowRight)movement.add(right);
    if(keys.current.KeyA||keys.current.ArrowLeft)movement.sub(right);
    const dt=Math.min(delta,.05);
    const crouching=Boolean(keys.current.ControlLeft||keys.current.ControlRight||crouchToggle.current);
    const sprinting=Boolean(!crouching&&(keys.current.ShiftLeft||keys.current.ShiftRight));
    const mode=crouching?'crouch':sprinting?'sprint':'walk';
    const moving=movement.lengthSq()>0;
    if(jumpQueued.current){
      if(!crouching&&vertical.current===0){velocityY.current=4.5;onNoise({type:'jump',loudness:72,position:camera.position.toArray()});}
      jumpQueued.current=false;
    }
    const actualMovement = (vertical.current>0||velocityY.current>0) ? 'jump'
      : !moving ? (crouching ? 'crouch-idle' : 'idle') : mode;
    if(lastMode.current!==actualMovement){
      lastMode.current=actualMovement;
      onMoveMode(actualMovement);
    }
    let movedDistance=0;
    if(moving){
      const beforeX=camera.position.x,beforeZ=camera.position.z;
      movement.normalize().multiplyScalar(dt*(crouching?1.45:sprinting?6.2:3.35));
      let nx=clamp(camera.position.x+movement.x,-18.5,18.5);
      let nz=clamp(camera.position.z+movement.z,-46,39);
      const blocked=(x,z)=>pillars.some(([px,pz])=>Math.abs(x-px)<1.15&&Math.abs(z-pz)<1.15) || parkedCars.some(([cx,cz])=>Math.abs(x-cx)<1.7&&Math.abs(z-cz)<2.7) || gateBlocksPlayer(x,z,poweredRef.current);
      if(!blocked(nx,camera.position.z))camera.position.x=nx;
      if(!blocked(camera.position.x,nz))camera.position.z=nz;
      movedDistance=Math.hypot(camera.position.x-beforeX,camera.position.z-beforeZ);
    }
    if(vertical.current>0||velocityY.current>0){
      vertical.current=Math.max(0,vertical.current+velocityY.current*dt);
      velocityY.current-=12*dt;
      if(vertical.current===0){velocityY.current=0;onNoise({type:'land',loudness:100,position:camera.position.toArray()});}
    }
    crouchAlpha.current=THREE.MathUtils.damp(crouchAlpha.current,crouching?1:0,12,dt);
    if(camera.position.z < -9&&!checkSet.current){checkSet.current=true;onCheckpoint();}
    const nearPanel=canUsePanel(camera.position.x,camera.position.z);
    onPuzzleProximity(nearPanel?'panel':isNearGate(camera.position.x,camera.position.z)?'gate':null);
    // The panel makes a loud crackle at the START of a two-second hold.
    // Distracting the nearby listening creature gives enough time to finish.
    if(!poweredRef.current && nearPanel && keys.current.KeyE){
      if(!panelHeld.current){panelHeld.current=true;panelTime.current=0;onPanelAttempt();}
      panelTime.current+=dt;
      panelUpdate.current+=dt;
      if(panelUpdate.current>=.075){
        panelUpdate.current=0;
        onPanelProgress(Math.min(1,panelTime.current/POWER_HOLD_SECONDS));
      }
      if(panelTime.current>=POWER_HOLD_SECONDS){
        panelHeld.current=false;panelTime.current=0;keys.current.KeyE=false;
        onPanelProgress(1);onPowerRestored();
      }
    }else if(panelHeld.current){
      panelHeld.current=false;panelTime.current=0;onPanelProgress(0);
    }
    const footstep=tickFootsteps(stepMeter.current,{
      distance:movedDistance,
      grounded:vertical.current===0&&velocityY.current===0,
      mode,dt
    });
    stepMeter.current=footstep.state;
    if(moving&&vertical.current===0){
      bobClock.current+=dt*(sprinting?11:crouching?3.5:7);
    }
    if(footstep.steps){
      const surface=Math.abs(camera.position.x)<2.5&&camera.position.z>-8.5&&camera.position.z<-3.5?'metal':
        Math.abs(camera.position.x-2)<2.5&&camera.position.z>-15.5&&camera.position.z<-12.5?'water':'concrete';
      onNoise({type:'step',mode,surface,loudness:footstepLoudness(mode,surface),position:camera.position.toArray()});
    }
    camera.position.y=1.7-.66*crouchAlpha.current+vertical.current+(moving&&vertical.current===0?Math.sin(bobClock.current)*.023:0);
    playerRef.current={x:camera.position.x,z:camera.position.z};
    if(camera.position.z < -10)onNear();
    if(camera.position.z < -10 && direction.z>0.45&&!hadLooked.current){hadLooked.current=true;onTurn();}
    if(!shiftedOnce.current){
      const toWatcher=new THREE.Vector3(9-camera.position.x,2-camera.position.y,-16-camera.position.z);
      const distance=toWatcher.length();
      const visible=direction.dot(toWatcher.normalize())>.67;
      if(distance<20&&visible)sawWatcher.current=true;
      if(sawWatcher.current&&!visible)unseenTime.current+=delta;
      else unseenTime.current=0;
      if(unseenTime.current>1.2){shiftedOnce.current=true;onWatcherShift();}
    }
    if(poweredRef.current&&camera.position.z<-43&&Math.abs(camera.position.x)<3)onFinish();
  });
  return null;
}
function World({ active, torch, onNear, onTurn, onWatcherShift, altered, shifted, powered, onFinish, onNoise, onMoveMode, playerRef, noiseEvents, onCaught, respawnSignal, onCreatureState, onSpatial, canCollected, canPosition, onPickCan, onThrowCan, onCheckpoint, checkpoint, projectile, onProjectileImpact, onPuzzleProximity, onPanelAttempt, onPanelProgress, onPowerRestored, deathPhase, onDeathComplete }) {
  const [flicker,setFlicker]=useState(false);
  useEffect(()=>{
    if(!active)return;
    let timer;
    const cycle=()=>{
      setFlicker(true);onNoise({type:'electric',loudness:12,position:[0,4,-2]});
      timer=setTimeout(()=>{setFlicker(false);timer=setTimeout(cycle,1900+Math.random()*6000);},90+Math.random()*550);
    };
    timer=setTimeout(cycle,1100+Math.random()*3500);
    return ()=>clearTimeout(timer);
  },[active,onNoise]);
  const {camera}=useThree();
  return <>
    <color attach="background" args={['#101719']}/>
    <fog attach="fog" args={['#101719',9,49]}/>
    <ambientLight intensity={.43} color="#9cadad"/>
    <Garage altered={altered} flicker={flicker} canPosition={canPosition}/>
    <EscapePuzzle powered={powered} active={active}/>
    <Flashlight enabled={torch}/>
    <Watcher shifted={shifted}/>
    <Listener active={active} events={noiseEvents} playerRef={playerRef} onCaught={onCaught} onState={onCreatureState} onSpatial={onSpatial} powered={powered}/>
    <ThrownCan projectile={projectile} active={active} onImpact={onProjectileImpact}/>
    <Player active={active} torch={torch} onNear={onNear} onTurn={onTurn} onWatcherShift={onWatcherShift} altered={altered} powered={powered} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode} playerRef={playerRef} respawnSignal={respawnSignal} checkpoint={checkpoint} canCollected={canCollected} canPosition={canPosition} onPickCan={onPickCan} onThrowCan={onThrowCan} onCheckpoint={onCheckpoint} onPuzzleProximity={onPuzzleProximity} onPanelAttempt={onPanelAttempt} onPanelProgress={onPanelProgress} onPowerRestored={onPowerRestored}/>
    <DeathCamera phase={deathPhase} onComplete={onDeathComplete}/>
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
  const [shifted,setShifted]=useState(false);
  const [audioOn,setAudioOn]=useState(true);
  const [moveMode,setMoveMode]=useState('idle');
  const [airborne,setAirborne]=useState(false);
  const [latestNoise,setLatestNoise]=useState(null);
  const [canCollected,setCanCollected]=useState(false);
  const [checkpoint,setCheckpoint]=useState(false);
  const [powered,setPowered]=useState(false);
  const [panelProgress,setPanelProgress]=useState(0);
  const [puzzleProximity,setPuzzleProximity]=useState(null);
  const [canPosition,setCanPosition]=useState([2,.18,12]);
  const [projectile,setProjectile]=useState(null);
  const projectileId=useRef(0);
  const onNoiseRef=useRef(null);
  const onPickCan=useCallback(()=>{
    setCanCollected(true);
    setCanPosition(null);
  },[]);
  const onCheckpoint=useCallback(()=>setCheckpoint(true),[]);
  const onPanelProgress=useCallback(value=>setPanelProgress(value),[]);
  const onPuzzleProximity=useCallback(value=>setPuzzleProximity(old=>old===value?old:value),[]);
  const onPanelAttempt=useCallback(()=>{
    onNoiseRef.current?.({type:'switch',loudness:86,position:[POWER_PANEL[0],1.5,POWER_PANEL[1]]});
  },[]);
  const onPowerRestored=useCallback(()=>{
    setPowered(true);
    onNoiseRef.current?.({type:'power',loudness:92,position:[POWER_PANEL[0],1.5,POWER_PANEL[1]]});
  },[]);
  const onThrowCan=useCallback(({start,end})=>{
    setCanCollected(false);
    setCanPosition(null);
    setProjectile({id:++projectileId.current,start,end});
  },[]);
  const onProjectileImpact=useCallback(end=>{
    setCanPosition(end);
    setProjectile(null);
    onNoiseRef.current?.({type:'throw',loudness:100,position:end});
  },[]);
  const soundRef=useRef(null);
  const noiseLog=useRef([]);
  const noiseId=useRef(0);
  const playerRef=useRef({x:0,z:17});
  const [respawnSignal,setRespawnSignal]=useState(0);
  const [caught,setCaught]=useState(false);
  const [deathPhase,setDeathPhase]=useState('alive');
  const deathPhaseRef=useRef('alive');
  const onDeathComplete=useCallback(()=>{
    if(deathPhaseRef.current!=='dying')return;
    deathPhaseRef.current='dead';
    setDeathPhase('dead');
  },[]);
  const [creatureInfo,setCreatureInfo]=useState({mode:'idle',excitement:0,speed:0});
  const onCreatureState=useCallback((mode,excitement,speed)=>{
    setCreatureInfo(old=>old.mode===mode&&old.excitement===excitement&&old.speed===speed
      ?old:{mode,excitement,speed});
  },[]);
  const onSpatial=useCallback(data=>{
    soundRef.current?.updateCreature?.(data);
  },[]);
  const onCaught=useCallback(()=>{
    if(deathPhaseRef.current!=='alive')return;
    deathPhaseRef.current='dying';
    soundRef.current?.updateCreature?.({active:false});
    soundRef.current?.death?.();
    setCaught(true);
    setDeathPhase('dying');
    document.exitPointerLock?.();
  },[]);
  const respawn=useCallback(()=>{
    noiseLog.current=[];
    deathPhaseRef.current='alive';
    setDeathPhase('alive');
    setRespawnSignal(n=>n+1);
    setCaught(false);
    setAirborne(false);
    setMoveMode('idle');
    setCreatureInfo({mode:'idle',excitement:0,speed:0});
    soundRef.current?.resume();
    const canvas=document.querySelector('canvas');
    canvas?.requestPointerLock?.();
  },[]);
  const onMoveMode=useCallback(mode=>setMoveMode(mode),[]);
  const onNoise=useCallback(event=>{
    // Shared noise event contract for a future sound-sensitive creature.
    const emitted={...event,id:++noiseId.current,time:performance.now()};
    noiseLog.current.push(emitted);
    if(noiseLog.current.length>32)noiseLog.current.shift();
    if(['step','jump','land','throw','switch','power'].includes(event.type))setLatestNoise(emitted);
    if(event.type==='jump')setAirborne(true);
    if(event.type==='land')setAirborne(false);
    const sound=soundRef.current;
    if(!sound)return;
    if(event.type==='step'){sound.step(event.mode);if(event.surface==='metal')sound.metal();if(event.surface==='water')sound.splash();}
    if(event.type==='jump')sound.jump();
    if(event.type==='throw')sound.throwCan();
    if(event.type==='land')sound.land();
    if(event.type==='electric')sound.flicker();
    if(event.type==='switch')sound.switchStart();
    if(event.type==='power')sound.powerRestore();
  },[]);
  onNoiseRef.current=onNoise;
  const onWatcherShift=useCallback(()=>setShifted(true),[]);
  const onFinish=useCallback(()=>{
    soundRef.current?.updateCreature?.({active:false});
    setEnding(true);
  },[]);
  const onNear=useCallback(()=>setNear(true),[]);
  const onTurn=useCallback(()=>setAltered(true),[]);
  useEffect(()=>{
    const key=e=>{if(e.code==='KeyF'&&!e.repeat)setTorch(v=>!v);};
    const lock=()=>setLocked(document.pointerLockElement!==null);
    window.addEventListener('keydown',key);document.addEventListener('pointerlockchange',lock);
    return ()=>{window.removeEventListener('keydown',key);document.removeEventListener('pointerlockchange',lock);};
  },[]);
  useEffect(()=>()=>soundRef.current?.dispose(),[]);
  useEffect(()=>{soundRef.current?.setEnabled(audioOn);},[audioOn]);
  const begin=()=>{
    setStarted(true);
    if(!soundRef.current)soundRef.current=createSoundEngine();
    soundRef.current?.setEnabled(audioOn);
    soundRef.current?.resume();
    const canvas=document.querySelector('canvas');
    canvas?.requestPointerLock?.();
  };
  return <>
    <Canvas shadows={false} camera={{fov:74,near:.08,far:90,position:[0,1.7,17]}} gl={{antialias:true,powerPreference:'high-performance'}}>
      <World active={started&&locked&&!ending&&!caught} torch={torch} onNear={onNear} onTurn={onTurn} onWatcherShift={onWatcherShift} altered={altered} shifted={shifted} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode} playerRef={playerRef} noiseEvents={noiseLog} onCaught={onCaught} respawnSignal={respawnSignal} onCreatureState={onCreatureState} onSpatial={onSpatial} checkpoint={checkpoint} powered={powered} canCollected={canCollected} canPosition={canPosition} onPickCan={onPickCan} onThrowCan={onThrowCan} onCheckpoint={onCheckpoint} projectile={projectile} onProjectileImpact={onProjectileImpact} onPuzzleProximity={onPuzzleProximity} onPanelAttempt={onPanelAttempt} onPanelProgress={onPanelProgress} onPowerRestored={onPowerRestored} deathPhase={deathPhase} onDeathComplete={onDeathComplete}/>
    </Canvas>
    <div className="vignette"/>
    {deathPhase!=='alive'&&<div className={'death-fx death-fx--'+deathPhase} aria-hidden="true">
      <div className="death-fx__blood"/>
      <div className="death-fx__blackout"/>
    </div>}
    <div className="hud">
      <div className="top">B<span>∞</span> / B2 · 03:17</div>
      <div className="stamp">PROTOTYPE 0.8.1 / WORK IN PROGRESS</div>
      <div className="reticle"/>
      <div className="audio-toggle" title="청음자의 방향성 숨소리와 발소리는 헤드폰 사용을 권장합니다" onClick={()=>setAudioOn(v=>!v)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')setAudioOn(v=>!v)}}>{audioOn?'환경음 ON':'환경음 OFF'}</div>
      <div className="creature-indicator">{creatureInfo.mode==='investigate'?'청음자가 소리를 향해 다가온다':creatureInfo.mode==='listen'?'청음자가 작은 소리에 귀를 기울인다':creatureInfo.mode==='search'?'무언가가 주변을 수색 중이다':creatureInfo.mode==='return'?'발소리가 멀어진다':'소리를 죽여라'}</div>
      {started&&<NoiseHUD latestNoise={latestNoise} moveMode={moveMode} airborne={airborne} creature={creatureInfo}/>}
      <div className="puzzle-goal">
        <div className="puzzle-goal__label">OBJECTIVE 01 · EMERGENCY EXIT</div>
        <div>{objectiveText(powered)}</div>
        {puzzleProximity==='panel'&&!powered&&<div className="puzzle-goal__interact">
          <strong>[E 누르기 유지] 배전반 재시동</strong>
          <span>전기 소음 발생. 청음자를 먼저 유인하라.</span>
          <div className="puzzle-goal__track"><div style={{width:(panelProgress*100)+'%'}}/></div>
        </div>}
        {puzzleProximity==='gate'&&!powered&&<div className="puzzle-goal__interact">
          비상문 잠김 — 왼쪽 벽 적색 배전반에 전력이 필요하다.
        </div>}
        {puzzleProximity==='gate'&&powered&&<div className="puzzle-goal__interact puzzle-goal__interact--success">
          비상문 열림 — 통로 안으로 들어가라.
        </div>}
      </div>
      <div className="item-indicator">{canCollected?'빈 캔 보유 · G 던지기':canPosition?'바닥에 떨어진 캔 · 가까이 가서 E로 줍기':'캔이 날아가는 중…'}{checkpoint?' · 체크포인트 확보':''}</div>
      <div className="torch-indicator">손전등 [F] {torch?'ON':'OFF'}</div>
      <div className="movement-indicator">{airborne?'점프 중 / 착지 소음 주의':moveMode==='idle'?'정지 / 무음':moveMode==='crouch-idle'?'앉아 있기 / 무음':moveMode==='crouch'?'앉아서 이동 / 저소음':moveMode==='sprint'?'달리기 / 큰 발소리':'걷기 / 보통 발소리'}</div>
      <div className="controls">WASD 이동 · Shift 달리기 · Ctrl 누르기 / C 앉기 전환 · Space 점프 · E 줍기 · G 던지기 · F 손전등 · ESC 일시정지</div>
      {started&&locked&&!ending&&<div className="hint">{powered?'비상문이 열렸다. 이제 나갈 수 있을까?':altered?'EXIT 표지판이 바뀌었다. 비상 전원을 찾아라.':shifted?'방금 전까지 저 기둥 뒤에 있지 않았나?':near?'기둥 뒤에 누군가 서 있다.':'비상문이 잠겨 있다. 근처의 전력실을 찾아라.'}</div>}
    </div>
    {(!started||(!locked&&deathPhase==='alive')||ending||deathPhase==='dead')&&<div className="overlay"><section className="panel">
      <div className="eyebrow">B∞ / THE ENDLESS PARKING GARAGE</div>
      <h1>{caught?'소리가 끊겼다.':ending?'다시 B2.':!started?'끝나지 않는 주차장':'일시정지'}</h1>
      <p>{caught?'귓가를 찢는 비명, 바닥에 떨어진 손전등. 마지막으로 들린 것은 그놈의 거친 숨소리였다.':ending?<>잠겨 있던 비상문이 열렸다.<br/>하지만 계단 끝에는 또다시 B2라고 적혀 있다.</>:!started?<>차를 찾으러 내려왔을 뿐이다.<br/>하지만 이곳에서 나가는 길은 보이지 않는다.</>:'마우스가 잠금 해제되었습니다. 다시 들어가려면 계속을 누르세요.'}</p>
      <button onClick={()=>{if(caught)respawn();else if(ending)window.location.reload();else begin();}}>{caught?'체크포인트에서 재시작':ending?'처음부터':'들어가기'}</button>
      {ending&&<p className="red">PROTOTYPE 0.8.1 — TO BE CONTINUED</p>}
    </section></div>}
  </>;
}
