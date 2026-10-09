import {clipSample,clipDuration} from './motion.mjs';

// Legacy cache transforms operate on the assembled player. Computing their
// pivots separately for a glove, weapon and arm makes those pieces drift apart.
export function assembleRig(parts,definitions){
 const vertices=[],groups=[],offsets=[];
 for(const {key,data} of parts){const offset=vertices.length;offsets.push(offset);
  vertices.push(...data.vertices.map(([x,y,z])=>[x,-y,-z]));
  (definitions[key]?.groups||[]).forEach((indices,group)=>{groups[group]??=[];groups[group].push(...indices.map(i=>i+offset));});
 }
 return{vertices,groups,offsets};
}
function transform(vertices,groups,ops,mask,selected){
 let pivot=[0,0,0];
 for(const op of ops){if(op.type!==0&&mask&&mask.has(op.index)!==selected)continue;
  const indices=op.groups.flatMap(group=>groups[group]||[]),delta=[op.x,op.y,op.z];
  if(op.type===0){pivot=delta.map((n,axis)=>n+(indices.length?indices.reduce((sum,i)=>sum+vertices[i][axis],0)/indices.length:0));continue;}
  if(op.type===5)continue;
  const angles=delta.map(n=>(n&255)*Math.PI/128),sin=angles.map(a=>Math.floor(Math.sin(a)*65536)),cos=angles.map(a=>Math.floor(Math.cos(a)*65536));
  for(const i of indices){let [x,y,z]=vertices[i];
   if(op.type===1){vertices[i]=[x+op.x,y+op.y,z+op.z];continue;}
   x-=pivot[0];y-=pivot[1];z-=pivot[2];
   if(op.type===2){
    if(angles[2])[x,y]=[(sin[2]*y+cos[2]*x)>>16,(cos[2]*y-sin[2]*x)>>16];
    if(angles[0])[y,z]=[(cos[0]*y-sin[0]*z)>>16,(sin[0]*y+cos[0]*z)>>16];
    if(angles[1])[x,z]=[(sin[1]*z+cos[1]*x)>>16,(cos[1]*z-sin[1]*x)>>16];
   }else if(op.type===3){x*=op.x/128;y*=op.y/128;z*=op.z/128;}
   vertices[i]=[x+pivot[0],y+pivot[1],z+pivot[2]];
  }
 }
}
export function poseRig(rig,sequence,frame,movement,movementFrame=0){
 const vertices=rig.vertices.map(v=>v.slice()),mask=movement&&sequence.mask?.length?new Set(sequence.mask):null;
 transform(vertices,rig.groups,sequence.frames[frame],mask,false);
 if(mask)transform(vertices,rig.groups,movement.frames[movementFrame],mask,true);
 return vertices.map(([x,y,z])=>[x,-y,-z]);
}
export class PlayerMotion {
 constructor(sequences){this.sequences=sequences;this.reset();}
 reset(){this.action=null;this.locomotion=null;this.lastAttack=-1;}
 attack(id,time){if(this.sequences[id])this.action={id,started:time};}
 sample(time,moving,pace,stance={}){
  const id=moving?(pace===2?stance.run||824:stance.walk||819):stance.idle||808;
  if(this.locomotion?.id!==id)this.locomotion={id,started:time};
  const base=this.sequences[id],baseSample=clipSample(base,time-this.locomotion.started);
  if(this.action&&time-this.action.started>=clipDuration(this.sequences[this.action.id]))this.action=null;
  if(!this.action)return{sequence:base,...baseSample};
  const action=this.sequences[this.action.id],sample=clipSample(action,time-this.action.started,false);
  return{sequence:action,...sample,movement:moving&&action.mask?.length?base:null,movementSample:baseSample};
 }
}
