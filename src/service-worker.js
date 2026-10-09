/* The build supplies the complete asset list and a content-derived version. */
const VERSION=__VERSION__,FILES=__FILES__;
const PREFIX='olm-lab:'+self.registration.scope+':',CACHE=PREFIX+VERSION;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(
  FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'}))
))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(url.pathname===new URL('update.html',self.registration.scope).pathname){
      try{return await fetch(new Request(url.href,{cache:'reload'}));}
      catch{const fallback=await cache.match(event.request,{ignoreSearch:true});if(fallback)return fallback;throw new Error('Connect to update the trainer.');}
    }
    // A build is served atomically: HTML and models always belong to one version.
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    if(event.request.mode==='navigate'&&url.pathname===new URL(self.registration.scope).pathname){
      const index=await cache.match(new URL('index.html',self.registration.scope).href);
      if(index)return index;
    }
    return fetch(event.request);
  })());
});
