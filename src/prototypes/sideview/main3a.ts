import './style.css';
import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, HemisphericLight,
  Mesh, MeshBuilder, Scene, StandardMaterial, Vector3,
} from '@babylonjs/core';

const BUILD = '0.6.9-2.5d.3a';
const CELL_SIZE = 50;
const CORRIDOR_WIDTH = 12;
const JUNCTION_SIZE = 18;
const PLAYER_RADIUS = 0.55;
const PLAYER_SPEED = 4.9;
const TOTAL_CHUNKS = 10;
const MIN_MAIN_CHUNKS = 6;
const MAX_MAIN_CHUNKS = 8;
const MIN_BRANCH_CHUNKS = 2;
const CAMERA_SIDE = 17;
const CAMERA_HEIGHT = 9;
const TRANSITION_OVERLAP = PLAYER_RADIUS * 2 + 1.2;

type Direction = 'N' | 'E' | 'S' | 'W';
type ChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
type ChunkRole = 'main' | 'secret';
type GridPoint = { x: number; z: number };
type FloorRect = { cx: number; cz: number; width: number; depth: number; chunkId: string };
type Chunk = {
  id: string; cell: GridPoint; role: ChunkRole; type: ChunkType;
  sockets: Direction[]; neighbors: string[]; mainIndex: number | null; branchIndex: number | null;
};
type GeneratedMap = {
  seed: number; chunks: Chunk[]; startId: string; exitId: string;
  endIds: string[]; mainIds: string[]; branchIds: string[];
};
type Rng = {
  next: () => number; int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T; shuffle: <T>(items: readonly T[]) => T[];
};

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
const hudQuery = document.querySelector<HTMLDivElement>('#prototypeHud');
if (!canvas || !hudQuery) throw new Error('2.5D prototype shell is missing required DOM elements.');
const hud: HTMLDivElement = hudQuery;

function hashSeed(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw) { const numeric = Number(raw); return Number.isFinite(numeric) ? numeric >>> 0 : hashSeed(raw); }
  const values = new Uint32Array(1); globalThis.crypto.getRandomValues(values); return values[0] >>> 0;
}
function createRng(seed: number): Rng {
  let state = seed >>> 0 || 0x9e3779b9;
  const next = (): number => {
    state += 0x6d2b79f5; let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    shuffle: <T>(items: readonly T[]): T[] => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
      return result;
    },
  };
}

