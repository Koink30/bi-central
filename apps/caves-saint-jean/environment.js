/* TEST is an isolated, per-account local sandbox. Production remains unchanged. */
(() => {
 'use strict';
 const MODE_KEY='cave-environment-v1';
 let selection=null;try{selection=JSON.parse(sessionStorage.getItem(MODE_KEY)||'null');}catch{}
 const test=selection?.mode==='test';
 const suffix=test?'-test-'+encodeURIComponent((selection.ownerId||'')+'-'+(selection.userId||'')):'';
 Object.defineProperty(window,'caveIsTest',{value:test});
 Object.defineProperty(window,'cavePhotoDB',{value:'caves-saint-jean-photos'+suffix});
 Object.defineProperty(window,'caveStateDB',{value:'caves-saint-jean-state'+suffix});
 window.caveModeSwitching=false;
 window.caveEnvironmentAuthorized=false;
 let resolveReady;
 window.caveEnvironmentReady=new Promise(resolve=>{resolveReady=resolve;});
 document.documentElement.dataset.caveEnvironment=test?'test':'real';
 document.documentElement.dataset.caveEnvReady='false';
 let verified=null,bar,info,tools,error,busy=false;
 function record(mode,account){sessionStorage.setItem(MODE_KEY,JSON.stringify({mode,userId:account.userId,ownerId:account.ownerId}));}
 function reload(){const url=new URL(location.href);url.searchParams.delete('cloud_revision');url.searchParams.set('v','40');location.replace(url.toString());}
 function admin(){if(verified?.role!=='admin')throw new Error('Cette action est réservée à un administrateur connecté.');}
 function say(text){if(error)error.textContent=text;}
 function update(){
  if(!bar)return;
  info.textContent=!window.caveEnvironmentAuthorized?'Vérification du compte…':test?'🟠 MODE TEST — données fictives · enregistrées sur cet appareil uniquement':'🟢 MODE RÉEL — données du magasin';
  tools.hidden=verified?.role!=='admin'||!window.caveEnvironmentAuthorized;
  for(const button of tools.querySelectorAll('button'))button.disabled=busy;
 }
 window.caveResolveEnvironment=async(account,userId)=>{
  const current={...account,userId:userId||''};verified=current;
  const matches=selection?.userId===current.userId&&selection?.ownerId===current.ownerId;
  const wanted=current.role==='admin'?(matches?selection.mode:'test'):'real';
  if((wanted==='test')!==test||test&&!matches){
    record(wanted,current);window.caveModeSwitching=true;reload();return new Promise(()=>{});
  }
  record(wanted,current);
  window.caveEnvironmentAuthorized=true;document.documentElement.dataset.caveEnvReady='true';
  update();resolveReady(true);
 };
 function db(name,store,mode,run){
  return new Promise((resolve,reject)=>{
   const request=indexedDB.open(name,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store,store==='photos'?{keyPath:'id'}:undefined);};
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const database=request.result;const tx=database.transaction(store,mode);let result;
    try{const req=run(tx.objectStore(store));if(req)req.onsuccess=()=>{result=req.result;};}catch(e){database.close();reject(e);return;}
    tx.oncomplete=()=>{database.close();resolve(result);};tx.onabort=()=>{database.close();reject(tx.error||new Error('Enregistrement interrompu'));};tx.onerror=()=>{};
   };
  });
 }
 async function switchMode(){
  admin();if(busy)return;
  if(document.querySelector('.cave-dialog[data-state="open"]')){say('Fermez la fiche en cours avant de changer de mode.');return;}
  if(!test&&!confirm('Passer en TEST ? Les essais seront séparés des données réelles.'))return;
  if(test&&!confirm('Revenir en RÉEL ? Les prochaines saisies modifieront les données du magasin.'))return;
  busy=true;window.caveModeSwitching=true;update();say('');
  try{
   await window.caveStorageFlush?.();
   if(!test){await window.caveSynchronizeNow?.();if(window.caveSyncState?.kind!=='ok')throw new Error('Terminez la synchronisation réelle avant de changer de mode.');}
   record(test?'real':'test',verified);reload();
  }catch(e){window.caveModeSwitching=false;busy=false;update();say(e.message);}
 }
 async function prepareTest(copy){
  admin();if(!test||busy)return;
  if(document.querySelector('.cave-dialog[data-state="open"]')){say('Fermez la fiche en cours avant cette action.');return;}
  if(!confirm(copy?'Remplacer les essais par une copie des données RÉELLES déjà présentes sur cet appareil ? Le réel restera intact.':'Effacer uniquement les essais et les photos de TEST ? Le catalogue de départ sera rechargé.'))return;
  busy=true;window.caveModeSwitching=true;update();say(copy?'Copie vers TEST…':'Réinitialisation du TEST…');
  try{
   await window.caveStorageFlush?.();
   let snapshot=null,photos=[];
   if(copy){
    const owner=await db('caves-saint-jean-state','state','readonly',s=>s.get('owner'));
    if(owner!==verified.ownerId)throw new Error('Ouvrez et synchronisez d’abord le mode RÉEL avec ce compte sur cet appareil.');
    const raw=await db('caves-saint-jean-state','state','readonly',s=>s.get('snapshot'));
    if(!raw)throw new Error('Aucune copie réelle sur cet appareil. Ouvrez et synchronisez le RÉEL auparavant.');
    const value=JSON.parse(raw);if(!value?.state||value.state.environment==='test')throw new Error('Copie réelle non reconnue.');
    value.state.environment='test';value.revision=0;
    snapshot=JSON.stringify(value);
    photos=await db('caves-saint-jean-photos','photos','readonly',s=>s.getAll());
   }
   await db(window.cavePhotoDB,'photos','readwrite',s=>{s.clear();photos.forEach(p=>s.put(p));});
   await db(window.caveStateDB,'state','readwrite',s=>snapshot===null?s.delete('snapshot'):s.put(snapshot,'snapshot'));
   reload();
  }catch(e){busy=false;window.caveModeSwitching=false;update();say(e.message);}
 }
 function boot(){
  bar=document.createElement('section');bar.id='cave-environment-bar';bar.setAttribute('aria-label','Environnement de travail');
  info=document.createElement('strong');info.setAttribute('role','status');
  tools=document.createElement('details');tools.id='cave-environment-tools';tools.hidden=true;
  const summary=document.createElement('summary');summary.textContent='⚙ Mode & essais';
  const panel=document.createElement('div');panel.className='cave-environment-actions';
  const add=(text,run)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>Promise.resolve().then(run).catch(e=>say(e.message));panel.append(b);};
  add(test?'Passer en RÉEL':'Passer en TEST',switchMode);
  if(test){add('Copier RÉEL → TEST (cet appareil)',()=>prepareTest(true));add('Réinitialiser le TEST',()=>prepareTest(false));}
  error=document.createElement('span');error.className='cave-environment-message';error.setAttribute('role','status');
  tools.append(summary,panel);bar.append(info,tools,error);document.body.prepend(bar);update();
 }
 const style=document.createElement('style');style.textContent=`
 html[data-cave-env-ready=false] :is(#root,main){pointer-events:none;visibility:hidden}
 #cave-environment-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;background:#e8f5ec;color:#164e30;border-bottom:2px solid #4b9766;font:600 13px system-ui;position:relative;z-index:900}
 html[data-cave-environment=test] #cave-environment-bar{background:#fff0cc;color:#673a00;border-color:#e59416}
 #cave-environment-tools{position:relative}#cave-environment-tools[hidden]{display:none}
 #cave-environment-tools summary{cursor:pointer;min-height:38px;padding:9px 12px;border:1px solid currentColor;border-radius:9px;list-style:none}
 .cave-environment-actions{position:absolute;right:0;top:100%;width:min(340px,88vw);padding:10px;background:#fff;color:#30271b;border:1px solid #cbbb9d;border-radius:12px;box-shadow:0 12px 36px #0003}
 .cave-environment-actions button{display:block;width:100%;min-height:48px;text-align:left;padding:10px;margin:4px 0;border-radius:8px;background:#f5efe4;color:#30271b;font:600 14px system-ui}
 .cave-environment-message:not(:empty){width:100%;font-weight:500}
 @media(max-width:767px){#cave-environment-bar{padding:8px 12px;font-size:12px}#cave-environment-bar>strong{flex:1;min-width:180px}}
 @media print{#cave-environment-tools{display:none!important}html[data-cave-environment=test] body:before{content:"TEST — DOCUMENT FICTIF";display:block;font:bold 24px sans-serif;color:#a54d00}}
 `;document.head.append(style);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
