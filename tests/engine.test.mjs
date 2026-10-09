import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Encounter,findPath,rectangleDistance} from '../src/engine.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url)));
const encounter=options=>new Encounter(scene,manifest.items,{invincible:true,...options});
test('pathing respects blocked diagonals and resolves unreachable clicks',()=>{
 const walkable=new Set(['0,0','1,1','0,1','0,2','1,2']);assert.deepEqual(findPath({x:0,y:0},{x:1,y:1},walkable),[{x:0,y:1},{x:1,y:1}]);
 const path=findPath({x:0,y:0},{x:8,y:8},walkable);assert.deepEqual(path.at(-1),{x:1,y:2});
});
test('game map has an unbroken main floor and hand ranges mirror on phase two',()=>{
 const e=encounter();assert.equal(e.walkable.has('27,48'),false);assert.equal(e.walkable.has('28,48'),true);assert.equal(e.walkable.has('37,52'),false);assert.equal(rectangleDistance({x:28,y:48},e.targetRect('melee')),1);e.phase=2;assert.equal(rectangleDistance({x:37,y:38},e.targetRect('melee')),1);
});
test('gear clicks swap a single slot without resetting weapon cooldown or attack target',()=>{
 const e=encounter();e.position={x:28,y:48};e.attack('melee');e.next();assert.equal(e.cooldown,4);const index=e.inventory.indexOf(12899);e.equip(index);assert.equal(e.equipment.weapon,12899);assert.equal(e.inventory[index],22978);assert.equal(e.cooldown,4);assert.equal(e.target,'melee');assert.equal(e.equipment.body,11832);
});
test('continuous attacks obey weapon cooldown, while a floor click cancels attacking',()=>{
 const e=encounter();e.position={x:28,y:48};e.attack('melee');e.next();for(let i=0;i<3;i++)e.next();assert.equal(e.attackCount,1);e.next();assert.equal(e.attackCount,2);e.move({x:33,y:44});assert.equal(e.target,null);for(let i=0;i<8;i++)e.next();assert.equal(e.attackCount,2);assert.deepEqual(e.position,{x:33,y:44});
});
test('a target click approaches during cooldown and running covers two tiles per tick',()=>{
 const e=encounter();e.position={x:33,y:48};e.cooldown=4;e.attack('melee');e.next();assert.equal(e.position.x,31);assert.equal(e.attackCount,0);assert.equal(e.cooldown,3);e.run=false;e.next();assert.equal(e.position.x,30);
});
test('supplies have doses and combat stat effects; restores recover those stats',()=>{
 const e=encounter();const brew=e.inventory.indexOf(6685),restore=e.inventory.indexOf(3024);e.hp=50;e.drink(brew);assert.equal(e.hp,66);assert.equal(e.stats.magic,87);assert.equal(e.doses[brew],3);e.drink(brew);assert.equal(e.doses[brew],3);for(let i=0;i<3;i++)e.next();e.drink(restore);assert.equal(e.stats.magic,99);assert.equal(e.doses[restore],3);
});
test('three hand phases transition to the ranged head and can be completed',()=>{
 const e=encounter();for(let phase=1;phase<=2;phase++){assert.equal(e.phase,phase);e.handHP.mage=e.handHP.melee=0;e.next();const transition=e.transition;assert.ok(transition);while(e.tick<transition)e.next();}assert.equal(e.phase,3);e.handHP.mage=e.handHP.melee=0;e.next();assert.equal(e.phase,4);assert.equal(e.transition,0);assert.equal(e.nextBoss,e.tick+4);e.handHP.head=0;e.next();assert.equal(e.won,true);
});
test('a lone dead phase-three hand revives after the training revival window',()=>{
 const e=encounter({phase:3});e.handHP.mage=0;e.deadAt.mage=0;for(let i=0;i<50;i++)e.next();assert.equal(e.handHP.mage,600);assert.equal(e.transition,0);
});
test('every extracted model has valid geometry and finite animation coordinates',()=>{
 assert.equal(manifest.failures.length,0);assert.ok(Object.keys(manifest.models).length>=100);let clips=0;
 for(const info of Object.values(manifest.models)){const model=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/assets/'+info.file,import.meta.url))));assert.ok(model.vertices.length>0);for(const face of model.faces)for(const v of face)assert.ok(v>=0&&v<model.vertices.length);for(const clip of Object.values(model.animations)){clips++;assert.equal(clip.frames.length,clip.lengths.length);for(const frame of clip.frames){assert.equal(frame.length,model.vertices.length);for(const vertex of frame)assert.ok(vertex.every(Number.isFinite));}}}
 assert.ok(clips>=280);
});
