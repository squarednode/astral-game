import './style.css';
import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, HemisphericLight,
  Mesh, MeshBuilder, Scene, StandardMaterial, Vector3,
} from '@babylonjs/core';

const ZONE = 50;
const TOTAL = 300;
const DEPTH = 12;
const HALF = DEPTH / 2;
const SPEED = 4.9;
const RADIUS = 0.55;
const SECRET_LEN = 30;
const SECRET_ENTRY = 199;
const SECRET_WINDOW: [number, number] = [192, 203];
const CAMERA_BLEND = 12;

type RouteKind = 'main' | 'secret';
type CameraMode = 'start' | 'travel' | 'battle' | 'turn' | 'reverse' | 'end' | 'secret';
type Segment = { a: Vector3; b: Vector3; d0: number; d1: number; len: number; f: Vector3; r: Vector3 };
type Coord = { route: RouteKind; progress: number; depth: number; world: Vector3 };
type Pose = { position: Vector3; target: Vector3 };

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
const hud = document.querySelector<HTMLDivElement>('#prototypeHud');
if (!canvas || !hud) throw new Error('2.5D prototype DOM missing.');

const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.07, 0.1, 1);
new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.82;
const sun = new DirectionalLight('sun', new Vector3(-0.35, -1, -0.25), scene);
sun.position = new Vector3(20, 30, 15);

const mat = (name: string, c: Color3, e = 0): StandardMaterial => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = c; m.emissiveColor = c.scale(e); m.specularColor = new Color3(0.08, 0.08, 0.08);
  return m;
};
const floors = [
  mat('z1', new Color3(.24,.28,.34)), mat('z2', new Color3(.29,.33,.39)),
  mat('z3', new Color3(.25,.30,.36)), mat('z4', new Color3(.30,.35,.40)),
  mat('z5', new Color3(.26,.31,.37)), mat('z6', new Color3(.31,.36,.42)),
];
const railMat = mat('rails', new Color3(.12,.14,.18));
const seamMat = mat('seams', new Color3(.25,.75,1), .35);
const secretMat = mat('secret', new Color3(.34,.18,.48), .12);
const playerMat = mat('player', new Color3(.7,.25,.95), .12);
const aimMat = mat('aim', new Color3(1,.86,.26), .35);

const points = [
  new Vector3(0,0,0), new Vector3(50,0,0), new Vector3(100,0,0), new Vector3(150,0,0),
  new Vector3(175,0,0), new Vector3(175,0,-25), new Vector3(175,0,-75), new Vector3(125,0,-75),
];
const segments: Segment[] = [];
let run = 0;
for (let i = 0; i < points.length - 1; i++) {
  const v = points[i+1].subtract(points[i]);
  const len = v.length(); const f = v.scale(1/len); const r = new Vector3(-f.z,0,f.x);
  segments.push({ a: points[i], b: points[i+1], d0: run, d1: run + len, len, f, r }); run += len;
}
if (Math.abs(run - TOTAL) > .001) throw new Error(`Route is ${run} m, expected ${TOTAL} m.`);

const clamp = (v:number,a:number,b:number) => Math.min(b,Math.max(a,v));
const smooth = (v:number) => { const t=clamp(v,0,1); return t*t*(3-2*t); };

function segmentAt(progress:number): { s:Segment; t:number } {
  const p=clamp(progress,0,TOTAL);
  const s=segments.find(x=>p<=x.d1+.0001) ?? segments[segments.length-1];
  return { s, t: clamp((p-s.d0)/s.len,0,1) };
}
function mainSample(progress:number, depth=0): { pos:Vector3; f:Vector3; r:Vector3 } {
  const {s,t}=segmentAt(progress);
  const center=Vector3.Lerp(s.a,s.b,t);
  return { pos:center.add(s.r.scale(depth)), f:s.f, r:s.r };
}
const secretStart = mainSample(SECRET_ENTRY, HALF-.7).pos;
const secretF = new Vector3(1,0,0), secretR = new Vector3(0,0,1), SECRET_HALF=3.5;
function secretSample(progress:number, depth=0) {
  return { pos: secretStart.add(secretF.scale(clamp(progress,0,SECRET_LEN))).add(secretR.scale(depth)), f:secretF, r:secretR };
}

