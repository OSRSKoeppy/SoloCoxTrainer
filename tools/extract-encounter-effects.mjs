import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {RSCache,IndexType,ConfigType,ModelGroup} from '../../olm-asset-tools/src/index.js';
const root='public/assets',manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));
const cache=new RSCache(process.argv[2]||'C:/Users/akoep/.runelite/jagexcache/oldschool/LIVE');await cache.onload;
// IDs verified against RuneLite gameval/SpotanimID.java and ObjectID.java.
const spots={crystal:1357,'crystal-shatter':1337,mage:1339,range:1340,'sphere-mage':1341,'sphere-range':1343,'sphere-melee':1345,'burn-projectile':1349,burn:1351,portal:1362,'player-mage':1040,'player-range':27,'pool-projectile':1355,pool:1363,explosion:1358};
async function save(name,model,def,id,object=false){
 (def.recolorToFind||[]).forEach((c,i)=>model.recolor(c,def.recolorToReplace[i]));
 const scale=object?[def.modelSizeX,def.modelSizeHeight,def.modelSizeY]:[def.resizeX,def.resizeY,def.resizeX];
 const convert=([x,y,z])=>[x*scale[0]/128,y*scale[1]/128,z*scale[2]/128];
 const data={id:model.id,vertices:model.vertexPositionsX.map((x,i)=>convert([x,-model.vertexPositionsY[i],-model.vertexPositionsZ[i]])),faces:model.faceVertexIndices1.map((a,i)=>[a,model.faceVertexIndices2[i],model.faceVertexIndices3[i]]),colors:model.faceColors,alphas:model.faceAlphas||[],textures:model.faceTextures||[],uvU:model.faceTextureUCoordinates||[],uvV:model.faceTextureVCoordinates||[],animations:{}};
 const animation=def.animationId??-1;
 if(animation>=0){
  model.computeAnimationTables();const a=await model.loadAnimation(cache,animation,false,true);
  const sequence=await cache.getDef(IndexType.CONFIGS,ConfigType.SEQUENCE,animation),alphas=[];
  for(const fid of sequence.frameIDs){const frame=await cache.getDef(IndexType.FRAMES,fid>>>16,fid&65535),alpha=Array.from({length:model.faceCount},(_,i)=>(model.faceAlphas[i]||0)&255);
   for(let j=0;j<frame.indexFrameIds.length;j++){const index=frame.indexFrameIds[j];if(frame.framemap.types[index]!==5)continue;for(const group of frame.framemap.frameMaps[index])for(const face of model.faceLabelsAlpha?.[group]||[])alpha[face]=Math.max(0,Math.min(255,alpha[face]+frame.translator_x[j]*8));}
   alphas.push(alpha);
  }
  data.animations[animation]={frames:a.vertexData.map(f=>f.map(convert)),lengths:a.lengths,alphas};
 }
 const key='effect-'+name,file='models/'+key+'.json.gz';await fs.writeFile(root+'/'+file,gzipSync(JSON.stringify(data)));
 manifest.models[key]={file,vertices:model.vertexCount,faces:model.faceCount,animations:Object.keys(data.animations)};manifest.effects[name]={key,animation,[object?'objectId':'spotanimId']:id};
 console.log(name,id,animation);
}
try{
 for(const [name,id]of Object.entries(spots)){const def=await cache.getDef(IndexType.CONFIGS,ConfigType.SPOTANIM,id);const model=new ModelGroup([await cache.getDef(IndexType.MODELS,def.modelId)]).getMergedModel();await save(name,model,def,id);}
 for(const [name,id]of Object.entries({'burst-seed':30033,burst:30034})){const def=await cache.getDef(IndexType.CONFIGS,ConfigType.OBJECT,id);const model=new ModelGroup(await Promise.all(def.objectModels.map(id=>cache.getDef(IndexType.MODELS,id)))).getMergedModel();await save(name,model,def,id,true);}
 await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest));
}finally{cache.close();}