const DIRS: readonly Direction[] = ['N', 'E', 'S', 'W'];
const DELTA: Record<Direction, GridPoint> = { N:{x:0,z:-1}, E:{x:1,z:0}, S:{x:0,z:1}, W:{x:-1,z:0} };
const OPPOSITE: Record<Direction, Direction> = { N:'S', E:'W', S:'N', W:'E' };
const keyOf = (cell: GridPoint): string => `${cell.x},${cell.z}`;
const addCell = (cell: GridPoint, direction: Direction): GridPoint => ({ x:cell.x+DELTA[direction].x, z:cell.z+DELTA[direction].z });
function directionBetween(a: GridPoint, b: GridPoint): Direction {
  const dx=b.x-a.x,dz=b.z-a.z;
  if(dx===1&&dz===0)return'E'; if(dx===-1&&dz===0)return'W'; if(dx===0&&dz===1)return'S'; if(dx===0&&dz===-1)return'N';
  throw new Error(`Cells are not cardinal neighbors: ${keyOf(a)} -> ${keyOf(b)}`);
}
function cardinalNeighbors(cell: GridPoint): GridPoint[] { return DIRS.map(direction=>addCell(cell,direction)); }
function candidateIsClean(candidate: GridPoint, occupied: Map<string, GridPoint>, allowedTouch: GridPoint): boolean {
  if(occupied.has(keyOf(candidate)))return false;
  for(const neighbor of cardinalNeighbors(candidate)){
    if(!occupied.has(keyOf(neighbor)))continue;
    if(neighbor.x===allowedTouch.x&&neighbor.z===allowedTouch.z)continue;
    return false;
  }
  return true;
}
function growSelfAvoidingPath(rng:Rng,start:GridPoint,count:number,occupied:Map<string,GridPoint>,preferredDirection?:Direction):GridPoint[]|null{
  const path:GridPoint[]=[{...start}]; const localAdded:GridPoint[]=[];
  const recurse=(current:GridPoint,remaining:number):boolean=>{
    if(remaining===0)return true;
    let directions=rng.shuffle(DIRS);
    if(path.length===1&&preferredDirection)directions=[preferredDirection,...directions.filter(d=>d!==preferredDirection)];
    for(const direction of directions){
      const candidate=addCell(current,direction); if(!candidateIsClean(candidate,occupied,current))continue;
      occupied.set(keyOf(candidate),candidate);localAdded.push(candidate);path.push(candidate);
      if(recurse(candidate,remaining-1))return true;
      path.pop();localAdded.pop();occupied.delete(keyOf(candidate));
    }
    return false;
  };
  if(recurse(start,count-1))return path;
  for(const cell of localAdded)occupied.delete(keyOf(cell));
  return null;
}
function deriveType(sockets:readonly Direction[],role:'start'|'exit'|'end'|null):ChunkType{
  if(role)return role; if(sockets.length===4)return'plus'; if(sockets.length===3)return't';
  if(sockets.length===2){const[a,b]=sockets;return OPPOSITE[a]===b?'straight':'l';}
  throw new Error(`Unsupported generated socket count ${sockets.length}.`);
}
function generateMap(seed:number):GeneratedMap{
  for(let attempt=0;attempt<300;attempt+=1){
    const rng=createRng((seed+attempt*2654435761)>>>0); const mainCount=rng.int(MIN_MAIN_CHUNKS,MAX_MAIN_CHUNKS); const branchCount=TOTAL_CHUNKS-mainCount;
    if(branchCount<MIN_BRANCH_CHUNKS)continue;
    const occupied=new Map<string,GridPoint>();const origin={x:0,z:0};occupied.set(keyOf(origin),origin);
    const main=growSelfAvoidingPath(rng,origin,mainCount,occupied,'E');if(!main)continue;
    const branchCandidates=rng.shuffle(main.map((cell,index)=>({cell,index})).filter(({index})=>index>=1&&index<=main.length-2));
    let branch:GridPoint[]|null=null;let branchRootIndex=-1;
    for(const candidate of branchCandidates){
      const used=new Set<Direction>();if(candidate.index>0)used.add(directionBetween(candidate.cell,main[candidate.index-1]));if(candidate.index<main.length-1)used.add(directionBetween(candidate.cell,main[candidate.index+1]));
      for(const direction of rng.shuffle(DIRS.filter(d=>!used.has(d)))){
        const first=addCell(candidate.cell,direction);if(!candidateIsClean(first,occupied,candidate.cell))continue;
        occupied.set(keyOf(first),first);const path=growSelfAvoidingPath(rng,first,branchCount,occupied,direction);
        if(path){branch=path;branchRootIndex=candidate.index;break;}occupied.delete(keyOf(first));
      }
      if(branch)break;
    }
    if(!branch||branchRootIndex<0)continue;
    const idByCell=new Map<string,string>();main.forEach((cell,index)=>idByCell.set(keyOf(cell),`main-${index}`));branch.forEach((cell,index)=>idByCell.set(keyOf(cell),`secret-${index}`));
    const chunks:Chunk[]=[];
    const build=(cell:GridPoint,role:ChunkRole,mainIndex:number|null,branchIndex:number|null):Chunk=>{
      const id=idByCell.get(keyOf(cell));if(!id)throw new Error('Generated cell missing id.');
      const sockets:Direction[]=[];const neighbors:string[]=[];
      for(const direction of DIRS){const neighborId=idByCell.get(keyOf(addCell(cell,direction)));if(neighborId){sockets.push(direction);neighbors.push(neighborId);}}
      let endpoint:'start'|'exit'|'end'|null=null;if(mainIndex===0)endpoint='start';else if(mainIndex===main.length-1)endpoint='exit';else if(branchIndex===branch.length-1)endpoint='end';
      return{id,cell:{...cell},role,type:deriveType(sockets,endpoint),sockets,neighbors,mainIndex,branchIndex};
    };
    main.forEach((cell,index)=>chunks.push(build(cell,'main',index,null)));branch.forEach((cell,index)=>chunks.push(build(cell,'secret',null,index)));
    const junction=chunks.find(chunk=>chunk.mainIndex===branchRootIndex);if(!junction||junction.sockets.length<3)continue;
    return{seed,chunks,startId:'main-0',exitId:`main-${main.length-1}`,endIds:[`secret-${branch.length-1}`],mainIds:main.map((_,i)=>`main-${i}`),branchIds:branch.map((_,i)=>`secret-${i}`)};
  }
  throw new Error(`Unable to generate valid ${TOTAL_CHUNKS}-chunk map for seed ${seed}.`);
}

