import React, { useEffect, useMemo, useRef, useState } from 'react';
import { clockSnapshot } from './clockRules.js';

// Deliberately isolated so clock ticks do not re-render the R3F game canvas.
export default React.memo(function GameClock({floor=1,active=false,reducedEffects=false,onAnomaly}){
  const [elapsedMs,setElapsedMs]=useState(0);
  const announcedCycle=useRef(-1);
  useEffect(()=>{
    setElapsedMs(0);
    announcedCycle.current=-1;
  },[floor]);
  useEffect(()=>{
    if(!active||floor!==2)return;
    let previous=performance.now();
    const id=setInterval(()=>{
      const now=performance.now();
      const delta=Math.max(0,Math.min(700,now-previous));
      previous=now;
      setElapsedMs(ms=>ms+delta);
    },250);
    return ()=>clearInterval(id);
  },[active,floor]);
  const frame=useMemo(()=>clockSnapshot(elapsedMs/1000,floor),[elapsedMs,floor]);
  useEffect(()=>{
    if(!frame.anomaly||announcedCycle.current===frame.cycle)return;
    announcedCycle.current=frame.cycle;
    onAnomaly?.();
  },[frame.anomaly,frame.cycle,onAnomaly]);
  return <span className={'game-header__time game-clock'+
      (frame.anomaly?' game-clock--wrong':'')+
      (reducedEffects?' game-clock--reduced':'')}
    title={floor===2?'설명할 수 없는 시간이 반복된다':'주차장 시각 03:17'}
    aria-label={floor===2?'비정상적인 주차장 시계 '+frame.text:'주차장 시각 '+frame.text}>
    {frame.text}
    {frame.anomaly&&<span className="game-clock__symbol" aria-hidden="true">↶</span>}
  </span>;
});
