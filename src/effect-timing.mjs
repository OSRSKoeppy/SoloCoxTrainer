// Visual interpolation shares the simulation clock, including pause/slow motion.
export function hazardPose(h,time){
  const tick=time/600,active=tick>=h.due;
  return {active,age:Math.max(0,time-h.due*600),
    warning:Math.max(0,Math.min(1,(tick-(h.created??h.due-2))/Math.max(1,h.due-(h.created??h.due-2)))),
    x:h.x,y:h.type==='lightning'?h.startY+Math.max(0,tick-h.due-1)*h.direction:h.y,
    height:h.type==='crystal'?Math.max(0,Math.min(6,(h.due-tick)*6)):0};
}
export function projectilePose(from,to,time,started,duration,arc=0){
 const fraction=Math.max(0,Math.min(1,(time-started)/duration));
 const position=from.map((n,i)=>n+(to[i]-n)*fraction+(i===1?4*arc*fraction*(1-fraction):0));
 const direction=from.map((n,i)=>to[i]-n+(i===1?4*arc*(1-2*fraction):0));
 return{fraction,position,direction,finished:time>=started+duration};
}

// Keep GPU objects and animation start times stable across simulation ticks.
export class EffectRegistry {
  constructor(create,destroy){this.entries=new Map();this.create=create;this.destroy=destroy;}
  sync(hazards){
    const live=new Set(hazards);
    for(const [h,actor] of this.entries)if(!live.has(h)){this.destroy(actor);this.entries.delete(h);}
    for(const h of hazards)if(!this.entries.has(h))this.entries.set(h,this.create(h));
  }
  clear(){this.sync([]);}
}
