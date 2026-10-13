import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Encounter} from '../src/engine.mjs';
import {DRILLS,prepareDrill,driveDrill,assessDrill,drillTile} from '../src/practice.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url))),items=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).items;
const make=(method,phase=1)=>{const game=new Encounter(scene,items,{method,phase,accuracy:'always',mechanics:'basic',invincible:true,handHealth:10000});prepareDrill(game);return game;};
const advance=g=>{driveDrill(g);g.next();assessDrill(g);};
test('guide 3:0: same-tick drag, 43-side cast, centre cast; three hits and zero autos on both walls',()=>{
 for(const phase of [1,2]){const g=make('3:0',phase);for(let t=0;t<36;t++)advance(g);
  assert.deepEqual(g.trace.filter(e=>e.type==='player').map(e=>e.tick),[1,5,9,13,17,21,25,29,33]);
  assert.deepEqual(g.trace.filter(e=>e.type==='player').slice(0,3).map(e=>e.position),[48,43,46].map(y=>drillTile(g,y)));
  assert.deepEqual(g.trace.filter(e=>e.type==='olm').slice(0,3).map(e=>e.to),['melee','mage','middle']);assert.equal(g.olmAttacks,0);assert.ok(g.cycles.every(c=>c.ok));
 }
});
test('guide 4:1: skip basic two and special, tank basic one, attack one tick after events',()=>{
 for(const phase of [1,2]){const g=make('4:1',phase);for(let t=0;t<48;t++)advance(g);
  assert.deepEqual(g.trace.filter(e=>e.type==='player').slice(0,4).map(e=>e.tick),[2,6,10,14]);assert.deepEqual(g.trace.filter(e=>e.type==='auto').map(e=>e.tick),[9,25,41]);
  assert.ok(g.trace.filter(e=>e.type==='olm'&&[2,3].includes(e.slot)).every(e=>e.turned));assert.equal(g.trace.filter(e=>e.type==='special').length,0);assert.ok(g.cycles.every(c=>c.ok));
 }
});
test('1:0, 3:1 and five-tick scythe routes keep their distinct periods on both walls',()=>{
 for(const method of ['1:0','3:1','scythe'])for(const phase of [1,2]){const g=make(method,phase),d=DRILLS[method];for(let t=0;t<d.period*3;t++)advance(g);assert.equal(g.attackCount,d.hits*3,method);assert.equal(g.olmAttacks,d.autos*3,method);assert.ok(g.cycles.every(c=>c.ok),method);if(method==='scythe')assert.deepEqual(g.trace.filter(e=>e.type==='player').slice(0,4).map(e=>e.tick),[2,7,12,18]);}
});
test('a first-hit splash can turn centre; continuing the rhythm recovers the next cycle',()=>{
 const g=make('3:0');g.random=()=>.1;g.forceSplash=true;for(let t=0;t<24;t++)advance(g);
 assert.equal(g.trace.find(e=>e.type==='olm'&&e.tick===5).to,'middle');assert.equal(g.olmAttacks,1);assert.deepEqual(g.trace.filter(e=>e.type==='player').map(e=>e.tick),[1,5,9,13,17,21]);assert.equal(g.cycles[0].ok,false);assert.equal(g.cycles[1].ok,true);
});
test('one tick late leaving the first mage hit misses the safe tile at the next scan',()=>{
 const g=make('3:0');for(let t=1;t<=12;t++){if(t===3)g.move(drillTile(g,43));else if(t!==2)driveDrill(g);g.next();assessDrill(g);}
 const scan=g.trace.find(e=>e.type==='olm'&&e.tick===5);assert.equal(scan.position.y,44);assert.equal(scan.turned,false);assert.ok(g.olmAttacks>0);assert.equal(g.cycles[0].ok,false);
});
test('hand damage expires after four ticks and a zero cannot refresh the cue',()=>{
 const g=make('3:0');g.position={x:28,y:43};g.headFacing='melee';g.tick=10;g.lastHandHit.mage=6;assert.equal(g.headSide(),'mage');g.tick=11;assert.equal(g.headSide(),'middle');g.pendingHits=[{target:'mage',damage:0,style:'mage',due:11}];g.resolveHits();assert.equal(g.lastHandHit.mage,6);
});

test('clean 4:1 skips crystal, lightning and teleport for normal rolls across all hand phases',()=>{
 for(const phase of [1,2,3])for(let seed=1;seed<=100;seed++){
  const g=make('4:1',phase);g.options.accuracy='random';g.seed=seed;
  for(let t=0;t<64;t++)advance(g);
  assert.equal(g.trace.filter(e=>e.type==='special').length,0,`phase ${phase}, seed ${seed}`);
  const scans=g.trace.filter(e=>e.type==='olm'&&e.special);
  assert.ok(['crystal','lightning','portal'].every(special=>scans.some(e=>e.special===special&&e.outcome==='skipped')));
 }
});

test('a one-tick late outside run fires each special even with perfect four-tick attacks',()=>{
 for(const phase of [1,2])for(const [index,special]of ['crystal','lightning','portal'].entries()){
  const g=make('4:1',phase);g.specialIndex=index;
  for(let t=1;t<=6;t++){if(t===4)g.move(drillTile(g,50));else if(t!==3)driveDrill(g);g.next();}
  assert.deepEqual(g.trace.filter(e=>e.type==='player').map(e=>e.tick),[2,6]);
  assert.equal(g.lastSpecial.special,special);assert.equal(g.lastSpecial.status,'fired');
  assert.deepEqual(g.lastSpecial.position,drillTile(g,49));
 }
});

test('full mechanics can obstruct a correctly timed 4:1 run and the special result records the obstruction',()=>{
 const g=make('4:1');g.options.mechanics='full';g.options.accuracy='random';g.seed=83531;
 // Use the default encounter seed from reset, including its phase-power rolls.
 g.options.seed=83531;g.reset();prepareDrill(g);
 for(let t=0;t<69;t++)advance(g);
 assert.equal(g.lastSpecial.special,'lightning');assert.equal(g.lastSpecial.status,'fired');assert.equal(g.lastSpecial.blocked,'a flame wall');
 const hits=g.trace.filter(e=>e.type==='player');assert.ok(hits.slice(1).every((hit,i)=>hit.tick-hits[i].tick===4));
 assert.ok(g.trace.some(e=>e.type==='move-blocked'&&e.tick===63));
});
