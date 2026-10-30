import React, { useEffect, useState } from 'react';
import { noiseSeverity, staminaSeverity, observerCue } from './uiRules.js';

const ACTIONS={idle:'정지','crouch-idle':'몸 낮춤',crouch:'은신 이동',walk:'걷기',sprint:'질주',jump:'공중'};
const MESSAGES={
  jump:'점프 소음 발생',land:'착지 충격! 크게 들린다',throw:'캔 충돌 · 유인 소음',
  switch:'배전반 작동 · 큰 소음',power:'전력 복구 · 경보음',breath:'거친 숨소리 · 가까이서 감지 위험',decoy:'유인 장치 작동 · 청음자가 듣는다',gear:'장비 사용 · 소음 발생'
};

export default React.memo(function SurvivalHUD({latestNoise,moveMode,airborne,vitals,creature,observer,secondFloor=false,reducedEffects=false,active=true}){
  const [displayNoise,setDisplayNoise]=useState(0);
  const [notice,setNotice]=useState(null);
  useEffect(()=>{
    if(!latestNoise)return;
    setDisplayNoise(Math.max(0,Math.min(100,Math.round(latestNoise.loudness||0))));
    if(MESSAGES[latestNoise.type]){
      setNotice({id:latestNoise.id,label:MESSAGES[latestNoise.type]});
    }
  },[latestNoise]);
  useEffect(()=>{
    if(!active)return;
    const id=setInterval(()=>setDisplayNoise(value=>Math.max(0,value-6)),95);
    return ()=>clearInterval(id);
  },[active]);
  useEffect(()=>{
    if(!notice)return;
    const id=setTimeout(()=>setNotice(previous=>previous?.id===notice.id?null:previous),1700);
    return ()=>clearTimeout(id);
  },[notice]);
  const stamina=Math.max(0,Math.min(100,Math.round(vitals?.stamina??100)));
  const low=staminaSeverity(stamina)==='low';
  const exhausted=Boolean(vitals?.exhausted);
  const breath=Number(vitals?.breath||0);
  const severity=noiseSeverity(displayNoise);
  const movement=airborne?'점프 중':ACTIONS[moveMode]||'정지';
  const listenerMode=creature?.mode||'idle';
  const danger=listenerMode==='investigate'?'놈이 소리를 따라 움직인다':
    listenerMode==='listen'?'놈이 움직임을 멈췄다':
    listenerMode==='search'?'주변을 수색 중이다':null;
  return <aside className={'survival-panel'+(reducedEffects?' survival-panel--reduced':'')} aria-label="생존 상태 및 소음 정보">
    <div className="survival-panel__title">SURVIVAL SIGNAL <span>REC ●</span></div>
    <section className={'survival-panel__gauge survival-panel__gauge--stamina '+(low?'is-low':'')} aria-label="스태미나">
      <div className="survival-panel__caption"><span>STAMINA</span><strong>{stamina}<small>%</small></strong></div>
      <div className="survival-panel__track" role="progressbar" aria-label="스태미나" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stamina}>
        <div style={{width:stamina+'%'}}/>
      </div>
      <div className="survival-panel__micro">
        {exhausted?'탈진 · 달리기 잠시 불가':low?'호흡 불안정 · 쉬어야 한다':breath>0?'호흡이 조금 가빠졌다':'호흡 안정'}
      </div>
    </section>
    <section className={'survival-panel__gauge survival-panel__gauge--noise noise-'+severity} aria-label="최근 소음">
      <div className="survival-panel__caption"><span>NOISE</span><strong>{displayNoise}<small>/100</small></strong></div>
      <div className="survival-panel__track" role="progressbar" aria-label="최근 소음 강도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayNoise}>
        <div style={{width:displayNoise+'%'}}/>
      </div>
      <div className="survival-panel__micro">{movement} · {breath>=14?'거친 숨소리 위험':severity==='danger'?'큰 소음 발생':severity==='warning'?'소음 주의':'저소음 유지'}</div>
    </section>
    {secondFloor&&<div className={'survival-panel__observer'+(observer?.mode==='chase'?' is-danger':'')}>
      관조자 · {observerCue(observer?.mode,observer?.distance)}
    </div>}
    <div className={'survival-panel__notice '+(notice?'is-visible':'')} aria-live="polite">
      {notice?notice.label:danger||'소리를 죽여라'}
    </div>
  </aside>;
});
