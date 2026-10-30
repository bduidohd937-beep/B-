import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { createSoundEngine } from './sound.js';
import Listener from './Listener.jsx';
import Observer from './Observer.jsx';
import ItemsWorld from './ItemsWorld.jsx';
import ThrownCan from './ThrownCan.jsx';
import SurvivalHUD from './SurvivalHUD.jsx';
import EscapePuzzle from './EscapePuzzle.jsx';
import DistortedB2 from './DistortedB2.jsx';
import DeathCamera from './DeathCamera.jsx';
import { tickFootsteps, footstepLoudness } from './stealth.js';
import { freshSurvival, tickSurvival, applyEnergyDrink } from './survival.js';
import { ITEM_TYPES,startingPickups,slots,canAddToInventory,pickupRadius,itemEffect } from './items.js';
import { panelPosition, POWER_HOLD_SECONDS, SECOND_FLOOR_START, canUsePanel, isNearGate, gateBlocksPlayer, gateIsPowered, canEnterNextArea, objectiveText } from './puzzle.js';

const pillars = [];
for (let z = -28; z <= 18; z += 9) for (const x of [-10, 10]) pillars.push([x, z]);
const parkedCars = [[-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11]];
const clamp = THREE.MathUtils.clamp;

const Car = React.memo(function Car({ x, z, color = '#303b3e' }) {
  return <group position={[x,0,z]}>
    <mesh position={[0,.58,0]} castShadow><boxGeometry args={[2.45,.95,4.5]}/><meshStandardMaterial color={color} roughness={.47} metalness={.33}/></mesh>
    <mesh position={[0,1.22,-.22]}><boxGeometry args={[2.16,.55,2.5]}/><meshStandardMaterial color="#18282d" metalness={.3} roughness={.23}/></mesh>
    {[-1,1].flatMap(s=>[-1.5,1.5].map(t=><mesh key={s+':'+t} position={[s*1.23,.38,t]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.35,.35,.16,12]}/><meshStandardMaterial color="#101417"/></mesh>))}
    {[-.8,.8].map(x=><mesh key={x} position={[x,.64,2.26]}><boxGeometry args={[.45,.2,.04]}/><meshBasicMaterial color="#842d2b"/></mesh>)}
  </group>;
});
const Garage = React.memo(function Garage({ altered, flicker, canPosition }) {
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
});
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

