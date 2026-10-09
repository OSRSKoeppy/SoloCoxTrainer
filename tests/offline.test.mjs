import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('standalone HTML embeds complete, parseable JavaScript without replacement-string corruption',()=>{
 const html=fs.readFileSync(new URL('../Olm-3D-Offline.html',import.meta.url),'utf8');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(scripts.length,2);for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script));
 const context={window:{}};vm.runInNewContext(scripts[0],context);const assets=context.window.OLM_ASSETS;const manifest=JSON.parse(assets['manifest.json']);for(const info of Object.values(manifest.models))assert.ok(assets[info.file]);for(const info of Object.values(manifest.sprites))assert.ok(assets[info.file].startsWith('data:image/png;base64,'));
 assert.ok(assets[manifest.playerRig]);for(const effect of Object.values(manifest.effects))assert.ok(assets[manifest.models[effect.key].file]);
 assert.ok(!html.includes('<script src='));assert.ok(!html.includes('href="style.css"'));
});
