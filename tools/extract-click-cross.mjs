// Run from the project root; this is an optional local-cache extraction tool.
import fs from 'node:fs/promises';
import {RSCache,IndexType} from '../../olm-asset-tools/src/index.js';
import {PNG} from 'pngjs';
const cache=new RSCache(process.argv[2]||'C:/Users/akoep/.runelite/jagexcache/oldschool/LIVE');
await cache.onload;
try{
 const hash=[...'cross'].reduce((n,c)=>(n*31+c.charCodeAt(0))|0,0);
 const archive=Object.values(cache.getIndex(IndexType.SPRITES).archives).find(a=>a.nameHash===hash);
 if(!archive)throw Error('Cross sprites missing from cache');
 const {sprites}=await cache.getDef(IndexType.SPRITES,archive.id);
 if(sprites.length!==8||sprites.some(s=>s.maxWidth!==16||s.maxHeight!==16))throw Error('Unexpected cross sprite layout');
 const png=new PNG({width:128,height:16});
 for(const [frame,s]of sprites.entries())s.pixels.forEach((v,i)=>{
  const x=frame*16+s.offsetX+i%s.width,y=s.offsetY+Math.floor(i/s.width),n=(y*128+x)*4;
  png.data.set([(v>>>16)&255,(v>>>8)&255,v&255,s.pixelIdx[i]===0?0:(v>>>24)||255],n);
 });
 const root='public/assets',manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));
 const file='sprites/click-cross.png';await fs.writeFile(root+'/'+file,PNG.sync.write(png));
 manifest.crossSprites={file,frameSize:16,count:8};await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest));
 console.log('Extracted eight original click-cross frames from sprite archive '+archive.id);
}finally{cache.close();}
