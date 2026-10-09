import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HeadMotion,clipSample,clipDuration,movementSample,PoseTransition} from './motion.mjs';
import {roomWalkable,PRACTICE_TILES} from './tiles.mjs';
import {assembleRig,poseRig,PlayerMotion} from './player-rig.mjs';
import {readAssetJson} from './assets.mjs';
import {EncounterEffects} from './effects.mjs';

export async function asset(file,json=false){
  if(window.OLM_ASSETS){
    const value=window.OLM_ASSETS[file];if(!value)throw new Error(`Missing bundled asset ${file}`);
    if(file.endsWith('.gz')){const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(stream).text());}
    return json?JSON.parse(value):value;
  }
  if(!json&&!file.endsWith('.gz'))return `assets/${file}`;
  const response=await fetch(`assets/${file}`);if(!response.ok)throw new Error(`Could not load ${file} (${response.status})`);return readAssetJson(response);
}
export function hsl(packed){return new THREE.Color().setHSL(((packed>>10)&63)/64+1/128,((packed>>7)&7)/8+1/16,(packed&127)/128,THREE.SRGBColorSpace);}
export const point=(x,y,height=0)=>new THREE.Vector3(x-32.5,height,44.5-y);
function outlineGeometry(width){
  const geometries=[];for(const [x,z,w,h]of [[0,-.5+width/2,1,width],[0,.5-width/2,1,width],[-.5+width/2,0,width,1],[.5-width/2,0,width,1]]){const g=new THREE.PlaneGeometry(w,h);g.rotateX(-Math.PI/2);g.translate(x,0,z);geometries.push(g);}
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());return geometry;
}
function tileOutline(color,width=.035){const mesh=new THREE.Mesh(outlineGeometry(width),new THREE.MeshBasicMaterial({color,depthWrite:false,depthTest:false,transparent:true,opacity:.9}));mesh.renderOrder=12;mesh.userData.outlineWidth=width;return mesh;
}

