import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Encounter} from '../src/engine.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url))),items=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).items;
const make=()=>new Encounter(scene,items,{mechanics:'basic'});
test('water targets one flame tile and opens only that escape gap',()=>{
 const g=make();g.position={x:32,y:44};g.addHazard('flame',32,44,0,8);
 assert.equal(g.water({x:32,y:44}),false);assert.equal(g.water({x:32,y:43}),true);assert.equal(g.water({x:32,y:43}),false);
 assert.equal(g.hazards.length,1);assert.deepEqual(g.hazards[0].gaps,['32,43']);
 g.move({x:32,y:42});g.applyMovement();assert.deepEqual(g.position,{x:32,y:42});
 g.position={x:33,y:44};g.move({x:33,y:42});g.applyMovement();assert.deepEqual(g.position,{x:33,y:44});
});
test('one scythe swing resolves three hits without counting three attacks',()=>{
 const g=new Encounter(scene,items,{method:'scythe',accuracy:'always',mechanics:'basic'});g.position={x:28,y:47};g.attack('melee');g.next();const hits=g.effects.filter(e=>e.type==='hand-hit');assert.equal(g.attackCount,1);assert.equal(g.cooldown,5);assert.equal(hits.length,3);assert.deepEqual(hits.map(h=>h.damage),[hits[0].damage,Math.floor(hits[0].damage/2),Math.floor(hits[0].damage/4)]);
});
test('sphere removes prayer at launch and checks the new prayer at impact',()=>{
 const g=make();g.protection='mage';g.prayerPoints=80;g.sphere('range');assert.equal(g.protection,null);assert.equal(g.prayerPoints,40);g.protection='range';g.tick=3;g.hazardsTick();assert.equal(g.hp,99);g.sphere('mage');g.tick=6;g.hazardsTick();assert.equal(g.hp,50);
});
test('melee hand clenches only in early phases while the mage hand remains alive',()=>{
 const g=make();g.position={x:28,y:48};g.headFacing='melee';g.bossCycle=1;g.tick=8;g.clenchDamage=30;g.bossAction();assert.equal(g.clenchUntil,16);g.tick=60;g.phase=3;g.clenchUntil=0;g.bossCycle=1;g.clenchDamage=100;g.bossAction();assert.equal(g.clenchUntil,0);
});
test('portal damage scales by distance and teleports after eight ticks',()=>{
 const g=make();g.position={x:28,y:43};g.addHazard('portal',32,43,8,1);g.tick=7;g.hazardsTick();assert.equal(g.hp,99);g.tick=8;g.hazardsTick();assert.equal(g.hp,79);assert.deepEqual(g.position,{x:32,y:43});
});
test('bomb damage falls by 15 per tile; four tiles clear its radius',()=>{
 for(const [distance,damage]of [[0,60],[1,45],[2,30],[3,15],[4,0]]){const g=make();g.position={x:28+distance,y:43};g.addHazard('bomb',28,43,0,1);g.hazardsTick();assert.equal(g.hp,99-damage);}
});
test('healing pools require occupancy on the final tick, not earlier',()=>{
 for(const safe of [true,false]){const g=make();g.phase=4;g.handHP.head=400;g.position={x:28,y:43};g.addHazard('pool',28,43,10,3);g.tick=9;g.hazardsTick();if(!safe)g.position.x=30;g.tick=10;g.hazardsTick();assert.equal(g.hp===99,safe);assert.equal(g.handHP.head===400,safe);}
});
test('lightning moves one tile each tick and locks protection prayer briefly',()=>{
 const g=make();g.position={x:30,y:40};g.protection='mage';g.hazards=[{type:'lightning',x:30,y:35,startY:35,direction:1,due:1,until:18}];g.tick=5;g.hazardsTick();assert.equal(g.hp,99);g.tick=6;g.hazardsTick();assert.equal(g.hp,84);assert.equal(g.protection,null);g.pray('mage');assert.equal(g.protection,null);g.tick=10;g.pray('mage');assert.equal(g.protection,'mage');
});
