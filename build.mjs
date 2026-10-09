import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
// Small original geometric app badge; no additional network assets at runtime.
await fs.mkdir('public/icons',{recursive:true});
for(const size of [192,512]){
  const png=new PNG({width:size,height:size});
  const polygon=(x,y,points)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,r=Math.hypot(u-.5,v-.5);let rgb=[35,33,26];
    if(r<.4)rgb=[78,72,53];if(r<.375)rgb=[24,36,32];
    if(polygon(u,v,[[.27,.25],[.4,.33],[.6,.33],[.73,.25],[.7,.59],[.5,.75],[.3,.59]]))rgb=[181,170,126];
    if(polygon(u,v,[[.35,.49],[.46,.52],[.44,.56],[.35,.54]])||polygon(u,v,[[.65,.49],[.54,.52],[.56,.56],[.65,.54]]))rgb=[102,224,204];
    if(polygon(u,v,[[.43,.64],[.57,.64],[.5,.69]]))rgb=[55,52,38];
    const i=(y*size+x)*4;png.data.set([...rgb,255],i);
  }
  await fs.writeFile(`public/icons/olm-${size}.png`,PNG.sync.write(png));
}
await build({entryPoints:['src/app.mjs'],bundle:true,format:'iife',target:'es2022',outfile:'public/app.js',minify:true,legalComments:'eof'});
const assets={};async function collect(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const filename=path.join(dir,entry.name);if(entry.isDirectory())await collect(filename);else{const key=path.relative('public/assets',filename).replaceAll('\\','/'),bytes=await fs.readFile(filename);assets[key]=key.endsWith('.json')?bytes.toString('utf8'):key.endsWith('.png')?'data:image/png;base64,'+bytes.toString('base64'):bytes.toString('base64');}}}
await collect('public/assets');const css=await fs.readFile('public/style.css','utf8'),js=await fs.readFile('public/app.js','utf8');let html=await fs.readFile('public/index.html','utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('<script src="app.js" defer></script>',()=>`<script>window.OLM_ASSETS=${JSON.stringify(assets).replaceAll('<','\\u003c')};</script><script>${js.replaceAll('</script','<\\/script')}</script>`);
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="apple-touch-icon" href="icons/olm-192.png">','');
html+='\n<!--\n'+(await fs.readFile('THIRD-PARTY-NOTICES.txt','utf8')).replaceAll('--','- -')+'\n-->';
await fs.writeFile('Olm-3D-Offline.html',html);console.log('Built local app and self-contained Olm-3D-Offline.html ('+(Buffer.byteLength(html)/1024/1024).toFixed(1)+' MB).');
await fs.mkdir('dist',{recursive:true});
await fs.cp('public','dist',{recursive:true});
await fs.copyFile('Olm-3D-Offline.html','dist/Olm-3D-Offline.html');
await fs.copyFile('THIRD-PARTY-NOTICES.txt','dist/THIRD-PARTY-NOTICES.txt');
await fs.writeFile('dist/.nojekyll','');
const files=[];const hash=createHash('sha256');
async function precache(dir){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
 const file=path.join(dir,entry.name);if(entry.isDirectory())await precache(file);else if(entry.name!=='sw.js'){
  const relative=path.relative('public',file).replaceAll('\\','/');files.push('./'+relative);hash.update(relative);hash.update(await fs.readFile(file));
 }
}}
await precache('public');
const template=await fs.readFile('src/service-worker.js','utf8');hash.update(template);
const worker=template.replace('__VERSION__',JSON.stringify(hash.digest('hex').slice(0,16))).replace('__FILES__',JSON.stringify(files));
await fs.writeFile('public/sw.js',worker);await fs.writeFile('dist/sw.js',worker);
console.log('GitHub Pages site built in dist/.');
