export function initAppInstall(){
  const button=document.getElementById('install-app'),status=document.getElementById('app-status'),update=document.getElementById('update-app');
  let prompt,registration,reloading=false;
  const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const label=()=>button.textContent=installed()?'App installed':prompt?'Install Olm Lab':'How to install';label();
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;label();});
  window.addEventListener('appinstalled',()=>{prompt=null;label();});
  button.onclick=async()=>{if(prompt){const pending=prompt;prompt=null;await pending.prompt();await pending.userChoice;label();}else document.getElementById('install-help').hidden=false;};
  if(window.OLM_ASSETS||location.protocol==='file:'){status.textContent='This HTML file already contains everything needed to play offline. Install the app from the hosted site.';return;}
  if(!('serviceWorker' in navigator)||!window.isSecureContext){status.textContent='App installation and offline saving require HTTPS or localhost.';return;}
  status.textContent='Saving game assets for offline play…';
  const waiting=()=>{if(registration.waiting){update.hidden=false;status.textContent='An update is ready. Apply it when you finish your fight.';}};
  update.onclick=()=>{if(registration?.waiting){reloading=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}};
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
    registration=reg;waiting();
    const watch=worker=>worker?.addEventListener('statechange',()=>{if(worker.state==='installed')waiting();if(worker.state==='redundant'&&!registration.active)status.textContent='Offline saving failed. Reopen online to retry.';});
    watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));
    navigator.serviceWorker.ready.then(()=>{if(!reg.waiting)status.textContent='Ready to play offline. Browser storage must remain available.';});
  }).catch(()=>{status.textContent='Offline saving is unavailable. You can still play online or download the standalone HTML.';});
}
