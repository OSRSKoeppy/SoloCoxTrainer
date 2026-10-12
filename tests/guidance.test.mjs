import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Encounter} from '../src/engine.mjs';
import {timingPlan,zonePlan,countdown} from '../src/guidance.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url))),items=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).items;
const make=options=>new Encounter(scene,items,{invincible:true,mechanics:'basic',...options});
const has=(cells,x,y)=>cells.some(p=>p.x===x&&p.y===y);

test('special countdown follows actual cycle slots and advances after a skipped special',()=>{
 const g=make();assert.equal(timingPlan(g).rows.find(r=>r.kind==='special').due,16);assert.equal(timingPlan(g).rows.find(r=>r.kind==='special').name,'Crystal burst window');
 for(let i=0;i<12;i++)g.next();assert.equal(timingPlan(g).rows.find(r=>r.kind==='special').ticks,4);
 g.position={x:28,y:50};g.headFacing='middle';for(let i=0;i<4;i++)g.next();assert.equal(g.trace.at(-1).turned,true);assert.equal(g.hazards.length,0);
 const next=timingPlan(g).rows.find(r=>r.kind==='special');assert.equal(next.name,'Lightning window');assert.equal(next.ticks,16);
});

test('phase three includes healing, while disabled hands, transitions and head phase have the correct timers',()=>{
 const g=make({phase:3});g.specialIndex=3;assert.equal(timingPlan(g).rows.find(r=>r.kind==='special').name,'Healing hand window');
 g.handHP.melee=0;assert.equal(timingPlan(g).rows.some(r=>r.kind==='special'),false);assert.match(timingPlan(g).note,/disabled/);
 g.transition=32;assert.equal(timingPlan(g).rows[0].name,'Next phase');g.transition=0;g.phase=4;g.options.mechanics='full';assert.equal(timingPlan(g).rows.find(r=>r.kind==='special').name,'Next healing pools');
 g.options.invincible=false;g.hp=0;assert.deepEqual(timingPlan(g).rows,[]);
});
test('sphere and healing instructions take priority over general head-running advice',()=>{
 const g=make({phase:3});g.healUntil=8;assert.match(zonePlan(g).hint,/stop attacking/);g.incoming.push({due:3,sphere:'range'});assert.match(zonePlan(g).hint,/Protect from Missiles/);
});

test('countdowns track game seconds, active deadlines and isolated practice without inventing phase-attack predictions',()=>{
 assert.deepEqual(countdown(8,5,.5),{ticks:3,seconds:1.5});
 const g=make();g.nextBoss=Number.MAX_SAFE_INTEGER;assert.equal(timingPlan(g,0,{isolated:true}).rows[0].name,'Practice special starts');
 g.tick=4;g.addHazard('portal',32,44,8,1);g.addHazard('crystal',33,44,2,1);g.incoming.push({sphere:'mage',due:7});
 const plan=timingPlan(g,.5,{isolated:true});assert.deepEqual(plan.rows.map(r=>r.name),['Falling crystal impact','Magic sphere impact','Teleport swap']);assert.ok(Math.abs(plan.rows[0].seconds-.9)<1e-9);
 const a=JSON.stringify(g);timingPlan(g,.25);zonePlan(g);assert.equal(JSON.stringify(g),a,'guidance must not mutate combat or consume random rolls');
});

test('middle-facing zones mark the centre and recommend outside melee tiles on both walls',()=>{
 for(const phase of [1,2]){const g=make({phase});g.headFacing='middle';const plan=zonePlan(g),x=g.east?37:28,out=g.east?38:50;
  assert.ok(has(plan.visible,x,44));assert.ok(!has(plan.visible,x,out));assert.ok(has(plan.turn,x,out));assert.deepEqual(plan.tile,{x,y:out});assert.match(plan.hint,/outside melee/);
 }
});

test('side-facing zones respect the shared centre boundary and mage method entry',()=>{
 const g=make({method:'3:0'});g.headFacing='mage';let plan=zonePlan(g);assert.ok(has(plan.visible,28,44));assert.ok(!has(plan.visible,28,45));assert.equal(plan.tile.y,46);
 g.headFacing='melee';plan=zonePlan(g);assert.ok(has(plan.visible,28,44));assert.ok(!has(plan.visible,28,43));assert.equal(plan.tile.y,43);
});

test('hazard footprints override recommended sectors and show portal goals and the next lightning tile',()=>{
 const g=make();g.headFacing='middle';g.addHazard('bomb',28,50,5,1);let plan=zonePlan(g);assert.ok(has(plan.danger,28,50));assert.ok(!has(plan.turn,28,50));assert.ok(!has(plan.danger,32,50));assert.notDeepEqual(plan.tile,{x:28,y:50});
 g.hazards=[];g.addHazard('portal',32,44,8,1);plan=zonePlan(g);assert.ok(has(plan.goals,32,44));assert.deepEqual(plan.tile,{x:32,y:44});g.tick=6;plan=zonePlan(g);assert.ok(has(plan.danger,28,50));assert.ok(!has(plan.danger,32,44));
 g.hazards=[{type:'lightning',x:30,startY:35,direction:1,due:1,until:18}];g.tick=5;plan=zonePlan(g);assert.ok(has(plan.danger,30,39));assert.ok(has(plan.warning,30,40));
 const isolated=zonePlan(g,{isolated:true});assert.equal(isolated.visible.length,0);assert.equal(isolated.turn.length,0);assert.ok(isolated.danger.length);
});

test('transition crystal hazards stay highlighted and extinguished flame tiles are removed',()=>{
 const g=make();g.transition=32;g.addHazard('crystal',32,44,4,1);let plan=zonePlan(g);assert.equal(plan.visible.length,0);assert.ok(has(plan.danger,33,45));
 g.transition=0;g.hazards=[];g.addHazard('flame',32,44,1,8);g.hazards[0].gaps=['32,43'];plan=zonePlan(g);assert.ok(!has(plan.danger,32,43));assert.ok(has(plan.danger,33,43));
});