const seed=seedFromUrl();const generated=generateMap(seed);const chunkById=new Map(generated.chunks.map(chunk=>[chunk.id,chunk]));
const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});const scene=new Scene(engine);scene.clearColor=new Color4(.055,.07,.1,1);
new HemisphericLight('ambient',new Vector3(0,1,0),scene).intensity=.84;const sun=new DirectionalLight('sun',new Vector3(-.35,-1,-.25),scene);sun.position=new Vector3(30,35,25);sun.intensity=1;
const makeMaterial=(name:string,color:Color3,emissive=0):StandardMaterial=>{const m=new StandardMaterial(name,scene);m.diffuseColor=color;m.emissiveColor=color.scale(emissive);m.specularColor=new Color3(.07,.07,.08);return m;};
const mainFloorMaterial=makeMaterial('main-floor',new Color3(.27,.31,.37));const secretFloorMaterial=makeMaterial('secret-floor',new Color3(.30,.22,.38));const junctionMaterial=makeMaterial('junction-floor',new Color3(.34,.37,.43));
const railMaterial=makeMaterial('limits',new Color3(.10,.12,.16));const socketMaterial=makeMaterial('socket',new Color3(.23,.72,1),.32);const secretSocketMaterial=makeMaterial('secret-socket',new Color3(.77,.35,.95),.32);
const startMaterial=makeMaterial('start',new Color3(.25,.95,.55),.30);const exitMaterial=makeMaterial('exit',new Color3(1,.72,.18),.30);const endMaterial=makeMaterial('end',new Color3(.95,.32,.40),.30);
const playerMaterial=makeMaterial('player',new Color3(.70,.25,.95),.12);const aimMaterial=makeMaterial('aim',new Color3(1,.86,.26),.35);
const floorRects:FloorRect[]=[];const chunkCenter=(chunk:Chunk):Vector3=>new Vector3(chunk.cell.x*CELL_SIZE,0,chunk.cell.z*CELL_SIZE);
function createFloorRect(chunk:Chunk,name:string,cx:number,cz:number,width:number,depth:number,material:StandardMaterial):void{
  const mesh=MeshBuilder.CreateBox(name,{width,height:.35,depth},scene);mesh.position.set(cx,-.175,cz);mesh.material=material;mesh.isPickable=true;mesh.metadata={proceduralWalkable:true,chunkId:chunk.id};floorRects.push({cx,cz,width,depth,chunkId:chunk.id});
}
function createLimitBox(name:string,cx:number,cz:number,width:number,depth:number):void{const mesh=MeshBuilder.CreateBox(name,{width,height:.8,depth},scene);mesh.position.set(cx,.4,cz);mesh.material=railMaterial;mesh.isPickable=false;}
function buildChunkGeometry(chunk:Chunk):void{
  const center=chunkCenter(chunk);const base=chunk.role==='secret'?secretFloorMaterial:mainFloorMaterial;const centerMat=chunk.type==='t'||chunk.type==='plus'?junctionMaterial:base;
  createFloorRect(chunk,`${chunk.id}-center`,center.x,center.z,JUNCTION_SIZE,JUNCTION_SIZE,centerMat);

  // Capsule-safe overlap contract: arm walkable bounds overlap the center and neighboring cell by > 2R.
  const armInner=JUNCTION_SIZE/2-TRANSITION_OVERLAP;
  const armOuter=CELL_SIZE/2+TRANSITION_OVERLAP;
  const armLength=armOuter-armInner;
  const armCenterOffset=(armInner+armOuter)/2;
  for(const direction of chunk.sockets){
    const d=DELTA[direction];const cx=center.x+d.x*armCenterOffset;const cz=center.z+d.z*armCenterOffset;const horizontal=direction==='E'||direction==='W';
    createFloorRect(chunk,`${chunk.id}-arm-${direction}`,cx,cz,horizontal?armLength:CORRIDOR_WIDTH,horizontal?CORRIDOR_WIDTH:armLength,base);
    const seam=MeshBuilder.CreateBox(`${chunk.id}-socket-${direction}`,{width:horizontal?.35:CORRIDOR_WIDTH-1.1,height:.06,depth:horizontal?CORRIDOR_WIDTH-1.1:.35},scene);
    seam.position.set(center.x+d.x*(CELL_SIZE/2-.15),.03,center.z+d.z*(CELL_SIZE/2-.15));seam.material=chunk.role==='secret'?secretSocketMaterial:socketMaterial;
  }
  const half=CELL_SIZE/2,wallThickness=.32,gap=CORRIDOR_WIDTH+.5,sideSpan=(CELL_SIZE-gap)/2,directions=new Set(chunk.sockets);
  for(const direction of DIRS){
    const open=directions.has(direction),horizontalEdge=direction==='N'||direction==='S',sign=direction==='N'||direction==='W'?-1:1;
    if(!open){if(horizontalEdge)createLimitBox(`${chunk.id}-wall-${direction}`,center.x,center.z+sign*half,CELL_SIZE,wallThickness);else createLimitBox(`${chunk.id}-wall-${direction}`,center.x+sign*half,center.z,wallThickness,CELL_SIZE);continue;}
    const offset=gap/2+sideSpan/2;if(horizontalEdge){createLimitBox(`${chunk.id}-wall-${direction}-a`,center.x-offset,center.z+sign*half,sideSpan,wallThickness);createLimitBox(`${chunk.id}-wall-${direction}-b`,center.x+offset,center.z+sign*half,sideSpan,wallThickness);}else{createLimitBox(`${chunk.id}-wall-${direction}-a`,center.x+sign*half,center.z-offset,wallThickness,sideSpan);createLimitBox(`${chunk.id}-wall-${direction}-b`,center.x+sign*half,center.z+offset,wallThickness,sideSpan);}
  }
  const markerMat=chunk.type==='start'?startMaterial:chunk.type==='exit'?exitMaterial:chunk.type==='end'?endMaterial:null;if(markerMat){const marker=MeshBuilder.CreateCylinder(`${chunk.id}-marker`,{diameter:3.4,height:.12,tessellation:24},scene);marker.position.copyFrom(center);marker.position.y=.08;marker.material=markerMat;marker.isPickable=false;}
}
generated.chunks.forEach(buildChunkGeometry);
function rectContains(rect:FloorRect,x:number,z:number,margin=PLAYER_RADIUS):boolean{return Math.abs(x-rect.cx)<=rect.width/2-margin&&Math.abs(z-rect.cz)<=rect.depth/2-margin;}
function isWalkable(x:number,z:number):boolean{return floorRects.some(rect=>rectContains(rect,x,z));}
function chunkAtWorld(x:number,z:number):Chunk|null{const containing=floorRects.find(rect=>rectContains(rect,x,z,0));return containing?chunkById.get(containing.chunkId)??null:null;}