const Player = React.memo(function Player({ active, torch, onNear, onTurn, altered, powered, floor, floorSignal, onFinish, onNoise, onMoveMode, playerRef, respawnSignal, canCollected, canPosition, onPickCan, onThrowCan, onCheckpoint, checkpoint, onPuzzleProximity, onPanelAttempt, onPanelProgress, onPowerRestored, onVitals, pickupItems, onPickupGear, selectedType, onSelectSlot, onUseGear, onDropGear, boostSignal }) {
  const { camera } = useThree();
  const keys = useRef({});
  const groundPickupsRef=useRef(pickupItems);
  groundPickupsRef.current=pickupItems;
  const selectedTypeRef=useRef(selectedType);
  selectedTypeRef.current=selectedType;
  const turnedOnce=useRef(false);
  const crouchToggle = useRef(false);
  const vertical = useRef(0);
  const velocityY = useRef(0);
  const stepMeter = useRef({meters:0,elapsed:1,moving:false});
  const survival=useRef(freshSurvival());
  const breathClock=useRef(0);
  const vitalsClock=useRef(0);
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
  const nearReported=useRef(false);
  const proximityReported=useRef(null);
  const panelHeld=useRef(false);
  const panelTime=useRef(0);
  const panelUpdate=useRef(0);
  const poweredRef=useRef(powered);
  poweredRef.current=powered;
  const floorRef=useRef(floor);
  floorRef.current=floor;
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
    survival.current=freshSurvival();
    breathClock.current=0;vitalsClock.current=0;
    onVitals({...survival.current,breath:0,exhausted:false});
    crouchToggle.current=false;
    panelHeld.current=false;panelTime.current=0;panelUpdate.current=0;
    proximityReported.current=null;
    onPanelProgress(0);
  },[respawnSignal,camera,checkpoint,onPanelProgress,onVitals]);
  useEffect(()=>{
    if(!floorSignal)return;
    camera.position.set(...SECOND_FLOOR_START);
    camera.rotation.set(0,0,0);
    vertical.current=0;velocityY.current=0;
    stepMeter.current={meters:0,elapsed:1,moving:false};
    survival.current=freshSurvival();
    breathClock.current=0;vitalsClock.current=0;
    onVitals({...survival.current,breath:0,exhausted:false});
    crouchToggle.current=false;
    checkSet.current=true;
    proximityReported.current=null;
    keys.current={};
    panelHeld.current=false;panelTime.current=0;panelUpdate.current=0;
    onPanelProgress(0);
  },[floorSignal,camera,onPanelProgress,onVitals]);
  useEffect(()=>{
    if(!boostSignal)return;
    survival.current=applyEnergyDrink(survival.current);
    onVitals({stamina:survival.current.stamina,exhausted:false,breath:0});
  },[boostSignal,onVitals]);
  useEffect(()=>{
    camera.position.set(0,1.7,17);
    const down=e=>{
      if(!activeRef.current)return;
      if(e.code==='KeyC'&&!e.repeat)crouchToggle.current=!crouchToggle.current;
      if(e.code==='Space'&&!e.repeat)jumpQueued.current=true;
      if(/^Digit[123]$/.test(e.code)&&!e.repeat)onSelectSlot(Number(e.code.slice(-1))-1);
      if(e.code==='KeyE'&&!e.repeat && !canUsePanel(camera.position.x,camera.position.z,floorRef.current)){
        const ground=groundCanRef.current;
        if(!canRef.current&&ground&&Math.hypot(camera.position.x-ground[0],camera.position.z-ground[2])<2.5){
          if(onPickCan()){
            canRef.current=true;
            groundCanRef.current=null;
          }
        } else {
          const candidate=groundPickupsRef.current
            .filter(item=>pickupRadius([camera.position.x,0,camera.position.z],item.position))
            .sort((a,b)=>Math.hypot(camera.position.x-a.position[0],camera.position.z-a.position[2])
              -Math.hypot(camera.position.x-b.position[0],camera.position.z-b.position[2]))[0];
          if(candidate)onPickupGear(candidate.id);
        }
      }
      if(e.code==='KeyG'&&!e.repeat){
        const type=selectedTypeRef.current;
        const look=new THREE.Vector3();
        camera.getWorldDirection(look);
        const flat=new THREE.Vector3(look.x,0,look.z);
        if(flat.lengthSq()<.001)flat.set(0,0,-1);
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
        if(type==='can'&&canRef.current){
          canRef.current=false;
          onThrowCan({start:[origin.x,Math.max(.95,origin.y-.15),origin.z],end});
        }else if(type){
          onUseGear(type,{
            position:camera.position.toArray(),
            end,
            nearPanel:canUsePanel(camera.position.x,camera.position.z,floorRef.current),
            powered:poweredRef.current
          });
        }
      }
      if(e.code==='KeyQ'&&!e.repeat){
        const type=selectedTypeRef.current;
        if(type&&type!=='can'){
          const look=new THREE.Vector3();camera.getWorldDirection(look);
          const xx=clamp(camera.position.x+look.x*.8,-18,18);
          const zz=clamp(camera.position.z+look.z*.8,-43,37);
          onDropGear(type,[xx,.24,zz]);
        }
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
    const sprintIntent=Boolean(!crouching&&(keys.current.ShiftLeft||keys.current.ShiftRight));
    const moving=movement.lengthSq()>0;
    const survivalTick=tickSurvival(survival.current,{
      dt,wantsSprint:sprintIntent,moving,crouching,airborne:vertical.current>0
    });
    survival.current=survivalTick.state;
    const sprinting=survivalTick.sprinting;
    const mode=crouching?'crouch':sprinting?'sprint':'walk';
    vitalsClock.current-=dt;
    if(vitalsClock.current<=0){
      onVitals({stamina:survival.current.stamina,exhausted:survivalTick.exhausted,breath:survivalTick.breath});
      vitalsClock.current=.13;
    }
    breathClock.current-=dt;
    if(survivalTick.breath>=14&&breathClock.current<=0){
      onNoise({type:'breath',loudness:survivalTick.breath,position:camera.position.toArray()});
      breathClock.current=1.22;
    }else if(survivalTick.breath<14){breathClock.current=0;}
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
    const nearPanel=canUsePanel(camera.position.x,camera.position.z,floorRef.current);
    const nextProximity=nearPanel?'panel':isNearGate(camera.position.x,camera.position.z)?'gate':null;
    if(nextProximity!==proximityReported.current){
      proximityReported.current=nextProximity;
      onPuzzleProximity(nextProximity);
    }
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
    playerRef.current={x:camera.position.x,z:camera.position.z,speed:movedDistance/Math.max(dt,.001),crouched:crouching};
    if(camera.position.z < -10&&!nearReported.current){nearReported.current=true;onNear();}
    if(camera.position.z < -10 && direction.z>0.45&&!turnedOnce.current){turnedOnce.current=true;onTurn();}
    if(canEnterNextArea(camera.position.x,camera.position.z,floorRef.current,poweredRef.current))onFinish();
  });
  return null;
});
function World({ active, torch, onNear, onTurn, altered, powered, floor, floorSignal, onFinish, onNoise, onMoveMode, playerRef, noiseEvents, onCaught, respawnSignal, onCreatureState, onSpatial, canCollected, canPosition, onPickCan, onThrowCan, onCheckpoint, checkpoint, projectile, onProjectileImpact, onPuzzleProximity, onPanelAttempt, onPanelProgress, onPowerRestored, deathPhase, onDeathComplete, onHorrorCue, onVitals, pickupItems, deployed, onPickupGear, onUseGear, onDropGear, selectedType, onSelectSlot, onGadgetExpired, onObserverState, boostSignal }) {
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
    <color attach="background" args={[floor===2?'#121017':'#101719']}/>
    <fog attach="fog" args={[floor===2?'#1b1018':'#101719',floor===2?6:9,floor===2?34:49]}/>
    <ambientLight intensity={floor===2?.27:.43} color={floor===2?'#ae8e98':'#9cadad'}/>
    <Garage altered={altered} flicker={flicker} canPosition={canPosition}/>
    {floor===2&&<DistortedB2 onEvent={onHorrorCue}/>}
    <EscapePuzzle key={floor} powered={powered} floor={floor}/>
    <Flashlight enabled={torch}/>
    {floor===2&&<Observer key={floorSignal} active={active} floor={floor} playerRef={playerRef} powered={powered} onCaught={onCaught} onState={onObserverState}/>}
    <ItemsWorld pickups={pickupItems} deployed={deployed} active={active} onNoise={onNoise} onExpire={onGadgetExpired}/>
    <Listener active={active} events={noiseEvents} playerRef={playerRef} onCaught={onCaught} onState={onCreatureState} onSpatial={onSpatial} powered={powered} floor={floor} levelSignal={floorSignal} deathPhase={deathPhase}/>
    <ThrownCan projectile={projectile} active={active} onImpact={onProjectileImpact}/>
    <Player active={active} torch={torch} onNear={onNear} onTurn={onTurn} altered={altered} powered={powered} floor={floor} floorSignal={floorSignal} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode} playerRef={playerRef} respawnSignal={respawnSignal} checkpoint={checkpoint} canCollected={canCollected} canPosition={canPosition} onPickCan={onPickCan} onThrowCan={onThrowCan} onCheckpoint={onCheckpoint} onPuzzleProximity={onPuzzleProximity} onPanelAttempt={onPanelAttempt} onPanelProgress={onPanelProgress} onPowerRestored={onPowerRestored} onVitals={onVitals} pickupItems={pickupItems} onPickupGear={onPickupGear} selectedType={selectedType} onSelectSlot={onSelectSlot} onUseGear={onUseGear} onDropGear={onDropGear} boostSignal={boostSignal}/>
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
  const [audioOn,setAudioOn]=useState(true);
  const [moveMode,setMoveMode]=useState('idle');
  const [airborne,setAirborne]=useState(false);
  const [vitals,setVitals]=useState({stamina:100,breath:0,exhausted:false});
  const [reducedEffects,setReducedEffects]=useState(false);
  const [showControls,setShowControls]=useState(false);
  const [latestNoise,setLatestNoise]=useState(null);
  const [canCollected,setCanCollected]=useState(false);
  const [checkpoint,setCheckpoint]=useState(false);
  const [powered,setPowered]=useState(false);
  const [echoRestored,setEchoRestored]=useState(false);
  const [floor,setFloor]=useState(1);
  const floorRef=useRef(1);
  const [floorSignal,setFloorSignal]=useState(0);
  const [floorFlash,setFloorFlash]=useState(false);
  const gatePowered=gateIsPowered(floor,powered,echoRestored);
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
    const position=panelPosition(floorRef.current);
    onNoiseRef.current?.({type:'switch',loudness:86,position:[position[0],1.5,position[1]]});
  },[]);
  const onPowerRestored=useCallback(()=>{
    const position=panelPosition(floorRef.current);
    if(floorRef.current===2)setEchoRestored(true);
    else setPowered(true);
    onNoiseRef.current?.({type:'power',loudness:92,position:[position[0],1.5,position[1]]});
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
  const onHorrorCue=useCallback(type=>{
    soundRef.current?.horrorCue?.(type);
  },[]);
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
  const [creatureInfo,setCreatureInfo]=useState({mode:'idle',excitement:0,speed:0,distance:Infinity});
  const creatureDistanceRef=useRef(Infinity);
  const onVitals=useCallback(next=>{
    const data={stamina:Math.max(0,Math.min(100,Math.round(next.stamina??100))),
      breath:next.breath||0,exhausted:Boolean(next.exhausted)};
    setVitals(previous=>previous.stamina===data.stamina&&previous.breath===data.breath&&previous.exhausted===data.exhausted
      ?previous:data);
    soundRef.current?.updateVitals?.({
      active:true,breathLevel:data.breath,creatureDistance:creatureDistanceRef.current
    });
  },[]);
  const onCreatureState=useCallback((mode,excitement,speed,distance=Infinity)=>{
    creatureDistanceRef.current=distance;
    const displayDistance=Number.isFinite(distance)?Math.round(distance*2)/2:Infinity;
    setCreatureInfo(old=>old.mode===mode&&old.excitement===excitement&&old.speed===speed&&old.distance===displayDistance
      ?old:{mode,excitement,speed,distance:displayDistance});
  },[]);
  const onSpatial=useCallback(data=>{
    soundRef.current?.updateCreature?.(data);
  },[]);
  const onCaught=useCallback(()=>{
    if(deathPhaseRef.current!=='alive')return;
    deathPhaseRef.current='dying';
    soundRef.current?.updateCreature?.({active:false});
    soundRef.current?.updateVitals?.({active:false});
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
    setCreatureInfo({mode:'idle',excitement:0,speed:0,distance:Infinity});
    creatureDistanceRef.current=Infinity;
    setVitals({stamina:100,breath:0,exhausted:false});
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
    if(['step','jump','land','throw','switch','power','breath'].includes(event.type))setLatestNoise(emitted);
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
  const onFinish=useCallback(()=>{
    if(floorRef.current===1){
      floorRef.current=2; // Guard against repeated transitions during the same frame.
      soundRef.current?.updateCreature?.({active:false});
      soundRef.current?.updateVitals?.({active:false});
      soundRef.current?.loopTransition?.();
      noiseLog.current=[];
      setFloor(2);
      setFloorSignal(v=>v+1);
      setPanelProgress(0);
      setPuzzleProximity(null);
      setFloorFlash(true);
      // The next loop contains another can unless the player carries theirs.
      setCanPosition(canCollected?null:[2,.18,12]);
      setProjectile(null);
      return;
    }
    soundRef.current?.updateCreature?.({active:false});
    soundRef.current?.updateVitals?.({active:false});
    setEnding(true);
  },[canCollected]);
  useEffect(()=>{
    if(!floorFlash)return;
    const id=setTimeout(()=>setFloorFlash(false),2250);
    return ()=>clearTimeout(id);
  },[floorFlash]);
  const onNear=useCallback(()=>setNear(true),[]);
  const onTurn=useCallback(()=>setAltered(true),[]);
  useEffect(()=>{
    const key=e=>{if(e.repeat)return;if(e.code==='KeyF')setTorch(v=>!v);if(e.code==='KeyH')setShowControls(v=>!v);};
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
      <World active={started&&locked&&!ending&&!caught} torch={torch} onNear={onNear} onTurn={onTurn} altered={altered} floor={floor} floorSignal={floorSignal} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode} playerRef={playerRef} noiseEvents={noiseLog} onCaught={onCaught} respawnSignal={respawnSignal} onCreatureState={onCreatureState} onSpatial={onSpatial} checkpoint={checkpoint} powered={gatePowered} canCollected={canCollected} canPosition={canPosition} onPickCan={onPickCan} onThrowCan={onThrowCan} onCheckpoint={onCheckpoint} projectile={projectile} onProjectileImpact={onProjectileImpact} onPuzzleProximity={onPuzzleProximity} onPanelAttempt={onPanelAttempt} onPanelProgress={onPanelProgress} onPowerRestored={onPowerRestored} deathPhase={deathPhase} onDeathComplete={onDeathComplete} onHorrorCue={onHorrorCue} onVitals={onVitals}/>
    </Canvas>
    <div className={"vignette "+(reducedEffects?"vignette--reduced":"")}/>
    {floorFlash&&<div className={'floor-loop-flash '+(reducedEffects?'floor-loop-flash--reduced':'')} aria-live="polite">
      <span>STAIR B2</span><strong>YOU ARE STILL HERE</strong><small>03:17 — AGAIN</small>
    </div>}
    {deathPhase!=='alive'&&<div className={'death-fx death-fx--'+deathPhase+(reducedEffects?' death-fx--reduced':'')} aria-hidden="true">
      <div className="death-fx__blood"/>
      <div className="death-fx__blackout"/>
    </div>}
    <div className="hud hud--v092">
      <header className="game-header">
        <div className="game-header__brand">B<span>∞</span> <small>THE ENDLESS PARKING GARAGE</small></div>
        <div className="game-header__location">B2 <span>/</span> {floor===2?'LOOP 02':'LOOP 01'} <span className="game-header__time">03:17</span></div>
      </header>
      <div className="reticle" aria-hidden="true"/>
      <section className="mission-card" aria-label="현재 탈출 목표">
        <div className="mission-card__index">OBJECTIVE {floor===2?'02':'01'} <span>· {floor===2?'BROADCAST':'EMERGENCY EXIT'}</span></div>
        <div className="mission-card__text">{objectiveText(gatePowered,floor)}</div>
      </section>
      {started&&<SurvivalHUD latestNoise={latestNoise} moveMode={moveMode} airborne={airborne} vitals={vitals} creature={creatureInfo}/>}
      <div className="danger-vignette" aria-hidden="true" style={{opacity:started&&!ending&&!reducedEffects?Math.max(0,Math.min(.57,(14-creatureInfo.distance)/20)):0}}/>
      {started&&locked&&puzzleProximity==='panel'&&!gatePowered&&
        <div className="interaction-callout" role="status">
          <strong><kbd>E</kbd> 누르고 있기 · {floor===2?'비상방송 재동기화':'배전반 재시동'}</strong>
          <span>큰 소음 발생 · 먼저 청음자를 유인하라</span>
          <div className="interaction-callout__progress" role="progressbar" aria-label="장치 재시동 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(panelProgress*100)}>
            <div style={{width:(panelProgress*100)+'%'}}/>
          </div>
        </div>}
      {started&&locked&&puzzleProximity==='gate'&&
        <div className={'interaction-callout '+(gatePowered?'interaction-callout--ready':'')} role="status">
          <strong>{gatePowered?'비상문 개방 · 통로로 이동':'비상문 잠김 · 전원 복구 필요'}</strong>
          {!gatePowered&&<span>{floor===2?'오른쪽 벽의 비상방송 제어반을 찾아라':'왼쪽 벽의 비상 배전반을 찾아라'}</span>}
        </div>}
      <div className="equipment-strip">
        <span className="equipment-strip__item"><kbd>F</kbd> LIGHT <b>{torch?'ON':'OFF'}</b></span>
        <span className="equipment-strip__item"><kbd>G</kbd> CAN <b>{canCollected?'READY':canPosition?'ON FLOOR':'AIRBORNE'}</b></span>
        {checkpoint&&<span className="equipment-strip__checkpoint">CHECKPOINT SAVED</span>}
      </div>
      <div className="helper-bar" aria-label="키보드 도움말">
        <span>{vitals.exhausted?'숨이 차 달릴 수 없다':vitals.breath>=14?'쉿… 숨소리가 새어 나온다':creatureInfo.mode==='listen'?'청음자가 듣고 있다':floor===2?'이곳도 B2층이다':'작은 소리도 위험하다'}</span>
        <span><kbd>H</kbd> {showControls?'조작법 닫기':'조작법'}</span>
      </div>
      {showControls&&<div className="controls-sheet">
        <strong>CONTROLS · H로 닫기</strong>
        <span>WASD 이동 · SHIFT 질주(스태미나 소모) · Ctrl/C 은신</span>
        <span>SPACE 점프 · E 줍기/장치 조작 · G 캔 던지기</span>
        <span>F 손전등 · ESC 일시정지 · H 조작법</span>
      </div>}
    </div>
    {(!started||(!locked&&deathPhase==='alive')||ending||deathPhase==='dead')&&<div className="overlay"><section className="panel" role="dialog" aria-modal="true">
      <div className="eyebrow">B∞ / THE ENDLESS PARKING GARAGE</div>
      <h1>{caught?'소리가 끊겼다.':ending?'다시 B2.':!started?'끝나지 않는 주차장':'일시정지'}</h1>
      <p>{caught?'귓가를 찢는 비명, 바닥에 떨어진 손전등. 마지막으로 들린 것은 그놈의 거친 숨소리였다.':ending?<>잠겨 있던 비상문이 열렸다.<br/>하지만 계단 끝에는 또다시 B2라고 적혀 있다.</>:!started?<>차를 찾으러 내려왔을 뿐이다.<br/>하지만 이곳에서 나가는 길은 보이지 않는다.</>:'마우스가 잠금 해제되었습니다. 다시 들어가려면 계속을 누르세요.'}</p>
      <button onClick={()=>{if(caught)respawn();else if(ending)window.location.reload();else begin();}}>{caught?'체크포인트에서 재시작':ending?'처음부터':'들어가기'}</button>
      {!caught&&!ending&&<div className="pause-settings">
        <button type="button" aria-pressed={audioOn} onClick={()=>setAudioOn(v=>!v)}>{audioOn?'사운드 켜짐':'사운드 꺼짐'}</button>
        <button type="button" aria-pressed={!reducedEffects} onClick={()=>setReducedEffects(v=>!v)}>{reducedEffects?'화면 효과 줄임':'화면 효과 켜짐'}</button>
        <p>H 조작법 · 헤드폰 권장 · 숨소리는 청음자가 들을 수 있습니다</p>
      </div>}
      {ending&&<p className="red">PROTOTYPE 0.9.2 — TO BE CONTINUED</p>}
    </section></div>}
  </>;
}
