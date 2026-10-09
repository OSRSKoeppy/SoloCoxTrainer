import {initInterface,PRAYERS,EQUIPMENT} from './interface.mjs';
import {initAppInstall} from './pwa.mjs';
import {Encounter,METHODS,TICK_MS} from './engine.mjs';
import {View,loadAssets,asset} from './render.mjs';
import {mapPoint,mapTile} from './tiles.mjs';
import {DRILLS,prepareDrill,driveDrill,assessDrill} from './practice.mjs';
import {TickClock} from './clock.mjs';
import {SPECIAL_PRACTICE,triggerSpecial,specialCue} from './special-practice.mjs';
(async()=>{
const $=id=>document.getElementById(id),clock=new TickClock();let game,view,icons,manifest,playing=false,lastTime=performance.now(),tab='inventory',uiVersion='',speed=1,coaching=false,rehearsal=null,endingTime=0,specialPractice=null,selectedSpell=false;
initInterface();initAppInstall();
for(const [key,info]of Object.entries(SPECIAL_PRACTICE))$('special-select').add(new Option(info.name,key));
$('special-select').onchange=()=>$('special-description').textContent=SPECIAL_PRACTICE[$('special-select').value].hint;$('special-select').onchange();
function stopSpecialPractice(){if(!specialPractice)return;Object.assign(game.options,specialPractice.options);specialPractice=null;$('mechanics').value=game.options.mechanics;$('invincible').checked=game.options.invincible;}
$('practice-special').onclick=()=>{
  restart();const kind=$('special-select').value;specialPractice={kind,options:{...game.options}};
  game.options.phase=kind==='pools'?4:3;game.options.method='full';game.options.mechanics='basic';game.options.invincible=true;game.reset();
  game.position={x:32,y:44};game.previous={...game.position};game.motionPath=[{...game.position}];game.nextBoss=Number.MAX_SAFE_INTEGER;view.reset();clock.reset();
  $('phase').value=game.phase;$('method').value='full';$('mechanics').value='basic';$('invincible').checked=true;
  game.feedback=SPECIAL_PRACTICE[kind].hint;setSpeed(1);playing=true;lastTime=performance.now();$('settings-dialog').close();updateUI();
};
$('retry-special').onclick=()=>$('practice-special').onclick();
for(const [id,m]of Object.entries(METHODS))$('method').add(new Option(m.name,id));
function setTab(name,toggle=false){const closed=toggle&&tab===name&&!document.body.classList.contains('panel-closed');document.body.classList.toggle('panel-closed',closed);tab=name;document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==name);document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===name&&!closed);b.setAttribute('aria-expanded',String(b.dataset.tab===name&&!closed));});uiVersion='';updateUI();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab,true));
$('play').onclick=()=>{playing=!playing;lastTime=performance.now();updateUI();};
$('reset').onclick=()=>restart();
function stopRehearsal(){if(rehearsal){Object.assign(game.options,rehearsal);rehearsal=null;$('watch-drill').textContent='Watch method';}}
function tickGame(time){if(rehearsal)driveDrill(game);game.next();if(specialPractice&&game.tick===4)triggerSpecial(game,specialPractice.kind);assessDrill(game);view.tick(game,time);if(rehearsal&&game.tick>=DRILLS[game.options.method].period*3){stopRehearsal();playing=false;game.feedback+=' Demonstration complete. Use Clean setup to try it yourself.';}}
$('setup-drill').onclick=()=>{restart();prepareDrill(game);view.reset();playing=false;updateUI();};
$('watch-drill').onclick=()=>{if(rehearsal){stopRehearsal();updateUI();return;}restart();prepareDrill(game);rehearsal={accuracy:game.options.accuracy,mechanics:game.options.mechanics,invincible:game.options.invincible};game.options.accuracy='always';game.options.mechanics='basic';game.options.invincible=true;view.reset();setSpeed(.5);playing=true;lastTime=performance.now();$('watch-drill').textContent='Take control';updateUI();};
$('splash').onclick=()=>{game.forceSplash=true;game.feedback='The next magic hit will splash. Keep your timing and watch the next head turn.';updateUI();};
$('accuracy').onchange=()=>{stopRehearsal();game.options.accuracy=$('accuracy').value;};
$('mechanics').onchange=()=>{stopRehearsal();game.options.mechanics=$('mechanics').value;};
$('phase').onchange=()=>{stopSpecialPractice();game.options.phase=+$('phase').value;game.options.method=$('phase').value==='4'?'head':$('method').value==='head'?'full':$('method').value;$('method').value=game.options.method;restart();};
$('method').onchange=()=>{stopSpecialPractice();if(game.options.method==='demo'&&$('method').value!=='demo')setSpeed(1);game.options.method=$('method').value;if(game.options.method==='head')game.options.phase=4;else if(game.options.phase===4)game.options.phase=1;restart();};
function setSpeed(value){speed=+value;$('speed').value=$('settings-speed').value=String(speed);}
$('speed').onchange=()=>setSpeed($('speed').value);$('settings-speed').onchange=()=>setSpeed($('settings-speed').value);
$('demo').onclick=()=>{stopSpecialPractice();$('method').value='demo';game.options.method='demo';setSpeed(.5);restart();playing=true;lastTime=performance.now();updateUI();};
$('help').onclick=()=>$('help-dialog').showModal();$('settings').onclick=$('settings-gear').onclick=()=>{$('trainer-menu').open=false;$('settings-dialog').showModal();};document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('invincible').onchange=()=>game.options.invincible=$('invincible').checked;
$('follow-player').onchange=()=>{view.followPlayer=$('follow-player').checked;view.focusInitialized=false;};
$('coaching').onchange=()=>{coaching=$('coaching').checked;document.body.classList.toggle('client-view',!coaching);$('layout').textContent=coaching?'Game view':'Show coaching';};
$('layout').onclick=()=>{$('coaching').checked=!coaching;$('coaching').onchange();};
for(const name of ['trueTile','destination','grid','markers','path'])$('tiles-'+name).onchange=()=>view.tileOptions[name]=$('tiles-'+name).checked;
$('step').onclick=()=>{playing=false;clock.remainder=0;clock.advance(TICK_MS,1,time=>tickGame(time));updateUI();};
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden&&playing){playing=false;updateUI();}});
$('run').onclick=()=>{game.run=!game.run;updateUI();};$('camera-reset').onclick=()=>view.resetCamera();
$('water').onclick=()=>{selectedSpell=!selectedSpell;$('water').classList.toggle('active',selectedSpell);game.feedback=selectedSpell?'Cast water: click a burning flame-wall tile.':'';updateUI();};
function restart(){selectedSpell=false;$('water').classList.remove('active');endingTime=0;stopSpecialPractice();stopRehearsal();game.reset();view.reset();clock.reset();lastTime=performance.now();uiVersion='';$('phase').value=game.phase;$('method').value=game.options.method;updateUI();}
function itemButton(id,index,equipment=false){const button=document.createElement('button');button.className='item'+(equipment?' equipment-item':'');if(!id){button.title='Empty slot';return button;}
  const item=manifest.items[id];button.title=item.name;button.setAttribute('aria-label',equipment?`Remove ${item.name}`:`${item.slot==='supply'?'Drink':'Equip'} ${item.name}`);const img=new Image();img.src=icons[id];img.alt=item.name;button.append(img);
  if(equipment){const label=document.createElement('span');label.textContent=index;button.append(label);button.onclick=()=>{game.unequip(index);uiVersion='';updateUI();};}
  else{if(game.doses[index]||item.slot==='rune'){const amount=document.createElement('span');amount.className='amount';amount.textContent=item.slot==='rune'?'∞':game.doses[index];button.append(amount);}button.onclick=()=>{if(item.slot==='supply'){const before=game.drinkAt;game.drink(index);if(game.drinkAt!==before)view.playerMotion.attack(829,clock.animationTime);}else game.equip(index);uiVersion='';updateUI();};}
  const activate=button.onclick;if(activate){button.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button===0){e.preventDefault();activate();}};button.onclick=e=>{if(e.detail===0||e.pointerType!=='mouse')activate();};}
  return button;
}
const spriteURLs={};
async function makePrayers(){
  for(const [name,id,protection,offensive]of PRAYERS){
    const b=document.createElement('button');b.className='prayer-item';b.title=name;b.setAttribute('aria-label',name);
    const img=new Image();img.src=await asset(manifest.sprites[id].file);img.alt='';b.append(img);
    if(protection||offensive){const key=protection?'protection':'offensive';b.dataset[key]=protection||offensive;b.onclick=()=>{game.pray(protection||offensive,!!offensive);updateUI();};}
    else{b.disabled=true;b.title=name+' · not simulated in this trainer';}
    $('prayers').append(b);
    if(protection){const quick=b.cloneNode(true);quick.onclick=b.onclick;quick.setAttribute('aria-label','Quick '+name);$('quick-prayers').append(quick);}
  }
  for(const [,id]of EQUIPMENT)spriteURLs[id]=await asset(manifest.sprites[id].file);
}
function equipmentButtons(){return EQUIPMENT.map(([slot,sprite,column,row])=>{
  const id=game.equipment[slot],b=itemButton(id,slot,true);b.style.gridColumn=column;b.style.gridRow=row;
  if(!id){const img=new Image();img.src=spriteURLs[sprite];img.alt='';b.append(img);b.title='Empty '+slot+' slot';b.setAttribute('aria-label',b.title);b.disabled=true;}
  return b;
});}
function updateUI(){if(!game)return;$('retry-special').hidden=!specialPractice;$('play').textContent=playing?'Pause':'Start';$('paused').hidden=playing&&game.active;$('paused').textContent=game.won?'Great Olm defeated':!game.active?'You have died · Reset to practise':game.tick?'Paused':'Click Start to practise';
  const targets=game.phase===4?['head']:['mage','melee'];$('boss-bars').replaceChildren(...targets.map(target=>{const bar=document.createElement('div');bar.className='boss-bar';const max=target==='head'?800:game.options.handHealth;const fill=document.createElement('i');fill.style.width=(100*game.handHP[target]/max)+'%';const label=document.createElement('span');label.textContent=`${target==='head'?'Great Olm':target==='mage'?'Right claw':'Left claw'} · ${game.handHP[target]} / ${max}`;bar.append(fill,label);return bar;}));
  const cue=specialCue(game);$('special-cue').hidden=!cue;if(cue){$('special-cue').dataset.tone=cue.tone;$('special-cue').querySelector('strong').textContent=cue.title;$('special-cue').querySelector('span').textContent=cue.detail;}
  $('hp').textContent=game.hp;$('pp').textContent=Math.ceil(game.prayerPoints);$('run-label').textContent=game.run?'Run':'Walk';$('run').classList.toggle('active',game.run);$('run').setAttribute('aria-pressed',String(game.run));$('phase-label').textContent=game.transition?'Phase transition':`Phase ${game.phase} · ${game.phase===4?'Head':game.power}`;$('timing').textContent=`Tick ${game.tick} · Next hit ${game.cooldown?`in ${game.cooldown}t`:'ready'}\nHits ${game.attackCount} · Olm autos ${game.olmAttacks} · Turns ${game.turns}`;$('timing').style.whiteSpace='pre-line';$('coach').textContent=METHODS[game.options.method]?.text||'';$('feedback').textContent=game.feedback;$('drill-controls').hidden=!DRILLS[game.options.method];$('splash').hidden=game.options.method!=='3:0';$('weapon-name').textContent=game.weapon?.name||'Unarmed';$('stats').textContent=`Attack ${game.stats.attack} · Strength ${game.stats.strength} · Magic ${game.stats.magic}`;
  const version=JSON.stringify([game.inventory,game.equipment,game.doses,tab]);if(version!==uiVersion){uiVersion=version;if(tab==='inventory')$('inventory').replaceChildren(...game.inventory.map((id,i)=>itemButton(id,i)));if(tab==='equipment')$('equipment').replaceChildren(...equipmentButtons());}
  for(const key of ['protection','offensive'])document.querySelectorAll('[data-'+key+']').forEach(b=>{const active=b.dataset[key]===game[key];b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('messages').replaceChildren(...game.events.slice(0,5).reverse().map(e=>{const p=document.createElement('p');p.className=`event-${e.type}`;p.textContent=`[${e.tick}] ${e.text}`;return p;}));drawMap();
}
function drawMap(){const ctx=$('map').getContext('2d');ctx.clearRect(0,0,176,176);ctx.fillStyle='#080807';ctx.fillRect(0,0,176,176);for(const t of game.scene.tiles){const p=mapPoint(t);ctx.fillStyle=game.walkable.has(`${t.x},${t.y}`)?'#514840':'#1d1d1a';ctx.fillRect(p.x-4,p.y-4,8,8);}if(game.destination&&game.path.length){const p=mapPoint(game.destination);ctx.strokeStyle='#fff';ctx.strokeRect(p.x-3,p.y-3,6,6);}const player=mapPoint(game.position);ctx.fillStyle='#30e9ef';ctx.fillRect(player.x-2,player.y-2,4,4);ctx.fillStyle='#e33';for(const target of ['mage','melee','head']){const r=game.targetRect(target),p=mapPoint({x:r.x+2,y:r.y+2});ctx.fillRect(p.x-2,p.y-2,4,4);}}
$('map').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),border=e.currentTarget.clientLeft,scale=e.currentTarget.clientWidth;const tile=mapTile({x:(e.clientX-r.left-border)*176/scale,y:(e.clientY-r.top-border)*176/scale});stopRehearsal();game.move(tile);updateUI();};
function action(hit,walk=false){if(!hit)return;if(selectedSpell){if(game.water(hit.tile)){view.playerMotion.attack(711,clock.animationTime);selectedSpell=false;$('water').classList.remove('active');game.feedback='The gap is open. Click through it to escape.';}else game.feedback='Click a burning tile in either flame wall.';updateUI();return;}stopRehearsal();if(hit.target)game.attack(hit.target);else game.move(hit.tile,walk);view.showClick(hit);$('context').hidden=true;updateUI();}
function context(hit,x,y){if(!hit)return;const menu=$('context');menu.replaceChildren();const title=document.createElement('strong');title.textContent='Choose Option';menu.append(title);const b=document.createElement('button');b.textContent=hit.target?`Attack ${hit.target==='mage'?'Right claw':hit.target==='melee'?'Left claw':'Great Olm'}`:'Walk here';b.onclick=()=>action(hit);menu.append(b);const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>menu.hidden=true;menu.append(cancel);const rect=$('viewport').getBoundingClientRect();menu.style.left=Math.min(x-rect.left,rect.width-180)+'px';menu.style.top=Math.min(y-rect.top,rect.height-100)+'px';menu.hidden=false;}
function input(){const el=$('viewport'),pointers=new Map();let drag=null,lastPinch=0;
  el.addEventListener('pointerdown',e=>{if(e.target.closest('#chat,#context,#drill-controls,button'))return;el.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,moved:false,time:performance.now()};else{if(drag)drag.moved=true;const [a,b]=[...pointers.values()];lastPinch=Math.hypot(a.x-b.x,a.y-b.y);}if(e.pointerType==='mouse'&&e.button===0)action(view.pick(e.clientX,e.clientY,game),e.ctrlKey);});
  el.addEventListener('pointermove',e=>{const previous=pointers.get(e.pointerId);if(previous&&drag){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;
    if(pointers.size>=2){view.rotate(e.clientX-previous.x,e.clientY-previous.y);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);view.zoomBy((lastPinch-distance)*4);lastPinch=distance;}
    else if(drag.button===1){view.rotate(e.clientX-drag.lastX,e.clientY-drag.lastY);}drag.lastX=e.clientX;drag.lastY=e.clientY;}
    const hit=view.pick(e.clientX,e.clientY,game);view.hover(hit);$('hover').textContent=hit?.target?`Attack ${hit.target==='mage'?'Right claw':hit.target==='melee'?'Left claw':'Great Olm'} / 2 more options`:hit?.tile?`Walk here · ${hit.tile.x+3200}, ${hit.tile.y+5696}`:'';});
  el.addEventListener('pointerleave',()=>view.hover(null));
  el.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(!drag)return;if(e.pointerType!=='mouse'&&!drag.moved&&drag.button===0)action(view.pick(e.clientX,e.clientY,game),e.ctrlKey);if(!pointers.size)drag=null;});
  el.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;});el.addEventListener('contextmenu',e=>{e.preventDefault();context(view.pick(e.clientX,e.clientY,game),e.clientX,e.clientY);});
  el.addEventListener('wheel',e=>{e.preventDefault();view.zoomBy(e.deltaY);},{passive:false});
  document.addEventListener('keydown',e=>{if(e.target.matches('input,select')||document.querySelector('dialog[open]'))return;const keys={F4:'inventory',F5:'equipment',F6:'prayers',F7:'magic'};if(keys[e.key]){e.preventDefault();setTab(keys[e.key]);}if(e.key.startsWith('Arrow')){e.preventDefault();view.rotate(e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0,e.key==='ArrowUp'?-12:e.key==='ArrowDown'?12:0);}if(e.key==='Escape'){$('context').hidden=true;selectedSpell=false;$('water').classList.remove('active');}});
}
let frames=0,fps=0,fpsTime=performance.now();
function frame(time){const delta=time-lastTime;lastTime=time;if(playing&&game.active&&!document.hidden)clock.advance(delta,speed,tickTime=>{tickGame(tickTime);updateUI();});if(playing&&game.won)endingTime+=delta*speed;view.draw(game,clock.animationTime+endingTime,clock.progress);const head=view.headMotion.sample(clock.animationTime),direction=head.facing==='middle'?'centre':head.facing==='mage'?'mage side':'melee side';$('head-status').textContent=`${head.action==='turn'?'Turning toward':head.action==='attack'?'Attacking':'Facing'} ${direction}`;$('tile-position').textContent=`True tile ${game.position.x+3200}, ${game.position.y+5696}`;$('tick-fill').style.width=`${clock.progress*100}%`;$('cycle-status').textContent=specialPractice?'Isolated special practice':`Olm: ${game.lastBossAction} · next in ${Math.max(0,game.nextBoss-game.tick)}t`;frames++;if(time-fpsTime>=1000){fps=Math.round(frames*1000/(time-fpsTime));frames=0;fpsTime=time;$('render-status').textContent=`${fps} fps · ${speed}×`; }requestAnimationFrame(frame);}
try{const data=await loadAssets((count,total)=>$('load-progress').textContent=`Decoding models ${count} / ${total}`);manifest=data.manifest;game=new Encounter(data.scene,manifest.items);view=new View($('viewport'),$('overlay'),manifest,data.scene,data.models,data.textures,data.playerRig);icons=view.icons();
  await Promise.all([...document.querySelectorAll('[data-sprite]')].map(async img=>img.src=await asset(manifest.sprites[img.dataset.sprite].file)));$('panel').style.backgroundImage=`url("${await asset(manifest.sprites[1031].file)}")`;await makePrayers();$('load').remove();input();updateUI();lastTime=performance.now();requestAnimationFrame(frame);
}catch(e){$('load-progress').textContent=`Unable to start: ${e.message}`;console.error(e);}
})();
