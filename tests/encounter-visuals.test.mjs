import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {closestWalkableTile} from '../src/tiles.mjs';
import {convexHull,silhouetteHit} from '../src/picking.mjs';
import {projectilePose} from '../src/effect-timing.mjs';
import {EncounterEffects} from '../src/effects.mjs';
import {Encounter} from '../src/engine.mjs';
import {AnimatedModel} from '../src/render.mjs';
import {triggerSpecial} from '../src/special-practice.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
const game=()=>new Encounter(scene,manifest.items,{mechanics:'basic'});
test('fire and portal transparency frames are preserved and applied to independent face layers',()=>{
 for(const name of ['mage','portal']){
  const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/assets/'+manifest.models[manifest.effects[name].key].file,import.meta.url)))),clip=data.animations[manifest.effects[name].animation];
  assert.equal(clip.alphas.length,clip.frames.length);assert.notDeepEqual(clip.alphas[0],clip.alphas[1]);
  const obj=new AnimatedModel(data,{},true);obj.setAnimation(manifest.effects[name].animation,0);obj.animate(0);
  for(const part of obj.parts){assert.equal(part.mesh.material.transparent,true);assert.equal(part.mesh.material.opacity,1-clip.alphas[0][part.faces[0]]/255);}
  obj.animate(clip.lengths[0]*20);for(const part of obj.parts)assert.equal(part.mesh.material.opacity,1-clip.alphas[1][part.faces[0]]/255);obj.dispose();
 }
});

test('blocked and slightly out-of-room floor clicks resolve to the nearest walkable tile',()=>{
 const g=game();assert.deepEqual(closestWalkableTile({x:27.95,y:43.5},g.walkable),{x:28,y:43});assert.deepEqual(closestWalkableTile({x:38.05,y:48.5},g.walkable),{x:37,y:48});
 for(const cell of g.walkable){const [x,y]=cell.split(',').map(Number);assert.deepEqual(closestWalkableTile({x:x+.99,y:y+.01},g.walkable),{x,y});}
 assert.equal(closestWalkableTile({x:NaN,y:43},g.walkable),null);assert.equal(closestWalkableTile({x:30,y:43},new Set()),null);
 g.move(closestWalkableTile({x:27.9,y:40.5},g.walkable));for(let i=0;i<8;i++)g.next();assert.deepEqual(g.position,{x:28,y:40});
});

test('hand silhouette fills finger gaps and accepts a small edge tolerance without grabbing distant floor clicks',()=>{
 const hull=convexHull([{x:0,y:0},{x:40,y:0},{x:40,y:30},{x:0,y:30},{x:15,y:8},{x:30,y:20}]);
 assert.equal(hull.length,4);assert.equal(silhouetteHit({x:20,y:10},hull),true);assert.equal(silhouetteHit({x:44,y:20},hull,6),true);assert.equal(silhouetteHit({x:47,y:20},hull,6),false);assert.equal(silhouetteHit({x:49,y:20},hull,10),true);assert.equal(silhouetteHit({x:200,y:40},hull,10),false);
});

test('projectile pose reaches its target at the damage time and faces its current flight direction',()=>{
 const from=[0,3,0],to=[6,1,-4];assert.deepEqual(projectilePose(from,to,100,100,1200).position,from);
 assert.deepEqual(projectilePose(from,to,700,100,1200).position,[3,2,-2]);assert.deepEqual(projectilePose(from,to,700,100,1200).direction,[6,-2,-4]);
 assert.deepEqual(projectilePose(from,to,1300,100,1200).position,to);assert.equal(projectilePose(from,to,1299,100,1200).finished,false);assert.equal(projectilePose(from,to,1300,100,1200).finished,true);
 assert.equal(projectilePose(from,to,700,100,1200,1).position[1],3);
});
test('head healing pools launch two blue projectiles at fixed ground targets',()=>{
 const g=game();g.phase=4;g.position={x:32,y:44};triggerSpecial(g,'pools');const shots=g.effects.filter(e=>e.type==='olm-projectile');assert.equal(shots.length,2);assert.deepEqual(shots.map(e=>e.aim),[{x:30,y:44},{x:35,y:44}]);assert.ok(shots.every(e=>e.special==='pool'&&e.groundTarget));
});

test('burn is a launched projectile and only applies burn status and damage after impact',()=>{
 const g=game();g.nextBoss=9999;g.phaseAttack('burn');assert.equal(g.burns.length,0);assert.equal(g.hp,99);assert.equal(g.effects.filter(e=>e.type==='olm-projectile'&&e.special==='burn').length,1);
 g.next();assert.equal(g.burns.length,0);assert.equal(g.hp,99);g.next();assert.equal(g.hp,94);assert.equal(g.burns.length,5);assert.ok(g.events.some(e=>e.text==='Burn with me!'));
});

test('defeated and clenched claws cannot accept attacks or consume a weapon swing',()=>{
 const g=game();g.position={x:28,y:48};g.handHP.melee=0;assert.equal(g.canAttack('melee'),false);g.attack('melee');g.playerAttack();assert.equal(g.target,null);assert.equal(g.attackCount,0);
 g.handHP.melee=600;g.clenchUntil=8;assert.equal(g.canAttack('melee'),false);g.attack('melee');assert.equal(g.target,null);
 g.target='melee';g.playerAttack();assert.equal(g.attackCount,0);assert.equal(g.cooldown,0);assert.equal(g.canAttack('mage'),true);
 g.tick=8;assert.equal(g.canAttack('melee'),true);g.playerAttack();assert.equal(g.attackCount,1);
 g.hp=0;assert.equal(g.canAttack('mage'),false);
 const clench=game();clench.target='melee';clench.bossCycle=1;clench.tick=8;clench.clenchDamage=30;clench.bossAction();assert.equal(clench.target,null);assert.equal(clench.canAttack('melee'),false);
});

test('portal renders matching cache effects around the player and destination; crystal uses the proper seed and eruption actors',()=>{
 const g=game();g.addHazard('portal',32,43,8,1);g.addHazard('burst',30,44,3,1);
 const effects=new EncounterEffects(new THREE.Scene(),name=>{const obj=new THREE.Group();obj.userData.name=name;obj.animate=()=>{};return obj;},()=>{}),player=new THREE.Group();player.position.set(2,0,1);
 effects.sync(g);effects.draw(g,600,player);
 const portal=effects.registry.entries.get(g.hazards[0]);assert.equal(portal.floor.visible,false);assert.equal(portal.actors[0].userData.name,'portal');assert.equal(effects.status.get('teleport').userData.name,'portal');assert.deepEqual(effects.status.get('teleport').position.toArray(),[2,0,1]);
 const burst=effects.registry.entries.get(g.hazards[1]);assert.equal(burst.floor.visible,false);assert.equal(burst.actors[0].visible,true);assert.equal(burst.actors[1].visible,false);
 effects.draw(g,1800,player);assert.equal(burst.actors[0].visible,false);assert.equal(burst.actors[1].visible,true);g.hazards=[];effects.sync(g);effects.draw(g,6000,player);assert.equal(effects.status.has('teleport'),false);effects.clear();
 assert.equal(manifest.effects.mage.spotanimId,1339);assert.equal(manifest.effects['burn-projectile'].spotanimId,1349);assert.equal(manifest.effects.burn.spotanimId,1351);assert.equal(manifest.effects.crystal.spotanimId,1357);assert.equal(manifest.effects.burst.objectId,30034);assert.equal(manifest.effects['burst-seed'].objectId,30033);
});
