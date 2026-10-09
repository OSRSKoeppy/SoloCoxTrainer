export function chooseInterface(preference, {mobile=false,userAgent='',touchPoints=0,coarse=false}={}) {
  if(preference==='desktop'||preference==='mobile')return preference;
  return mobile||/Android|iPhone|iPad|iPod/i.test(userAgent)||(touchPoints>0&&coarse)?'mobile':'desktop';
}

// Default prayer-book order, including the prayers unused by this encounter.
export const PRAYERS=[
  ['Thick Skin',115],['Burst of Strength',116],['Clarity of Thought',117],['Sharp Eye',133],['Mystic Will',134],
  ['Rock Skin',118],['Superhuman Strength',119],['Improved Reflexes',120],['Rapid Restore',121],['Rapid Heal',122],
  ['Protect Item',123],['Hawk Eye',502],['Mystic Lore',503],['Steel Skin',124],['Ultimate Strength',125],
  ['Incredible Reflexes',126],['Protect from Magic',128,'mage'],['Protect from Missiles',129,'range'],['Protect from Melee',127,'melee'],['Eagle Eye',504],
  ['Mystic Might',505],['Retribution',131],['Redemption',130],['Smite',132],['Preserve',947],
  ['Chivalry',945],['Piety',946,'','melee'],['Rigour',1420,'','range'],['Augury',1421,'','mage']
];
export const EQUIPMENT=[['head',156,3,1],['cape',157,2,2],['neck',158,3,2],['ammo',166,4,2],['weapon',159,1,3],['body',161,3,3],['shield',162,5,3],['legs',163,3,4],['hands',164,1,5],['feet',165,3,5],['ring',160,5,5]];

export function initInterface() {
  const select=document.getElementById('interface-mode'),query=matchMedia('(pointer:coarse)');
  try{select.value=localStorage.getItem('olm-interface')||'auto';}catch{}
  if(!select.value)select.value='auto';
  const apply=()=>{document.body.dataset.interface=chooseInterface(select.value,{mobile:navigator.userAgentData?.mobile,userAgent:navigator.userAgent,touchPoints:navigator.maxTouchPoints,coarse:query.matches});};
  select.onchange=()=>{apply();setChat(document.body.dataset.interface==='mobile');try{localStorage.setItem('olm-interface',select.value);}catch{}};
  query.addEventListener('change',apply);apply();
  document.getElementById('panel-close').onclick=()=>{document.body.classList.add('panel-closed');document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-expanded','false');b.classList.remove('selected');});};
  const chat=document.getElementById('chat'),toggle=document.getElementById('chat-toggle');
  const setChat=closed=>{chat.classList.toggle('collapsed',closed);document.getElementById('messages').hidden=closed;toggle.textContent=closed?'+':'−';toggle.setAttribute('aria-label',closed?'Expand chat':'Collapse chat');toggle.setAttribute('aria-expanded',String(!closed));};
  setChat(document.body.dataset.interface==='mobile');toggle.onclick=()=>setChat(!chat.classList.contains('collapsed'));
  document.addEventListener('pointerdown',e=>{const menu=document.getElementById('trainer-menu');if(menu.open&&!menu.contains(e.target))menu.open=false;});
  document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.getElementById('app-status').textContent='Use Add to Home Screen for a full-screen experience on this browser.';}};
}
