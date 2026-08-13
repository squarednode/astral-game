import { Engine } from '@babylonjs/core';

type C={id:string;cell:{x:number;z:number}};
type A={snapshot:()=>{chunks:C[];endIds:string[]}};

function install():boolean{
  const api=(globalThis as any).__astralProcMap as A|undefined;
  const scene=Engine.Instances[0]?.scenes[0];
  const player=scene?.getMeshByName('PLAYER');
  if(!api||!scene||!player)return false;
  const map=api.snapshot();
  const end=map.chunks.find(c=>c.id===map.endIds[0]);
  if(!end)return false;
  const ex=end.cell.x*50,ez=end.cell.z*50;
  let inArena=false,lock=0;
  scene.onBeforeRenderObservable.add(()=>{
    lock=Math.max(0,lock-.016);
    if(lock>0)return;
    if(!inArena&&Math.hypot(player.position.x-ex,player.position.z-ez)<1.8){player.position.x=600;player.position.z=600;inArena=true;lock=1;}
    else if(inArena&&Math.hypot(player.position.x-600,player.position.z-600)<1.8){player.position.x=ex;player.position.z=ez;inArena=false;lock=1;}
  });
  (globalThis as any).__astralPortalTransition={active:()=>inArena};
  return true;
}
function wait():void{if(!install())setTimeout(wait,25);}wait();
