import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

async function updateUI(fresh){
 const elements=new Map(),events={},workerEvents={};let posted=0,reloads=0,checks=0;
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,disabled:true});return elements.get(id);};
 const reg={waiting:{postMessage:()=>posted++},active:{},addEventListener(){},update:async()=>checks++};
 const context={__OLM_BUILD__:'test-build',document:{getElementById:element,hidden:false,addEventListener(){}},matchMedia:()=>({matches:false}),location:{protocol:'https:',reload:()=>reloads++},window:{isSecureContext:true,addEventListener:(name,fn)=>events[name]=fn},navigator:{serviceWorker:{register:async()=>reg,ready:Promise.resolve(reg),addEventListener:(name,fn)=>workerEvents[name]=fn}}};
 vm.createContext(context);vm.runInContext((await fs.readFile(new URL('../src/pwa.mjs',import.meta.url),'utf8')).replace('export function','function'),context);
 context.initAppInstall(()=>fresh);await new Promise(resolve=>setImmediate(resolve));
 return {element,events,workerEvents,posted:()=>posted,reloads:()=>reloads,checks:()=>checks};
}
test('an update on a fresh launch activates once and refreshes the page',async()=>{
 const ui=await updateUI(true);assert.equal(ui.posted(),1);ui.workerEvents.controllerchange();assert.equal(ui.reloads(),1);assert.equal(ui.element('build-label').textContent,'Build test-build');
});
test('an existing fight shows the update button and waits for an explicit click',async()=>{
 const ui=await updateUI(false);assert.equal(ui.posted(),0);assert.equal(ui.element('update-notice').hidden,false);assert.equal(ui.element('update-app').hidden,false);
 ui.workerEvents.controllerchange();assert.equal(ui.reloads(),0);ui.element('update-notice').onclick();assert.equal(ui.posted(),1);ui.workerEvents.controllerchange();assert.equal(ui.reloads(),1);
});
test('manual and online checks request fresh service-worker updates',async()=>{
 const ui=await updateUI(false),before=ui.checks();await ui.element('check-update').onclick();await ui.events.online();assert.equal(ui.checks(),before+2);
});
