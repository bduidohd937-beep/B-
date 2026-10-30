import React, { useEffect, useState } from 'react';

const LABELS = {
  step: '발소리',
  jump: '점프 · 이륙 소음!',
  land: '착지 충격 · 큰 소음!',
  throw: '캔 충돌 · 소음 발생!',
  switch: '배전반 가동 · 전기 소음!',
  power: '전력 복구 · 큰 경보음!'
};
const SURFACES = {concrete:'콘크리트',metal:'금속판',water:'물웅덩이'};
const MOVEMENTS = {idle:'정지', 'crouch-idle':'앉아서 정지', crouch:'앉아서 이동',walk:'걷기',sprint:'달리기',jump:'점프 중'};

function severity(value) {
  if (value >= 75) return 'danger';
  if (value >= 35) return 'warning';
  return 'quiet';
}

export default function NoiseHUD({ latestNoise, moveMode, airborne, creature }) {
  const [level, setLevel] = useState(0);
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    if (!latestNoise) return;
    setLevel(Math.round(Math.min(100, Math.max(0, latestNoise.loudness || 0))));
    if (latestNoise.type === 'jump' || latestNoise.type === 'land' || latestNoise.type === 'throw' || latestNoise.type === 'switch' || latestNoise.type === 'power') {
      setAlert({ id: latestNoise.id, text: LABELS[latestNoise.type] });
    }
  }, [latestNoise]);
  useEffect(() => {
    const timer = setInterval(() => {
      setLevel(v => Math.max(0, v - 5));
    }, 80);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(current => current?.id === alert.id ? null : current), 1150);
    return () => clearTimeout(timer);
  }, [alert]);

  const status = airborne ? '점프 중' : MOVEMENTS[moveMode] || '정지';
  const power = severity(level);
  const creatureSpeed = creature?.speed || 0;
  const creatureExcitement = creature?.excitement || 0;

  return <aside className={'noise-hud noise-hud--' + power} aria-label="소음 상태">
    <div className="noise-hud__header">
      <span>NOISE MONITOR</span>
      <strong>{level}<small> / 100</small></strong>
    </div>
    <div className="noise-hud__meter"><div style={{width:level + '%'}}/></div>
    <div className="noise-hud__row"><span>현재 행동</span><strong>{status}</strong></div>
    <div className="noise-hud__row"><span>소음 위험</span><strong>{power==='danger'?'위험':power==='warning'?'주의':'낮음'}</strong></div>
    {latestNoise?.type === 'step' && !alert && <div className="noise-hud__detail">
      {SURFACES[latestNoise.surface] || '바닥'} · {moveMode === 'crouch' ? '저소음' : '발소리'}
    </div>}
    <div className={'noise-hud__alert' + (alert ? ' is-active' : '')}>
      {alert ? alert.text : airborne ? '착지할 때 큰 소음이 발생합니다' : '뛰거나 점프하면 청음자를 자극합니다'}
    </div>
    <div className="noise-hud__creature">
      <span>청음자 흥분도</span><strong>{creatureExcitement} / 100</strong>
      <div className="noise-hud__creature-meter"><div style={{width:creatureExcitement + '%'}}/></div>
      <small>추적 속도 {creatureSpeed.toFixed(1)} m/s</small>
    </div>
  </aside>;
}
