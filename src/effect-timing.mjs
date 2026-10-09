// Visual interpolation shares the simulation clock, including pause/slow motion.
export function hazardPose(h,time){
  const tick=time/600,active=tick>=h.due;
  return {active,age:Math.max(0,time-h.due*600),
    warning:Math.max(0,Math.min(1,(tick-(h.created??h.due-2))/Math.max(1,h.due-(h.created??h.due-2)))),
    x:h.x,y:h.type==='lightning'?h.startY+Math.max(0,tick-h.due-1)*h.direction:h.y,
    height:h.type==='crystal'?Math.max(0,Math.min(6,(h.due-tick)*6)):0};
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
