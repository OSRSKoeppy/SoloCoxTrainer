import {roomWalkable,meleeReach} from './tiles.mjs';
export const TICK_MS = 600;
export const METHODS = {
  full: { name:'Full solo encounter', text:'Three hand phases, then the ranged head. Kill both hands together in phase three.' },
  demo: { name:'Head-turn demonstration', text:'Watch the player cross each sector and Olm turn before firing. Choose another focus to practise yourself.' },
  '1:0': { name:'1:0 melee', text:'One melee hit, then run to the opposite side. Return when the head turns away.' },
  '3:0': { name:'3:0 mage', text:'Keep the staff on its four-tick cycle. Move after casting to make Olm turn instead of attacking.' },
  '3:1': { name:'3:1 melee', text:'Use three melee hits to adjust the cycle. Keep the weapon cooldown while running the head.' },
  '4:1': { name:'4:1 melee', text:'Keep four lance hits on a sixteen-tick rhythm. Use the head turn and empty attack to avoid extra autos.' },
  scythe: { name:'3:1 scythe', text:'Five-tick weapon. Three swings fit into sixteen ticks with a one-tick pause.' },
  head: { name:'Ranged head phase', text:'Equip ranged, shoot between head turns, and keep moving away from crystal shadows.' },
};
const key = (p) => `${p.x},${p.y}`;
const distance = (a,b) => Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
export function findPath(start, goal, walkable) {
  const queue=[start], previous=new Map([[key(start),null]]);let best=start,bestDistance=distance(start,goal);
  for(let i=0;i<queue.length;i++) {
    const p=queue[i], d=distance(p,goal);
    if(d<bestDistance||(d===bestDistance&&(p.x-goal.x)**2+(p.y-goal.y)**2<(best.x-goal.x)**2+(best.y-goal.y)**2)){best=p;bestDistance=d;} if(d===0){best=p;break;}
    for(const [dx,dy]of directions){const n={x:p.x+dx,y:p.y+dy};
      if(!walkable.has(key(n))||previous.has(key(n)))continue;
      if(dx&&dy&&(!walkable.has(`${p.x+dx},${p.y}`)||!walkable.has(`${p.x},${p.y+dy}`)))continue;
      previous.set(key(n),p);queue.push(n);
    }
  }
  const result=[];for(let p=best;p&&key(p)!==key(start);p=previous.get(key(p)))result.unshift(p);return result;
}
export function rectangleDistance(p, r) {
  return Math.max(Math.max(r.x-p.x,0,p.x-(r.x+r.w-1)),Math.max(r.y-p.y,0,p.y-(r.y+r.h-1)));
}
export class Encounter {
  constructor(scene,items,options={}) {
    this.scene=scene;this.items=items;this.options={method:'full',phase:1,invincible:false,handHealth:600,accuracy:'random',mechanics:'full',...options};
    this.walkable=roomWalkable(scene);
    this.reset();
  }
  reset() {
    this.tick=0;this.phase=this.options.method==='head'?4:this.options.phase;this.hp=99;this.prayerPoints=99;
    this.stats={attack:99,strength:99,magic:99};this.position={x:29,y:48};this.previous={...this.position};
    this.path=[];this.destination=null;this.walkOverride=false;this.target=null;this.cooldown=0;this.run=this.options.method!=='demo';this.facing=Math.PI/2;this.animation=808;
    if(this.options.method==='demo')this.position={x:29,y:44};this.previous={...this.position};this.motionPath=[{...this.position}];this.demoIndex=0;this.demoHold=0;
    this.pendingHits=[];this.incoming=[];this.trace=[];this.lastHandAttempt={};this.boundUntil=0;this.prayerLockedUntil=0;this.trailUntil=0;this.shardsUntil=0;this.burns=[];this.powerReady=0;this.nextPools=24;this.forceSplash=false;this.clenchDamage=0;this.nextClench=0;this.feedback='';this.attackAt=-100;this.drinkAt=-100;this.headFacing='middle';this.bossCycle=0;this.nextBoss=4;this.catchUp=false;this.lastHandHit={};this.bossStyle='mage';this.lastBossAction='Waiting';
    this.handHP={mage:this.options.handHealth,melee:this.options.handHealth,head:800};this.deadAt={};this.transition=0;this.won=false;
    this.healUntil=0;this.clenchUntil=0;this.hazards=[];this.effects=[];this.events=[];this.attackCount=0;this.olmAttacks=0;this.turns=0;this.switches=0;this.specialIndex=0;
    this.equipment={head:10828,cape:6570,hands:7462,feet:11840,weapon:22978,body:11832,legs:11834,neck:19553};
    if(this.options.method==='3:0')Object.assign(this.equipment,{weapon:12899,body:4712,legs:4714,neck:12002});
    if(this.options.method==='head')Object.assign(this.equipment,{weapon:21012,body:4736,legs:4738,neck:19547});
    if(this.options.method==='scythe')this.equipment.weapon=22325;
    this.inventory=[22978,11832,11834,19553,12899,4712,4714,12002,21012,4736,4738,19547,22325,6685,6685,6685,6685,3024,3024,3024,555,560,null,null,null,null,null,null];
    for(const id of Object.values(this.equipment)){const i=this.inventory.indexOf(id);if(i>=0)this.inventory[i]=null;}
    this.doses={};this.inventory.forEach((id,i)=>{if(id===6685||id===3024)this.doses[i]=4;});
    this.protection=null;this.offensive=null;this.seed=this.options.seed??83531;const powers=['acid','flame','crystal'];const first=Math.floor(this.random()*3);this.phasePowers=[powers.splice(first,1)[0],powers[Math.floor(this.random()*2)]];this.bossStyle=this.random()<.5?'mage':'range';this.log('Game','Click a hand to attack. Click the ground to move.');
  }
  log(type,text){this.events.unshift({tick:this.tick,type,text});this.events.length=Math.min(this.events.length,100);}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  get east(){return this.phase===2;}
  get power(){return this.phase>=3?'all':this.phasePowers[this.phase-1];}
  get weapon(){return this.items[this.equipment.weapon];}
  get active(){return !this.won&&(this.hp>0||this.options.invincible);}
  targetRect(target){const west=!this.east;let y=target==='head'?42:target==='mage'?(west?37:47):(west?47:37);return{x:west?23:38,y,w:5,h:5};}
  targetPoint(target){const r=this.targetRect(target);return{x:r.x+r.w/2,y:r.y+r.h/2};}
  canAttack(target){return this.phase===4?target==='head':target!=='head'&&this.handHP[target]>0&&!this.transition;}
  move(tile,walk=false){this.target=null;this.path=findPath(this.position,tile,this.walkable);this.walkOverride=walk;this.destination=this.path.at(-1)||{...this.position};}
  attack(target){if(!this.canAttack(target)){this.log('Game','That part of Olm cannot be attacked right now.');return;}this.target=target;this.path=[];this.destination=null;this.walkOverride=false;}
  equip(index){const id=this.inventory[index],item=this.items[id];if(!item?.slot||!item.wearModels?.length)return false;
    this.inventory[index]=this.equipment[item.slot]||null;this.equipment[item.slot]=id;this.switches++;this.log('Equipment',`You equip ${item.name}.`);return true;}
  unequip(slot){const index=this.inventory.indexOf(null);if(index<0)return;this.inventory[index]=this.equipment[slot];delete this.equipment[slot];}
  drink(index){const id=this.inventory[index];if(![6685,3024].includes(id)||this.tick-this.drinkAt<3)return;
    this.drinkAt=this.tick;
    if(id===6685){this.hp=Math.min(115,this.hp+16);for(const stat of ['attack','strength','magic'])this.stats[stat]=Math.max(1,Math.floor(this.stats[stat]*.9)-2);this.log('Game','You drink some Saradomin brew. Your combat stats are reduced.');}
    else{this.prayerPoints=Math.min(99,this.prayerPoints+32);for(const stat of ['attack','strength','magic'])this.stats[stat]=Math.min(99,this.stats[stat]+32);this.log('Game','You drink some super restore.');}
    this.doses[index]--;if(!this.doses[index]){this.inventory[index]=null;delete this.doses[index];}
  }
  pray(name,offensive=false){if(!offensive&&this.tick<this.prayerLockedUntil){this.log('Game','Lightning has temporarily disabled protection prayers.');return;}if(offensive)this.offensive=this.offensive===name?null:name;else this.protection=this.protection===name?null:name;}
  water(){if(this.inventory.includes(555)&&this.inventory.includes(560)){this.hazards=this.hazards.filter(h=>h.type!=='flame');this.animation=711;this.attackAt=this.tick;this.log('Spell','You extinguish the flame wall.');}}
  hitPlayer(amount,style){if(this.protection===style)amount=Math.floor(amount*.4);if(!this.options.invincible&&this.options.method!=='demo')this.hp=Math.max(0,this.hp-amount);this.effects.push({type:'player-hit',damage:amount,tick:this.tick});}
  applyMovement(){this.previous={...this.position};const steps=this.run&&!this.walkOverride?2:1;this.motionPace=steps;
    this.motionPath=[{...this.position}];
    for(let n=0;n<steps&&this.path.length&&this.tick>=this.boundUntil;n++){const next=this.path[0];if(this.hazards.some(h=>h.type==='flame'&&this.tick>=h.due&&this.tick<h.until&&Math.abs(next.y-h.y)===1))break;this.path.shift();this.facing=Math.atan2(next.x-this.position.x,-(next.y-this.position.y));this.position=next;this.motionPath.push({...next});}
    this.animation=distance(this.previous,this.position)?steps===2?824:819:this.tick-this.attackAt<2?this.animation:808;
  }
  inRange(p=this.position){if(!this.target||!this.weapon)return false;const r=this.targetRect(this.target);return this.weapon.style==='melee'?meleeReach(p,r):rectangleDistance(p,r)<=7;}
  approachTarget(){if(!this.target||!this.canAttack(this.target)||!this.weapon)return;
    this.path=[];this.destination=null;if(this.inRange())return;
    const r=this.targetRect(this.target);let p={...this.position};
    // Interaction pursuit moves diagonally toward the nearest edge. Ground clicks
    // still use the client-style breadth-first route, which can take a different path.
    for(let n=0;n<40&&!this.inRange(p);n++){
      const dx=Math.sign(Math.max(r.x,Math.min(p.x,r.x+r.w-1))-p.x),dy=Math.sign(Math.max(r.y,Math.min(p.y,r.y+r.h-1))-p.y);
      const candidates=[[dx,dy],[dx,0],[0,dy]].filter(([x,y])=>x||y);
      const step=candidates.map(([x,y])=>({x:p.x+x,y:p.y+y})).find(q=>this.walkable.has(key(q))&&(!(q.x!==p.x&&q.y!==p.y)||(this.walkable.has(`${q.x},${p.y}`)&&this.walkable.has(`${p.x},${q.y}`))));
      if(!step)break;this.path.push(step);p=step;
    }
    this.destination=this.path.at(-1)||null;
  }
  playerAttack(){if(this.tick<this.boundUntil||!this.target||this.cooldown>0||!this.canAttack(this.target))return;const weapon=this.weapon;if(!weapon)return;
    if(!this.inRange()){
      return;
    }
    this.path=[];this.destination=null;const point=this.targetPoint(this.target);this.facing=Math.atan2(point.x-(this.position.x+.5),-(point.y-(this.position.y+.5)));
    this.cooldown=weapon.speed||4;this.attackAt=this.tick;this.animation=weapon.attackAnim||8145;this.attackCount++;
    const correct=(this.target==='mage'&&weapon.style==='mage')||(this.target==='melee'&&weapon.style==='melee')||(this.target==='head'&&weapon.style==='range');
    const pieces=['body','legs','neck'].filter(slot=>this.items[this.equipment[slot]]?.style===weapon.style).length;
    const stat=weapon.style==='mage'?this.stats.magic:weapon.style==='melee'?this.stats.strength:99;
    const roll=this.random(),hit=this.options.accuracy==='always'||roll<.93;
    let damage=hit?Math.floor((20+this.random()*18)*(.55+pieces*.15)*stat/99):0;
    if(!correct)damage=Math.floor(damage*.34);
    if(this.offensive===weapon.style)damage=Math.floor(damage*1.15);
    if(this.forceSplash&&weapon.style==='mage'){damage=0;this.forceSplash=false;}
    this.lastHandAttempt[this.target]=this.tick;const target=this.target,delay=weapon.style==='melee'?0:2;
    this.pendingHits.push({target,damage,style:weapon.style,due:this.tick+delay,hitSlot:0});
    if(this.equipment.weapon===22325)for(let hitSlot=1;hitSlot<=2;hitSlot++)this.pendingHits.push({target,damage:this.options.accuracy==='always'||this.random()<.93?Math.floor(damage/2**hitSlot):0,style:weapon.style,due:this.tick,hitSlot});
    this.effects.push({type:'attack',target,animation:this.animation,style:weapon.style,damage,tick:this.tick,from:{...this.position}});
    this.trace.push({type:'player',tick:this.tick,target,style:weapon.style,position:{...this.position},damage});
    if(!damage&&weapon.style==='mage'){this.feedback='Splash: keep the four-tick rhythm. If Olm turns centre, protect against the next auto.';this.log('Coach',this.feedback);}
    this.resolveHits();
  }
  resolveHits(){
    for(const hit of this.pendingHits.filter(h=>h.due<=this.tick)){
      if(!this.handHP[hit.target])continue;
      let damage=hit.damage;if(hit.target==='melee'&&this.tick<this.clenchUntil)damage=0;
      const healing=hit.target==='melee'&&this.tick<this.healUntil;
      if(healing)this.handHP.melee=Math.min(this.options.handHealth,this.handHP.melee+damage);else this.handHP[hit.target]=Math.max(0,this.handHP[hit.target]-damage);
      if(damage>0&&!healing){this.lastHandHit[hit.target]=this.tick;if(hit.target==='melee')this.clenchDamage+=damage;}
      this.effects.push({type:'hand-hit',target:hit.target,damage,healing,hitSlot:hit.hitSlot||0,tick:this.tick});
      if(!this.handHP[hit.target]){if(hit.target!=='head'&&this.deadAt[hit.target]==null)this.deadAt[hit.target]=this.tick;this.log('Game',hit.target==='head'?'Great Olm is defeated.':(hit.target==='mage'?'Right':'Left')+' claw falls.');if(this.target===hit.target)this.target=null;}
    }
    this.pendingHits=this.pendingHits.filter(h=>h.due>this.tick);
  }
  headSide(){let y=this.east?88-this.position.y:this.position.y;
    if(this.headFacing==='mage'&&y<=44||this.headFacing==='melee'&&y>=44||this.headFacing==='middle'&&y>=39&&y<=49)return this.headFacing;
    if(y<=38)return'mage';if(y>=50)return'melee';
    const side=y<44?'mage':'melee',recent=hand=>this.lastHandHit[hand]!=null&&this.tick-this.lastHandHit[hand]<=4;
    if(recent(side)){this.scanReason='recent '+side+' hand damage';return side;}
    // A recent hit on the opposite half cannot pull the head across the player.
    // Without a damage cue, scanning may settle on centre (the splash case).
    this.scanReason='no recent damage cue';
    if(recent(side==='mage'?'melee':'mage'))return'middle';
    return this.handHP[side]>0&&this.lastHandAttempt[side]!=null&&this.tick-this.lastHandAttempt[side]<=4&&this.random()>=.5?side:'middle';
  }
  bossAction(){
    const slot=this.bossCycle++%4,basic=this.phase===4||slot===0||slot===2,owed=this.catchUp;this.catchUp=false;
    const kinds=this.phase===3?['crystal','lightning','portal','heal']:['crystal','lightning','portal'];
    const special=this.phase<4&&slot===3?kinds[this.specialIndex++%kinds.length]:null;
    this.scanReason='player position';const desired=this.headSide();this.trace.push({type:'olm',tick:this.tick,slot,special,from:this.headFacing,to:desired,turned:desired!==this.headFacing,position:{...this.position},reason:this.scanReason});
    if(desired!==this.headFacing){const fromFacing=this.headFacing;this.headFacing=desired;this.turns++;this.catchUp=basic;this.lastBossAction=`Turn (${basic?'basic skipped':special||'empty'})`;this.effects.push({type:'turn',fromFacing,side:desired,facing:desired,tick:this.tick});this.log('Olm',this.lastBossAction);return;}
    if(this.phase<3&&slot===1&&this.handHP.mage>0&&this.handHP.melee>0&&this.tick>=this.nextClench&&this.clenchDamage>=this.options.handHealth*.05){this.clenchUntil=this.tick+8;this.nextClench=this.tick+50;this.clenchDamage=0;this.log('Olm','The left claw clenches for eight ticks.');}
    this.lastBossAction=this.phase===4?'Head attack':basic?`Basic ${slot===0?1:2}`:special||'Empty';
    if(special&&this.handHP.melee>0&&this.phase<4&&this.tick>=this.clenchUntil&&this.options.method!=='demo')this.special(special);
    if(!basic&&!owed&&this.phase<4&&this.options.method!=='demo'){if(!special)this.log('Olm','Empty attack.');return;}
    if(owed&&!basic)this.lastBossAction+=' + catch-up';
    this.trace.push({type:'auto',tick:this.tick,slot});
    if(this.options.mechanics==='full'&&this.options.method!=='demo'){const choice=this.random();if(this.tick>=this.powerReady&&choice<.2){this.powerReady=this.tick+16;this.olmAttacks++;this.phaseAttack();return;}if(choice<.3){this.olmAttacks++;this.sphere();return;}}
    const style=this.bossStyle,damage=15+Math.floor(this.random()*20);this.olmAttacks++;if(this.random()<.2)this.bossStyle=style==='mage'?'range':'mage';
    this.effects.push({type:'olm-projectile',style,facing:this.headFacing,aim:{...this.position},tick:this.tick,damage});this.incoming.push({due:this.tick+2,damage:this.protection===style?Math.floor(damage*.4):damage});this.log('Olm',`${style==='mage'?'Magic':'Ranged'} attack.`);
  }
  demoMovement(){const stops=[{x:29,y:38},{x:29,y:44},{x:29,y:50},{x:29,y:44}],stop=stops[this.demoIndex];
    if(key(this.position)===key(stop)){this.path=[];if(++this.demoHold<8)return;this.demoHold=0;this.demoIndex=(this.demoIndex+1)%stops.length;}
    if(!this.path.length)this.move(stops[this.demoIndex]);
  }
  randomTile(){const cells=[...this.walkable],values=cells[Math.floor(this.random()*cells.length)].split(',').map(Number);return{x:values[0],y:values[1]};}
  sphere(style=['melee','range','mage'][Math.floor(this.random()*3)]){
    if(this.protection){this.protection=null;this.prayerPoints=Math.floor(this.prayerPoints/2);}
    this.incoming.push({due:this.tick+3,sphere:style});this.effects.push({type:'olm-projectile',style,sphere:true,facing:this.headFacing,aim:{...this.position},tick:this.tick});this.lastBossAction+=' · '+style+' sphere';this.log('Olm','Prayer sphere: protect from '+style+' before impact.');
  }
  phaseAttack(forced){
    const power=this.power==='all'?['acid','flame','crystal'][Math.floor(this.random()*3)]:this.power;
    const type=forced||({acid:['acid-splat','acid-trail'],flame:['burn','flame'],crystal:['bomb','shards']}[power][Math.floor(this.random()*2)]);
    if(type==='acid-splat')for(let i=0;i<8;i++){const p=i?this.randomTile():this.position;this.addHazard('acid',p.x,p.y,2,20);}
    if(type==='acid-trail')this.trailUntil=this.tick+12;
    if(type==='burn')for(let i=0;i<6;i++)this.burns.push(this.tick+i*8);
    if(type==='bomb')this.addHazard('bomb',this.position.x,this.position.y,5,1);
    if(type==='shards')this.shardsUntil=this.tick+12;
    if(type==='flame'){
      const visible=y=>{const n=this.east?88-y:y;return this.headFacing==='middle'?n>=39&&n<=49:this.headFacing==='mage'?n<=44:n>=44;};
      if(visible(this.position.y-1)&&visible(this.position.y+1)&&this.walkable.has(key({x:this.position.x,y:this.position.y-1}))&&this.walkable.has(key({x:this.position.x,y:this.position.y+1})))this.addHazard('flame',this.position.x,this.position.y,1,8);
      else this.log('Olm','The flame walls cannot form at this tile.');
    }
    this.effects.push({type:'olm-power',facing:this.headFacing,tick:this.tick});this.lastBossAction+=' · '+type;this.log('Olm',type+' attack.');
  }
  special(type){
    this.trace.push({type:'special',tick:this.tick,special:type});this.effects.push({type:'hand-special',special:type,tick:this.tick});
    if(type==='crystal')this.addHazard('burst',this.position.x,this.position.y,3,1);
    if(type==='lightning')for(let x=29;x<=36;x+=2){const north=this.random()<.5;this.hazards.push({type:'lightning',x,y:north?35:51,startY:north?35:51,direction:north?1:-1,due:this.tick+2,until:this.tick+19});}
    if(type==='portal'){let p=this.randomTile();while(distance(p,this.position)>10)p=this.randomTile();this.addHazard('portal',p.x,p.y,8,1);}
    if(type==='heal'){this.healUntil=this.tick+8;this.log('Olm','The left hand begins to heal.');}
    this.log('Olm',type+' special.');
  }
  addHazard(type,x,y,delay,duration){this.hazards.push({type,x,y,due:this.tick+delay,until:this.tick+delay+duration});}
  hazardsTick(){
    for(const hit of this.incoming.filter(h=>h.due<=this.tick))this.hitPlayer(hit.sphere?(this.protection===hit.sphere?0:Math.floor(this.hp/2)):hit.damage,'none');
    this.incoming=this.incoming.filter(h=>h.due>this.tick);
    for(const due of this.burns.filter(t=>t<=this.tick)){this.hitPlayer(5,'none');for(const stat of Object.keys(this.stats))this.stats[stat]=Math.max(1,this.stats[stat]-2);this.log('Game','Burn with me!');}this.burns=this.burns.filter(t=>t>this.tick);
    if(this.tick<this.trailUntil)for(const p of this.motionPath.slice(0,-1).length?this.motionPath.slice(0,-1):[this.position])this.addHazard('acid',p.x,p.y,1,20);
    if(this.tick<this.shardsUntil)this.addHazard('crystal',this.position.x,this.position.y,2,1);
    const pools=this.hazards.filter(h=>h.type==='pool'&&this.tick===h.due);
    if(pools.length&&!pools.some(h=>distance(this.position,h)===0)){const damage=10+Math.floor(this.random()*11);this.hitPlayer(damage,'none');this.handHP.head=Math.min(800,this.handHP.head+damage*5);this.log('Olm','Missed healing pools: Olm absorbs health.');}
    for(const h of this.hazards){if(this.tick<h.due||this.tick>=h.until||h.type==='pool')continue;
      if(h.type==='lightning')h.y=h.startY+(this.tick-h.due)*h.direction;
      const d=distance(this.position,h);
      if(h.type==='acid'&&d===0)this.hitPlayer(4,'none');
      if(h.type==='crystal'&&d<=1)this.hitPlayer(d===0?20:12,'none');
      if(h.type==='bomb'&&d<4)this.hitPlayer(60-15*d,'none');
      if(h.type==='burst'&&d===0){this.hitPlayer(25,'none');this.boundUntil=this.tick+2;}
      if(h.type==='lightning'&&d===0){this.hitPlayer(15,'none');this.boundUntil=this.tick+2;this.prayerLockedUntil=this.tick+4;this.protection=null;}
      if(h.type==='portal'){this.hitPlayer(Math.min(50,d*5),'none');this.position={x:h.x,y:h.y};this.previous={...this.position};this.motionPath=[{...this.position}];this.path=[];this.destination=null;this.log('Olm',d?'The portal pulls you across the room.':'The teleport attack has no effect.');}
      if(h.type==='flame'&&this.position.y===h.y&&this.tick===h.until-1)this.hitPlayer(50,'none');
      if(h.type==='flame'&&Math.abs(this.position.y-h.y)===1)this.hitPlayer(5,'none');
    }
    this.hazards=this.hazards.filter(h=>h.until>this.tick);
  }
  next(){if(!this.active)return;this.tick++;this.effects=[];if(this.cooldown>0)this.cooldown--;
    if(this.options.method==='demo'){this.demoMovement();this.applyMovement();if(this.tick>=this.nextBoss){this.nextBoss+=4;this.bossAction();}return;}
    this.resolveHits();
    // NPC targeting observes the tile occupied at the start of the server tick.
    // Movement and the player's attack then resolve, enabling same-tick drags.
    if(!this.transition&&(this.phase===4||this.handHP.mage>0||this.handHP.melee>0)&&this.tick>=this.nextBoss){this.nextBoss+=4;this.bossAction();}
    this.approachTarget();this.applyMovement();
    if(this.protection||this.offensive)this.prayerPoints=Math.max(0,this.prayerPoints-.2-(this.offensive ? .2 : 0));
    if(!this.prayerPoints){this.protection=null;this.offensive=null;}
    this.hazardsTick();
    if(!this.active){this.log('Game','You have died. Reset to practise.');return;}
    if(this.transition){if(this.tick>=this.transition){this.phase++;this.nextPools=this.tick+24;this.handHP.mage=this.options.handHealth;this.handHP.melee=this.options.handHealth;this.deadAt={};this.transition=0;this.headFacing='middle';this.nextBoss=this.tick+4;this.bossCycle=0;this.specialIndex=0;this.catchUp=false;this.lastHandHit={};this.clenchDamage=0;this.clenchUntil=0;this.healUntil=0;this.nextClench=this.tick;this.lastBossAction='Waiting';this.log('Game',this.phase===4?'Olm prepares its final stand. Equip ranged.':`Phase ${this.phase} begins.`);}else if(this.tick%4===0)this.addHazard('crystal',this.position.x,this.position.y,4,1);return;}
    this.playerAttack();
    if(this.phase===3&&!(this.handHP.mage===0&&this.handHP.melee===0))for(const hand of ['mage','melee']){
      if(this.handHP[hand]===0&&this.tick-this.deadAt[hand]>=50){this.handHP[hand]=this.options.handHealth;delete this.deadAt[hand];this.log('Game',`${hand} hand revives. Finish both within thirty seconds.`);}}
    if(this.phase<4&&this.handHP.mage===0&&this.handHP.melee===0){this.target=null;this.pendingHits=[];
      if(this.phase===3){this.phase=4;this.headFacing='middle';this.nextBoss=this.tick+4;this.nextPools=this.tick+24;this.bossCycle=0;this.catchUp=false;this.lastHandHit={};this.log('Game','Both claws fall. The head phase begins—equip ranged.');}
      else{this.transition=this.tick+32;this.log('Game','Both claws fall. Keep moving through the transition.');}return;}
    if(this.phase===4&&this.handHP.head===0){this.won=true;this.log('Game','You have completed the solo encounter.');return;}
    if(this.phase===4&&this.options.mechanics==='full'){if(this.tick%5===0)this.addHazard('crystal',this.position.x,this.position.y,4,1);if(this.tick>=this.nextPools){this.nextPools=this.tick+32;for(let i=0;i<2;i++){const p=this.randomTile();this.addHazard('pool',p.x,p.y,10,3);}this.log('Olm','Stand on a blue healing pool when its countdown ends.');}}
    if(this.trace.length>256)this.trace.splice(0,this.trace.length-256);
    if(this.hp===0)this.log('Game','You have died. Reset or select another phase to practise.');
  }
}
