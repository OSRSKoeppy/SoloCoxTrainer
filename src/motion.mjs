const normal={idle:{middle:7336,mage:7337,melee:7338},attack:{middle:7345,mage:7346,melee:7347},
 turn:{'middle:mage':7339,'mage:middle':7340,'middle:melee':7341,'melee:middle':7342,'melee:mage':7343,'mage:melee':7344}};
const enraged={idle:{middle:7374,mage:7376,melee:7375},attack:{middle:7371,mage:7373,melee:7372},
 turn:{'middle:mage':7381,'mage:middle':7382,'middle:melee':7377,'melee:middle':7378,'melee:mage':7379,'mage:melee':7380}};
export function headAnimation(action,to='middle',from='middle',phase=1){const set=phase===4?enraged:normal;return action==='turn'?set.turn[`${from}:${to}`]||set.idle[to]:set[action][to];}
export function clipDuration(clip){return (clip.lengths?.length?clip.lengths:clip.frames.map(()=>1)).reduce((sum,n)=>sum+n*20,0);}
export function clipSample(clip,elapsed,loop=true){const lengths=clip.lengths?.length?clip.lengths:clip.frames.map(()=>1),duration=clipDuration(clip);let ms=loop?((elapsed%duration)+duration)%duration:Math.max(0,Math.min(elapsed,duration));let frame=0;
 while(frame<clip.frames.length-1&&ms>=lengths[frame]*20){ms-=lengths[frame]*20;frame++;}
 return{frame,next:frame+1<clip.frames.length?frame+1:loop?0:frame,fraction:Math.max(0,Math.min(ms/(lengths[frame]*20),1)),finished:!loop&&elapsed>=duration};
}
export function movementSample(points,progress){if(!points?.length)return{x:0,y:0};const t=Math.max(0,Math.min(progress,1))*(points.length-1),index=Math.min(Math.floor(t),points.length-1),a=points[index],b=points[Math.min(index+1,points.length-1)],fraction=t-index;return{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};}
export class HeadMotion {
 constructor(model){this.model=model;this.reset(1,0);}
 reset(phase,time,facing='middle'){this.override=null;this.phase=phase;this.facing=facing;this.action='idle';this.from=facing;this.started=time;this.until=time;}
 play(id,time){this.override={id,started:time,until:time+clipDuration(this.model.animations[id])};}
 handle(event,time,phase){this.phase=phase;this.from=event.fromFacing||this.facing;this.facing=event.facing||event.side||this.facing;this.action=event.type==='turn'?'turn':'attack';this.started=time;
   const id=headAnimation(this.action,this.facing,this.from,this.phase);this.until=time+clipDuration(this.model.animations[id]);}
 sample(time){if(this.override&&time<this.override.until)return{...this.override,loop:false,action:'transition',facing:this.facing};const busy=time<this.until;return{id:headAnimation(busy?this.action:'idle',this.facing,this.from,this.phase),started:busy?this.started:this.until,loop:!busy,action:busy?this.action:'idle',facing:this.facing};}
}