function validateTransitions():string[]{
  const failures:string[]=[];
  for(const chunk of generated.chunks){
    const a=chunkCenter(chunk);
    for(const neighborId of chunk.neighbors){
      if(chunk.id.localeCompare(neighborId)>=0)continue;
      const neighbor=chunkById.get(neighborId);if(!neighbor)continue;const b=chunkCenter(neighbor);
      for(let i=0;i<=200;i+=1){const t=i/200,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(!isWalkable(x,z)){failures.push(`${chunk.id}<->${neighbor.id}@${t.toFixed(2)}`);break;}}
    }
  }
  return failures;
}
const transitionFailures=validateTransitions();if(transitionFailures.length)throw new Error(`Procedural socket validation failed: ${transitionFailures.join(', ')}`);

const startChunk=chunkById.get(generated.startId);if(!startChunk)throw new Error('Generated map has no start chunk.');const startCenter=chunkCenter(startChunk);const startSocket=startChunk.sockets[0];const startForward=DELTA[startSocket];
const player=MeshBuilder.CreateCapsule('PLAYER',{height:1.8,radius:PLAYER_RADIUS},scene);player.material=playerMaterial;player.position.set(startCenter.x+startForward.x*4,.9,startCenter.z+startForward.z*4);
const facing=MeshBuilder.CreateBox('PLAYER_FACING',{width:.16,height:.16,depth:1.1},scene);facing.position.set(0,.24,.68);facing.material=makeMaterial('facing',new Color3(.92,.92,1),.1);facing.parent=player;
const aimMarker=MeshBuilder.CreateTorus('AIM_MARKER',{diameter:1,thickness:.08,tessellation:24},scene);aimMarker.rotation.x=Math.PI/2;aimMarker.position.set(player.position.x+startForward.x*7,.05,player.position.z+startForward.z*7);aimMarker.material=aimMaterial;aimMarker.isPickable=false;
const camera=new FreeCamera('camera',new Vector3(player.position.x-9,7,player.position.z),scene);camera.inputs.clear();camera.minZ=.1;
const pressed=new Set<string>();let aimPoint=aimMarker.position.clone(),clickTarget:Vector3|null=null,currentChunk:Chunk=startChunk,previousChunk:Chunk|null=null,cameraLabel='start';let cameraForward=new Vector3(startForward.x,0,startForward.z).normalize(),cameraPosition=camera.position.clone(),cameraTarget=new Vector3(player.position.x,.8,player.position.z);
window.addEventListener('keydown',event=>{pressed.add(event.code);if(event.code==='KeyR'){const values=new Uint32Array(1);crypto.getRandomValues(values);const params=new URLSearchParams(window.location.search);params.set('seed',String(values[0]>>>0));window.location.search=params.toString();}});window.addEventListener('keyup',event=>pressed.delete(event.code));window.addEventListener('blur',()=>pressed.clear());
function updatePointer(event:PointerEvent):void{const pick=scene.pick(event.clientX,event.clientY,mesh=>Boolean(mesh.metadata?.proceduralWalkable));if(!pick?.hit||!pick.pickedPoint)return;aimPoint=pick.pickedPoint.clone();aimPoint.y=.05;aimMarker.position.copyFrom(aimPoint);const dx=aimPoint.x-player.position.x,dz=aimPoint.z-player.position.z;if(Math.hypot(dx,dz)>.01)player.rotation.y=Math.atan2(dx,dz);}
canvas.addEventListener('pointermove',updatePointer);canvas.addEventListener('pointerdown',event=>{updatePointer(event);if(event.button===0)clickTarget=aimPoint.clone();});canvas.addEventListener('contextmenu',event=>event.preventDefault());
function movePlayer(dx:number,dz:number):void{const nx=player.position.x+dx,nz=player.position.z+dz;if(isWalkable(nx,nz)){player.position.x=nx;player.position.z=nz;return;}if(isWalkable(nx,player.position.z))player.position.x=nx;if(isWalkable(player.position.x,nz))player.position.z=nz;}
function updateMovement(dt:number):void{
  const keyboardActive=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(code=>pressed.has(code));if(keyboardActive)clickTarget=null;
  const mouseDx=aimPoint.x-player.position.x,mouseDz=aimPoint.z-player.position.z,mouseLength=Math.hypot(mouseDx,mouseDz);let forwardX=cameraForward.x,forwardZ=cameraForward.z;if(mouseLength>.05){forwardX=mouseDx/mouseLength;forwardZ=mouseDz/mouseLength;}const leftX=forwardZ,leftZ=-forwardX;
  let inputX=0,inputZ=0;if(pressed.has('KeyW')||pressed.has('ArrowUp')){inputX+=forwardX;inputZ+=forwardZ;}if(pressed.has('KeyS')||pressed.has('ArrowDown')){inputX-=forwardX;inputZ-=forwardZ;}if(pressed.has('KeyA')||pressed.has('ArrowLeft')){inputX+=leftX;inputZ+=leftZ;}if(pressed.has('KeyD')||pressed.has('ArrowRight')){inputX-=leftX;inputZ-=leftZ;}
  if(!keyboardActive&&clickTarget){const dx=clickTarget.x-player.position.x,dz=clickTarget.z-player.position.z,distance=Math.hypot(dx,dz);if(distance<=.2)clickTarget=null;else{inputX=dx/distance;inputZ=dz/distance;}}
  const length=Math.hypot(inputX,inputZ);if(length>1){inputX/=length;inputZ/=length;}movePlayer(inputX*PLAYER_SPEED*dt,inputZ*PLAYER_SPEED*dt);
  const found=chunkAtWorld(player.position.x,player.position.z);if(found&&found.id!==currentChunk.id){previousChunk=currentChunk;currentChunk=found;}
}
function directionVector(direction:Direction):Vector3{const d=DELTA[direction];return new Vector3(d.x,0,d.z);}
function desiredForwardForChunk(chunk:Chunk):Vector3{
  if(previousChunk&&chunk.neighbors.includes(previousChunk.id)){const entryDirection=directionBetween(previousChunk.cell,chunk.cell);const exits=chunk.sockets.filter(direction=>direction!==OPPOSITE[entryDirection]);if(exits.length===1)return directionVector(exits[0]);}
  const mouseVector=new Vector3(aimPoint.x-player.position.x,0,aimPoint.z-player.position.z);if(mouseVector.lengthSquared()>.01&&chunk.sockets.length>0){mouseVector.normalize();let bestDirection=chunk.sockets[0],bestDot=-Infinity;for(const direction of chunk.sockets){const dot=Vector3.Dot(mouseVector,directionVector(direction));if(dot>bestDot){bestDot=dot;bestDirection=direction;}}return directionVector(bestDirection);}return directionVector(chunk.sockets[0]??'E');
}
function updateCamera(dt:number):void{
  const desiredForward=desiredForwardForChunk(currentChunk),forwardBlend=1-Math.exp(-2.2*dt);cameraForward=Vector3.Lerp(cameraForward,desiredForward,forwardBlend);if(cameraForward.lengthSquared()<.01)cameraForward.copyFrom(desiredForward);cameraForward.normalize();const right=new Vector3(-cameraForward.z,0,cameraForward.x),ground=new Vector3(player.position.x,.8,player.position.z);
  let sideDistance=CAMERA_SIDE,height=CAMERA_HEIGHT,lookAhead=6;if(currentChunk.type==='t'||currentChunk.type==='plus'){sideDistance=20;height=11;lookAhead=2;cameraLabel=`${currentChunk.type.toUpperCase()} junction wide`;}else if(currentChunk.type==='start'){sideDistance=3;height=5.2;lookAhead=9;cameraLabel='Start third-person';}else if(currentChunk.type==='exit'){sideDistance=3;height=5.2;lookAhead=9;cameraLabel='Exit transition';}else if(currentChunk.type==='end'){sideDistance=10;height=7;lookAhead=2;cameraLabel='Dead-end / secret';}else cameraLabel=`${currentChunk.type.toUpperCase()} travel`;
  const desiredPosition=ground.add(right.scale(sideDistance)).add(new Vector3(0,height,0)).subtract(cameraForward.scale(currentChunk.type==='start'||currentChunk.type==='exit'?8:3)),desiredTarget=ground.add(cameraForward.scale(lookAhead)),positionBlend=1-Math.exp(-2.7*dt),targetBlend=1-Math.exp(-3.4*dt);cameraPosition=Vector3.Lerp(cameraPosition,desiredPosition,positionBlend);cameraTarget=Vector3.Lerp(cameraTarget,desiredTarget,targetBlend);camera.position.copyFrom(cameraPosition);camera.setTarget(cameraTarget);
}
function topologyText():string{return[...generated.chunks].sort((a,b)=>{if(a.mainIndex!==null&&b.mainIndex!==null)return a.mainIndex-b.mainIndex;if(a.mainIndex!==null)return-1;if(b.mainIndex!==null)return 1;return(a.branchIndex??0)-(b.branchIndex??0);}).map(chunk=>`${chunk.id}:${chunk.type.toUpperCase()}[${chunk.sockets.join('')}]`).join(' · ');}
function updateHud():void{const secret=currentChunk.role==='secret'?' · SECRET BRANCH':'';hud.innerHTML=`<div class="prototype-title">Astral Shift ${BUILD} — Procedural Chunk Grammar</div><div>Seed: <strong>${generated.seed}</strong> · ${TOTAL_CHUNKS} chunks · main path ${generated.mainIds.length} · 1 dead end</div><div>Current: <strong>${currentChunk.id}</strong> · ${currentChunk.type.toUpperCase()} · sockets ${currentChunk.sockets.join(', ')}${secret}</div><div>Camera: <strong>${cameraLabel}</strong> · speed ${PLAYER_SPEED.toFixed(1)} m/s</div><div class="prototype-muted">Transition validation: <strong>PASS</strong> · overlap ${TRANSITION_OVERLAP.toFixed(2)} m</div><div class="prototype-muted">W/S = toward/away from mouse · A/D = mouse-relative strafe · LMB = click-to-move · R = new generated seed</div><div class="prototype-muted">${topologyText()}</div>`;}
scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(.05,engine.getDeltaTime()/1000);updateMovement(dt);updateCamera(dt);updateHud();});engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());
(globalThis as typeof globalThis&{__astralProcMap?:unknown}).__astralProcMap={seed,snapshot:()=>generated,transitionValidation:()=>({pass:transitionFailures.length===0,failures:transitionFailures,overlap:TRANSITION_OVERLAP}),regenerate:(nextSeed?:number)=>{const params=new URLSearchParams(window.location.search);const value=nextSeed??(()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);return values[0]>>>0;})();params.set('seed',String(value>>>0));window.location.search=params.toString();}};
