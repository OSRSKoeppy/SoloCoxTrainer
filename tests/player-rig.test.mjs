import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {assembleRig,poseRig,PlayerMotion} from '../src/player-rig.mjs';
import {clipDuration} from '../src/motion.mjs';
const read=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url)));
const rigData=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/assets/player-rig.json.gz',import.meta.url))));
const manifest=read('../public/assets/manifest.json'),fixtures=read('fixtures/player-poses.json');
const models={};function parts(keys){return keys.map(key=>({key,data:models[key]??=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/assets/'+manifest.models[key].file,import.meta.url))))}));}
test('assembled player matches independent cache-decoder reference poses for every loadout',()=>{
 for(const fixture of fixtures){const rig=assembleRig(parts(fixture.keys),rigData.rigs),actual=poseRig(rig,rigData.sequences[fixture.id],fixture.frame);for(const {i,position}of fixture.vertices)for(let axis=0;axis<3;axis++)assert.ok(Math.abs(actual[i][axis]-position[axis])<1e-8);}
 assert.equal(manifest.items[22978].attackAnim,8288);
});
test('a same-tick attack drag starts the attack immediately and mixes running legs',()=>{
 const motion=new PlayerMotion(rigData.sequences);motion.attack(8288,600);const pose=motion.sample(600,true,2,manifest.items[22978].stance);
 assert.equal(pose.sequence.name,'human_dhunter_lance_attack');assert.equal(pose.frame,0);assert.equal(pose.movement.name,'human_halberdrunning');
 const rig=assembleRig(parts(fixtures[0].keys),rigData.rigs),attack=poseRig(rig,pose.sequence,4),blended=poseRig(rig,pose.sequence,4,pose.movement,3),run=poseRig(rig,pose.movement,3);
 assert.notDeepEqual(blended,attack);assert.notDeepEqual(blended,run);assert.ok(blended.every(v=>v.every(Number.isFinite)));
});
test('gear switching cannot restart an in-flight action; clips stop at their cache duration',()=>{
 const motion=new PlayerMotion(rigData.sequences);motion.attack(8056,600);const before=motion.sample(1100,false,2,manifest.items[22325].stance),after=motion.sample(1100,false,2,manifest.items[12899].stance);
 assert.equal(before.frame,after.frame);assert.equal(before.fraction,after.fraction);assert.equal(after.sequence.name,'scythe_of_vitur_attack');
 const duration=clipDuration(rigData.sequences[8056]);assert.equal(motion.sample(600+duration,false,2,manifest.items[12899].stance).sequence.name,'human_staffready');
 motion.attack(1167,3000);assert.equal(motion.sample(3000,true,2,manifest.items[12899].stance).sequence.name,'human_castwave_staff');
});
