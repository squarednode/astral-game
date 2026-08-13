import { Engine, Vector3 } from '@babylonjs/core';

type Chunk = { id:string; type:string; cell:{x:number;z:number}; neighbors:string[] };
type Api = { snapshot:()=>{chunks:Chunk[]} };

function install(): boolean {
  const api=(globalThis as any).__astralProcMap as Api|undefined;
  const engine=Engine.Instances[0];
  const scene=engine?.scenes[0];
  const camera=scene?.getCameraByName('camera');
  const player=scene?.getMeshByName('PLAYER');
  if(!api||!engine||!scene||!camera||!player)return false;

  const chunks=api.snapshot().chunks;
  const byId=new Map(chunks.map(c=>[c.id,c]));
  let previous=player.position.clone();

  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(.05,engine.getDeltaTime()/1000);
    const motion=player.position.subtract(previous); motion.y=0;
    previous.copyFrom(player.position);
    if(motion.lengthSquared()<.00002)return;
    motion.normalize();

    let chunk=chunks[0],best=Infinity;
    for(const c of chunks){
      const dx=player.position.x-c.cell.x*50,dz=player.position.z-c.cell.z*50,q=dx*dx+dz*dz;
      if(q<best){best=q;chunk=c;}
    }
    if(chunk.type!=='exit'&&chunk.type!=='end')return;

    const neighbor=chunk.neighbors.length?byId.get(chunk.neighbors[0]):undefined;
    if(!neighbor)return;
    const inward=new Vector3(neighbor.cell.x-chunk.cell.x,0,neighbor.cell.z-chunk.cell.z).normalize();
    const outward=inward.scale(-1);
    if(Vector3.Dot(motion,outward)<.2)return;

    const ground=new Vector3(player.position.x,.8,player.position.z);
    const desiredTarget=ground.add(outward.scale(4.5));
    camera.setTarget(Vector3.Lerp(camera.getTarget(),desiredTarget,1-Math.exp(-3.0*dt)));
  });
  return true;
}

function wait():void{if(!install())setTimeout(wait,25);}wait();
