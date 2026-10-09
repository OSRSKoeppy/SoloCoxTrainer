import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {AnimatedModel,View} from '../src/render.mjs';
import {PoseTransition} from '../src/motion.mjs';
import {Encounter} from '../src/engine.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url)));
const items=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).items;

test('animated target picking follows its displayed geometry outside the original bounds',()=>{
 const rest=[[-64,-64,0],[64,-64,0],[0,64,0]],moved=rest.map(([x,y,z])=>[x+640,y,z]);
 const model=new AnimatedModel({vertices:rest,faces:[[0,1,2]],alphas:[],textures:[],colors:[100],uvU:[],uvV:[],animations:{1:{frames:[moved],lengths:[30]}}},{},true);
 model.setAnimation(1,0);model.animate(0);model.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(5,0,10),new THREE.Vector3(0,0,-1));
 assert.equal(ray.intersectObject(model,true).length,1,'visible moving geometry must remain clickable');model.dispose();
});

test('an unattackable head does not swallow a valid claw click behind it',()=>{
 const targets=[{visible:true,userData:{target:'head'}},{visible:true,userData:{target:'melee'}}];
 const view={container:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},mouse:new THREE.Vector2(),camera:{},targets,
  raycaster:{setFromCamera(){},intersectObjects(objects){assert.deepEqual(objects,[targets[1]]);return[{object:targets[1],point:new THREE.Vector3()}];}}};
 assert.equal(View.prototype.pick.call(view,50,50,{canAttack:t=>t==='melee'}).target,'melee');
});

test('attack to stance transitions stay continuous and reach the new pose in 100ms',()=>{
 const blend=new PoseTransition(),a=[[0,20,0]],b=[[100,40,0]];
 assert.deepEqual(blend.sample(a,'attack',600),a);
 assert.deepEqual(blend.sample(b,'idle',1200),a);
 assert.deepEqual(blend.sample(b,'idle',1250),[[50,30,0]]);
 assert.deepEqual(blend.sample(b,'idle',1300),b);
 assert.deepEqual(blend.sample([[200,0,0]],'run',1300),b);
 assert.deepEqual(blend.sample([[200,0,0]],'run',1350),[[150,20,0]]);
 assert.deepEqual(blend.sample(a,'attack-again',1350),[[150,20,0]],'interruptions blend from the displayed pose');
 blend.reset();assert.deepEqual(blend.sample(b,'idle',0),b);
 assert.deepEqual(blend.sample([...b,...b],'new-gear',0),[...b,...b],'different equipment topology must not morph');
});

test('repeated attack clicks and a gear switch keep the original cooldown; movement cancels pursuit',()=>{
 const e=new Encounter(scene,items,{invincible:true,mechanics:'basic',accuracy:'always'});e.position={x:28,y:48};e.attack('melee');e.next();
 const first=e.tick;for(let n=0;n<3;n++){e.attack('melee');e.attack('melee');e.next();assert.equal(e.attackCount,1);}
 const scythe=e.inventory.indexOf(22325);assert.ok(scythe>=0);e.equip(scythe);e.attack('melee');e.next();
 assert.equal(e.tick-first,4);assert.equal(e.attackCount,2);assert.equal(e.cooldown,5);
 e.move({x:32,y:48});for(let i=0;i<6;i++)e.next();assert.equal(e.attackCount,2);assert.equal(e.target,null);
});

test('death cannot be undone by drinking; restart restores the selected practice settings and state',()=>{
 const e=new Encounter(scene,items,{phase:3,method:'4:1',accuracy:'always',mechanics:'basic'});e.hp=1;e.incoming.push({due:1,damage:99});e.next();assert.equal(e.active,false);
 e.drink(e.inventory.indexOf(6685));assert.equal(e.hp,0);
 const options={...e.options};e.reset();assert.deepEqual(e.options,options);assert.equal(e.phase,3);assert.equal(e.hp,99);assert.equal(e.active,true);assert.equal(e.cooldown,0);assert.equal(e.target,null);assert.equal(e.tick,0);assert.deepEqual(e.path,[]);assert.deepEqual(e.pendingHits,[]);
});
