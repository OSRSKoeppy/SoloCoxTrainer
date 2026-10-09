import * as THREE from 'three';
import {EffectRegistry,hazardPose} from './effect-timing.mjs';
const color={acid:0x77be30,flame:0xff912b,crystal:0x291e2d,burst:0xce71d9,bomb:0xb574dd,lightning:0xc2ffc1,portal:0xcd84ff,pool:0x43cfe2};
const pos=(x,y,z=0)=>new THREE.Vector3(x-32.5,z,44.5-y);
function disc(radius,tint,opacity){const m=new THREE.Mesh(new THREE.CircleGeometry(radius,24),new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;return m;}
function ring(radius,tint,opacity){const m=new THREE.Mesh(new THREE.RingGeometry(radius*.84,radius,32),new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;return m;}

export class EncounterEffects {
  constructor(scene,model,dispose){
    this.scene=scene;this.model=model;this.dispose=dispose;this.bursts=[];this.status=new Map();
    this.registry=new EffectRegistry(h=>this.create(h),a=>{scene.remove(a.root);dispose(a.root);});
  }
  create(h){
    const root=new THREE.Group(),actors=[],rings=[];
    root.position.copy(pos(h.x+.5,h.y+.5));this.scene.add(root);
    const floor=disc(h.type==='bomb'?.48:h.type==='portal'||h.type==='pool'?.64:.45,color[h.type],h.type==='crystal'?.48:.38);floor.position.y=.025;root.add(floor);
    const addModel=(name,x=0,z=0)=>{const obj=this.model(name,h.due*600);obj.position.set(x,0,z);root.add(obj);actors.push(obj);return obj;};
    if(h.type==='flame'){
      floor.visible=false;
      for(const y of [-1,1])for(let x=28;x<=37;x++){const flame=addModel('flame',x-h.x,-y);flame.userData.tile=`${x},${h.y+y}`;flame.scale.set(3,3,3);flame.setAnimation(flame.anim,h.due*600,{started:h.due*600-(x%3)*80});}
    }else if(['crystal','burst','bomb','lightning'].includes(h.type))addModel(h.type);
    if(['portal','pool','acid','bomb'].includes(h.type)){
      for(let i=0;i<3;i++){const r=ring(.52,color[h.type],.65);r.position.y=.04+i*.014;root.add(r);rings.push(r);}
    }
    if(h.type==='acid'){
      for(let i=0;i<5;i++){const bubble=new THREE.Mesh(new THREE.IcosahedronGeometry(.07,1),new THREE.MeshBasicMaterial({color:0x9bdd40,transparent:true,opacity:.7}));root.add(bubble);actors.push(bubble);}
    }
    return{root,floor,actors,rings,h};
  }
  sync(game){this.registry.sync(game.hazards);}
  burst(name,x,y,time){const obj=this.model(name,time);obj.position.copy(pos(x+.5,y+.5,.02));this.scene.add(obj);this.bursts.push({obj,time,until:time+1000});}
  clear(){this.registry.clear();for(const {obj}of this.bursts){this.scene.remove(obj);this.dispose(obj);}this.bursts=[];for(const obj of this.status.values()){this.scene.remove(obj);this.dispose(obj);}this.status.clear();}
  draw(game,time,player){
    for(const [h,a]of this.registry.entries){
      const p=hazardPose(h,time);a.root.position.copy(pos(p.x+.5,p.y+.5));
      const pulse=.5+.5*Math.sin(time/130);
      a.floor.material.opacity=h.type==='crystal'?.25+p.warning*.4:p.active?.42:.18+p.warning*.2;
      a.rings.forEach((r,i)=>{const phase=((time/1100+i/3)%1);r.scale.setScalar(h.type==='portal'?.65+phase*.9:.6+phase*.65);r.material.opacity=(1-phase)*.7;});
      for(const [i,obj]of a.actors.entries()){
        if(h.type==='acid'){obj.visible=p.active;obj.position.set(Math.sin(i*2.4)*.3,((time/1200+i/5)%1)*.3,Math.cos(i*2.4)*.3);}
        else {obj.visible=h.type==='crystal'?time>=(h.due-1)*600:h.type==='bomb'||p.active;if(h.type==='flame'&&(h.gaps||[]).includes(obj.userData.tile))obj.visible=false;obj.position.y=p.height;obj.animate?.(time);}
      }
      if(h.type==='bomb'){a.floor.scale.setScalar(1+pulse*.12);}
      if(h.type==='burst'&&!p.active){a.floor.scale.setScalar(.25+p.warning*.65);}
      if(h.type==='pool'){a.floor.material.opacity=.32+pulse*.18;}
    }
    for(const b of this.bursts){b.obj.animate?.(time);if(time>=b.until){this.scene.remove(b.obj);this.dispose(b.obj);}}
    this.bursts=this.bursts.filter(b=>time<b.until);
    this.statusEffect('burn',game.burns.length>0,time,player.position,'burn');
    this.statusEffect('acid-trail',game.tick<game.trailUntil,time,player.position,null);
    const hand=game.targetPoint('melee');this.statusEffect('healing',game.tick<game.healUntil,time,pos(hand.x,hand.y,2),null);
  }
  statusEffect(key,active,time,position,model){
    let obj=this.status.get(key);
    if(!active){if(obj){this.scene.remove(obj);this.dispose(obj);this.status.delete(key);}return;}
    if(!obj){obj=model?this.model(model,time):ring(key==='healing'?1.1:.6,key==='healing'?0x72ff75:0x91e63c,.8);this.scene.add(obj);this.status.set(key,obj);}
    obj.position.copy(position);obj.position.y+=model?.9:.05;obj.animate?.(time);
    if(!model){obj.scale.setScalar(.9+Math.sin(time/200)*.12);obj.material.opacity=.55+Math.sin(time/130)*.2;}
  }
}
