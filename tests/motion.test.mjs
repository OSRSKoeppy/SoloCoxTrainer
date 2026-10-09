import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {HeadMotion,headAnimation,clipSample,clipDuration,movementSample} from '../src/motion.mjs';
import {Encounter} from '../src/engine.mjs';
const model=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/assets/models/olm-head.json.gz',import.meta.url))));
const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url)));
const rms=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+v.reduce((s,n,j)=>s+(n-b[i][j])**2,0),0)/a.length);
test('every turn starts and ends in the correct physical pose in normal and final phases',()=>{
 for(const phase of [1,2,3,4])for(const from of ['middle','mage','melee'])for(const to of ['middle','mage','melee']){if(from===to)continue;
  const clip=model.animations[headAnimation('turn',to,from,phase)],start=model.animations[headAnimation('idle',from,from,phase)].frames[0],end=model.animations[headAnimation('idle',to,to,phase)].frames[0];
  assert.ok(clip,`${phase}: ${from} → ${to}`);assert.ok(rms(clip.frames[0],start)<65,`wrong start: ${phase} ${from} ${to}`);assert.ok(rms(clip.frames.at(-1),end)<65,`wrong end: ${phase} ${from} ${to}`);assert.equal(clipDuration(clip),1200);
 }
});
test('mage and melee poses point toward the corresponding room sector on both walls',()=>{
 const mouthIndices=model.animations[7336].frames[0].map((p,i)=>({p,i})).filter(a=>a.p[1]>280).sort((a,b)=>b.p[2]-a.p[2]).slice(0,8).map(a=>a.i);
 for(const phase of [1,2,3,4])for(const action of ['idle','attack'])for(const side of ['mage','melee']){
  const pose=model.animations[headAnimation(action,side,'middle',phase)].frames[0];const localX=mouthIndices.reduce((sum,i)=>sum+pose[i][0]/mouthIndices.length,0);
  assert.ok(side==='mage'?localX<-40:localX>40,`${phase} ${action} ${side} points the wrong way`);
  // West rotation gives world Z = -local X; east gives world Z = local X.
  const worldZ=phase===2?localX:-localX;const targetY=side==='mage'?(phase===2?49:39):(phase===2?39:49);
  assert.equal(Math.sign(worldZ),Math.sign(44-targetY));
 }
});
test('one-shot turn animation cannot loop or be replaced by idle before completing',()=>{
 const motion=new HeadMotion(model);motion.handle({type:'turn',fromFacing:'middle',facing:'mage'},0,1);
 assert.equal(motion.sample(600).action,'turn');assert.equal(motion.sample(1199).loop,false);assert.equal(motion.sample(1200).action,'idle');assert.equal(motion.sample(1200).id,7337);
 const clip=model.animations[7339],sample=clipSample(clip,1300,false);assert.equal(sample.frame,clip.frames.length-1);assert.equal(sample.next,sample.frame);assert.equal(sample.finished,true);
 assert.deepEqual(motion.sample(600),motion.sample(600));
});
test('attack pose stays aligned with the captured firing direction, including ranged head',()=>{
 const e=new Encounter(scene,manifest.items,{invincible:true});e.position={x:29,y:38};e.bossAction();assert.equal(e.effects[0].fromFacing,'middle');assert.equal(e.effects[0].facing,'mage');e.effects=[];e.bossAction();const shot=e.effects.find(e=>e.type==='olm-projectile');assert.equal(shot.facing,'mage');e.position={x:29,y:50};assert.deepEqual(shot.aim,{x:29,y:38});
 const motion=new HeadMotion(model);motion.reset(4,0,'melee');motion.handle({type:'olm-projectile',facing:'melee'},100,4);assert.equal(motion.sample(500).id,7372);assert.equal(motion.sample(1300).id,7375);
});
test('movement interpolation follows both run tiles through a corner for the full tick',()=>{
 const path=[{x:0,y:0},{x:1,y:0},{x:1,y:1}];assert.deepEqual(movementSample(path,.25),{x:.5,y:0});assert.deepEqual(movementSample(path,.5),{x:1,y:0});assert.deepEqual(movementSample(path,.75),{x:1,y:.5});assert.deepEqual(movementSample(path,1),{x:1,y:1});
});
test('demonstration walks through all sectors and fires in each without ending the encounter',()=>{
 const e=new Encounter(scene,manifest.items,{method:'demo'}),fired=new Set();for(let n=0;n<120;n++){e.next();for(const shot of e.effects.filter(e=>e.type==='olm-projectile'))fired.add(shot.facing);assert.ok(e.motionPath.length<=2);assert.ok(e.walkable.has(`${e.position.x},${e.position.y}`));}
 assert.deepEqual([...fired].sort(),['mage','melee','middle']);assert.equal(e.hp,99);assert.equal(e.phase,1);
});
