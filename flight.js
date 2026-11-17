import * as T from './vendor/three.module.js';

const clamp=T.MathUtils.clamp;
export const ease=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10)};
const span=(t,a,b)=>ease((t-a)/(b-a));

// The route is continuous in position and attitude. Horizontal travel finishes
// above the pad; the final descent follows the pad's actual normal.
export function planFlight(start,end,up,startQuaternion,cruiseRadius=4.85){
  const gate=end.clone().addScaledVector(up,.76);
  const n0=start.clone().normalize(),n1=gate.clone().normalize();
  let axis=new T.Vector3().crossVectors(n0,n1);
  let angle=Math.acos(clamp(n0.dot(n1),-1,1));
  if(axis.lengthSq()<1e-8){axis.crossVectors(n0,new T.Vector3(1,.17,.3)).normalize();if(angle<.01)angle=.001;}
  else axis.normalize();
  return{start:start.clone(),end:end.clone(),up:up.clone(),gate,n0,n1,axis,angle,
    startQuaternion:startQuaternion.clone(),cruiseRadius:Math.max(cruiseRadius,start.length()+.15,gate.length()+.2),
    duration:8800+angle*900};
}

export function sampleFlight(f,t){
  t=clamp(t,0,1);
  const a=span(t,.065,.78);
  const radial=f.n0.clone().applyAxisAngle(f.axis,f.angle*a).normalize();
  let radius=T.MathUtils.lerp(f.start.length(),f.cruiseRadius,span(t,0,.23));
  radius=T.MathUtils.lerp(radius,f.gate.length(),span(t,.56,.78));
  let position=radial.clone().multiplyScalar(radius);
  if(t>=.78)position=f.gate.clone().lerp(f.end,span(t,.78,.98));
  if(t===0)position.copy(f.start);
  if(t>=.98)position.copy(f.end);
  const heading=new T.Vector3().crossVectors(f.axis,radial).normalize();
  // Pitch follows acceleration on launch, then anticipates braking. It never
  // uses a downward path tangent, so the nose cannot flip towards the ground.
  const nose=radial.clone().lerp(heading,span(t,.045,.27)).normalize();
  nose.lerp(f.up,span(t,.57,.78)).normalize();
  let right=new T.Vector3().crossVectors(heading,radial).normalize();
  right.addScaledVector(nose,-right.dot(nose)).normalize();
  const back=new T.Vector3().crossVectors(right,nose).normalize();
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,nose,back));
  if(t<.28)q.copy(f.startQuaternion).slerp(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,nose,back)),span(t,0,.28));
  const phase=t<.2?'launch':t<.57?'cruise':t<.78?'approach':t<.98?'descent':'touchdown';
  const thrust=t<.23?.45+.55*Math.sin(t/.23*Math.PI/2):t<.57?.24:t<.78?.45:t<.98?.55*(1-span(t,.92,.98)):.0;
  return{position,quaternion:q,up:radial,heading,phase,thrust,progress:t};
}
