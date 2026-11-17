import * as T from './vendor/three.module.js';
import {destinations} from './content.js';
export const R=3.2,UP=new T.Vector3(0,1,0),TAU=Math.PI*2;
export const spherical=(lat,lon,r=1)=>{const a=lat*Math.PI/180,b=lon*Math.PI/180;return new T.Vector3(Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)).multiplyScalar(r)};
let seed=1717;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
function hash(x,y,z){const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n)}
function noise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),f=[x-ix,y-iy,z-iz].map(t=>t*t*(3-2*t));let n=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)n+=hash(ix+a,iy+b,iz+c)*(a?f[0]:1-f[0])*(b?f[1]:1-f[1])*(c?f[2]:1-f[2]);return n}
function fbm(v,scale=1){let n=0,amp=.5;for(let i=0;i<4;i++){n+=amp*noise(v.x*scale,v.y*scale,v.z*scale);scale*=2.03;amp*=.5}return n}
const centres=destinations.map(d=>spherical(d.lat,d.lon));
export function terrainHeight(n){let land=0,near=10;for(const c of centres){const d=n.distanceTo(c);near=Math.min(near,d);land=Math.max(land,Math.max(0,1-d/.68))}const variation=fbm(n,6),ridge=1-Math.abs(fbm(n,11)*2-1);let h=-.24+Math.pow(land,.9)*.54+(variation-.46)*.31+Math.pow(ridge,4)*.035;if(n.y>.6)h+=Math.max(0,noise(n.x*8,n.y*8,n.z*8)-.45)*1.25;if(near<.19)h=T.MathUtils.lerp(.19,h,T.MathUtils.smoothstep(near,.07,.19));return R+h}
const materials=new Map();
function mat(color,roughness=.7,metalness=0,emission=0){const key=[color,roughness,metalness,emission].join();if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness,emissive:emission?color:'#000000',emissiveIntensity:emission}));return materials.get(key)}
const carbon=mat('#17211e',.48,.55),metal=mat('#38423b',.3,.8),stone=mat('#354138',.98),glass=mat('#a6ba81',.2,.35,.38),darkGlass=mat('#78975c',.2,.4,.22),light=mat('#b6ff4d',.35,.2,2.2),pale=mat('#dfffad',.4,.1,1.5),white=mat('#d5e1c6',.45,.3),roof=mat('#243b26',.9);
const leafGeo=new T.SphereGeometry(1,12,9);{const p=leafGeo.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);v.multiplyScalar(.88+noise(v.x*3,v.y*3,v.z*3)*.23);p.setXYZ(i,v.x,v.y,v.z)}leafGeo.computeVertexNormals()}
const box=new T.BoxGeometry(1,1,1),ballGeo=new T.SphereGeometry(1,12,8),trunkGeo=new T.CylinderGeometry(.018,.028,.22,5);
function add(parent,geo,m,pos=[0,0,0],scale=[1,1,1]){const mesh=new T.Mesh(geo,m);mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function block(p,m,x,y,z,w,h,d){return add(p,box,m,[x,y,z],[w,h,d])}
function sphere(p,m,x,y,z,sx,sy=sx,sz=sx){return add(p,ballGeo,m,[x,y,z],[sx,sy,sz])}
function cyl(p,m,rt,rb,h,x=0,y=0,z=0,segments=24){return add(p,new T.CylinderGeometry(rt,rb,h,segments),m,[x,y,z])}
function tube(p,points,m,r=.01){return add(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(16,points.length*3),r,5,false),m)}
function line(p,points,m,r=.008){return tube(p,points.map(v=>new T.Vector3(...v)),m,r)}
function surface(parent,n,r){const g=new T.Group();g.position.copy(n).multiplyScalar(r);g.quaternion.setFromUnitVectors(UP,n);parent.add(g);return g}
function ring(p,m,r,y,th=.008){const a=add(p,new T.TorusGeometry(r,th,5,48),m,[0,y,0]);a.rotation.x=Math.PI/2;return a}
function curvedRoof(p,width,depth,y,slope=.18){const s=block(p,carbon,0,y,0,width,.045,depth);s.rotation.z=slope;const lip=block(p,light,0,y+.026,depth*.5,width,.008,.009);lip.rotation.z=slope;}
function circularHome(parent,x,z,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);cyl(g,carbon,.43,.45,.08,0,.02);cyl(g,darkGlass,.37,.37,.32,0,.22,0,48);cyl(g,metal,.43,.43,.045,0,.41);cyl(g,roof,.38,.38,.02,0,.44);ring(g,light,.375,.08,.006);ring(g,pale,.37,.38,.004);for(let i=0;i<16;i++){const a=i/16*TAU;block(g,metal,Math.sin(a)*.372,.23,Math.cos(a)*.372,.014,.32,.014)}for(let i=0;i<5;i++){const a=rand()*TAU;sphere(g,mat('#33472a'),Math.sin(a)*.27,.48,Math.cos(a)*.27,.06,.04,.06)}block(g,white,-.13,.12,.07,.2,.07,.12);cyl(g,pale,.055,.055,.006,.12,.18,.03,12);cyl(g,metal,.008,.008,.18,.12,.09,.03,8);return g}
function studio(parent){const g=new T.Group();parent.add(g);block(g,stone,0,-.05,0,1.2,.13,.8);block(g,carbon,0,.05,0,1.1,.08,.72);block(g,glass,0,.32,0,1.02,.48,.64);for(let i=0;i<8;i++)block(g,carbon,-.49+i*.14,.32,.33,.018,.49,.02);for(const side of [-1,1]){block(g,metal,side*.53,.32,0,.025,.57,.69);block(g,light,side*.54,.07,0,.009,.009,.7)}curvedRoof(g,1.27,.88,.64,.17);block(g,roof,0,.68,-.1,.8,.025,.46).rotation.z=.17;block(g,carbon,0,.43,-.35,1.03,.34,.04);block(g,white,-.25,.18,.1,.3,.09,.14);block(g,metal,.25,.22,.06,.22,.025,.18);block(g,pale,.23,.3,-.02,.12,.07,.012);for(let i=0;i<5;i++)block(g,carbon,.66,.03+i*.025,.22+i*.06,.28,.04,.08);line(g,[[-.55,.12,.28],[-.55,.12,.4],[.43,.12,.4],[.43,.12,.28]],metal,.008);block(g,carbon,0,.03,.35,1.25,.06,.2);block(g,light,0,.067,.45,1.2,.008,.008);return g}
function observatory(p){cyl(p,carbon,.38,.44,.1,0,.06);cyl(p,glass,.32,.32,.36,0,.28,0,48);ring(p,light,.33,.14,.007);ring(p,metal,.36,.47,.019);for(let i=0;i<18;i++){const a=i/18*TAU;block(p,metal,Math.sin(a)*.33,.3,Math.cos(a)*.33,.014,.36,.014)}const dome=add(p,new T.SphereGeometry(.35,32,16,0,TAU,0,Math.PI/2),metal,[0,.49,0]);for(const a of [-.5,0,.5]){const arc=[];for(let i=0;i<=20;i++){const t=i/20*Math.PI;arc.push(new T.Vector3(Math.cos(t)*.355,Math.sin(t)*.355+.49,0))}const ring=tube(p,arc,carbon,.009);ring.rotation.y=a}const scope=new T.Group();scope.position.set(.08,.73,.1);scope.rotation.z=-.65;p.add(scope);cyl(scope,carbon,.04,.06,.4,0,.12,0,16);cyl(scope,light,.042,.042,.012,0,.325,0);cyl(p,metal,.007,.009,.75,-.36,.65,-.18,8);sphere(p,pale,-.36,1.04,-.18,.018);}
function beacon(p){cyl(p,carbon,.055,.16,1,0,.5,0,12);for(let i=0;i<3;i++){const arm=block(p,metal,0,.5,0,.025,1.1,.025);arm.rotation.z=.12;arm.rotation.y=i*TAU/3}cyl(p,pale,.12,.12,.035,0,1.04);cyl(p,carbon,.14,.14,.04,0,1.09);sphere(p,light,0,1.13,0,.035);circularHome(p,.35,.04,.4);const mast=cyl(p,metal,.01,.01,.28,0,1.24,0,8);}
function tree(parent,hit,s,records){
 const radial=hit.point.clone().normalize(),normal=hit.normal.clone();
 const up=radial.clone().lerp(normal,.22).normalize();
 const g=new T.Group();g.position.copy(hit.point).addScaledVector(up,-.018);g.quaternion.setFromUnitVectors(UP,up);g.rotateY(rand()*TAU);parent.add(g);
 const bark=mat('#4b4a34',.95),greens=['#29452e','#365536','#46643a'];
 cyl(g,bark,.012*s,.03*s,.33*s,0,.15*s,0,7);
 // Root flare is buried into the hit triangle; the trunk remains gravity-aligned.
 cyl(g,bark,.025*s,.065*s,.07*s,0,.018*s,0,7);
 for(let j=0;j<5;j++){const a=j*2.399+rand()*.2,y=(.22+j*.047)*s,r=(.12-j*.013)*s;
  const branch=cyl(g,bark,.005*s,.009*s,.12*s,Math.sin(a)*r*.32,y-.025*s,Math.cos(a)*r*.32,5);branch.rotation.z=Math.sin(a)*.5;branch.rotation.x=Math.cos(a)*.5;
  const canopy=add(g,leafGeo,mat(greens[j%3]),[Math.sin(a)*r*.44,y+.07*s,Math.cos(a)*r*.44],[r,.13*s,r*.9]);canopy.rotation.y=a;
 }
 records.push({root:g.position.toArray(),point:hit.point.toArray(),normal:normal.toArray(),up:up.toArray()});
}
function landingPad(g){
 cyl(g,stone,.35,.38,.09,0,-.005,.93,40);cyl(g,carbon,.325,.33,.025,0,.05,.93,48);
 const ringGroup=new T.Group();ringGroup.position.z=.93;g.add(ringGroup);ring(ringGroup,light,.29,.067,.006);ring(ringGroup,metal,.21,.065,.004);
 for(let i=0;i<4;i++){const a=i*TAU/4;const m=block(g,pale,Math.sin(a)*.255,.068,.93+Math.cos(a)*.255,.045,.004,.007);m.rotation.y=a;}
 // Keep the approach corridor open from the terminal platform to the landing deck.
 block(g,carbon,0,.018,.38,.22,.05,.12);block(g,light,-.105,.047,.38,.004,.005,.12);block(g,light,.105,.047,.38,.004,.005,.12);
 // Dynamic ring is retained outside static batching for destination guidance.
 const pulse=new T.Mesh(new T.RingGeometry(.285,.3,64),new T.MeshBasicMaterial({color:'#b6ff4d',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));pulse.rotation.x=-Math.PI/2;pulse.position.set(0,.073,.93);g.add(pulse);return pulse;
}
function mergeStatic(root,exclude=[]){root.updateMatrixWorld(true);const batches=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh)return;let p=o;while(p){if(exclude.includes(p))return;p=p.parent}const key=o.material.uuid+'-'+o.castShadow+'-'+o.receiveShadow;let b=batches.get(key);if(!b){b={m:o.material,cast:o.castShadow,receive:o.receiveShadow,geos:[]};batches.set(key,b)}const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);b.geos.push(g);remove.push(o)});for(const b of batches.values()){const geo=new T.BufferGeometry();for(const attr of ['position','normal','uv','color']){if(!b.geos.every(g=>g.getAttribute(attr)))continue;const attrs=b.geos.map(g=>g.getAttribute(attr));const array=new Float32Array(attrs.reduce((n,a)=>n+a.array.length,0));let offset=0;for(const a of attrs){array.set(a.array,offset);offset+=a.array.length}geo.setAttribute(attr,new T.BufferAttribute(array,attrs[0].itemSize))}const mesh=new T.Mesh(geo,b.m);mesh.castShadow=b.cast;mesh.receiveShadow=b.receive;root.add(mesh);for(const g of b.geos)g.dispose()}for(const o of remove)o.removeFromParent()}
function rocketCraft(){
 const g=new T.Group();g.name='rocket';const hull=mat('#b6c2b6',.3,.72),trim=mat('#202e28',.25,.8);
 cyl(g,hull,.075,.095,.38,0,.10,0,32);
 const profile=[];for(let i=0;i<=16;i++){const t=i/16;profile.push(new T.Vector2(.075*Math.cos(t*Math.PI/2),.29+t*.23))}add(g,new T.LatheGeometry(profile,32),hull);
 cyl(g,trim,.097,.09,.045,0,-.095);cyl(g,metal,.045,.068,.09,0,-.16);ring(g,light,.077,.23,.004);ring(g,light,.096,-.075,.004);
 sphere(g,darkGlass,0,.24,.067,.039,.055,.022);
 for(let i=0;i<3;i++){const a=i*TAU/3,leg=new T.Group();leg.rotation.y=a;g.add(leg);
  const fin=new T.Shape();fin.moveTo(.075,.08);fin.lineTo(.17,-.14);fin.lineTo(.16,-.22);fin.lineTo(.07,-.08);fin.closePath();const mesh=add(leg,new T.ExtrudeGeometry(fin,{depth:.014,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:1,steps:1}),trim);mesh.position.z=-.007;
  line(leg,[[.085,-.08,0],[.19,-.27,0],[.22,-.27,0]],metal,.009);block(leg,carbon,.21,-.279,0,.075,.018,.045);sphere(leg,light,.167,-.15,0,.011,.017,.013);
 }
 const flame=new T.Group();flame.position.y=-.205;g.add(flame);
 const flameMat=new T.MeshBasicMaterial({color:'#b6ff70',transparent:true,opacity:.35,depthWrite:false,blending:T.AdditiveBlending});
 const outer=add(flame,new T.ConeGeometry(.045,.42,24),flameMat,[0,-.2,0]);outer.rotation.z=Math.PI;outer.castShadow=false;
 const inner=add(flame,new T.ConeGeometry(.024,.25,20),new T.MeshBasicMaterial({color:'#efffc5',transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}),[0,-.12,0]);inner.rotation.z=Math.PI;inner.castShadow=false;
 const engineLight=new T.PointLight('#b6ff70',0,1.4,2);engineLight.position.y=-.23;g.add(engineLight);
 g.userData.flame=flame;g.userData.engineLight=engineLight;g.userData.foot=-.288;return g;
}
function cloudTexture(){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(256,128);for(let y=0;y<128;y++)for(let x=0;x<256;x++){const u=x/255,v=y/127,envelope=Math.pow(Math.sin(Math.PI*u),1.6)*Math.pow(Math.sin(Math.PI*v),1.8);const f=fbm(new T.Vector3(u*3,v*3,7),1);const i=(y*256+x)*4;im.data[i]=155;im.data[i+1]=176;im.data[i+2]=141;im.data[i+3]=Math.max(0,f-.22)*envelope*170;}ctx.putImageData(im,0,0);return new T.CanvasTexture(c)}
function surfaceNormal(water=false){const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){let dx,dy;if(water){dx=Math.cos(x*.15+y*.1)*.12+Math.sin(y*.4+x*.05)*.06;dy=Math.sin(y*.2+x*.1)*.16+Math.cos(x*.4+y*.08)*.06}else{dx=(noise(x*.2,y*.2,3)-noise((x+1)*.2,y*.2,3))*.8;dy=(noise(x*.2,y*.2,3)-noise(x*.2,(y+1)*.2,3))*.8}const i=(y*256+x)*4;im.data[i]=128+dx*127;im.data[i+1]=128+dy*127;im.data[i+2]=250;im.data[i+3]=255}ctx.putImageData(im,0,0);const texture=new T.CanvasTexture(c);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(water?12:25,water?8:16);return texture}

