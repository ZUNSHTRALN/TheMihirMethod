import * as T from './vendor/three.module.js';
import {buildScene,environmentTexture,R,UP} from './scene.js';
import {createPostFX} from './postfx.js';
import {planFlight,sampleFlight,ease} from './flight.js';
import {createLighting} from './lighting.js';

export function createWorld(canvas,{onArrival=()=>{},onSelect=()=>{},onFrame=()=>{},onError=()=>{},lighting='night'}={}){
 const mobile=innerWidth<700;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setClearColor('#030605',0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.NoToneMapping;
 const model=buildScene({detail:mobile?'low':'high'}),{scene,globe,rocket,stops,clouds,trail,key}=model;
 if(mobile)key.shadow.mapSize.set(1024,1024);
 const camera=new T.PerspectiveCamera(35,1,.05,80);
 const env=environmentTexture(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(env).texture;env.dispose();pmrem.dispose();
 const applyLighting=createLighting(model),post=createPostFX(renderer);
 let daylight=lighting==='day'?1:0,lightFrom=daylight,lightTarget=daylight,lightStarted=0;applyLighting(daylight);
 let width=1,height=1,baseDistance=15,zoom=1,dpr=1.5,quality='auto',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let mode='covered',active=null,parked=-1,time=0,last=0,lastRender=0,lastInteraction=0,hold=false,rx=.04,ry=-.14,targetX=.04,targetY=-.14,panelOffset=0,targetOffset=0;
 let onOrbit=()=>{};const orbitCamera=new T.Vector3(),cameraTarget=new T.Vector3(),currentLook=new T.Vector3();
 const trailPoints=[],raycaster=new T.Raycaster(),parkedQuaternion=new T.Quaternion();let avgDelta=16,frames=0,lastPhase='idle';
 function resize(){width=innerWidth;height=innerHeight;camera.aspect=width/height;baseDistance=Math.max(15,4.55/(Math.tan(35*Math.PI/360)*camera.aspect));orbitCamera.set(0,baseDistance*.19,baseDistance).multiplyScalar(zoom);dpr=Math.min(devicePixelRatio,quality==='low'?1:quality==='high'?2:mobile?1.35:1.65);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);post.resize(Math.round(width*dpr),Math.round(height*dpr));camera.updateProjectionMatrix();if(mode==='covered'){camera.position.copy(orbitCamera);camera.lookAt(0,0,0)}}
 resize();addEventListener('resize',resize);
 function destinationView(index){const s=stops[index];globe.updateMatrixWorld(true);const k=width<700?1.18:1;return{position:s.group.localToWorld(new T.Vector3(1.9*k,1.65*k,3.2*k)),look:s.group.localToWorld(new T.Vector3(0,.4,.4)),up:UP.clone().applyQuaternion(s.group.getWorldQuaternion(new T.Quaternion()))}}
 function engine(power){rocket.userData.flame.visible=power>.01;rocket.userData.flame.scale.set(.7+power*.3,Math.max(.01,power*(.94+.06*Math.sin(time*35))),.7+power*.3);rocket.userData.engineLight.intensity=power*1.3;}
 function parkedPose(index){const s=stops[index];rocket.position.copy(s.group.localToWorld(s.landing.clone()));rocket.quaternion.copy(s.group.getWorldQuaternion(new T.Quaternion())).multiply(parkedQuaternion);engine(0)}
 function fly(index){
  if(active||!stops[index])return false;
  globe.updateMatrixWorld(true);const s=stops[index],end=s.group.localToWorld(s.landing.clone()),up=UP.clone().applyQuaternion(s.group.getWorldQuaternion(new T.Quaternion()));
  const route=planFlight(rocket.position,end,up,rocket.quaternion);mode='flight';targetOffset=0;
  active={index,route,started:performance.now(),duration:reduced?1:route.duration,startCamera:camera.position.clone(),startLook:currentLook.clone(),startUp:camera.up.clone()};
  trailPoints.length=0;trail.geometry.setDrawRange(0,0);trail.material.opacity=.65;lastInteraction=performance.now();return true;
 }
 function arrive(){if(!active)return;const index=active.index,finalPose=sampleFlight(active.route,1);parkedQuaternion.copy(stops[index].group.getWorldQuaternion(new T.Quaternion())).invert().multiply(finalPose.quaternion);parkedPose(index);active=null;parked=index;mode='landed';lastPhase='touchdown';targetOffset=1;stops.forEach(s=>s.pulse.material.opacity=0);onArrival(index)}
 function orbit(){active=null;mode='orbit';targetOffset=0;lastInteraction=performance.now();stops.forEach(s=>s.pulse.material.opacity=0);onOrbit()}
 function setQuality(q){quality=q;renderer.shadowMap.enabled=q!=='low';resize()}
 function updateRocketIdle(){
  if(parked>=0){parkedPose(parked);return}
  const a=reduced?-.8:time*.09-.8,n=new T.Vector3(Math.sin(a),.28+Math.cos(a*.6)*.06,Math.cos(a)).normalize(),heading=new T.Vector3(Math.cos(a),0,-Math.sin(a)).normalize();
  rocket.position.copy(n).multiplyScalar(R+1.4);const nose=heading.clone().addScaledVector(n,.24).normalize(),right=new T.Vector3().crossVectors(heading,n).normalize(),back=new T.Vector3().crossVectors(right,nose).normalize();rocket.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,nose,back));engine(reduced?0:.22);
 }
 function frame(now){
  requestAnimationFrame(frame);if(document.hidden){last=now;return}if(quality==='low'&&now-lastRender<30)return;
  const delta=last?now-last:16,dt=Math.min(delta/1000,.05);last=now;lastRender=now;time+=dt;avgDelta=avgDelta*.98+Math.min(delta,100)*.02;
  if(quality==='auto'&&++frames===240&&avgDelta>32)setQuality('low');
  daylight=T.MathUtils.lerp(lightFrom,lightTarget,reduced?1:ease((now-lightStarted)/2400));applyLighting(daylight);
  if(mode==='orbit'&&!reduced&&!hold&&!pointers.size&&now-lastInteraction>5000)targetY+=dt*.025;
  if(mode==='orbit'||mode==='covered'){rx+=(targetX-rx)*.12;ry+=(targetY-ry)*.12;globe.rotation.set(rx,ry,0)}globe.updateMatrixWorld(true);
  if(active){
   const f=active,t=Math.min(1,(now-f.started)/f.duration),pose=sampleFlight(f.route,t);lastPhase=pose.phase;
   rocket.position.copy(pose.position);rocket.quaternion.copy(pose.quaternion);engine(pose.thrust);
   const chase=pose.position.clone().addScaledVector(pose.heading,-2.1).addScaledVector(pose.up,1.2);
   // Keep the camera above the world throughout the trip, including far-side routes.
   if(chase.length()<R+1.5)chase.setLength(R+1.5);
   const look=pose.position.clone().addScaledVector(pose.heading,.2),enter=ease(t/.23),land=ease((t-.53)/.37),view=destinationView(f.index);
   cameraTarget.copy(f.startCamera).lerp(chase,enter).lerp(view.position,land);
   if(cameraTarget.length()<R+1.15)cameraTarget.setLength(R+1.15);
   currentLook.copy(f.startLook).lerp(look,enter).lerp(view.look,land);
   camera.position.lerp(cameraTarget,reduced?1:1-Math.exp(-dt*7));
   const up=f.startUp.clone().lerp(pose.up,enter).lerp(view.up,land).normalize();camera.up.lerp(up,1-Math.exp(-dt*7)).normalize();
   trailPoints.push(pose.position.clone());if(trailPoints.length>160)trailPoints.shift();const attr=trail.geometry.attributes.position;trailPoints.forEach((v,i)=>attr.setXYZ(i,v.x,v.y,v.z));attr.needsUpdate=true;trail.geometry.setDrawRange(0,trailPoints.length);trail.geometry.computeBoundingSphere();
   const pulse=stops[f.index].pulse;pulse.material.opacity=(.35+.25*Math.sin(time*3))*(1-.5*daylight);pulse.scale.setScalar(1+.3*((time*.55)%1));
   if(t>=1)arrive();
  }else if(mode==='landed'&&parked>=0){const view=destinationView(parked);camera.position.lerp(view.position,reduced?1:.07);currentLook.lerp(view.look,reduced?1:.07);camera.up.lerp(view.up,.09).normalize();updateRocketIdle();trail.material.opacity*=.96;
  }else{orbitCamera.set(0,baseDistance*.19,baseDistance).multiplyScalar(zoom);camera.position.lerp(orbitCamera,reduced?1:.065);currentLook.lerp(new T.Vector3(),reduced?1:.065);camera.up.lerp(UP,.09).normalize();updateRocketIdle();trail.material.opacity*=.96;}
  // Camera interpolation can cut across a sphere when returning from its far side.
  if(camera.position.length()<R+1.15)camera.position.setLength(R+1.15);
  panelOffset+=(targetOffset-panelOffset)*(reduced?1:.08);if(panelOffset>.005){if(width<700)camera.setViewOffset(width,height,0,height*.35*panelOffset,width,height);else camera.setViewOffset(width,height,Math.min(570,width-48)*.5*panelOffset,0,width,height)}else camera.clearViewOffset();
  camera.lookAt(currentLook);camera.updateMatrixWorld(true);
  clouds.forEach((c,i)=>{if(!reduced&&mode!=='facts')c.position.x+=Math.sin(time*.12+i)*dt*.018;c.material.opacity=(c.userData.baseOpacity||.25)*(active?.45:1)});
  if(quality==='low'){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setRenderTarget(null);renderer.render(scene,camera);renderer.toneMapping=T.NoToneMapping}else post.render(scene,camera);
  onFrame({camera,globe,stops,width,height,mode,quality,renderer,frameTime:avgDelta,daylight,phase:lastPhase});
 }
 const pointers=new Map();let lastX=0,lastY=0,pinchDistance=0,dragDistance=0;
 canvas.addEventListener('pointerdown',e=>{if(mode!=='orbit')return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastX=e.clientX;lastY=e.clientY;dragDistance=0;canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);zoom=T.MathUtils.clamp(zoom*pinchDistance/Math.max(d,1),.85,1.45);pinchDistance=d;dragDistance=20}else{targetY+=(e.clientX-lastX)*.005;targetX=T.MathUtils.clamp(targetX+(e.clientY-lastY)*.004,-1.1,1.1);dragDistance+=Math.abs(e.clientX-lastX)+Math.abs(e.clientY-lastY);lastX=e.clientX;lastY=e.clientY}lastInteraction=performance.now()});
 canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);lastInteraction=performance.now();if(mode!=='orbit'||dragDistance>8)return;raycaster.setFromCamera(new T.Vector2(e.clientX/width*2-1,-e.clientY/height*2+1),camera);const visible=stops.filter(s=>s.normal.clone().applyQuaternion(globe.quaternion).dot(camera.position.clone().normalize())>.15);const hits=raycaster.intersectObjects(visible.map(s=>s.group),true);if(hits.length){let o=hits[0].object;while(o&&!stops.some(s=>s.group===o))o=o.parent;const idx=stops.findIndex(s=>s.group===o);if(idx>=0)onSelect(idx)}});
 canvas.addEventListener('pointercancel',e=>pointers.delete(e.pointerId));canvas.addEventListener('wheel',e=>{if(mode!=='orbit')return;e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.0005,.85,1.45);lastInteraction=performance.now()},{passive:false});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||mode!=='orbit')return;e.preventDefault();targetY+=e.key==='ArrowLeft'?-.2:e.key==='ArrowRight'?.2:0;targetX=T.MathUtils.clamp(targetX+(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0),-1.1,1.1);lastInteraction=performance.now()});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onError('context-lost')});
 updateRocketIdle();requestAnimationFrame(frame);
 return{fly,skip:arrive,orbit,reveal(){if(mode==='covered')mode='orbit'},hold(value){hold=value;lastInteraction=performance.now()},facts(){active=null;mode='facts';targetOffset=0},reduce(v){reduced=v;if(v&&active)arrive()},setQuality,setLighting(value){lightFrom=daylight;lightTarget=value==='day'?1:0;lightStarted=performance.now()},debug(){return{mode,quality,phase:lastPhase,daylight,frameTime:Math.round(avgDelta),triangles:renderer.info.render.triangles,trees:model.treeCount,destinations:stops.length,position:rocket.position.toArray()}},set onOrbit(fn){onOrbit=fn}};
}
