import { Color3, Engine, MeshBuilder, StandardMaterial } from '@babylonjs/core';

type Direction='N'|'E'|'S'|'W';
type Chunk={id:string;cell:{x:number;z:number};sockets:Direction[];role:'main'|'secret'};
type ProcApi={snapshot:()=>{chunks:Chunk[]}};
const CELL=50, APRON=8, CAP=9.6;

function install():boolean{
  const api=(globalThis as typeof globalThis&{__astralProcMap?:ProcApi}).__astralProcMap;
  const scene=Engine.Instances[0]?.scenes[0];
  if(!api||!scene)return false;
  const chunks=api.snapshot().chunks;
  const green=new StandardMaterial('forest-edge-green-3m',scene);green.diffuseColor=new Color3(.12,.25,.10);green.specularColor=new Color3(.01,.01,.01);
  const dirt=new StandardMaterial('forest-cap-dirt-3m',scene);dirt.diffuseColor=new Color3(.30,.23,.14);dirt.specularColor=new Color3(.01,.01,.01);
  const secret=new StandardMaterial('forest-cap-secret-3m',scene);secret.diffuseColor=new Color3(.22,.18,.11);secret.specularColor=new Color3(.01,.01,.01);

  for(const chunk of chunks){
    const cx=chunk.cell.x*CELL,cz=chunk.cell.z*CELL,sockets=new Set(chunk.sockets);
    for(const direction of ['N','E','S','W'] as Direction[]){
      if(sockets.has(direction))continue;
      const horizontal=direction==='N'||direction==='S';
      const apron=MeshBuilder.CreateBox(`forest-apron-${chunk.id}-${direction}-3m`,{width:horizontal?CELL+APRON*2:APRON,height:.08,depth:horizontal?APRON:CELL+APRON*2},scene);
      const offset=CELL/2+APRON/2;let x=cx,z=cz;
      if(direction==='N')z-=offset;if(direction==='S')z+=offset;if(direction==='W')x-=offset;if(direction==='E')x+=offset;
      apron.position.set(x,.0,z);apron.material=green;apron.isPickable=false;
    }
    const cap=MeshBuilder.CreateBox(`forest-cap-${chunk.id}-3m`,{width:CAP*2,height:.045,depth:CAP*2},scene);
    cap.position.set(cx,.095,cz);cap.material=chunk.role==='secret'?secret:dirt;cap.isPickable=false;
  }
  return true;
}
function wait():void{if(install())return;window.setTimeout(wait,25);}wait();
