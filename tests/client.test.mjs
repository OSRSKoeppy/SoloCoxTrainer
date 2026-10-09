import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {chooseInterface,PRAYERS,EQUIPMENT} from '../src/interface.mjs';

test('automatic layout handles phones, iPad desktop identity and hybrid desktop pointers',()=>{
 assert.equal(chooseInterface('auto',{userAgent:'iPhone',touchPoints:5}),'mobile');
 assert.equal(chooseInterface('auto',{userAgent:'Macintosh',touchPoints:5,coarse:true}),'mobile');
 assert.equal(chooseInterface('auto',{userAgent:'Windows',touchPoints:10,coarse:false}),'desktop');
 assert.equal(chooseInterface('auto',{mobile:true}),'mobile');
 assert.equal(chooseInterface('desktop',{mobile:true}),'desktop');
 assert.equal(chooseInterface('mobile',{}),'mobile');
});
test('client sprite definitions resolve to real files and protection prayers occupy the standard cells',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../public/assets/manifest.json',import.meta.url)));
 for(const [,id]of [...PRAYERS,...EQUIPMENT])await fs.access(new URL('../public/assets/'+manifest.sprites[id].file,import.meta.url));
 assert.deepEqual(PRAYERS.slice(16,19).map(p=>p[2]),['mage','range','melee']);
 assert.equal(PRAYERS.filter(p=>p[3]).length,3);
 assert.equal(new Set(EQUIPMENT.map(e=>e.slice(2).join(','))).size,EQUIPMENT.length);
});

async function workerHarness(){
 const source=await fs.readFile(new URL('../public/sw.js',import.meta.url),'utf8');
 const handlers={},stores=new Map(),deleted=[];let online=true,claimed=0,activated=0;
 const scope='https://example.test/SoloCoxTrainer/';
 const absolute=request=>new URL(typeof request==='string'?request:request.url,scope).href.split('?')[0];
 const cacheAPI={keys:async()=>[...stores.keys()],delete:async key=>{deleted.push(key);return stores.delete(key);},open:async key=>{
   if(!stores.has(key))stores.set(key,new Map());const store=stores.get(key);
   return {addAll:async files=>{for(const request of files){assert.equal(request.cache,'reload','new builds must bypass stale HTTP-cached HTML and bundles');const f='./'+request.url.slice(scope.length);await fs.access(new URL('../public/'+f.slice(2),import.meta.url));store.set(absolute(request),{file:f});}},match:async request=>store.get(absolute(request))};
 }};
 vm.runInNewContext(source,{URL,Request,caches:cacheAPI,fetch:async()=>{if(!online)throw Error('offline');return {network:true};},self:{registration:{scope},addEventListener:(type,fn)=>handlers[type]=fn,clients:{claim:async()=>claimed++},skipWaiting:()=>activated++}});
 return {handlers,stores,deleted,scope,offline:()=>online=false,claimed:()=>claimed,activated:()=>activated,dispatch:async(type)=>{let pending;handlers[type]({waitUntil:p=>pending=p});await pending;},request:async(path,mode='cors')=>{let pending;handlers.fetch({request:{url:scope+path,method:'GET',mode},respondWith:p=>pending=p});return pending;}};
}
test('installed app precaches every game asset and starts offline below a GitHub project path',async()=>{
 const w=await workerHarness();await w.dispatch('install');w.offline();
 assert.equal((await w.request('', 'navigate')).file,'./index.html');
 assert.equal((await w.request('app.js?refresh=1')).file,'./app.js');
 const manifest=JSON.parse(await fs.readFile(new URL('../public/assets/manifest.json',import.meta.url)));
 for(const asset of [...Object.values(manifest.models),...Object.values(manifest.sprites)])assert.ok(await w.request('assets/'+asset.file));
 assert.ok(await w.request('assets/'+manifest.playerRig));
 await assert.rejects(w.request('missing.json'),/offline/);
});
test('updates preserve other apps caches and activate only on the explicit update action',async()=>{
 const w=await workerHarness();await w.dispatch('install');assert.equal(w.activated(),0);
 w.stores.set('olm-lab:'+w.scope+':old',new Map());w.stores.set('another-app',new Map());w.stores.set('olm-lab:https://example.test/Other/:old',new Map());
 await w.dispatch('activate');assert.equal(w.claimed(),1);assert.deepEqual(w.deleted,['olm-lab:'+w.scope+':old']);assert.ok(w.stores.has('another-app'));
 w.handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(w.activated(),1);
});
test('install manifest stays within the project and both app icons have the advertised size',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../public/manifest.webmanifest',import.meta.url)));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const data=await fs.readFile(new URL('../public/'+icon.src,import.meta.url));const size=Number(icon.sizes.split('x')[0]);assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}
});