function floor(name:string,a:Vector3,b:Vector3,width:number,m:StandardMaterial,route:RouteKind):Mesh {
  const d=b.subtract(a), len=d.length();
  const mesh=MeshBuilder.CreateBox(name,{width:len+.12,height:.35,depth:width},scene);
  mesh.position.copyFrom(Vector3.Lerp(a,b,.5)); mesh.position.y=-.175;
  mesh.rotation.y=-Math.atan2(d.z,d.x); mesh.material=m; mesh.isPickable=true;
  mesh.metadata={sideviewWalkable:true,sideviewRoute:route}; return mesh;
}
segments.forEach((s,i)=>{
  const z=Math.min(5,Math.floor(((s.d0+s.d1)/2)/ZONE)); floor(`floor${i}`,s.a,s.b,DEPTH,floors[z],'main');
  const mid=Vector3.Lerp(s.a,s.b,.5);
  for(const side of [-1,1]){
    const r=MeshBuilder.CreateBox(`rail${i}_${side}`,{width:s.len+.2,height:1,depth:.3},scene);
    r.position.copyFrom(mid.add(s.r.scale(side*(HALF+.15)))); r.position.y=.5;
    r.rotation.y=-Math.atan2(s.b.z-s.a.z,s.b.x-s.a.x); r.material=railMat;
  }
});
for(let z=1;z<6;z++){
  const s=mainSample(z*ZONE); const seam=MeshBuilder.CreateBox(`seam${z}`,{width:.7,height:.06,depth:DEPTH-.8},scene);
  seam.position.copyFrom(s.pos); seam.position.y=.03; seam.rotation.y=-Math.atan2(s.f.z,s.f.x); seam.material=seamMat;
}
const secretEnd=secretStart.add(secretF.scale(SECRET_LEN));
floor('secretFloor',secretStart,secretEnd,7,secretMat,'secret');
const connector=MeshBuilder.CreateBox('secretConnector',{width:7,height:.06,depth:5.8},scene);
connector.position.copyFrom(secretStart.add(secretF.scale(3))); connector.position.y=.03; connector.material=secretMat;
connector.isPickable=true; connector.metadata={sideviewWalkable:true,sideviewRoute:'secret'};
for(const side of [-1,1]){
  const r=MeshBuilder.CreateBox(`secretRail${side}`,{width:SECRET_LEN+.2,height:.8,depth:.28},scene);
  r.position.copyFrom(Vector3.Lerp(secretStart,secretEnd,.5).add(secretR.scale(side*3.64))); r.position.y=.4; r.material=railMat;
}

const player=MeshBuilder.CreateCapsule('PLAYER',{height:1.8,radius:RADIUS},scene); player.material=playerMat;
const aim=MeshBuilder.CreateTorus('AIM',{diameter:1,thickness:.08,tessellation:24},scene); aim.rotation.x=Math.PI/2; aim.position.y=.05; aim.material=aimMat; aim.isPickable=false;
const camera=new FreeCamera('camera',new Vector3(-7,7,0),scene); camera.inputs.clear(); camera.minZ=.1;

let route:RouteKind='main', progress=2, depth=0, aimCoord:Coord|null=null, clickTarget:Coord|null=null;
let cameraLabel='start', handoff='none';
const keys=new Set<string>();
window.addEventListener('keydown',e=>keys.add(e.code)); window.addEventListener('keyup',e=>keys.delete(e.code)); window.addEventListener('blur',()=>keys.clear());

function sample(){return route==='main'?mainSample(progress,depth):secretSample(progress,depth)}
function place(){const s=sample();player.position.copyFrom(s.pos);player.position.y=.9}
place();

