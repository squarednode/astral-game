import { Color3, Engine, MeshBuilder, StandardMaterial } from '@babylonjs/core';

type Chunk = { id:string; cell:{x:number;z:number}; sockets:string[]; role:'main'|'secret' };
type ProcApi = { snapshot: () => { chunks:Chunk[] } };
const CELL_SIZE=50;
const PATH_HALF=6.35;
const JUNCTION_HALF=9.35;

function install():boolean{
  const api=(globalThis as typeof globalThis&{__astralProcMap?:ProcApi}).__astralProcMap;
  const engine=Engine.Instances[0];const scene=engine?.scenes[0];if(!api||!scene)return false;
  const chunks=api.snapshot().chunks;
  const dirt=new StandardMaterial('forest-runner-skin-3l',scene);dirt.diffuseColor=new Color3(.30,.23,.14);dirt.specularColor=new Color3(.01,.01,.01);
  const secret=new StandardMaterial('forest-secret-skin-3l',scene);secret.diffuseColor=new Color3(.22,.18,.11);secret.specularColor=new Color3(.01,.01,.01);
  const green=new StandardMaterial('forest-level-ground-3l',scene);green.diffuseColor=new Color3(.12,.25,.10);green.specularColor=new Color3(.01,.01,.01);

  // Hide the brown construction meshes visually; they remain enabled/pickable for movement logic.
  for(const mesh of scene.meshes){if(mesh.metadata?.proceduralWalkable)mesh.visibility=0;}
  for(const mesh of scene.meshes){if(mesh.name.startsWith('forest-ground-')&&mesh.name.endsWith('-3k'))mesh.visibility=0;}

  for(const chunk of chunks){
    const cx=chunk.cell.x*CELL_SIZE,cz=chunk.cell.z*CELL_SIZE;
    const base=MeshBuilder.CreateBox(`forest-level-base-${chunk.id}-3l`,{width:CELL_SIZE+.8,height:.10,depth:CELL_SIZE+.8},scene);
    base.position.set(cx,-.05,cz);base.material=green;base.isPickable=false;

    const mat=chunk.role==='secret'?secret:dirt;
    const center=MeshBuilder.CreateBox(`forest-runner-center-${chunk.id}-3l`,{width:JUNCTION_HALF*2,height:.08,depth:JUNCTION_HALF*2},scene);
    center.position.set(cx,.04,cz);center.material=mat;center.isPickable=false;

    for(const socket of chunk.sockets){
      const horizontal=socket==='E'||socket==='W';
      const length=CELL_SIZE/2-JUNCTION_HALF+1.6;
      const offset=JUNCTION_HALF+length/2-.8;
      let x=cx,z=cz;
      if(socket==='E')x+=offset;if(socket==='W')x-=offset;if(socket==='N')z-=offset;if(socket==='S')z+=offset;
      const arm=MeshBuilder.CreateBox(`forest-runner-arm-${chunk.id}-${socket}-3l`,{width:horizontal?length:PATH_HALF*2,height:.08,depth:horizontal?PATH_HALF*2:length},scene);
      arm.position.set(x,.04,z);arm.material=mat;arm.isPickable=false;
    }
  }
  const hud=document.querySelector<HTMLDivElement>('#prototypeHud');if(hud){const line=document.createElement('div');line.className='prototype-muted';line.textContent='Polish 3l: flush forest ground + seam-safe runner skin';hud.appendChild(line);}return true;
}
function wait():void{if(install())return;window.setTimeout(wait,25);}wait();