export class AnimatedModel extends THREE.Group {
  constructor(data,textures,animated=false){
    super();this.data=data;this.parts=[];this.anim=0;this.started=0;this.frame=-1;
    const groups=new Map();data.faces.forEach((face,i)=>{const alpha=data.alphas[i]||0;if(alpha===255)return;const texture=data.textures[i]??-1,key=`${texture}:${alpha}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);});
    for(const [key,faces]of groups){
      const [texture,alpha]=key.split(':').map(Number),positions=[],colors=[],uv=[],indices=[];
      for(const faceIndex of faces){const face=data.faces[faceIndex],color=texture>=0?new THREE.Color('white'):hsl(data.colors[faceIndex]);
        face.forEach((v,j)=>{const coords=data.vertices[v];positions.push(...coords.map(n=>n/128));colors.push(color.r,color.g,color.b);uv.push(data.uvU[faceIndex]?.[j]||0,data.uvV[faceIndex]?.[j]||0);indices.push(v);});}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();
      const material=new THREE.MeshLambertMaterial({vertexColors:true,map:textures[texture]||null,flatShading:true,side:THREE.DoubleSide,transparent:alpha>0,opacity:1-alpha/255,alphaTest:texture>=0?.1:0});
      const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=!animated;this.add(mesh);this.parts.push({mesh,indices});
    }
  }
  setAnimation(id,time,{loop=true,started=time}={}){if(this.anim!==id||this.started!==started){this.anim=id;this.started=started;this.frame=-1;}this.loop=loop;}
  animate(time){const clip=this.data.animations[this.anim];if(!clip?.frames?.length)return;
    if(this.lastPoseTime===time&&this.lastPoseAnimation===this.anim&&this.lastPoseStart===this.started)return;
    this.lastPoseTime=time;this.lastPoseAnimation=this.anim;this.lastPoseStart=this.started;
    const {frame,next,fraction}=clipSample(clip,time-this.started,this.loop!==false),changed=frame!==this.frame;this.frame=frame;const vertices=clip.frames[frame],following=clip.frames[next];this.pose={vertices,following,fraction};
    for(const {mesh,indices}of this.parts){const p=mesh.geometry.attributes.position;indices.forEach((v,i)=>{const a=vertices[v]||this.data.vertices[v],b=following[v]||a;p.setXYZ(i,(a[0]+(b[0]-a[0])*fraction)/128,(a[1]+(b[1]-a[1])*fraction)/128,(a[2]+(b[2]-a[2])*fraction)/128);});p.needsUpdate=true;mesh.geometry.computeBoundingSphere();if(changed)mesh.geometry.computeVertexNormals();}
  }
  mouthPosition(){const v=this.pose?.vertices||this.data.vertices,b=this.pose?.following||v,f=this.pose?.fraction||0;
    if(!this.mouthIndices)this.mouthIndices=this.data.animations[7336].frames[0].map((p,i)=>({p,i})).filter(a=>a.p[1]>280).sort((a,b)=>b.p[2]-a.p[2]).slice(0,8).map(a=>a.i);
    const p=new THREE.Vector3();for(const i of this.mouthIndices)p.add(new THREE.Vector3(...v[i].map((n,j)=>(n+(b[i][j]-n)*f)/128/this.mouthIndices.length)));return this.localToWorld(p);
  }
  dispose(){this.parts.forEach(({mesh})=>{mesh.geometry.dispose();mesh.material.dispose();});}
}

export class View {
  constructor(container,overlay,manifest,scene,models,textures,playerRig){
    this.playerRig=playerRig;this.playerMotion=new PlayerMotion(playerRig.sequences);this.poseTransition=new PoseTransition();this.poseCache=new Map();this.container=container;this.overlay=overlay;this.manifest=manifest;this.map=scene;this.models=models;this.textures=textures;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;container.prepend(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#080807');this.scene.fog=new THREE.Fog('#080807',30,65);
    this.scene.add(new THREE.AmbientLight(0xffffff,1.55));const light=new THREE.DirectionalLight(0xfff2cf,2);light.position.set(-10,25,16);this.scene.add(light);
    this.camera=new THREE.PerspectiveCamera(42,1,.1,110);this.azimuth=.8;this.elevation=.88;this.zoom=20;this.followPlayer=true;this.focusInitialized=false;this.focus=new THREE.Vector3(0,.4,0);
    this.raycaster=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.floor=[];this.targets=[];this.statics=[];this.animated=[];this.projectiles=[];this.hazardGroup=new THREE.Group();this.scene.add(this.hazardGroup);
    this.buildRoom();this.headMotion=new HeadMotion(models['olm-head']);this.pendingShots=[];this.player=new THREE.Group();this.scene.add(this.player);this.playerParts=[];this.gearKey='';this.lastPhase=0;this.lastTick=-1;this.handDeaths={};this.previousHP={};this.lastTransition=0;this.headHiddenAt=0;this.labels=new Map();this.hits=[];
    this.encounterEffects=new EncounterEffects(this.scene,(name,time)=>this.effectModel(name,time),mesh=>this.disposeEffect(mesh));
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.32,16),new THREE.MeshBasicMaterial({color:0x000000,opacity:.5,transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.scene.add(this.shadow);
    this.clickMark=tileOutline(0xffff00);this.clickMark.visible=false;this.scene.add(this.clickMark);
    this.tileOptions={trueTile:true,destination:true,grid:true,markers:true,path:false};
    this.trueTile=tileOutline(0x30e9ef,.045);this.destinationTile=tileOutline(0xffffff);this.hoverTile=tileOutline(0xffdf55,.02);this.hoverTile.visible=false;this.scene.add(this.trueTile,this.destinationTile,this.hoverTile);
    this.practiceTiles=new THREE.Group();for(const p of PRACTICE_TILES){const mesh=tileOutline(0xf4b65b,.023);mesh.position.copy(point(p.x+.5,p.y+.5,.016));mesh.material.opacity=.7;this.practiceTiles.add(mesh);}this.scene.add(this.practiceTiles);
    const vertices=[],cells=roomWalkable(scene);for(const k of cells){const [x,y]=k.split(',').map(Number);for(const [a,b]of [[[x,y],[x+1,y]],[[x,y],[x,y+1]]])vertices.push(...point(...a,.005),...point(...b,.005));if(!cells.has(`${x+1},${y}`))vertices.push(...point(x+1,y,.005),...point(x+1,y+1,.005));if(!cells.has(`${x},${y+1}`))vertices.push(...point(x,y+1,.005),...point(x+1,y+1,.005));}
    this.grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),new THREE.LineBasicMaterial({color:0xb0a28b,transparent:true,opacity:.24,depthWrite:false}));this.scene.add(this.grid);
    this.route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthTest:false}));this.route.renderOrder=11;this.scene.add(this.route);
    new ResizeObserver(()=>this.resize()).observe(container);this.resize();
  }
  buildRoom(){
    const floorGroups=new Map();
    for(const tile of this.map.tiles){
      const geom=new THREE.PlaneGeometry(1,1),base=hsl(tile.color);const colors=[];for(let i=0;i<4;i++)colors.push(base.r,base.g,base.b);geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      geom.rotateX(-Math.PI/2);const p=point(tile.x+.5,tile.y+.5,-.035);geom.translate(p.x,p.y,p.z);if(!floorGroups.has(tile.texture))floorGroups.set(tile.texture,[]);floorGroups.get(tile.texture).push(geom);
    }
    for(const [texture,geometries]of floorGroups){this.scene.add(new THREE.Mesh(mergeGeometries(geometries),new THREE.MeshLambertMaterial({vertexColors:texture<0,map:this.textures[texture]||null,side:THREE.DoubleSide})));geometries.forEach(g=>g.dispose());}
    const templates=new Map(),instances=new Map();
    for(const loc of this.map.locations){const data=this.models[loc.key];if(!data)continue;if(!templates.has(loc.key))templates.set(loc.key,new AnimatedModel(data,this.textures));const obj=new THREE.Group();for(const mesh of templates.get(loc.key).children)obj.add(mesh.clone());let sx=loc.sizeX,sy=loc.sizeY;if(loc.rotation%2)[sx,sy]=[sy,sx];
      obj.position.copy(point(loc.x+sx/2,loc.y+sy/2));obj.rotation.y=-loc.rotation*Math.PI/2;
      if([29882,29885,29888].includes(loc.id)){this.scene.add(obj);this.statics.push({loc,obj});}else{obj.updateMatrixWorld(true);obj.children.forEach((mesh,i)=>{const key=`${loc.key}:${i}`;if(!instances.has(key))instances.set(key,{mesh,matrices:[]});instances.get(key).matrices.push(mesh.matrixWorld.clone());});}}
    for(const {mesh,matrices}of instances.values()){const batch=new THREE.InstancedMesh(mesh.geometry,mesh.material,matrices.length);matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));batch.computeBoundingSphere();this.scene.add(batch);}
    for(const target of ['head','melee','mage']){const obj=new AnimatedModel(this.models[`olm-${target}`],this.textures,true);obj.userData.target=target;obj.traverse(child=>child.userData.target=target);this.scene.add(obj);this.targets.push(obj);this.animated.push(obj);}
  }
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.overlay.width=w*devicePixelRatio;this.overlay.height=h*devicePixelRatio;this.overlay.style.width=w+'px';this.overlay.style.height=h+'px';for(const mesh of [this.clickMark,this.trueTile,this.destinationTile,this.hoverTile,...this.practiceTiles.children]){const width=w<520?Math.max(.1,mesh.userData.outlineWidth):mesh.userData.outlineWidth;if(mesh.userData.currentWidth!==width){mesh.geometry.dispose();mesh.geometry=outlineGeometry(width);mesh.userData.currentWidth=width;}}}
  cameraUpdate(){const zoom=this.zoom*Math.max(1,(this.followPlayer?1.1:1.45)/this.camera.aspect),radius=zoom*Math.cos(this.elevation);this.camera.position.set(this.focus.x+Math.sin(this.azimuth)*radius,this.focus.y+Math.sin(this.elevation)*zoom,this.focus.z+Math.cos(this.azimuth)*radius);this.camera.lookAt(this.focus);}
  resetCamera(){this.azimuth=.8;this.elevation=.88;this.zoom=20;}
  reset(){this.focusInitialized=false;this.playerMotion.reset();this.wasWon=false;this.handDeaths={};this.previousHP={};this.lastTransition=0;this.headHiddenAt=0;this.lastTick=-1;this.lastPhase=0;this.gearKey='';this.hits=[];this.pendingShots=[];this.playerTime=undefined;this.handBusy=null;this.clickMark.visible=false;this.hoverTile.visible=false;
    this.encounterEffects.clear();this.lastPlayerPose=null;this.poseTransition.reset();this.clickFeedback=null;
    for(const p of this.projectiles){this.scene.remove(p.mesh);this.disposeEffect(p.mesh);}this.projectiles=[];
  }
  rotate(dx,dy){this.azimuth-=dx*.007;this.elevation=THREE.MathUtils.clamp(this.elevation+dy*.004,.35,1.35);}
  zoomBy(delta){this.zoom=THREE.MathUtils.clamp(this.zoom+delta*.015,12,40);}
  pick(clientX,clientY,game){const rect=this.container.getBoundingClientRect();this.mouse.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);this.raycaster.setFromCamera(this.mouse,this.camera);
    const targets=this.targets.filter(t=>t.visible&&game.canAttack(t.userData.target)),hit=this.raycaster.intersectObjects(targets,true)[0];if(hit)return{target:hit.object.userData.target,point:hit.point};
    const ground=this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());if(!ground)return null;const tile={x:Math.floor(ground.x+32.5),y:Math.floor(44.5-ground.z)};if(game.walkable.has(`${tile.x},${tile.y}`))return{tile,point:ground};return null;
  }
  showClick(hit,screen){if(!hit?.point)return;this.clickFeedback={...(screen||this.project(hit.point)),attack:!!hit.target,started:performance.now()};this.clickMark.position.copy(hit.tile?point(hit.tile.x+.5,hit.tile.y+.5,.04):hit.point);this.clickMark.visible=!!hit.tile;this.clickAt=this.time||0;}
  hover(hit){this.hoverTile.visible=!!hit?.tile;if(hit?.tile)this.hoverTile.position.copy(point(hit.tile.x+.5,hit.tile.y+.5,.025));}
  gear(game,time){const ids=Object.entries(game.equipment).map(([k,v])=>`${k}:${v}`).join(',');if(ids===this.gearKey)return;this.gearKey=ids;this.poseCache.clear();for(const part of this.playerParts){this.player.remove(part);part.dispose();}this.playerParts=[];
    const hidden=new Set([0,2,3,4,5,6]);const keys=this.manifest.playerKits.filter(kit=>!hidden.has(kit.part)||((kit.part===0&&!game.equipment.head)||(kit.part===2&&!game.equipment.body)||(kit.part===3&&!game.equipment.body)||(kit.part===4&&!game.equipment.hands)||(kit.part===5&&!game.equipment.legs)||(kit.part===6&&!game.equipment.feet))).map(k=>k.key);
    for(const id of Object.values(game.equipment))keys.push(...(this.manifest.items[id]?.wearModels||[]));
    for(const key of keys){const part=new AnimatedModel(this.models[key],this.textures,true);this.player.add(part);this.playerParts.push(part);}
    this.rig=assembleRig(keys.map(key=>({key,data:this.models[key]})),this.playerRig.rigs);this.poseTransition.reset();
  }
  bossPhase(game,time){if(this.lastPhase===game.phase)return;const east=game.east;
    // Keep the active wall in view when Olm changes sides between phases.
    if(this.lastEast!==undefined&&east!==this.lastEast)this.azimuth+=Math.PI;
    const changed=this.lastPhase>0;this.lastPhase=game.phase;this.lastEast=east;this.headHiddenAt=0;this.handDeaths={};this.handBusy=null;
    this.headMotion.reset(game.phase,time,game.headFacing);if(changed)this.headMotion.play(7335,time);this.pendingShots=[];
    for(const {loc,obj}of this.statics)if([29882,29885,29888].includes(loc.id))obj.visible=(loc.x>=38)!==east;
    for(const obj of this.targets){const target=obj.userData.target,r=game.targetRect(target);obj.position.copy(point(east?42:24,r.y+2.5));obj.rotation.y=east?-Math.PI/2:-3*Math.PI/2;obj.setAnimation(target==='head'?7336:target==='melee'?7355:7351,time);}
  }
  tick(game,time){
    this.bossPhase(game,time);
    if(game.transition&&!this.lastTransition){this.headMotion.play(7348,time);this.headHiddenAt=time+clipDuration(this.models['olm-head'].animations[7348]);}
    if(game.won&&!this.wasWon){this.headMotion.play(7348,time);this.headHiddenAt=time+clipDuration(this.models['olm-head'].animations[7348]);}this.wasWon=game.won;this.lastTransition=game.transition;
    for(const hand of ['mage','melee']){if(!game.handHP[hand]&&this.previousHP[hand]>0){const id=hand==='mage'?7352:7370;this.handDeaths[hand]={id,started:time,until:time+clipDuration(this.models['olm-'+hand].animations[id])};}if(game.handHP[hand]>0)delete this.handDeaths[hand];this.previousHP[hand]=game.handHP[hand];}
    this.encounterEffects.sync(game);
    for(const e of game.effects){if(e.type==='attack'){
      this.playerMotion.attack(e.animation||game.animation,time);

      if(e.style!=='melee')this.projectile(point(e.from.x+.5,e.from.y+.5,1),point(...Object.values(game.targetPoint(e.target)),2),e.style==='mage'?0x59bdb6:0xeeeecc,time);
    }else if(e.type==='hand-hit')this.hits.push({time,point:point(...Object.values(game.targetPoint(e.target)),2.7),damage:e.damage,healing:e.healing,hitSlot:e.hitSlot});
    else if(e.type==='player-hit')this.hits.push({time,followPlayer:true,damage:e.damage});
    else if(e.type==='hazard-impact')this.encounterEffects.burst('explosion',e.x,e.y,time);
    else if(e.type==='hand-special'){const id={crystal:7358,lightning:7356,portal:7359,heal:7357}[e.special];this.handBusy={id,started:time,until:time+clipDuration(this.models['olm-melee'].animations[id])};}
    else if(e.type==='olm-power')this.headMotion.handle(e,time,game.phase);
    else if(e.type==='turn')this.headMotion.handle(e,time,game.phase);
    else if(e.type==='olm-projectile'){
      this.headMotion.handle(e,time,game.phase);const aim=e.aim||game.position;
      this.pendingShots.push({due:time+360,to:point(aim.x+.5,aim.y+.5,1),color:e.sphere?{mage:0xaa55ff,range:0x44ff55,melee:0xff3322}[e.style]:e.style==='mage'?0x4db947:0xcbbce8,effect:e.sphere?null:e.style,duration:e.sphere?1440:840});
    }}
    this.lastTick=game.tick;
    this.route.geometry.dispose();this.route.geometry=new THREE.BufferGeometry().setFromPoints([game.position,...game.path].map(p=>point(p.x+.5,p.y+.5,.03)));
  }
  effectModel(name,time){const def=this.manifest.effects[name],obj=new AnimatedModel(this.models[def.key],this.textures,true);if(def.animation>=0)obj.setAnimation(def.animation,time);return obj;}
  disposeEffect(mesh){mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  projectile(from,to,color,time,effect=null,duration=1200,followPlayer=false){const mesh=effect?this.effectModel(effect,time):new THREE.Mesh(new THREE.IcosahedronGeometry(followPlayer?.27:.13,1),new THREE.MeshBasicMaterial({color}));if(!effect&&followPlayer){const halo=new THREE.Mesh(new THREE.IcosahedronGeometry(.4,1),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.2,depthWrite:false}));mesh.add(halo);}this.scene.add(mesh);this.projectiles.push({mesh,from,to,time,duration,followPlayer});}
  project(p){const v=p.clone().project(this.camera);return{x:(v.x*.5+.5)*this.container.clientWidth,y:(-.5*v.y+.5)*this.container.clientHeight};}
  draw(game,time,progress){
    this.time=time;this.gear(game,time);if(game.tick!==this.lastTick)this.tick(game,time);
    const points=game.motionPath||[game.position],steps=points.length-1,pace=game.motionPace||1,movementProgress=steps?Math.min(1,progress*pace/steps):1;
    const {x,y}=movementSample(points,movementProgress),moving=movementProgress<1&&steps>0;
    this.player.position.copy(point(x+.5,y+.5));this.shadow.position.copy(point(x+.5,y+.5,.01));
    const next=points[Math.min(Math.floor(movementProgress*steps)+1,steps)],desired=moving&&!game.target?Math.atan2(next.x-x,-(next.y-y)):game.facing;
    const elapsed=Math.max(0,time-(this.playerTime??time));this.playerTime=time;const angle=THREE.MathUtils.euclideanModulo(desired-this.player.rotation.y+Math.PI,Math.PI*2)-Math.PI;this.player.rotation.y+=Math.sign(angle)*Math.min(Math.abs(angle),elapsed*(Math.PI/640));
    const cameraTarget=this.followPlayer?new THREE.Vector3(this.player.position.x,.4,this.player.position.z):new THREE.Vector3(0,.4,0);if(!this.focusInitialized){this.focus.copy(cameraTarget);this.focusInitialized=true;}else this.focus.lerp(cameraTarget,1-Math.exp(-elapsed/100));this.cameraUpdate();
    this.animatePlayer(time,moving,pace,game.weapon?.stance);
    this.trueTile.visible=this.tileOptions.trueTile;this.trueTile.position.copy(point(game.position.x+.5,game.position.y+.5,.02));
    this.destinationTile.visible=this.tileOptions.destination&&!!game.destination&&(game.path.length>0||moving);if(game.destination)this.destinationTile.position.copy(point(game.destination.x+.5,game.destination.y+.5,.018));
    this.grid.visible=this.tileOptions.grid;this.practiceTiles.visible=this.tileOptions.markers;this.route.visible=this.tileOptions.path;
    for(const obj of this.targets){const target=obj.userData.target;const death=this.handDeaths[target];obj.visible=target==='head'?(!this.headHiddenAt||time<this.headHiddenAt):!!(game.phase<4&&(game.handHP[target]>0&&!game.transition||death&&time<death.until));if(death){obj.setAnimation(death.id,time,{started:death.started,loop:false});obj.animate(time);continue;}
      if(target==='head'){const pose=this.headMotion.sample(time);obj.setAnimation(pose.id,time,pose);}
      if(target==='melee'){const busy=this.handBusy&&time<this.handBusy.until;const id=game.tick<game.clenchUntil?7361:busy?this.handBusy.id:game.tick<game.healUntil?7357:7355;obj.setAnimation(id,time,{started:busy?this.handBusy.started:obj.anim===id?obj.started:time,loop:!busy});}obj.animate(time);}
    for(const {loc,obj}of this.statics)if([29882,29885,29888].includes(loc.id)){
      const inactive=(loc.x>=38)!==game.east;
      const fallen=loc.id===29885?(game.phase===4||game.handHP.melee===0||!!game.transition):loc.id===29888?(game.phase===4||game.handHP.mage===0||!!game.transition):false;
      const death=this.handDeaths[loc.id===29885?'melee':'mage'];obj.visible=inactive||fallen&&!(death&&time<death.until);
    }
    this.targets[0].updateMatrixWorld(true);for(const shot of this.pendingShots)if(time>=shot.due)this.projectile(this.targets[0].mouthPosition(),shot.to,shot.color,shot.due,shot.effect,shot.duration,true);this.pendingShots=this.pendingShots.filter(shot=>time<shot.due);
    for(const p of this.projectiles){const fraction=(time-p.time)/p.duration;p.mesh.animate?.(time);if(p.followPlayer)p.to.copy(this.player.position).add(new THREE.Vector3(0,1,0));p.mesh.position.lerpVectors(p.from,p.to,THREE.MathUtils.clamp(fraction,0,1));if(fraction>1){this.scene.remove(p.mesh);this.disposeEffect(p.mesh);}}
    this.projectiles=this.projectiles.filter(p=>time-p.time<=p.duration);if(time-this.clickAt>400)this.clickMark.visible=false;
    this.encounterEffects.draw(game,time,this.player);
    this.renderer.render(this.scene,this.camera);this.drawOverlay(game,time,progress);
  }
  animatePlayer(time,moving,pace,stance){
    const sample=this.playerMotion.sample(time,moving,pace,stance),{sequence,frame,next,fraction,movement,movementSample}=sample;
    const poseKey=[this.gearKey,sequence.name,frame,next,fraction,movement?.name,movementSample?.frame,movementSample?.fraction,time].join(':');if(poseKey===this.lastPlayerPose)return;this.lastPlayerPose=poseKey;
    const pose=(frame,mf=0)=>{const key=sequence.name+':'+frame+':'+(movement?.name||'')+':'+mf;if(!this.poseCache.has(key)){if(this.poseCache.size>48)this.poseCache.delete(this.poseCache.keys().next().value);this.poseCache.set(key,poseRig(this.rig,sequence,frame,movement,mf));}return this.poseCache.get(key);};
    const a=pose(frame,movementSample?.frame),b=pose(next,movementSample?.frame),c=movement?pose(frame,movementSample.next):a,d=movement?pose(next,movementSample.next):b,mix=movement?movementSample.fraction:0;
    const interpolated=a.map((v,j)=>v.map((n,axis)=>{const start=n+(b[j][axis]-n)*fraction,end=c[j][axis]+(d[j][axis]-c[j][axis])*fraction;return start+(end-start)*mix;}));
    const displayed=this.poseTransition.sample(interpolated,[sequence.name,movement?.name,this.playerMotion.action?.started].join(':'),time);
    this.playerParts.forEach((part,partIndex)=>{const offset=this.rig.offsets[partIndex];for(const {mesh,indices}of part.parts){const attribute=mesh.geometry.attributes.position,buffer=attribute.array;for(let i=0;i<indices.length;i++){const vertex=displayed[indices[i]+offset];for(let axis=0;axis<3;axis++)buffer[i*3+axis]=vertex[axis]/128;}attribute.needsUpdate=true;mesh.geometry.computeVertexNormals();}});
  }
  drawOverlay(game,time,progress){const ctx=this.overlay.getContext('2d');ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.clearRect(0,0,this.container.clientWidth,this.container.clientHeight);ctx.font='bold 13px monospace';ctx.textAlign='center';
    const click=this.clickFeedback,age=click?performance.now()-click.started:Infinity;
    if(age<400){const size=7+3*Math.sin(age/400*Math.PI);ctx.save();ctx.translate(click.x,click.y);ctx.lineCap='square';for(const [color,width]of [['#17120a',5],[click.attack?'#ff3020':'#ffe700',2]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(-size,-size);ctx.lineTo(size,size);ctx.moveTo(size,-size);ctx.lineTo(-size,size);ctx.stroke();}ctx.restore();}
    for(const target of ['mage','melee','head']){if(target==='head'&&game.phase<4||target!=='head'&&game.phase===4||game.handHP[target]<=0)continue;
      const r=game.targetRect(target),p=this.project(point(game.east?39:26,r.y+2.5,3.8));ctx.fillStyle='#000';ctx.fillRect(p.x-36,p.y-5,72,8);ctx.fillStyle='#bd302a';ctx.fillRect(p.x-35,p.y-4,70,6);ctx.fillStyle='#38b12d';ctx.fillRect(p.x-35,p.y-4,70*game.handHP[target]/(target==='head'?800:game.options.handHealth),6);}
    this.hits=this.hits.filter(h=>time-h.time<950);for(const hit of this.hits){if(time<hit.time)continue;const p=this.project(hit.followPlayer?this.player.position.clone().add(new THREE.Vector3(0,1.65,0)):hit.point);p.x+=(hit.hitSlot||0)*25;p.y-=(time-hit.time)/120;ctx.fillStyle=hit.healing?'#14841d':hit.damage?'#a5140d':'#202cbb';ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d1a889';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(hit.damage,p.x,p.y+4);}
    for(const h of game.hazards){if(!['portal','pool','bomb','burst'].includes(h.type)||game.tick>h.due)continue;const p=this.project(point(h.x+.5,h.y+.5,.3));ctx.fillStyle='#fff';ctx.fillText(Math.max(0,h.due-game.tick)+'t',p.x,p.y);}
    if(game.protection){const p=this.project(this.player.position.clone().add(new THREE.Vector3(0,2,0)));ctx.fillStyle='#fff9c0';ctx.fillText(game.protection==='mage'?'✦':game.protection==='range'?'➶':'⚔',p.x,p.y);}
    if(game.tick<game.healUntil){const hand=game.targetPoint('melee'),p=this.project(point(hand.x,hand.y,3.5));ctx.fillStyle='#7bff79';ctx.font='bold 30px serif';ctx.fillText('∞',p.x,p.y);}
    if(game.burns.length){const p=this.project(this.player.position.clone().add(new THREE.Vector3(0,2.4,0)));ctx.font='bold 13px monospace';ctx.fillStyle='#ffdf47';ctx.fillText('Burn with me!',p.x,p.y);}
  }
  icons(){
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(48,42);renderer.setPixelRatio(1);renderer.setClearColor(0,0);const scene=new THREE.Scene();scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,5,10);scene.add(light);const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,100);camera.position.z=10;const icons={};
    for(const item of Object.values(this.manifest.items)){const model=new AnimatedModel(this.models[item.icon],this.textures);model.rotation.set((item.iconAngles[0]||0)*Math.PI/1024,(item.iconAngles[1]||0)*Math.PI/1024,(item.iconAngles[2]||0)*Math.PI/1024);scene.add(model);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());model.position.sub(center);const span=Math.max(size.x/1.14,size.y)*.65||1;camera.left=-span*1.14;camera.right=span*1.14;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();renderer.render(scene,camera);icons[item.id]=renderer.domElement.toDataURL();scene.remove(model);model.dispose();}
    renderer.dispose();return icons;
  }
}

export async function loadAssets(progress){const manifest=await asset('manifest.json',true),scene=await asset('scene.json',true),models={},textures={};let count=0;const entries=Object.entries(manifest.models);
  // Limit concurrent inflate requests so phone startup does not spike memory.
  let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<entries.length){const [key,info]=entries[next++];models[key]=await asset(info.file,true);progress(++count,entries.length);}}));
  await Promise.all(Object.entries(scene.textures).map(async([id,file])=>{textures[id]=await new THREE.TextureLoader().loadAsync(await asset(file));textures[id].colorSpace=THREE.SRGBColorSpace;textures[id].magFilter=THREE.NearestFilter;textures[id].wrapS=textures[id].wrapT=THREE.RepeatWrapping;}));
  const playerRig=await asset(manifest.playerRig,true);return{manifest,scene,models,textures,playerRig};
}
