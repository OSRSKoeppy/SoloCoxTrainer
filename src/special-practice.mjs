export const SPECIAL_PRACTICE={
  crystal:{name:'Crystal burst',hint:'Move off the seed before the crystal erupts.'},
  lightning:{name:'Lightning',hint:'Keep out of the moving lightning lanes.'},
  portal:{name:'Teleport portal',hint:'Stand on the purple portal before the timer ends.'},
  heal:{name:'Healing hand',hint:'Stop hitting the left claw while the green infinity symbol is visible.'},
  'acid-splat':{name:'Acid spray',hint:'Avoid the green pools.'},
  'acid-trail':{name:'Acid trail',hint:'Keep moving so the acid drops behind you.'},
  burn:{name:'Burn with me',hint:'Watch the burn effect and periodic damage; manage your supplies.'},
  flame:{name:'Flame walls',hint:'Choose the water spell, click a flame tile, then walk through the gap.'},
  bomb:{name:'Crystal bomb',hint:'Get at least four tiles away from the bomb.'},
  shards:{name:'Falling crystals',hint:'Move away from the growing floor shadows.'},
  'sphere-mage':{name:'Magic prayer sphere',hint:'Switch to Protect from Magic before impact.'},
  'sphere-range':{name:'Ranged prayer sphere',hint:'Switch to Protect from Missiles before impact.'},
  'sphere-melee':{name:'Melee prayer sphere',hint:'Switch to Protect from Melee before impact.'},
  pools:{name:'Head healing pools',hint:'Stand on a blue pool when its countdown finishes.'},
};
export function triggerSpecial(game,kind){
  if(!SPECIAL_PRACTICE[kind])throw new Error('Unknown special practice');
  if(['crystal','lightning','portal','heal'].includes(kind))game.special(kind);
  else if(kind.startsWith('sphere-'))game.sphere(kind.slice(7));
  else if(kind==='pools'){
    const y=game.position.y;game.addHazard('pool',30,y,10,3);game.addHazard('pool',35,y,10,3);
    game.effects.push({type:'olm-power',special:'pools',facing:game.headFacing,tick:game.tick});
  }else game.phaseAttack(kind);
  game.feedback=SPECIAL_PRACTICE[kind].hint;
}
export function specialCue(game){
  const sphere=game.incoming.find(h=>h.sphere);
  if(sphere)return{title:`Protect from ${sphere.sphere==='range'?'Missiles':sphere.sphere==='mage'?'Magic':'Melee'}`,detail:`Prayer sphere · ${Math.max(0,sphere.due-game.tick)} ticks`,tone:sphere.sphere};
  if(game.tick<game.prayerLockedUntil)return{title:'Prayer disabled',detail:'Lightning hit · move out of the lane',tone:'danger'};
  const urgent=game.hazards.filter(h=>['portal','pool','flame','bomb','burst'].includes(h.type)).sort((a,b)=>a.due-b.due)[0];
  if(urgent){const names={portal:['Teleport portal','Reach the purple portal'],pool:['Healing pools','Stand on a blue pool'],flame:['Flame walls','Cast a water spell'],bomb:['Crystal bomb','Move four tiles away'],burst:['Crystal burst','Move off the seed']};const [title,detail]=names[urgent.type];return{title,detail:detail+(urgent.due>game.tick?` · ${urgent.due-game.tick} ticks`:''),tone:urgent.type==='pool'?'range':'danger'};}
  if(game.tick<game.healUntil)return{title:'Left claw healing',detail:'Stop attacking the left claw',tone:'range'};
  if(game.tick<game.trailUntil)return{title:'Acid trail',detail:'Keep moving',tone:'range'};
  if(game.burns.length)return{title:'Burn with me',detail:'Periodic burn damage',tone:'danger'};
  if(game.hazards.some(h=>h.type==='lightning'))return{title:'Lightning',detail:'Avoid the moving lanes',tone:'range'};
  if(game.hazards.some(h=>h.type==='crystal'))return{title:'Falling crystals',detail:'Move away from the shadows',tone:'danger'};
  return null;
}
