import { Engine, Vector3 } from '@babylonjs/core';

type Chunk = { id: string; type: 'start'|'exit'|'end'|'straight'|'l'|'t'|'plus'; cell:{x:number;z:number}; neighbors:string[] };
type ProcApi = { snapshot: () => { chunks: Chunk[] } };
const CELL_SIZE = 50;

function install(): boolean {
  const api=(globalThis as typeof globalThis&{__astralProcMap?:ProcApi}).__astralProcMap;
  const engine=Engine.Instances[0];
  const scene=engine?.scenes[0];
  const camera=scene?.getCameraByName('camera');
  const player=scene?.getMeshByName('PLAYER');
  if(!api||!engine||!scene||!camera||!player)return false;
  const chunks=api.snapshot().chunks;
  const byId=new Map(chunks.map(c=>[c.id,c]));
  let previous=player.position.clone();
  let motion=new Vector3(1,0,0);

  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(.05,engine.getDeltaTime()/1000);
    const d=player.position.subtract(previous); d.y=0;
    if(d.lengthSquared()>.00002){d.normalize();motion=Vector3.Lerp(motion,d,1-Math.exp(-7*dt));if(motion.lengthSquared()>.001)motion.normalize();}
    previous.copyFrom(player.position);

    let chunk=chunks[0],best=Infinity;
    for(const c of chunks){const dx=player.position.x-c.cell.x*CELL_SIZE,dz=player.position.z-c.cell.z*CELL_SIZE,q=dx*dx+dz*dz;if(q<best){best=q;chunk=c;}}
    if(chunk.type!=='exit'&&chunk.type!=='end')return;
    const neighbor=chunk.neighbors.length?byId.get(chunk.neighbors[0]):undefined;
    if(!neighbor)return;
    const interior=new Vector3(neighbor.cell.x-chunk.cell.x,0,neighbor.cell.z-chunk.cell.z).normalize();
    if(Vector3.Dot(motion,interior)<.18)return;

    const center=new Vector3(chunk.cell.x*CELL_SIZE,0,chunk.cell.z*CELL_SIZE);
    const distance=Math.hypot(player.position.x-center.x,player.position.z-center.z);
    const returnMix=Math.max(0,Math.min(1,(18-distance)/12));
    if(returnMix<=0)return;

    const currentTarget=camera.getTarget();
    const centeredTarget=new Vector3(player.position.x,.8,player.position.z).add(interior.scale(.15));
    const blend=(1-Math.exp(-3.2*dt))*returnMix;
    camera.setTarget(Vector3.Lerp(currentTarget,centeredTarget,blend));
  });
  return true;
}
function wait():void{if(install())return;window.setTimeout(wait,25);}wait();
