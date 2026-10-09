import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
await build({entryPoints:['src/app.mjs'],bundle:true,format:'iife',target:'es2022',outfile:'public/app.js',minify:true,legalComments:'eof'});
const assets={};async function collect(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const filename=path.join(dir,entry.name);if(entry.isDirectory())await collect(filename);else{const key=path.relative('public/assets',filename).replaceAll('\\','/'),bytes=await fs.readFile(filename);assets[key]=key.endsWith('.json')?bytes.toString('utf8'):key.endsWith('.png')?'data:image/png;base64,'+bytes.toString('base64'):bytes.toString('base64');}}}
await collect('public/assets');const css=await fs.readFile('public/style.css','utf8'),js=await fs.readFile('public/app.js','utf8');let html=await fs.readFile('public/index.html','utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('<script src="app.js" defer></script>',()=>`<script>window.OLM_ASSETS=${JSON.stringify(assets).replaceAll('<','\\u003c')};</script><script>${js.replaceAll('</script','<\\/script')}</script>`);
html+='\n<!--\n'+(await fs.readFile('THIRD-PARTY-NOTICES.txt','utf8')).replaceAll('--','- -')+'\n-->';
await fs.writeFile('Olm-3D-Offline.html',html);console.log('Built local app and self-contained Olm-3D-Offline.html ('+(Buffer.byteLength(html)/1024/1024).toFixed(1)+' MB).');
await fs.mkdir('dist',{recursive:true});
await fs.cp('public','dist',{recursive:true});
await fs.copyFile('Olm-3D-Offline.html','dist/Olm-3D-Offline.html');
await fs.copyFile('THIRD-PARTY-NOTICES.txt','dist/THIRD-PARTY-NOTICES.txt');
await fs.writeFile('dist/.nojekyll','');
console.log('GitHub Pages site built in dist/.');
