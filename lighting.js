import * as T from './vendor/three.module.js';
export function createLighting(model){
 const {scene,key,ambient,rim,fill,water,terrain,atmosphere,clouds}=model;
 const illuminated=[],surfaces=[];const dayMaterials={'17211e':'596c64','354138':'87947b','243b26':'49613d','38423b':'6f7c73'};scene.traverse(o=>{const m=o.material;if(m?.color&&!surfaces.some(a=>a.m===m)){m.userData.nightColor??=m.color.getHexString();const dayColor=dayMaterials[m.userData.nightColor];if(dayColor)surfaces.push({m,night:'#'+m.userData.nightColor,day:'#'+dayColor})}if(m?.emissiveIntensity&&!illuminated.some(a=>a.m===m)){m.userData.nightEmission??=m.emissiveIntensity;illuminated.push({m,base:m.userData.nightEmission})}});
 const starsGeo=new T.BufferGeometry(),starPositions=[];
 for(let i=0;i<240;i++){const x=Math.sin(i*127.1)*23,y=Math.sin(i*311.7)*16;starPositions.push(x,y,-12-Math.abs(Math.sin(i*74.7))*10)}
 starsGeo.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));const stars=new T.Points(starsGeo,new T.PointsMaterial({color:'#d8e9cf',size:.028,transparent:true,opacity:.58,depthWrite:false}));scene.add(stars);
 const mix=(a,b,t)=>new T.Color(a).lerp(new T.Color(b),t);
 let last=-1;
 return function apply(day){if(Math.abs(last-day)<.00001)return;last=day;
  key.color.copy(mix('#dcebd5','#fff1cf',day));key.intensity=T.MathUtils.lerp(1.65,3.7,day);
  // A moving key light makes the transition read as changing time, including shadows.
  key.position.set(T.MathUtils.lerp(-5,-6,day),T.MathUtils.lerp(7,10,day),T.MathUtils.lerp(3,7,day));
  ambient.color.copy(mix('#8aa792','#dceef3',day));ambient.groundColor.copy(mix('#080f0a','#78875b',day));ambient.intensity=T.MathUtils.lerp(.85,1.8,day);
  rim.color.copy(mix('#b6ff4d','#e4ffc5',day));rim.intensity=T.MathUtils.lerp(2.1,.8,day);
  fill.color.copy(mix('#6b8d7a','#b6dae5',day));fill.intensity=T.MathUtils.lerp(.55,.9,day);
  scene.environmentIntensity=T.MathUtils.lerp(.28,.7,day);
  water.material.color.copy(mix('#10271f','#3e8c89',day));water.material.roughness=T.MathUtils.lerp(.25,.32,day);
  terrain.material.color.copy(mix('#7e9770','#f1f9d4',day));
  atmosphere.material.uniforms.tint.value.copy(mix('#a9e468','#a8e9ff',day));
  surfaces.forEach(({m,night,day:color})=>m.color.copy(mix(night,color,day)));
  illuminated.forEach(({m,base})=>m.emissiveIntensity=base*T.MathUtils.lerp(1,.17,day));
  clouds.forEach((c,i)=>{c.material.color.copy(mix(i%3===0?'#bddc96':'#73896b',i%3===0?'#fff4de':'#e9f6f8',day));c.userData.baseOpacity=T.MathUtils.lerp(i<12?.34:.2,i<12?.65:.42,day)});
  stars.material.opacity=.55*(1-day);stars.visible=day<.99;
 };
}
