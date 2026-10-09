import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EffectRegistry,hazardPose} from '../src/effect-timing.mjs';
import {Encounter} from '../src/engine.mjs';
import {SPECIAL_PRACTICE,triggerSpecial,specialCue} from '../src/special-practice.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../public/assets/scene.json',import.meta.url))),items=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).items;
test('moving hazards retain actors across ticks and dispose exactly once on expiration/reset',()=>{
  let created=0;const disposed=[];const registry=new EffectRegistry(h=>({h,id:++created}),a=>disposed.push(a.id));
  const lightning={type:'lightning',y:35},acid={type:'acid'};registry.sync([lightning,acid]);const actor=registry.entries.get(lightning);
  lightning.y++;registry.sync([lightning,acid]);assert.equal(registry.entries.get(lightning),actor);assert.equal(created,2);
  registry.sync([lightning]);assert.deepEqual(disposed,[2]);registry.clear();registry.clear();assert.deepEqual(disposed,[2,1]);
});
test('lightning interpolates between tile positions instead of jumping at a tick',()=>{
  for(const direction of [-1,1]){const h={type:'lightning',x:30,startY:44,direction,due:4};
    assert.equal(hazardPose(h,3000).y,44);assert.equal(hazardPose(h,3300).y,44+direction*.5);assert.equal(hazardPose(h,3600).y,44+direction);
    assert.deepEqual(hazardPose(h,3300),hazardPose(h,3300));
  }
});
test('crystal warning grows before the fall and reaches the floor at impact',()=>{
  const h={type:'crystal',x:32,y:44,created:1,due:5};
  assert.ok(hazardPose(h,1200).warning<hazardPose(h,2400).warning);
  assert.equal(hazardPose(h,2400).height,6);assert.equal(hazardPose(h,2700).height,3);assert.equal(hazardPose(h,3000).height,0);
  assert.equal(hazardPose(h,2999).active,false);assert.equal(hazardPose(h,3000).active,true);
});
test('every special practice launches its mechanic and remains playable through expiration',()=>{
  for(const kind of Object.keys(SPECIAL_PRACTICE)){
    const g=new Encounter(scene,items,{phase:kind==='pools'?4:3,mechanics:'basic',invincible:true});
    g.position={x:32,y:44};g.motionPath=[{...g.position}];g.nextBoss=9999;triggerSpecial(g,kind);
    assert.ok(g.hazards.length||g.incoming.length||g.burns.length||g.trailUntil||g.shardsUntil||g.healUntil,kind);
    for(let i=0;i<65;i++)g.next();assert.equal(g.active,true,kind);
  }
});
test('special cue prioritizes prayer spheres and changes as hazards expire',()=>{
  const g=new Encounter(scene,items);g.addHazard('bomb',32,44,5,1);g.sphere('mage');
  assert.equal(specialCue(g).title,'Protect from Magic');g.incoming=[];assert.equal(specialCue(g).title,'Crystal bomb');g.hazards=[];assert.equal(specialCue(g),null);
});
test('crystal and bomb impacts emit one effect on the damage tick',()=>{
  const g=new Encounter(scene,items,{mechanics:'basic',invincible:true});g.nextBoss=9999;g.addHazard('bomb',32,44,2,1);
  g.next();assert.equal(g.effects.some(e=>e.type==='hazard-impact'),false);g.next();assert.equal(g.effects.filter(e=>e.type==='hazard-impact').length,1);g.next();assert.equal(g.effects.some(e=>e.type==='hazard-impact'),false);
});
