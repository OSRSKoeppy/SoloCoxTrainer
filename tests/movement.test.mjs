import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Encounter,findPath} from '../src/engine.mjs';
import {PRACTICE_TILES,meleeReach,mapPoint,mapTile} from '../src/tiles.mjs';
import {TickClock} from '../src/clock.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url)));
const items=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).items;
const encounter=options=>new Encounter(scene,items,{invincible:true,mechanics:'basic',...options});

test('published Olm markers are reachable and west claw footprint cannot be walked into',()=>{
 const e=encounter();for(const tile of PRACTICE_TILES){assert.ok(e.walkable.has(`${tile.x},${tile.y}`));assert.deepEqual(findPath(e.position,tile,e.walkable).at(-1),tile);}
 for(let y=37;y<=51;y++){assert.ok(!e.walkable.has(`27,${y}`));assert.ok(e.walkable.has(`28,${y}`));}
 assert.equal(meleeReach({x:28,y:46},e.targetRect('melee')),false);
 assert.equal(meleeReach({x:28,y:47},e.targetRect('melee')),true);
});
test('minimap tile centres round-trip without the old north/south off-by-one',()=>{
 for(const key of encounter().walkable){const [x,y]=key.split(',').map(Number);assert.deepEqual(mapTile(mapPoint({x,y})),{x,y});}
});
test('Synq pathing examples: seven and eight running tiles both need four ticks',()=>{
 for(const tiles of [7,8]){const e=encounter();e.position={x:28,y:38};e.move({x:28,y:38+tiles});for(let t=1;t<=4;t++){e.next();assert.equal(e.position.y,38+Math.min(tiles,t*2));}assert.equal(e.path.length,0);}
});
test('dragging from two tiles away moves and attacks on the same tick',()=>{
 const e=encounter();e.position={x:30,y:48};e.attack('melee');e.next();assert.deepEqual(e.position,{x:28,y:48});assert.equal(e.attackCount,1);assert.equal(e.cooldown,4);
 const mage=encounter({method:'3:0'});mage.position={x:28,y:50};mage.attack('mage');mage.next();assert.deepEqual(mage.position,{x:28,y:48});assert.equal(mage.attackCount,1);
});
test('a new ground click redirects from the true tile and cancels auto-attack',()=>{
 const e=encounter();e.position={x:28,y:48};e.move({x:28,y:38});e.next();assert.deepEqual(e.position,{x:28,y:46});e.move({x:32,y:46});e.next();assert.deepEqual(e.position,{x:30,y:46});assert.deepEqual(e.motionPath,[{x:28,y:46},{x:29,y:46},{x:30,y:46}]);assert.equal(e.target,null);
});
test('the crossed running tile does not take acid damage; the true tile does',()=>{
 const e=encounter();e.options.invincible=false;e.position={x:28,y:48};e.addHazard('acid',28,47,0,4);e.move({x:28,y:46});e.next();assert.equal(e.hp,99);e.addHazard('acid',28,46,0,4);e.next();assert.equal(e.hp,95);
});
test('slow frames preserve all 600ms ticks and deliver separate event timestamps',()=>{
 const clock=new TickClock(),events=[];for(let i=0;i<10;i++)clock.advance(180,1,t=>events.push(t));assert.deepEqual(events,[600,1200,1800]);assert.equal(clock.progress,0);
 clock.advance(150,.5,t=>events.push(t));assert.equal(clock.animationTime,1875);assert.equal(clock.progress,.125);clock.reset();clock.advance(1800,1,t=>events.push(t));assert.deepEqual(events.slice(-3),[600,1200,1800]);
});
test('turns consume cycle slots; a skipped basic catches up once at the empty event',()=>{
 const e=encounter();e.position={x:28,y:50};e.bossAction();assert.equal(e.bossCycle,1);assert.equal(e.turns,1);assert.equal(e.olmAttacks,0);e.bossAction();assert.equal(e.olmAttacks,1);assert.equal(e.catchUp,false);assert.match(e.lastBossAction,/catch-up/);
 e.bossAction();assert.equal(e.olmAttacks,2);e.bossAction();assert.equal(e.specialIndex,1);assert.ok(e.hazards.some(h=>h.type==='burst'));
});
test('skipped specials advance; mage hand death does not disable melee-hand specials',()=>{
 const e=encounter({phase:3});e.handHP.mage=0;e.bossCycle=3;e.position={x:28,y:50};e.bossAction();assert.equal(e.specialIndex,1);assert.equal(e.hazards.length,0);e.bossCycle=7;e.bossAction();assert.ok(e.hazards.some(h=>h.type==='lightning'));
 e.handHP.melee=0;e.bossCycle=11;e.hazards=[];e.bossAction();assert.equal(e.hazards.length,0);
});