function projectMain(p:Vector3):Coord{
  let best:Coord={route:'main',progress:0,depth:0,world:points[0].clone()},bd=Infinity;
  for(const s of segments){
    const rel=p.subtract(s.a), along=clamp(Vector3.Dot(rel,s.f),0,s.len), center=s.a.add(s.f.scale(along));
    const d=clamp(Vector3.Dot(p.subtract(center),s.r),-HALF+RADIUS,HALF-RADIUS), world=center.add(s.r.scale(d));
    const ds=Vector3.DistanceSquared(world,p); if(ds<bd){bd=ds;best={route:'main',progress:s.d0+along,depth:d,world}}
  } return best;
}
function projectSecret(p:Vector3):Coord{
  const rel=p.subtract(secretStart), pr=clamp(Vector3.Dot(rel,secretF),0,SECRET_LEN-RADIUS), d=clamp(Vector3.Dot(rel,secretR),-SECRET_HALF+RADIUS,SECRET_HALF-RADIUS);
  return {route:'secret',progress:pr,depth:d,world:secretStart.add(secretF.scale(pr)).add(secretR.scale(d))};
}
function pointer(e:PointerEvent){
  const pick=scene.pick(e.clientX,e.clientY,m=>Boolean(m.metadata?.sideviewWalkable)); if(!pick?.hit||!pick.pickedPoint)return;
  const rk=(pick.pickedMesh as Mesh|null)?.metadata?.sideviewRoute as RouteKind|undefined;
  aimCoord=rk==='secret'?projectSecret(pick.pickedPoint):projectMain(pick.pickedPoint);
  aim.position.copyFrom(aimCoord.world); aim.position.y=.05;
  const dx=aim.position.x-player.position.x,dz=aim.position.z-player.position.z;if(Math.hypot(dx,dz)>.01)player.rotation.y=Math.atan2(dx,dz);
}
canvas.addEventListener('pointermove',pointer);
canvas.addEventListener('pointerdown',e=>{
  pointer(e); if(e.button!==0||!aimCoord)return;
  if(aimCoord.route===route){clickTarget={...aimCoord,world:aimCoord.world.clone()};return;}
  if(route==='main'&&progress>=SECRET_WINDOW[0]&&progress<=SECRET_WINDOW[1]&&depth>HALF-2.8&&aimCoord.route==='secret'){
    route='secret';progress=Math.max(.25,aimCoord.progress);depth=aimCoord.depth;clickTarget={...aimCoord,world:aimCoord.world.clone()};handoff='main → secret';place();
  }else if(route==='secret'&&progress<7&&aimCoord.route==='main'){
    route='main';progress=clamp(aimCoord.progress,SECRET_WINDOW[0],SECRET_WINDOW[1]);depth=aimCoord.depth;clickTarget={...aimCoord,world:aimCoord.world.clone()};handoff='secret → main';place();
  }
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function updateMovement(dt:number){
  const keyboard=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>keys.has(k)); if(keyboard)clickTarget=null;
  let pi=0,di=0; const target=aimCoord?.route===route?aimCoord:null;
  let fp=1,fd=0;if(target){const dp=target.progress-progress,dd=target.depth-depth,l=Math.hypot(dp,dd);if(l>.05){fp=dp/l;fd=dd/l}}
  if(keys.has('KeyW')||keys.has('ArrowUp')){pi+=fp;di+=fd} if(keys.has('KeyS')||keys.has('ArrowDown')){pi-=fp;di-=fd}
  // Mouse-relative strafe: left/right are perpendicular to the current mouse-facing drive vector.
  const lp=-fd,ld=fp;
  if(keys.has('KeyA')||keys.has('ArrowLeft')){pi+=lp;di+=ld} if(keys.has('KeyD')||keys.has('ArrowRight')){pi-=lp;di-=ld}
  if(!keyboard&&clickTarget?.route===route){const dp=clickTarget.progress-progress,dd=clickTarget.depth-depth,l=Math.hypot(dp,dd);if(l<.18)clickTarget=null;else{pi=dp/l;di=dd/l}}
  const il=Math.hypot(pi,di);if(il>1){pi/=il;di/=il}
  progress+=pi*SPEED*dt; const dlim=route==='main'?HALF-RADIUS:SECRET_HALF-RADIUS; depth=clamp(depth+di*SPEED*dt,-dlim,dlim);
  progress=clamp(progress,route==='main'?RADIUS:0,route==='main'?TOTAL-RADIUS:SECRET_LEN-RADIUS);
  if(route==='main'&&progress>=SECRET_WINDOW[0]&&progress<=SECRET_WINDOW[1]&&depth>HALF-1.25&&aimCoord?.route==='secret'&&(di>.2||pi>.1)){
    route='secret';progress=Math.max(.25,aimCoord.progress);depth=aimCoord.depth;handoff='main → secret';
  }else if(route==='secret'&&progress<.3&&aimCoord?.route==='main'&&pi<-.1){
    route='main';progress=clamp(aimCoord.progress,SECRET_WINDOW[0],SECRET_WINDOW[1]);depth=aimCoord.depth;handoff='secret → main';
  }
  place();
}

const pose=(mode:CameraMode,p:Vector3,f:Vector3,r:Vector3):Pose=>{
  const g=new Vector3(p.x,.8,p.z);
  if(mode==='start')return{position:g.subtract(f.scale(9)).add(new Vector3(0,4.8,0)).add(r.scale(1.4)),target:g.add(f.scale(7))};
  if(mode==='battle')return{position:g.add(r.scale(20)).add(new Vector3(0,11.5,0)).subtract(f.scale(3)),target:g.add(f.scale(4.5))};
  if(mode==='turn')return{position:g.add(r.scale(14)).add(new Vector3(0,8.3,0)).subtract(f.scale(4)),target:g.add(f.scale(5))};
  if(mode==='reverse')return{position:g.subtract(r.scale(15)).add(new Vector3(0,8.2,0)).subtract(f.scale(3)),target:g.add(f.scale(5))};
  if(mode==='end')return{position:g.subtract(f.scale(10)).add(new Vector3(0,5.2,0)),target:g.add(f.scale(9))};
  if(mode==='secret')return{position:g.add(r.scale(9)).add(new Vector3(0,6.2,0)).subtract(f.scale(5)),target:g.add(f.scale(4))};
  return{position:g.add(r.scale(15)).add(new Vector3(0,8.5,0)).subtract(f.scale(3)),target:g.add(f.scale(6))};
};
const blendPose=(a:Pose,b:Pose,t:number):Pose=>({position:Vector3.Lerp(a.position,b.position,t),target:Vector3.Lerp(a.target,b.target,t)});

function cameraDesired():Pose{
  const s=sample(), p=player.position;
  if(route==='secret'){
    const t=smooth(progress/8), a=pose('turn',p,s.f,s.r), b=pose('secret',p,s.f,s.r);cameraLabel=`secret handoff ${Math.round(t*100)}%`;return blendPose(a,b,t);
  }
  if(progress<14){const t=smooth(progress/14);cameraLabel=`start → travel ${Math.round(t*100)}%`;return blendPose(pose('start',p,s.f,s.r),pose('travel',p,s.f,s.r),t)}
  if(progress>282){const t=smooth((progress-282)/16);cameraLabel=`reverse → end ${Math.round(t*100)}%`;return blendPose(pose('reverse',p,s.f,s.r),pose('end',p,s.f,s.r),t)}
  const modes:CameraMode[]=['travel','travel','battle','turn','travel','reverse'];
  for(let i=1;i<6;i++){
    const b=i*ZONE;if(progress>=b-CAMERA_BLEND&&progress<=b+CAMERA_BLEND){const t=smooth((progress-(b-CAMERA_BLEND))/(CAMERA_BLEND*2)),from=modes[i-1],to=modes[i];
      if(from==='travel'&&to==='reverse'){
        // Reversible orbit: cross behind the player instead of linearly crossing through the avatar.
        const ang=Math.PI*t, g=new Vector3(p.x,.8,p.z), orbit=s.r.scale(Math.cos(ang)*15).subtract(s.f.scale(Math.sin(ang)*15)).subtract(s.f.scale(3));
        cameraLabel=`travel ↔ reverse orbit ${Math.round(t*100)}%`;return{position:g.add(orbit).add(new Vector3(0,8.2+Math.sin(ang)*2.5,0)),target:g.add(s.f.scale(5))};
      }
      cameraLabel=`${from} → ${to} ${Math.round(t*100)}%`;return blendPose(pose(from,p,s.f,s.r),pose(to,p,s.f,s.r),t);
    }
  }
  const mode=modes[Math.min(5,Math.floor(progress/ZONE))];cameraLabel=`${mode} follow`;return pose(mode,p,s.f,s.r);
}
let camPos=camera.position.clone(),camTarget=camera.getTarget().clone();
function updateCamera(dt:number){const d=cameraDesired(),pb=1-Math.exp(-2.8*dt),tb=1-Math.exp(-3.4*dt);camPos=Vector3.Lerp(camPos,d.position,pb);camTarget=Vector3.Lerp(camTarget,d.target,tb);camera.position.copyFrom(camPos);camera.setTarget(camTarget)}

function updateHud(){const zi=route==='main'?Math.min(5,Math.floor(progress/ZONE)):3;hud.innerHTML=`
<div class="prototype-title">Astral Shift 0.6.9-2.5d.2c</div>
<div>300 m route · 6 × 50 m zones · 30 m secret branch</div>
<div>Zone <strong>${zi+1}</strong> · ${route==='secret'?'Secret Route':route}</div>
<div>Progress ${progress.toFixed(1)} m · depth ${depth.toFixed(1)} m · speed ${SPEED.toFixed(1)} m/s</div>
<div>Camera: <strong>${cameraLabel}</strong></div>
<div class="prototype-muted">W/S = toward/away from mouse · A/D = mouse-relative strafe · LMB = click-to-move</div>
<div class="prototype-muted">Secret handoff: aim/click onto the purple branch near the connector. Last handoff: ${handoff}</div>`}

scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(.05,engine.getDeltaTime()/1000);updateMovement(dt);updateCamera(dt);updateHud()});
engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());

(globalThis as typeof globalThis & {__astral25d?:unknown}).__astral25d={
  totalLength:TOTAL,zoneLength:ZONE,playableDepth:DEPTH,playerSpeed:SPEED,
  player:()=>({x:player.position.x,z:player.position.z,zone:route==='main'?Math.min(6,Math.floor(progress/ZONE)+1):4,progress,depth,route}),
  camera:()=>({label:cameraLabel,x:camera.position.x,y:camera.position.y,z:camera.position.z}),
  setProgress:(m:number)=>{route='main';progress=clamp(m,RADIUS,TOTAL-RADIUS);depth=0;clickTarget=null;place()},
  enterSecret:()=>{route='secret';progress=.25;depth=0;handoff='debug main → secret';place()},
  exitSecret:()=>{route='main';progress=SECRET_ENTRY;depth=HALF-1.2;handoff='debug secret → main';place()},
};
