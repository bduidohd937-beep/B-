import React,{useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {freshFrameWindow,observeFrame,frameSummary} from './performanceMetrics.js';

// Opt-in F3 instrumentation. No React or object churn while hidden.
// One report per real second, with both mean FPS and p95/worst frame gaps.
export default React.memo(function PerformanceSampler({enabled=false,onSample}){
 const {gl}=useThree();
 const windowRef=useRef(null);
 useFrame((_,delta)=>{
   if(!enabled){
     windowRef.current=null;
     return;
   }
   if(!windowRef.current)windowRef.current=freshFrameWindow();
   const w=windowRef.current;
   if(!observeFrame(w,delta))return;
   const measured=frameSummary(w);
   onSample?.({
     ...measured,
     drawCalls:gl.info.render.calls,
     triangles:gl.info.render.triangles,
     pixelRatio:gl.getPixelRatio()
   });
   windowRef.current=freshFrameWindow();
 });
 return null;
});
