const names={crystal:'Crystal burst',lightning:'Lightning',portal:'Teleport',heal:'Healing hand',burst:'Crystal burst',bomb:'Crystal bomb',pool:'Healing pools',flame:'Flame-wall damage',acid:'Acid',mage:'Magic sphere',range:'Ranged sphere',melee:'Melee sphere'};
const slots=['Basic 1','Empty','Basic 2','Special'];
const fourToOne=game=>['4:1','scythe'].includes(game.options.method)&&game.phase<4;
export function specialReport(game){
 const e=game.lastSpecial;if(!e||game.transition)return null;
 const tile=`${e.position.x+3200}, ${e.position.y+5696}`,name=names[e.special];
 const detail=e.status==='skipped'?`Head turned ${e.from} → ${e.to} at true tile ${tile}.`:e.status==='disabled'?'Left claw was down.':e.status==='clenched'?'Left claw was clenched.':`Head stayed ${e.from} at true tile ${tile}. ${e.blocked?`Recent movement was blocked by ${e.blocked}.`:'The turn must happen on the special slot; attack cadence alone does not skip it.'}`;
 return{tick:e.tick,status:e.status,title:`${name} ${e.status} · tick ${e.tick}`,detail};
}
export function countdown(due,tick,progress=0){const remaining=Math.max(0,due-tick-progress);return{ticks:Math.ceil(remaining),seconds:remaining*.6};}
export function timingPlan(game,progress=0,{isolated=false}={}){
 if(!game.active)return{rows:[],note:''};
 const rows=[],add=(name,due,kind='hazard')=>rows.push({name,kind,due,...countdown(due,game.tick,progress)});
 if(isolated&&game.tick<4)add('Practice special starts',4,'special');
 if(game.transition)add('Next phase',game.transition,'cycle');
 else if(!isolated&&game.options.method!=='demo'&&game.nextBoss<1e9){
  const slot=game.bossCycle%4;
  add(game.phase===4?'Next Olm look':`${slots[slot]}${fourToOne(game)?slot===2||slot===3?' · turn head':slot===0?' · tank / pray':' · hold melee side':''}`,game.nextBoss,'look');
  if(game.phase<4&&game.handHP.melee>0){
   const due=game.nextBoss+((3-game.bossCycle%4+4)%4)*4,kinds=game.phase===3?['crystal','lightning','portal','heal']:['crystal','lightning','portal'];
   add(names[kinds[game.specialIndex%kinds.length]]+' window',due,'special');
   if(due<game.clenchUntil)rows.at(-1).suppressed='Claw clenched';
  }else if(game.phase===4&&game.options.mechanics==='full')add('Next healing pools',game.nextPools,'special');
 }
 const deadlines=new Map(),offer=(name,due)=>{if(due>=game.tick&&(deadlines.get(name)??Infinity)>due)deadlines.set(name,due);};
 for(const h of game.hazards){
  if(h.type==='flame')offer('Escape flame walls',h.until-1);
  else if(h.due>game.tick&&['burst','bomb','crystal','portal','pool','lightning'].includes(h.type))offer((h.type==='crystal'?'Falling crystal':names[h.type])+(h.type==='crystal'?' impact':h.type==='portal'?' swap':h.type==='pool'?' check':''),h.due);
 }
 for(const hit of game.incoming)if(hit.sphere||hit.burn)offer(hit.burn?'Burn impact':names[hit.sphere]+' impact',hit.due);
 if(game.burns.length)offer('Next burn damage',Math.min(...game.burns));
 if(game.healUntil>game.tick)offer('Hand healing ends',game.healUntil);
 for(const [name,due]of [...deadlines].sort((a,b)=>a[1]-b[1]).slice(0,3))add(name,due);
 const note=isolated?'Isolated special practice':game.transition?'Keep moving through falling crystals':game.phase===4?'Keep moving from crystal shadows':!game.handHP.melee?'Left claw down · hand specials disabled':'Head turns can skip a special window';
 return{rows,note,report:specialReport(game)};
}
const key=p=>`${p.x},${p.y}`,distance=(p,h)=>Math.max(Math.abs(p.x-h.x),Math.abs(p.y-h.y));
export function zonePlan(game,{isolated=false}={}){
 const visible=[],danger=[],warning=[],goals=[],turn=[];
 if(!game.active||game.options.method==='demo')return{visible,danger,warning,goals,turn,tile:null,hint:''};
 const headRunning=!isolated&&!game.transition,methodCycle=headRunning&&fourToOne(game),slot=game.bossCycle%4;
 const hazards=game.hazards.filter(h=>h.until>game.tick),cells=[...game.walkable].map(cell=>{const [x,y]=cell.split(',').map(Number);return{x,y};});
 const portal=hazards.find(h=>h.type==='portal'&&h.due>game.tick),pools=hazards.filter(h=>h.type==='pool'&&h.due>game.tick);
 for(const p of cells){
  const y=game.east?88-p.y:p.y,sees=game.headFacing==='middle'?y>=39&&y<=49:game.headFacing==='mage'?y<=44:y>=44;
  if(sees&&headRunning)visible.push(p);
  let bad=false,soon=false,goal=!!(portal&&distance(p,portal)===0||pools.some(h=>distance(p,h)===0));
  for(const h of hazards){
   const d=distance(p,h);
   if(h.type==='burst'&&d===0||h.type==='crystal'&&d<=1||h.type==='bomb'&&d<4||h.type==='acid'&&d===0)bad=true;
   if(h.type==='flame'&&Math.abs(p.y-h.y)===1&&!(h.gaps||[]).includes(key(p)))bad=true;
   if(h.type==='flame'&&p.y===h.y&&h.until-1-game.tick<=2)bad=true;
   if(h.type==='lightning'){
    const current=h.startY+Math.max(0,game.tick-h.due)*h.direction;
    if(p.x===h.x&&p.y===current)bad=true;
    if(p.x===h.x&&p.y===current+h.direction)soon=true;
   }
  }
  if(portal&&portal.due-game.tick<=2&&!goal||pools.length&&Math.min(...pools.map(h=>h.due))-game.tick<=2&&!goal)bad=true;
  if(bad)danger.push(p);else if(goal)goals.push(p);else if(soon)warning.push(p);
  const preferred=methodCycle?slot===2?y<=43:slot===3?y>=50:false:game.headFacing==='middle'?y>=50:!sees;
  if(preferred&&!bad&&!soon&&headRunning)turn.push(p);
 }
 const desiredY=methodCycle?slot===2?43:50:game.headFacing==='middle'?50:game.headFacing==='mage'?(game.options.method==='3:0'?46:47):43;
 const desired={x:game.east?37:28,y:game.east?88-desiredY:desiredY};
 const tile=goals.length?[...goals].sort((a,b)=>distance(a,game.position)-distance(b,game.position))[0]:turn.find(p=>key(p)===key(desired))||[...turn].sort((a,b)=>distance(a,desired)-distance(b,desired)||distance(a,game.position)-distance(b,game.position))[0]||null;
 const sphere=game.incoming.find(h=>h.sphere),bomb=hazards.some(h=>h.type==='bomb'),burst=hazards.some(h=>h.type==='burst');
 const methodHint=slot===2?'Basic 2 next · reach the centre turn tile before Olm looks':slot===3?'Special next · reach the outside melee tile before Olm looks':slot===0?'Basic 1 next · hold the melee side and protect; this is the tanked attack':`Empty next · hold the melee side for your ${game.options.method==='scythe'?'third':'fourth'} hit, then run centre`;
 const hint=sphere?`Protect from ${sphere.sphere==='range'?'Missiles':sphere.sphere==='mage'?'Magic':'Melee'} before sphere impact`:portal?'Reach the marked teleport tile before the swap':pools.length?'Stand on a marked blue pool for its check':game.healUntil>game.tick?'Left claw healing · stop attacking until the timer ends':bomb?'Crystal bomb · move at least four tiles from the bomb':burst?'Crystal burst · move off the red seed tile':game.transition?'Phase transition · avoid the crystal shadows':isolated?'Avoid the highlighted mechanic tiles':methodCycle?`${game.options.method==='scythe'?'Scythe':'4:1'} · ${methodHint}`:game.headFacing==='middle'?'Middle facing · leave the centre for the outside melee tiles':game.headFacing==='mage'?'Mage facing · cross toward the melee side to turn Olm':'Melee facing · cross toward the mage side to turn Olm';
 return{visible,danger,warning,goals,turn,tile,hint};
}
