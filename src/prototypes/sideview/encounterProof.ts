import { Color3, Engine, Mesh, MeshBuilder, Ray, StandardMaterial, Vector3 } from '@babylonjs/core';

type Chunk = { id:string; cell:{x:number;z:number}; type:string };
type ProcApi = { snapshot:()=>{ chunks:Chunk[]; mainIds:string[] } };
type State = 'unvisited'|'entered'|'encounterActive'|'cleared';
const CELL=50, SPEED=2.7, ATTACK_RANGE=4.2;

function install():boolean{
  const api=(globalThis as typeof globalThis&{__astralProcMap?:ProcApi}).__astralProcMap;
  const engine=Engine.Instances[0],scene=engine?.scenes[0],player=scene?.getMeshByName('PLAYER');
  if(!api||!engine||!scene||!player)return false;
  const map=api.snapshot(), chunkById=new Map(map.chunks.map(c=>[c.id,c]));
  const encounterId=map.mainIds[Math.min(2,map.mainIds.length-2)], encounterChunk=chunkById.get(encounterId);
  if(!encounterChunk)return false;
  let state:State='unvisited'; const enemies:Mesh[]=[];
  const mat=new StandardMaterial('encounter-enemy',scene);mat.diffuseColor=new Color3(.82,.16,.12);mat.emissiveColor=new Color3(.14,.02,.01);
  const cx=encounterChunk.cell.x*CELL,cz=encounterChunk.cell.z*CELL;

  const walkable=(x:number,z:number):boolean=>{
    const ray=new Ray(new Vector3(x,4,z),new Vector3(0,-1,0),8);
    const hit=scene.pickWithRay(ray,m=>Boolean(m.metadata?.proceduralWalkable));
    return Boolean(hit?.hit);
  };
  const spawn=():void=>{
    if(enemies.length)return;
    [[-4,-3],[4,2],[0,5]].forEach(([ox,oz],i)=>{
      const e=MeshBuilder.CreateSphere(`PROOF_ENEMY_${i}`,{diameter:1.5,segments:12},scene);
      e.position.set(cx+ox,.75,cz+oz);e.material=mat;e.isPickable=false;enemies.push(e);
    });
  };
  const nearestChunk=():Chunk=>{
    let best=map.chunks[0],d=Infinity;
    for(const c of map.chunks){const dx=player.position.x-c.cell.x*CELL,dz=player.position.z-c.cell.z*CELL,q=dx*dx+dz*dz;if(q<d){d=q;best=c;}}
    return best;
  };
  const attack=():void=>{
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i],dx=e.position.x-player.position.x,dz=e.position.z-player.position.z;
      if(Math.hypot(dx,dz)<=ATTACK_RANGE){e.dispose();enemies.splice(i,1);}
    }
    if(state==='encounterActive'&&enemies.length===0)state='cleared';
  };
  window.addEventListener('keydown',e=>{if(e.code==='KeyF'||e.code==='Space')attack();});

  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(.05,engine.getDeltaTime()/1000),current=nearestChunk();
    if(current.id===encounterId&&state==='unvisited'){state='entered';spawn();state='encounterActive';}
    if(state!=='encounterActive')return;
    for(const enemy of enemies){
      const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,len=Math.hypot(dx,dz);
      if(len<.9)continue;
      const step=SPEED*dt,nx=enemy.position.x+dx/len*step,nz=enemy.position.z+dz/len*step;
      if(walkable(nx,nz)){enemy.position.x=nx;enemy.position.z=nz;continue;}
      if(walkable(nx,enemy.position.z))enemy.position.x=nx;
      if(walkable(enemy.position.x,nz))enemy.position.z=nz;
    }
  });

  const hud=document.querySelector<HTMLDivElement>('#prototypeHud');
  window.setInterval(()=>{if(!hud)return;document.querySelector('#encounterProofHud')?.remove();const line=document.createElement('div');line.id='encounterProofHud';line.className='prototype-muted';line.textContent=`Gameplay 2.5d.4: encounter ${encounterId} = ${state} · enemies ${enemies.length} · F/Space attack`;hud.appendChild(line);},250);
  (globalThis as any).__astralEncounterProof={state:()=>state,enemies:()=>enemies.length,chunk:encounterId};
  return true;
}
function wait():void{if(install())return;window.setTimeout(wait,25);}wait();
