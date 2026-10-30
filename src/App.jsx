import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { createSoundEngine } from './sound.js';
import { DEFAULT_SIREN_VOLUME } from './emergencyAudio.js';
import { tickFlashlight,rechargeFlashlight,clampCharge,lowBatteryBrightness,FLASHLIGHT_CLICK_NOISE } from './flashlightRules.js';
import { cameraMotion } from './cameraMotion.js';
import Listener from './Listener.jsx';
import Observer from './Observer.jsx';
import ItemsWorld from './ItemsWorld.jsx';
import ThrownCan from './ThrownCan.jsx';
import SurvivalHUD from './SurvivalHUD.jsx';
import GameClock from './GameClock.jsx';
import { inventoryControls } from './uiRules.js';
import EscapePuzzle from './EscapePuzzle.jsx';
import DistortedB2 from './DistortedB2.jsx';
import GarageWorld from './GarageWorld.jsx';
import EmergencyAlarm from './EmergencyAlarm.jsx';
import { PILLARS,PARKED_CARS,GARAGE_HEIGHT,FOG_NEAR,FOG_FAR,terrainBlocked,clampWalkPosition,surfaceAt,WALK_BOUNDS } from './garageLayout.js';
import { SIREN_LOUDNESS,SIREN_SECONDS,canTriggerSiren,sirenPosition } from './alarmRules.js';
import DeathCamera from './DeathCamera.jsx';
import { tickFootsteps, footstepLoudness } from './stealth.js';
import { freshSurvival, tickSurvival, applyEnergyDrink } from './survival.js';
import { ITEM_TYPES,startingPickups,slots,canAddToInventory,pickupRadius,itemEffect } from './items.js';
import { itemActionNoise,mechanicalNoise,nearestLookedAtPickup } from './interactions.js';
import { panelPosition, POWER_HOLD_SECONDS, SECOND_FLOOR_START, canUsePanel, isNearGate, gateBlocksPlayer, gateIsPowered, canEnterNextArea, objectiveText } from './puzzle.js';

const clamp = THREE.MathUtils.clamp;
function Flashlight({enabled,charge=100,reducedEffects=false}){
  const {camera,scene}=useThree();
  const lamp=useRef();
  const target=useMemo(()=>new THREE.Object3D(),[]);
  const origin=useMemo(()=>new THREE.Vector3(),[]);
  const aim=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{scene.add(target);return ()=>scene.remove(target)},[scene,target]);
  useFrame(({clock})=>{
    if(!lamp.current)return;
    camera.getWorldPosition(origin);
    camera.getWorldDirection(aim);
    lamp.current.position.copy(origin).addScaledVector(aim,.22);
    lamp.current.position.y-=.12;
    target.position.copy(origin).addScaledVector(aim,14);
    target.updateMatrixWorld();
    // Low charge causes a gentle warm pulse, never disorienting 0/100 strobing.
    lamp.current.intensity=enabled&&charge>0
      ?108*lowBatteryBrightness(charge,clock.elapsedTime,reducedEffects):0;
  });
  return <spotLight ref={lamp} target={target} intensity={0}
    angle={Math.PI/6.5} penumbra={.72} distance={33}
    decay={1.7} color="#f2e9cb"/>;
}