export function buildScene({detail='high'}={}){seed=1717;const scene=new T.Scene();const globe=new T.Group();scene.add(globe);const terrainGeo=new T.SphereGeometry(1,detail==='high'?192:128,detail==='high'?128:88);const positions=terrainGeo.attributes.position,colors=[];const lowland=new T.Color('#899b79'),upland=new T.Color('#9eab87'),highland=new T.Color('#c2b99b');for(let i=0;i<positions.count;i++){const n=new T.Vector3().fromBufferAttribute(positions,i).normalize();const radius=terrainHeight(n);positions.setXYZ(i,n.x*radius,n.y*radius,n.z*radius);const elevation=radius-R,c=lowland.clone().lerp(upland,T.MathUtils.smoothstep(elevation,.1,.42)).lerp(highland,T.MathUtils.smoothstep(elevation,.48,.82));c.multiplyScalar(.92+noise(n.x*38,n.y*38,n.z*38)*.18);colors.push(c.r,c.g,c.b)}terrainGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();const terrain=add(globe,terrainGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:.025,emissive:'#506341',emissiveIntensity:.1}));terrain.castShadow=true;terrain.material.normalMap=surfaceNormal();terrain.material.normalScale.set(.32,.32);
 const water=add(globe,new T.SphereGeometry(R,128,88),mat('#122c27',.24,.65));water.castShadow=false;water.material.normalMap=surfaceNormal(true);water.material.normalScale=new T.Vector2(.55,.55);
 // Every placement is sampled from the final triangulated mesh, not the height approximation.
 terrain.updateMatrixWorld(true);const groundRay=new T.Raycaster();const placements=[],pulses=[],clearZones=[];
 function ground(n){groundRay.set(n.clone().multiplyScalar(9),n.clone().negate());const h=groundRay.intersectObject(terrain,false)[0];if(!h)return null;return{point:h.point.clone(),normal:h.face.normal.clone().normalize()}}
 function supports(group,points){group.updateWorldMatrix(true,false);for(const [x,y,z] of points){const top=group.localToWorld(new T.Vector3(x,y,z)),down=new T.Vector3(0,-1,0).applyQuaternion(group.getWorldQuaternion(new T.Quaternion()));groundRay.set(top,down);const hit=groundRay.intersectObject(terrain,false)[0];if(!hit)continue;const length=hit.distance+.03;cyl(group,stone,.035,.045,length,x,y-length/2,z,8);}}
 const stops=[],roadChecks=[],landingExclusionRadius=.9;for(const d of destinations){const n=spherical(d.lat,d.lon),hit=ground(n),g=surface(globe,n,hit.point.length()+.035);block(g,stone,0,-.04,0,1.28,.12,1.05);if(d.kind==='home'){circularHome(g,-.08,0,1);circularHome(g,.49,-.25,.43)}else if(d.kind==='observatory')observatory(g);else if(d.kind==='lighthouse')beacon(g);else if(d.kind==='village'){circularHome(g,-.28,-.05,.7);circularHome(g,.32,-.2,.6);circularHome(g,.08,.25,.42)}else if(d.kind==='lab'){studio(g).scale.setScalar(.7);for(let i=0;i<3;i++){const a=i*TAU/3;cyl(g,metal,.012,.012,.8,Math.sin(a)*.4,.4,Math.cos(a)*.4,8);sphere(g,light,Math.sin(a)*.4,.82,Math.cos(a)*.4,.02)}}else studio(g);const pulse=landingPad(g);pulses.push(pulse);supports(g,[[-.5,-.02,-.4],[.5,-.02,-.4],[-.5,-.02,.4],[.5,-.02,.4],[-.22,.015,.93],[.22,.015,.93],[0,.015,1.16]]);stops.push({...d,group:g,normal:n,pulse,anchor:new T.Vector3(0,d.kind==='lighthouse'?1.35:1,0),landing:new T.Vector3(0,.356,.93)});
 // Terraced satellite pavilions and elevated paths follow the actual curved terrain.
 for(let i=0;i<3;i++){const nn=spherical(d.lat+7+i*3,d.lon-9-i*3);const gh=ground(nn),h=gh.point.length();if(h<R+.03)continue;const house=surface(globe,nn,h+.012);circularHome(house,0,0,.28+i*.035);supports(house,[[-.08,0,0],[.08,0,0]]);clearZones.push({point:house.position.clone(),radius:.23})}
 // Routes stop before every destination pad, so no path or rail can cross a landing surface.
 const roadSegments=[];let roadSegment=[];
 function nearLanding(point){return stops.some(stop=>stop.group.localToWorld(new T.Vector3(0,0,.93)).distanceTo(point)<landingExclusionRadius)}
 function finishRoadSegment(){if(roadSegment.length>1)roadSegments.push(roadSegment);roadSegment=[]}
 for(let i=0;i<=40;i++){
  const k=i/40,nn=spherical(d.lat-13+k*29,d.lon-7+Math.sin(k*Math.PI*2)*6),h=Math.max(R+.05,ground(nn).point.length()+.035),point=nn.clone().multiplyScalar(h);
  if(nearLanding(point)){finishRoadSegment();continue}
  roadSegment.push(point);clearZones.push({point:point.clone(),radius:.14});
  if(i%5===0){const post=surface(globe,nn,h);supports(post,[[0,0,0]]);cyl(post,metal,.005,.005,.07,.055,.035,0,5);sphere(post,pale,.055,.08,0,.008)}
 }
 finishRoadSegment();roadChecks.push(...roadSegments);
 const roadMaterial=mat('#52614a',.95),edgeMaterial=mat('#a5b579',.65,.05,.16);
 for(const segment of roadSegments){const edgePoints=[];for(const point of segment){const n=point.clone().normalize(),h=point.length();edgePoints.push(spherical(Math.asin(n.y)*180/Math.PI,Math.atan2(n.x,n.z)*180/Math.PI+.5,h+.009))}tube(globe,segment,roadMaterial,.026);tube(globe,edgePoints,edgeMaterial,.003)}
 // Small geometric planters and miniature terrace details.
 for(let i=0;i<5;i++){const x=-.55+i*.21;block(g,carbon,x,.06,-.5,.13,.09,.1);sphere(g,mat('#45602e'),x,.12,-.5,.065,.055,.045)}
 }
 function reserved(point){if(clearZones.some(z=>z.point.distanceTo(point)<z.radius))return true;for(const s of stops){const p=s.group.worldToLocal(point.clone());if(p.y<-.65||p.y>1.1)continue;if(Math.abs(p.x)<.77&&p.z>-.75&&p.z<.64)return true;if(Math.hypot(p.x,p.z-.93)<.52)return true;}return false}
 // Lush forests around coves and on mountain slopes, sparse around buildings.
 const treeCount=detail==='high'?150:90;let placed=0;for(let i=0;i<treeCount*30&&placed<treeCount;i++){const n=new T.Vector3(rand()*2-1,rand()*2-1,rand()*2-1).normalize(),h=terrainHeight(n),distance=Math.min(...centres.map(c=>c.distanceTo(n)));if(h<R+.05||distance<.22||noise(n.x*20,n.y*20,n.z*20)<.24)continue;const hit=ground(n);if(!hit||hit.point.length()<R+.06||hit.normal.dot(n)<.90||reserved(hit.point)||placements.some(p=>new T.Vector3(...p.point).distanceTo(hit.point)<.13))continue;tree(globe,hit,.45+rand()*.35,placements);placed++}
 // Small irregular rock outcrops expose the landscape between forest patches.
 for(let i=0;i<160;i++){const n=new T.Vector3(rand()*2-1,rand()*2-1,rand()*2-1).normalize(),h=terrainHeight(n);if(h<R+.035||centres.some(c=>c.distanceTo(n)<.2)||reserved(n.clone().multiplyScalar(h)))continue;const gh=ground(n),g=surface(globe,n,gh.point.length()-.018);const rock=add(g,new T.IcosahedronGeometry(1,1),mat('#4f5a4a',.95),[0,.025,0],[.055+rand()*.07,.07+rand()*.14,.055+rand()*.08]);rock.rotation.y=rand()*TAU;}
 // Arch bridges over two sea inlets.
 for(const [lat,lon] of [[12,-22],[21,71],[-18,35]]){const n=spherical(lat,lon),g=surface(globe,n,Math.max(R+.03,ground(n).point.length()));const arch=[];for(let i=0;i<=30;i++){const x=-.6+i/30*1.2;arch.push(new T.Vector3(x,.13+Math.sin(i/30*Math.PI)*.12,0))}tube(g,arch,metal,.055);for(const z of [-.06,.06])line(g,arch.map(p=>[p.x,p.y+.055,z]),light,.003);supports(g,[[-.58,.13,0],[.58,.13,0]])}
 // Fine water glints around the dark coastline.
 for(let i=0;i<95;i++){const n=new T.Vector3(rand()*2-1,rand()*2-1,rand()*2-1).normalize();if(terrainHeight(n)>R-.015)continue;const g=surface(globe,n,R+.002);const arc=add(g,new T.TorusGeometry(.03+rand()*.055,.0018,3,12,2.4),mat('#4d6950',.4,.5));arc.rotation.x=Math.PI/2;arc.castShadow=false;}
 mergeStatic(globe,pulses);
 for(const s of stops){const hit=add(s.group,new T.BoxGeometry(1.3,1.3,1.7),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),[0,.5,.3]);hit.castShadow=false;hit.receiveShadow=false}
 const rocket=rocketCraft();scene.add(rocket);
 const ambient=new T.HemisphereLight('#b1c4ad','#0e1712',1.55);scene.add(ambient);const key=new T.DirectionalLight('#ddf0d4',3.1);key.position.set(-5,9,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});key.shadow.normalBias=.018;key.shadow.bias=-.00015;scene.add(key);const rim=new T.DirectionalLight('#b6ff4d',2.3);rim.position.set(4,3,-6);scene.add(rim);const fill=new T.DirectionalLight('#6f9278',.8);fill.position.set(5,-1,3);scene.add(fill);
 // Atmospheric rim follows the sphere in world space.
 const atmosphere=add(scene,new T.SphereGeometry(R+.18,48,32),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color('#8bba51')}},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n; varying vec3 v; uniform vec3 tint; void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(tint*.28,f*.2);}'}));atmosphere.castShadow=false;atmosphere.receiveShadow=false;
 const tex=cloudTexture(),clouds=[];for(let i=0;i<22;i++){const a=i/22*TAU,sprite=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:i<12?.38:.23,color:i%3===0?'#bbd88f':'#6c8261'}));sprite.position.set(Math.sin(a)*(4.2+rand()),Math.cos(a)*2.8-1.1,-2.6+rand()*3);sprite.scale.set(3+rand()*2.6,1.25+rand(),1);scene.add(sprite);clouds.push(sprite)}
 const trailGeo=new T.BufferGeometry();trailGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(160*3),3));trailGeo.setDrawRange(0,0);const trail=new T.Line(trailGeo,new T.LineBasicMaterial({color:'#b6ff4d',transparent:true,opacity:.4}));scene.add(trail);
 return{scene,globe,stops,rocket,clouds,trail,key,rim,fill,ambient,atmosphere,water,terrain,treeCount:placed,placements,clearZones,roadSegments:roadChecks,landingExclusionRadius};
}
export function environmentTexture(){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#0b120d';ctx.fillRect(0,0,512,256);for(const [x,y,w,h,color] of [[100,50,100,70,'#a5bca0'],[350,100,60,100,'#b1c869'],[220,20,60,30,'#445e47']]){const g=ctx.createRadialGradient(x,y,0,x,y,w);g.addColorStop(0,color);g.addColorStop(1,'#0b120d');ctx.fillStyle=g;ctx.fillRect(x-w,y-w,w*2,w*2)}const texture=new T.CanvasTexture(c);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.SRGBColorSpace;return texture}