const Player = React.memo(function Player({ active, torch, onNear, onTurn, altered, powered, floor, floorSignal, onFinish, onNoise, onMoveMode, playerRef, respawnSignal, canCollected, canPosition, onPickCan, onThrowCan, onCheckpoint, checkpoint, onPuzzleProximity, onPanelAttempt, onPanelProgress, onPowerRestored, onVitals, pickupItems, onPickupGear, selectedType, onSelectSlot, onUseGear, onDropGear, boostSignal,rechargeSignal,onBatteryReport,cameraShake,reducedEffects }) {
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
  const bobClock=useRef(0);
  const flashlightCharge=useRef(100);
  const batteryReportClock=useRef(0);
  const tiltSmooth=useRef(0);
  const bobSmooth=useRef(0);
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
    flashlightCharge.current=100;
    batteryReportClock.current=0;
    onBatteryReport(100);
    camera.rotation.z=0;tiltSmooth.current=0;bobSmooth.current=0;
    breathClock.current=0;vitalsClock.current=0;
    onVitals({...survival.current,breath:0,exhausted:false});
    crouchToggle.current=false;
    panelHeld.current=false;panelTime.current=0;panelUpdate.current=0;
    proximityReported.current=null;
    onPanelProgress(0);
  },[respawnSignal,camera,checkpoint,onPanelProgress,onVitals,onBatteryReport]);
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
    if(!rechargeSignal)return;
    flashlightCharge.current=rechargeFlashlight(flashlightCharge.current);
    onBatteryReport(flashlightCharge.current);
  },[rechargeSignal,onBatteryReport]);
  useEffect(()=>{
    camera.position.set(0,1.7,17);
    const down=e=>{
      if(!activeRef.current)return;
      if(e.code==='KeyC'&&!e.repeat)crouchToggle.current=!crouchToggle.current;
      if(e.code==='Space'&&!e.repeat)jumpQueued.current=true;
      if(/^Digit[123]$/.test(e.code)&&!e.repeat)onSelectSlot(Number(e.code.slice(-1))-1);
      if(e.code==='KeyE'&&!e.repeat && !canUsePanel(camera.position.x,camera.position.z,floorRef.current)){
        const look=new THREE.Vector3();
        camera.getWorldDirection(look);
        const focused=nearestLookedAtPickup(
          camera.position.toArray(),look.toArray(),groundPickupsRef.current,
          canRef.current?null:groundCanRef.current
        );
        const crouching=Boolean(keys.current.ControlLeft||keys.current.ControlRight||crouchToggle.current);
        const context={position:camera.position.toArray(),crouching};
        if(focused?.kind==='can'){
          if(onPickCan(context)){canRef.current=true;groundCanRef.current=null;}
        }else if(focused?.kind==='item'){
          onPickupGear(focused.id,context);
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
          endX=clamp(camera.position.x+flat.x*range,WALK_BOUNDS.minX,WALK_BOUNDS.maxX);
          endZ=clamp(camera.position.z+flat.z*range,WALK_BOUNDS.minZ,WALK_BOUNDS.maxZ);
          const obstacle=terrainBlocked(endX,endZ,poweredRef.current);
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
            position:camera.position.toArray(),end,
            crouching:Boolean(keys.current.ControlLeft||keys.current.ControlRight||crouchToggle.current),
            nearPanel:canUsePanel(camera.position.x,camera.position.z,floorRef.current),
            powered:poweredRef.current
          });
        }
      }
      if(e.code==='KeyQ'&&!e.repeat){
        const type=selectedTypeRef.current;
        if(type&&type!=='can'){
          const look=new THREE.Vector3();camera.getWorldDirection(look);
          const xx=clamp(camera.position.x+look.x*.8,WALK_BOUNDS.minX,WALK_BOUNDS.maxX);
          const zz=clamp(camera.position.z+look.z*.8,WALK_BOUNDS.minZ,WALK_BOUNDS.maxZ);
          onDropGear(type,[xx,.24,zz],{
            crouching:Boolean(keys.current.ControlLeft||keys.current.ControlRight||crouchToggle.current)
          });
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
    const battery=tickFlashlight(flashlightCharge.current,{
      active,enabled:torch,dt
    });
    flashlightCharge.current=battery.charge;
    batteryReportClock.current-=dt;
    if(batteryReportClock.current<=0||battery.empty&&torch){
      onBatteryReport(battery.charge);
      batteryReportClock.current=.24;
    }
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
      let nx=clamp(camera.position.x+movement.x,WALK_BOUNDS.minX,WALK_BOUNDS.maxX);
      let nz=clamp(camera.position.z+movement.z,WALK_BOUNDS.minZ,WALK_BOUNDS.maxZ);
      const blocked=(x,z)=>terrainBlocked(x,z,poweredRef.current);
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
    const focused=nearestLookedAtPickup(
      camera.position.toArray(),direction.toArray(),groundPickupsRef.current,
      canRef.current?null:groundCanRef.current
    );
    const nextProximity=nearPanel?'panel':isNearGate(camera.position.x,camera.position.z)?'gate':
      focused?.kind==='can'?'can':focused?.kind==='item'?'item:'+focused.type:null;
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
    // Visual motion derives from the same stride progress used for audible
    // footsteps, rather than a free-running random shake timer.
    const cameraOffsets=cameraMotion({
      mode,distanceIntoStep:footstep.state.meters,
      moving:movedDistance>.0001,
      grounded:vertical.current===0&&velocityY.current===0,
      intensity:cameraShake,reducedEffects
    });
    bobSmooth.current=THREE.MathUtils.damp(bobSmooth.current,cameraOffsets.rise,12,dt);
    tiltSmooth.current=THREE.MathUtils.damp(tiltSmooth.current,cameraOffsets.roll,10,dt);
    if(footstep.steps){
      const surface=surfaceAt(camera.position.x,camera.position.z);
      onNoise({type:'step',mode,surface,loudness:footstepLoudness(mode,surface),position:camera.position.toArray()});
    }
    camera.position.y=1.7-.66*crouchAlpha.current+vertical.current+bobSmooth.current;
    camera.rotation.z=tiltSmooth.current;
    playerRef.current={x:camera.position.x,z:camera.position.z,speed:movedDistance/Math.max(dt,.001),crouched:crouching};
    if(camera.position.z < -10&&!nearReported.current){nearReported.current=true;onNear();}
    if(camera.position.z < -10 && direction.z>0.45&&!turnedOnce.current){turnedOnce.current=true;onTurn();}
    if(canEnterNextArea(camera.position.x,camera.position.z,floorRef.current,poweredRef.current))onFinish();
  });
  return null;
});
function World({ active, torch, onNear, onTurn, altered, powered, floor, floorSignal, onFinish, onNoise, onMoveMode, playerRef, noiseEvents, onCaught, respawnSignal, onCreatureState, onSpatial, canCollected, canPosition, onPickCan, onThrowCan, onCheckpoint, checkpoint, projectile, onProjectileImpact, onPuzzleProximity, onPanelAttempt, onPanelProgress, onPowerRestored, deathPhase, onDeathComplete, onHorrorCue, onVitals, pickupItems, deployed, onPickupGear, onUseGear, onDropGear, selectedType, onSelectSlot, onGadgetExpired, onObserverState, boostSignal, alarmActive, reducedEffects, flashlightCharge, onBatteryReport, cameraShake, rechargeSignal }) {
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
    <fog attach="fog" args={[alarmActive?'#2a0f18':floor===2?'#1b1018':'#101719',FOG_NEAR,FOG_FAR]}/>
    <ambientLight intensity={floor===2?.245:.37} color={alarmActive?'#cf7d7d':floor===2?'#ae8e98':'#9cadad'}/>
    <GarageWorld altered={altered} flicker={flicker} canPosition={canPosition}/>
    <EmergencyAlarm active={alarmActive} floor={floor} reducedEffects={reducedEffects}/>
    {floor===2&&<DistortedB2 onEvent={onHorrorCue}/>}
    <EscapePuzzle key={floor} powered={powered} floor={floor}/>
    <Flashlight enabled={torch} charge={flashlightCharge} reducedEffects={reducedEffects}/>
    {floor===2&&<Observer key={floorSignal+'-'+respawnSignal} active={active} floor={floor} playerRef={playerRef} powered={powered} onCaught={onCaught} onState={onObserverState}/>}
    <ItemsWorld pickups={pickupItems} deployed={deployed} active={active} onNoise={onNoise} onExpire={onGadgetExpired}/>
    <Listener active={active} events={noiseEvents} playerRef={playerRef} onCaught={onCaught} onState={onCreatureState} onSpatial={onSpatial} powered={powered} floor={floor} levelSignal={floorSignal} deathPhase={deathPhase}/>
    <ThrownCan projectile={projectile} active={active} onImpact={onProjectileImpact}/>
    <Player active={active} torch={torch} onNear={onNear} onTurn={onTurn} altered={altered} powered={powered} floor={floor} floorSignal={floorSignal} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode} playerRef={playerRef} respawnSignal={respawnSignal} checkpoint={checkpoint} canCollected={canCollected} canPosition={canPosition} onPickCan={onPickCan} onThrowCan={onThrowCan} onCheckpoint={onCheckpoint} onPuzzleProximity={onPuzzleProximity} onPanelAttempt={onPanelAttempt} onPanelProgress={onPanelProgress} onPowerRestored={onPowerRestored} onVitals={onVitals} pickupItems={pickupItems} onPickupGear={onPickupGear} selectedType={selectedType} onSelectSlot={onSelectSlot} onUseGear={onUseGear} onDropGear={onDropGear} boostSignal={boostSignal} rechargeSignal={rechargeSignal} onBatteryReport={onBatteryReport} cameraShake={cameraShake} reducedEffects={reducedEffects}/>
    <DeathCamera phase={deathPhase} onComplete={onDeathComplete}/>
    <PointerLockControls makeDefault onLock={()=>{}} onUnlock={()=>{}} />
  </>;
}
export default function App(){
  const [started,setStarted]=useState(false);
  const [locked,setLocked]=useState(false);
  const [torch,setTorch]=useState(true);
  const torchRef=useRef(true);
  torchRef.current=torch;
  const [flashlightCharge,setFlashlightCharge]=useState(100);
  const flashlightChargeRef=useRef(100);
  const onBatteryReport=useCallback(value=>{
    const next=clampCharge(value);
    flashlightChargeRef.current=next;
    setFlashlightCharge(old=>Math.ceil(old)===Math.ceil(next)?old:next);
    if(next<=0)setTorch(false);
  },[]);
  const [cameraShake,setCameraShake]=useState(.45);
  const [near,setNear]=useState(false);
  const [altered,setAltered]=useState(false);
  const [ending,setEnding]=useState(false);
  const [audioOn,setAudioOn]=useState(true);
  const [sirenVolume,setSirenVolume]=useState(DEFAULT_SIREN_VOLUME);
  const [moveMode,setMoveMode]=useState('idle');
  const [airborne,setAirborne]=useState(false);
  const [vitals,setVitals]=useState({stamina:100,breath:0,exhausted:false});
  const [reducedEffects,setReducedEffects]=useState(false);
  const [showControls,setShowControls]=useState(false);
  const [alarmActive,setAlarmActive]=useState(false);
  const alarmFiredRef=useRef(false);
  useEffect(()=>{
    if(!alarmActive)return;
    const id=setTimeout(()=>setAlarmActive(false),SIREN_SECONDS*1000);
    return ()=>clearTimeout(id);
  },[alarmActive]);
  const [latestNoise,setLatestNoise]=useState(null);
  const [canCollected,setCanCollected]=useState(false);
  const canHeldRef=useRef(false);
  canHeldRef.current=canCollected;
  const [gear,setGear]=useState([]);
  const gearRef=useRef([]);
  gearRef.current=gear;
  const [pickupItems,setPickupItems]=useState(()=>startingPickups(1));
  const pickupItemsRef=useRef(pickupItems);
  pickupItemsRef.current=pickupItems;
  const [deployed,setDeployed]=useState([]);
  const gadgetId=useRef(0);
  const [selectedSlot,setSelectedSlot]=useState(0);
  const bag=slots(canCollected,gear);
  const selectedIndex=Math.min(selectedSlot,Math.max(0,bag.length-1));
  const selectedType=bag[selectedIndex]||null;
  const [boostSignal,setBoostSignal]=useState(0);
  const [rechargeSignal,setRechargeSignal]=useState(0);
  const [silentFloor,setSilentFloor]=useState(0);
  const silentRef=useRef(0);
  silentRef.current=silentFloor;
  const [itemNotice,setItemNotice]=useState(null);
  const notify=useCallback(text=>setItemNotice({text,id:Date.now()}),[]);
  useEffect(()=>{
    if(!itemNotice)return;
    const timer=setTimeout(()=>setItemNotice(old=>old?.id===itemNotice.id?null:old),2100);
    return ()=>clearTimeout(timer);
  },[itemNotice]);
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
  const emitItemNoise=useCallback((item,action,position,crouching=false)=>{
    onNoiseRef.current?.({
      type:'item',item,action,position,
      crouching,loudness:itemActionNoise(item,action,{crouching})
    });
  },[]);
  const onPickCan=useCallback(({position=[0,1.7,17],crouching=false}={})=>{
    if(!canAddToInventory(canHeldRef.current,gearRef.current)){
      notify('가방이 꽉 찼다 · Q로 장비를 내려놓자');
      return false;
    }
    canHeldRef.current=true;
    setCanCollected(true);
    setCanPosition(null);
    setSelectedSlot(0);
    emitItemNoise('can','pickup',position,crouching);
    notify('빈 캔 확보 · [1] 선택 후 G로 던지기');
    return true;
  },[notify,emitItemNoise]);
  const onPickupGear=useCallback((id,{position=[0,1.7,17],crouching=false}={})=>{
    const item=pickupItemsRef.current.find(it=>it.id===id);
    if(!item)return false;
    if(!canAddToInventory(canHeldRef.current,gearRef.current)){
      notify('가방이 꽉 찼다 · Q로 장비를 내려놓자');
      return false;
    }
    const next=[...gearRef.current,item.type];
    gearRef.current=next;
    setGear(next);
    const remaining=pickupItemsRef.current.filter(it=>it.id!==id);
    pickupItemsRef.current=remaining;
    setPickupItems(remaining);
    setSelectedSlot(Math.min(2,slots(canHeldRef.current,next).length-1));
    emitItemNoise(item.type,'pickup',position,crouching);
    notify(ITEM_TYPES[item.type].label+' 획득');
    return true;
  },[notify,emitItemNoise]);
  const onSelectSlot=useCallback(index=>{
    const available=slots(canHeldRef.current,gearRef.current);
    if(available[index])setSelectedSlot(index);
  },[]);
  const onDropGear=useCallback((type,position,{crouching=false}={})=>{
    const index=gearRef.current.indexOf(type);
    if(index<0)return false;
    const updated=gearRef.current.filter((_,i)=>i!==index);
    gearRef.current=updated;setGear(updated);
    const drop={id:'drop-'+(++gadgetId.current),type,position};
    const world=[...pickupItemsRef.current,drop];
    pickupItemsRef.current=world;
    setPickupItems(world);
    setSelectedSlot(0);
    emitItemNoise(type,'drop',position,crouching);
    notify(ITEM_TYPES[type].label+' 내려놓음 · 주변 소음 주의');
    return true;
  },[notify,emitItemNoise]);
  const onUseGear=useCallback((type,{position,end,nearPanel,powered:alreadyPowered,crouching=false})=>{
    const index=gearRef.current.indexOf(type);
    if(index<0)return false;
    const effect=itemEffect(type,nearPanel);
    if(effect==='requires-panel'||(effect==='attenuate'&&alreadyPowered)){
      notify('윤활 스프레이는 잠긴 배전반 앞에서만 사용 가능');
      return false;
    }
    if(effect==='recharge'&&flashlightChargeRef.current>=100){
      notify('배터리가 이미 가득 차 있다 · 나중에 사용하자');
      return false;
    }
    const updated=gearRef.current.filter((_,i)=>i!==index);
    gearRef.current=updated;
    setGear(updated);
    setSelectedSlot(0);
    emitItemNoise(type,'use',position,crouching);
    if(effect==='attenuate'){
      silentRef.current=floorRef.current;
      setSilentFloor(floorRef.current);
      notify('윤활 완료 · 기계음 감소 · 비상 사이렌은 그대로 작동!');
    }else if(effect==='boost'){
      setBoostSignal(v=>v+1);
      notify('스태미나 +48 · 5초 동안 질주 강화 · 개봉 소음 발생');
    }else if(effect==='recharge'){
      // The Player owns precise charge; rechargeSignal applies it once.
      setRechargeSignal(v=>v+1);
      notify('예비 건전지 교체 · 손전등 +45% · 교체음 발생');
    }else if(effect==='deploy'){
      setDeployed(old=>[...old,{id:'gadget-'+(++gadgetId.current),type,position:end}]);
      notify(type==='alarm'?'4초 후 알람 작동 · 8초간 유인':
        type==='radio'?'무전기 잡음 유인 · 약 9초': '야광봉 설치 · 50초간 유지');
    }
    return true;
  },[notify,emitItemNoise]);
  const onGadgetExpired=useCallback(id=>setDeployed(old=>old.filter(g=>g.id!==id)),[]);
  const onCheckpoint=useCallback(()=>setCheckpoint(true),[]);
  const onPanelProgress=useCallback(value=>setPanelProgress(value),[]);
  const onPuzzleProximity=useCallback(value=>setPuzzleProximity(old=>old===value?old:value),[]);
  const onPanelAttempt=useCallback(()=>{
    const lubricated=silentRef.current===floorRef.current;
    const position=sirenPosition(floorRef.current);
    // EVERY attempt still moves metal; lube only reduces the impact and friction.
    onNoiseRef.current?.({
      type:'switch',position,lubricated,
      loudness:mechanicalNoise(86,lubricated)
    });
    if(!canTriggerSiren({alreadyTriggered:alarmFiredRef.current}))return;
    alarmFiredRef.current=true;
    setAlarmActive(true);
    soundRef.current?.startSiren?.(position,SIREN_SECONDS);
    // The alarm circuit is electronic: even lubricated panels summon the
    // Listener. A future *separate* wiring puzzle may disable this.
    onNoiseRef.current?.({type:'siren',loudness:SIREN_LOUDNESS,position});
  },[]);
  const onPowerRestored=useCallback(()=>{
    const position=panelPosition(floorRef.current);
    if(floorRef.current===2)setEchoRestored(true);
    else setPowered(true);
    const lubricated=silentRef.current===floorRef.current;
    onNoiseRef.current?.({
      type:'power',lubricated,
      loudness:mechanicalNoise(92,lubricated),
      position:[position[0],1.5,position[1]]
    });
  },[]);
  const onThrowCan=useCallback(({start,end})=>{
    emitItemNoise('can','use',start,false);
    canHeldRef.current=false;
    setCanCollected(false);
    setCanPosition(null);
    setProjectile({id:++projectileId.current,start,end});
  },[emitItemNoise]);
  const onProjectileImpact=useCallback(end=>{
    setCanPosition(end);
    setProjectile(null);
    onNoiseRef.current?.({type:'throw',loudness:100,position:end});
  },[]);
  const soundRef=useRef(null);
  const onHorrorCue=useCallback(type=>{
    soundRef.current?.horrorCue?.(type);
  },[]);
  const onClockAnomaly=useCallback(()=>{
    // A player-only uncanny hint, not a noise event: the Listener cannot hear time reverse.
    soundRef.current?.horrorCue?.('clock');
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
  const [observerInfo,setObserverInfo]=useState({mode:'scan',alert:0,distance:Infinity});
  const observerModeRef=useRef('scan');
  const observerDistanceRef=useRef(Infinity);
  const onObserverState=useCallback((mode,alert,distance)=>{
    observerDistanceRef.current=distance;
    if(observerModeRef.current!==mode){
      if(mode==='chase')soundRef.current?.observerAlert?.();
      observerModeRef.current=mode;
    }
    setObserverInfo(old=>old.mode===mode&&old.alert===alert&&old.distance===distance?old:{mode,alert,distance});
  },[]);
  const creatureDistanceRef=useRef(Infinity);
  const onVitals=useCallback(next=>{
    const data={stamina:Math.max(0,Math.min(100,Math.round(next.stamina??100))),
      breath:next.breath||0,exhausted:Boolean(next.exhausted)};
    setVitals(previous=>previous.stamina===data.stamina&&previous.breath===data.breath&&previous.exhausted===data.exhausted
      ?previous:data);
    soundRef.current?.updateVitals?.({
      active:true,breathLevel:data.breath,creatureDistance:Math.min(creatureDistanceRef.current,observerDistanceRef.current)
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
    soundRef.current?.stopSiren?.();
    setAlarmActive(false);
    soundRef.current?.death?.();
    setCaught(true);
    setDeathPhase('dying');
    document.exitPointerLock?.();
  },[]);
  const respawn=useCallback(()=>{
    noiseLog.current=[];
    alarmFiredRef.current=false;
    setAlarmActive(false);
    soundRef.current?.stopSiren?.();
    deathPhaseRef.current='alive';
    setDeathPhase('alive');
    setRespawnSignal(n=>n+1);
    setTorch(true);
    torchRef.current=true;
    setCaught(false);
    setAirborne(false);
    setMoveMode('idle');
    setCreatureInfo({mode:'idle',excitement:0,speed:0,distance:Infinity});
    setObserverInfo({mode:'scan',alert:0,distance:Infinity});
    observerModeRef.current='scan';
    observerDistanceRef.current=Infinity;
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
    if(['step','jump','land','throw','switch','power','breath','decoy','gear','siren','item','flashlight'].includes(event.type))setLatestNoise(emitted);
    if(event.type==='jump')setAirborne(true);
    if(event.type==='land')setAirborne(false);
    const sound=soundRef.current;
    if(!sound)return;
    if(event.type==='step'){sound.step(event.mode);if(event.surface==='metal')sound.metal();if(event.surface==='water')sound.splash();}
    if(event.type==='jump')sound.jump();
    if(event.type==='throw')sound.throwCan();
    if(event.type==='land')sound.land();
    if(event.type==='electric')sound.flicker();
    if(event.type==='switch')sound.switchStart(Boolean(event.lubricated));
    if(event.type==='power')sound.powerRestore(Boolean(event.lubricated));
    if(event.type==='decoy')sound.devicePulse?.(event.device,event.position);
    if(event.type==='gear')sound.gearClick?.(event.device);
    if(event.type==='item')sound.itemAction?.(event.item,event.action);
    if(event.type==='flashlight')sound.flashlightClick?.(event.enabled);
  },[]);
  onNoiseRef.current=onNoise;
  const onFinish=useCallback(()=>{
    if(floorRef.current===1){
      floorRef.current=2; // Guard against repeated transitions during the same frame.
      soundRef.current?.updateCreature?.({active:false});
      soundRef.current?.updateVitals?.({active:false});
      soundRef.current?.stopSiren?.();
      setAlarmActive(false);
      alarmFiredRef.current=false;
      soundRef.current?.loopTransition?.();
      noiseLog.current=[];
      const nextItems=startingPickups(2);
      pickupItemsRef.current=nextItems;
      setPickupItems(nextItems);
      setDeployed([]);
      setSelectedSlot(0);
      silentRef.current=0;
      setSilentFloor(0);
      setObserverInfo({mode:'scan',alert:0,distance:Infinity});
      observerModeRef.current='scan';
      observerDistanceRef.current=Infinity;
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
    soundRef.current?.stopSiren?.();
    setAlarmActive(false);
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
    const key=e=>{
      if(e.repeat)return;
      if(e.code==='KeyH')setShowControls(v=>!v);
      if(e.code!=='KeyF'||!started||!locked||caught||ending)return;
      if(!torchRef.current&&flashlightChargeRef.current<=0){
        notify('손전등 배터리 방전 · 예비 건전지를 찾아야 한다');
        return;
      }
      const next=!torchRef.current;
      torchRef.current=next;
      setTorch(next);
      // The tactile switch is audible to nearby Listener, not omniscient.
      onNoiseRef.current?.({type:'flashlight',enabled:next,
        loudness:FLASHLIGHT_CLICK_NOISE,
        position:[playerRef.current.x,1.5,playerRef.current.z]});
    };
    const lock=()=>setLocked(document.pointerLockElement!==null);
    window.addEventListener('keydown',key);document.addEventListener('pointerlockchange',lock);
    return ()=>{window.removeEventListener('keydown',key);document.removeEventListener('pointerlockchange',lock);};
  },[started,locked,caught,ending,notify]);
  useEffect(()=>()=>soundRef.current?.dispose(),[]);
  useEffect(()=>{soundRef.current?.setEnabled(audioOn);},[audioOn]);
  useEffect(()=>{soundRef.current?.setSirenVolume?.(sirenVolume);},[sirenVolume]);
  const begin=()=>{
    setStarted(true);
    if(!soundRef.current)soundRef.current=createSoundEngine();
    soundRef.current?.setEnabled(audioOn);
    soundRef.current?.setSirenVolume?.(sirenVolume);
    soundRef.current?.resume();
    const canvas=document.querySelector('canvas');
    canvas?.requestPointerLock?.();
  };
  return <>
    <Canvas shadows={false} camera={{fov:74,near:.08,far:90,position:[0,1.7,17]}} gl={{antialias:true,powerPreference:'high-performance'}}>
      <World active={started&&locked&&!ending&&!caught} torch={torch} onNear={onNear} onTurn={onTurn} altered={altered} floor={floor} floorSignal={floorSignal} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode} playerRef={playerRef} noiseEvents={noiseLog} onCaught={onCaught} respawnSignal={respawnSignal} onCreatureState={onCreatureState} onSpatial={onSpatial} checkpoint={checkpoint} powered={gatePowered} canCollected={canCollected} canPosition={canPosition} onPickCan={onPickCan} onThrowCan={onThrowCan} onCheckpoint={onCheckpoint} projectile={projectile} onProjectileImpact={onProjectileImpact} onPuzzleProximity={onPuzzleProximity} onPanelAttempt={onPanelAttempt} onPanelProgress={onPanelProgress} onPowerRestored={onPowerRestored} deathPhase={deathPhase} onDeathComplete={onDeathComplete} onHorrorCue={onHorrorCue} onVitals={onVitals}
      pickupItems={pickupItems} deployed={deployed} onPickupGear={onPickupGear} onUseGear={onUseGear} onDropGear={onDropGear}
      selectedType={selectedType} onSelectSlot={onSelectSlot} onGadgetExpired={onGadgetExpired}
      onObserverState={onObserverState} boostSignal={boostSignal} alarmActive={alarmActive} reducedEffects={reducedEffects} flashlightCharge={flashlightCharge} onBatteryReport={onBatteryReport} cameraShake={cameraShake} rechargeSignal={rechargeSignal}/>
    </Canvas>
    <div className={"vignette "+(reducedEffects?"vignette--reduced":"")}/>
    {floorFlash&&<div className={'floor-loop-flash '+(reducedEffects?'floor-loop-flash--reduced':'')} aria-live="polite">
      <span>STAIR B2</span><strong>YOU ARE STILL HERE</strong><small>03:17 — AGAIN</small>
    </div>}
    {deathPhase!=='alive'&&<div className={'death-fx death-fx--'+deathPhase+(reducedEffects?' death-fx--reduced':'')} aria-hidden="true">
      <div className="death-fx__blood"/>
      <div className="death-fx__blackout"/>
    </div>}
    {alarmActive&&<div className={'emergency-dread'+(reducedEffects?' emergency-dread--reduced':'')} aria-hidden="true">
      <div className="emergency-dread__blackout"/>
      <div className="emergency-dread__red"/>
    </div>}
    {alarmActive&&<div className="siren-indicator" role="status" aria-live="polite">
      <strong>EMERGENCY PROTOCOL · B2</strong>
      <span>위이이잉— · 전자 사이렌 가동 · 청음자가 배전반으로 돌진</span>
      <small>비상 방송 신호 왜곡 · 즉시 이동 또는 은폐</small>
    </div>}
    <div className="hud hud--v092">
      <header className="game-header">
        <div className="game-header__brand">B<span>∞</span> <small>THE ENDLESS PARKING GARAGE</small></div>
        <div className="game-header__location">B2 <span>/</span> {floor===2?'LOOP 02':'LOOP 01'} <GameClock floor={floor} active={started&&locked&&!ending&&!caught} reducedEffects={reducedEffects} onAnomaly={onClockAnomaly}/></div>
      </header>
      <div className="reticle" aria-hidden="true"/>
      <section className="mission-card" aria-label="현재 탈출 목표">
        <div className="mission-card__index">OBJECTIVE {floor===2?'02':'01'} <span>· {floor===2?'BROADCAST':'EMERGENCY EXIT'}</span></div>
        <div className="mission-card__text">{objectiveText(gatePowered,floor)}</div>
        {floor===2&&<div className="mission-card__rule">귀 달린 놈 = 소리 · 관조자 = 움직임</div>}
      </section>
      {started&&<SurvivalHUD latestNoise={latestNoise} moveMode={moveMode} airborne={airborne} vitals={vitals} creature={creatureInfo} observer={observerInfo} secondFloor={floor===2} reducedEffects={reducedEffects} active={started&&locked&&!ending&&!caught}/>}
      <div className="danger-vignette" aria-hidden="true" style={{opacity:started&&!ending&&!reducedEffects?Math.max(observerInfo.mode==='chase'?.44:0,Math.max(0,Math.min(.57,(14-creatureInfo.distance)/20))):0}}/>
      {started&&locked&&puzzleProximity==='panel'&&!gatePowered&&
        <div className="interaction-callout" role="status">
          <strong><kbd>E</kbd> 누르고 있기 · {floor===2?'비상방송 재동기화':'배전반 재시동'}</strong>
          <span>{silentFloor===floor?'윤활 완료 · 금속음 감소, 사이렌은 작동!':'작동 시 붉은 비상등 · 청음자 긴급 추적'}</span>
          <div className="interaction-callout__progress" role="progressbar" aria-label="장치 재시동 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(panelProgress*100)}>
            <div style={{width:(panelProgress*100)+'%'}}/>
          </div>
        </div>}
      {started&&locked&&puzzleProximity==='gate'&&
        <div className={'interaction-callout '+(gatePowered?'interaction-callout--ready':'')} role="status">
          <strong>{gatePowered?'비상문 개방 · 통로로 이동':'비상문 잠김 · 전원 복구 필요'}</strong>
          {!gatePowered&&<span>{floor===2?'오른쪽 벽의 비상방송 제어반을 찾아라':'왼쪽 벽의 비상 배전반을 찾아라'}</span>}
        </div>}
      {started&&locked&&puzzleProximity==='can'&&<div className="interaction-callout" role="status">
        <strong><kbd>E</kbd> 빈 캔 줍기</strong><span>회수한 캔은 다시 던질 수 있다</span>
      </div>}
      {started&&locked&&puzzleProximity?.startsWith('item:')&&<div className="interaction-callout" role="status">
        <strong><kbd>E</kbd> {ITEM_TYPES[puzzleProximity.slice(5)]?.label} 줍기</strong>
        <span>보유 {bag.length}/3 · 가득 차면 Q로 내려놓기</span>
      </div>}
      {itemNotice&&<div className="item-toast" role="status">{itemNotice.text}</div>}
      <div className="equipment-strip equipment-strip--v010">
        <div className="inventory-quickbar" role="group" aria-label="장비 3칸">
          {[0,1,2].map(index=>{
            const type=bag[index];
            return <div key={index}
              className={'inventory-slot'+(type&&index===selectedIndex?' is-selected':'')+(!type?' is-empty':'')}
              title={type?ITEM_TYPES[type].description:'빈 인벤토리 슬롯'}
              aria-label={`${index+1}번 슬롯 · ${type?ITEM_TYPES[type].label:'비어 있음'}${type&&index===selectedIndex?' · 현재 선택':''}`}>
              <kbd>{index+1}</kbd>
              <span>{type?ITEM_TYPES[type].label:'비어 있음'}</span>
              <small>{type?ITEM_TYPES[type].key:'EMPTY'}</small>
            </div>;
          })}
        </div>
        <div className="inventory-guide">
          {inventoryControls(selectedType).use&&<span><kbd>G</kbd> {selectedType==='can'?'캔 던지기':'장비 사용'}</span>}
          {inventoryControls(selectedType).drop&&<span><kbd>Q</kbd> 장비 내려놓기</span>}
          <span className={'flashlight-status'+(flashlightCharge<=18?' is-low':'')}>
            <kbd>F</kbd> 손전등 {torch?'ON':'OFF'}
            <strong>{Math.ceil(flashlightCharge)}%</strong>
            <i className="flashlight-status__track" aria-hidden="true">
              <i style={{width:Math.ceil(flashlightCharge)+'%'}}/>
            </i>
          </span>
          {checkpoint&&<span className="equipment-strip__checkpoint">SAVE ✓</span>}
        </div>
      </div>
      <div className="helper-bar" aria-label="키보드 도움말">
        <span>{observerInfo.mode==='chase'&&floor===2?'관조자 포착! 움직임을 멈추고 시야를 끊어라':
          vitals.exhausted?'숨이 차 달릴 수 없다':
          vitals.breath>=14?'쉿… 숨소리가 새어 나온다':
          creatureInfo.mode==='listen'?'청음자가 듣고 있다':
          floor===2?'소리와 움직임을 모두 조심하라':'작은 소리도 위험하다'}</span>
        <span><kbd>H</kbd> {showControls?'조작법 닫기':'조작법'}</span>
      </div>
      {showControls&&<div className="controls-sheet">
        <strong>CONTROLS · H로 닫기</strong>
        <span>WASD 이동 · SHIFT 질주(스태미나 소모) · Ctrl/C 은신</span>
        <span>F 손전등 딸깍 · 배터리 7분 · 예비 건전지 선택 후 G 충전</span>
        <span>SPACE 점프 · E 줍기/장치 조작 · 1/2/3 장비 선택</span>
        <span>G 장비 사용·던지기 · Q 장비 내려놓기</span>
        <span>F 손전등 · ESC 일시정지 · H 조작법</span>
        {floor===2&&<span>청음자: 소리 감지 · 관조자: 움직임 감지</span>}
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
        <label className="camera-shake-control" htmlFor="camera-shake">
          <span>달리기 카메라 흔들림 · {Math.round(cameraShake*100)}%</span>
          <input id="camera-shake" type="range" min="0" max="100" step="5"
            value={Math.round(cameraShake*100)}
            onChange={e=>setCameraShake(Number(e.target.value)/100)}
            aria-label="달리기 화면 흔들림 강도"/>
        </label>
        <label className="siren-volume-control" htmlFor="siren-volume">
          <span>비상 사이렌 음량 · {Math.round(sirenVolume*100)}%</span>
          <input id="siren-volume" type="range" min="0" max="100" step="5"
            value={Math.round(sirenVolume*100)}
            onChange={e=>setSirenVolume(Number(e.target.value)/100)}
            aria-label="사이렌 음량"/>
        </label>
        <p>처음은 낮은 음량으로 테스트 권장 · 헤드폰 사용자 주의 · ESC 일시정지</p>
      </div>}
      {ending&&<p className="red">PROTOTYPE 0.11.2 — TO BE CONTINUED</p>}
    </section></div>}
  </>;
}
