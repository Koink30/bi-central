/* Les Caves de Saint-Jean — Identifier une bouteille, v30.
   Simple, hors recherche externe : EAN/UPC -> catalogue local -> fiche existante ou nouvelle fiche.
   Photo liée seulement après enregistrement confirmé du produit. */
(() => {
'use strict';
if(window.caveScanOpen)return;
const KEY='bi-caviste-saint-jean-v1';
const LIB='https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
const LIB_FALLBACK='https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
const PHOTO_DB='caves-saint-jean-photos', PHOTO_STORE='photos';
const $=id=>document.getElementById(id);
let layer=null,video=null,reader=null,controls=null,streaming=false,loading=false;
let currentCode='',foundProduct=null,photoFile=null,photoURL='',binding=false;
const uiCss=`
.cave-scan-launch{display:inline-flex!important;align-items:center;justify-content:center;border:1px solid #b99a60!important;border-radius:10px!important;background:#294539!important;color:#fff!important;padding:10px 13px!important;font-weight:700!important;cursor:pointer}
#cave-scan-layer{display:none;position:fixed;inset:0;background:#07100cce;z-index:2147483500;align-items:center;justify-content:center;padding:12px;overflow-y:auto}
#cave-scan-layer.open{display:flex}
#cave-scan-modal{box-sizing:border-box;width:min(540px,100%);max-height:94dvh;overflow:auto;background:#182d24;color:#f5f0e7;border:1px solid #819b8659;border-radius:20px;box-shadow:0 25px 85px #0009;font:15px/1.45 system-ui,sans-serif}
#cave-scan-modal *{box-sizing:border-box}
.csm-top{display:flex;align-items:start;justify-content:space-between;gap:10px;padding:22px 20px 10px}
.csm-top h2{font-size:24px;line-height:1.2;color:#fff;margin:2px 0 4px;font-weight:700}
.csm-sub{font-size:13px;color:#c2d1c5}
.csm-content{padding:10px 20px 22px}
.csm-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#e7ce94;font-weight:750}
#cave-scan-modal button{font:inherit;cursor:pointer}
.csm-primary{border:0;border-radius:12px;background:#e1c489;color:#183022;font-weight:750!important;padding:14px 17px;min-height:49px}
.csm-ghost{border:1px solid #97b49a72!important;border-radius:12px;background:#ffffff0c!important;color:#fff!important;padding:12px 15px;min-height:47px}
.csm-primary:disabled,.csm-ghost:disabled{opacity:.45;cursor:not-allowed}
.csm-close{border:0;border-radius:8px;padding:5px 10px;color:white;background:#ffffff18}
.csm-main-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}
.csm-main-actions button{text-align:center}
.csm-status{border:1px solid #97b49a55;background:#ffffff09;border-radius:11px;padding:11px 13px;margin:10px 0;font-size:13px;min-height:43px;overflow-wrap:anywhere}
.csm-status.warn{border-color:#d5bd7b;color:#ffe6ac}
.csm-status.ok{border-color:#70b294;color:#c9f0df}
.csm-result{border:1px solid #a2b69a5c;border-radius:13px;padding:14px;background:#ffffff0b;margin:12px 0;min-height:80px}
.csm-result strong{display:block;color:#fff;font-size:17px;margin:4px 0}
.csm-muted{font-size:13px;color:#c2d1c5}
.csm-input{display:block;width:100%;border:1px solid #acc0ab!important;border-radius:9px!important;padding:11px!important;background:#f9f5e8!important;color:#14291f!important;font:16px system-ui!important;margin:5px 0 0}
.csm-field{display:block;font-size:13px;color:#c7dac8;margin:10px 0}
.csm-code{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
.csm-footer{display:flex;flex-wrap:wrap;gap:9px;margin-top:13px}
.csm-video-wrap{display:none;position:relative;overflow:hidden;aspect-ratio:4/3;background:#07100c;border:1px solid #789c82;border-radius:12px;margin-top:12px}
.csm-video-wrap.active{display:block}
.csm-video-wrap video{width:100%;height:100%;object-fit:cover}
.csm-target{position:absolute;left:16%;top:38%;width:68%;height:24%;border:2px solid #f3d28e;border-radius:10px;box-shadow:0 0 16px #f9d98844;pointer-events:none}
.csm-small-action{border:0!important;background:none!important;color:#e9d19c!important;padding:7px 0!important;font-size:13px!important;text-decoration:underline}
.csm-photo-preview{display:none;width:100%;max-height:150px;object-fit:contain;border-radius:10px;background:#0c1711;margin:8px 0}
.csm-photo-preview.visible{display:block}
.csm-notice{font-size:12px;color:#c4d0c4;margin-top:9px}
.csm-line{border-top:1px solid #b4c0af36;margin:13px 0}
@media(max-width:580px){#cave-scan-layer{padding:0;align-items:stretch}#cave-scan-modal{height:100dvh;max-height:100dvh;border-radius:0}.csm-content{padding:8px 15px 25px}.csm-top{padding:16px 15px 8px}.csm-main-actions{grid-template-columns:1fr}}
`;
function makeUI(){
 if(layer)return;
 const style=document.createElement('style');style.textContent=uiCss;document.head.append(style);
 layer=document.createElement('div');layer.id='cave-scan-layer';layer.setAttribute('aria-hidden','true');
 layer.innerHTML=`
 <section id="cave-scan-modal" role="dialog" aria-modal="true" aria-label="Identifier une bouteille">
  <header class="csm-top"><div><span class="csm-kicker">Les Caves de Saint-Jean</span><h2>Ajouter une bouteille</h2><div class="csm-sub">Scanner, retrouver ou créer une référence.</div></div><button class="csm-close" id="csm-close" type="button" aria-label="Fermer">✕</button></header>
  <div class="csm-content">
   <div class="csm-main-actions"><button class="csm-primary" id="csm-scan" type="button">▣ Scanner le code-barres</button><button class="csm-ghost" id="csm-photo" type="button">📷 Prendre une photo</button></div>
   <input type="file" id="csm-file" accept="image/*" capture="environment" hidden>
   <div class="csm-video-wrap" id="csm-video-wrap"><video id="csm-video" autoplay muted playsinline></video><span class="csm-target"></span></div>
   <img id="csm-photo-preview" class="csm-photo-preview" alt="Photo de la bouteille choisie">
   <label class="csm-field">Code-barres (facultatif)
    <div class="csm-code"><input id="csm-ean" class="csm-input" inputmode="numeric" autocomplete="off" placeholder="Chiffres sous les barres"><button class="csm-ghost" id="csm-find" type="button">Rechercher</button></div>
   </label>
   <div id="csm-status" class="csm-status" role="status" aria-live="polite">Scannez le code-barres au dos de la bouteille, ou créez une fiche sans code.</div>
   <section id="csm-result" class="csm-result"><div class="csm-kicker">FICHE PRODUIT</div><div class="csm-muted">Aucune bouteille sélectionnée.</div></section>
   <div class="csm-footer"><button class="csm-primary" id="csm-new" type="button">＋ Créer une fiche produit</button><button class="csm-ghost" id="csm-open" type="button" hidden>Ouvrir la fiche existante</button></div>
   <div class="csm-notice">Pas de recherche Internet ni d'OCR approximatif. Les prix et les stocks restent sous votre contrôle. Enregistrer la fiche valide l'ajout.</div>
  </div>
 </section>`;
 document.body.append(layer);
 video=$('csm-video');
 $('csm-close').onclick=close;
 layer.addEventListener('click',e=>{if(e.target===layer)close()});
 $('csm-scan').onclick=()=>streaming?stopCamera():startCamera();
 $('csm-photo').onclick=()=>$('csm-file').click();
 $('csm-file').onchange=onPhoto;
 $('csm-find').onclick=()=>lookup($('csm-ean').value);
 $('csm-ean').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookup(e.target.value)}});
 $('csm-ean').oninput=()=>{currentCode='';foundProduct=null;renderResult()};
 $('csm-new').onclick=()=>beginCreation();
 $('csm-open').onclick=openExisting;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&layer.classList.contains('open'))close()});
}
function status(text,level=''){
 if(!$('csm-status'))return;
 $('csm-status').textContent=text;
 $('csm-status').className='csm-status'+(level?' '+level:'');
}
function open(){
 makeUI();layer.classList.add('open');layer.setAttribute('aria-hidden','false');
 $('csm-ean').focus();document.documentElement.style.overflow='hidden';
}
function close(){
 stopCamera();
 if(layer){layer.classList.remove('open');layer.setAttribute('aria-hidden','true')}
 document.documentElement.style.overflow='';
}
function clearPhoto(){
 photoFile=null;
 if(photoURL){URL.revokeObjectURL(photoURL);photoURL=''}
 const img=$('csm-photo-preview');if(img){img.removeAttribute('src');img.classList.remove('visible')}
}
function reset(){
 stopCamera();clearPhoto();currentCode='';foundProduct=null;
 $('csm-ean').value='';$('csm-file').value='';renderResult();
 status('Prêt. Scannez un code-barres ou créez une fiche sans code.');
}
function stopCamera(){
 streaming=false;try{controls?.stop()}catch{}controls=null;
 if(video?.srcObject){for(const track of video.srcObject.getTracks())track.stop();video.srcObject=null}
 $('csm-video-wrap')?.classList.remove('active');
 if($('csm-scan'))$('csm-scan').textContent='▣ Scanner le code-barres';
}
let libraryPromise=null;
function loadLibrary(){
 if(window.ZXingBrowser?.BrowserMultiFormatReader)return Promise.resolve(window.ZXingBrowser);
 if(libraryPromise)return libraryPromise;
 libraryPromise=new Promise((resolve,reject)=>{
  function use(url,backup){
   const script=document.createElement('script');script.src=url;script.async=true;
   script.onload=()=>window.ZXingBrowser?.BrowserMultiFormatReader?resolve(window.ZXingBrowser):backup?use(LIB_FALLBACK,false):reject(new Error('Lecteur inaccessible'));
   script.onerror=()=>backup?use(LIB_FALLBACK,false):reject(new Error('Lecteur indisponible'));
   document.head.append(script);
  }
  use(LIB,true);
 }).catch(error=>{libraryPromise=null;throw error});
 return libraryPromise;
}
function gtinValid(value){
 const code=String(value||'').trim();
 if(!/^(?:\d{8}|\d{12,14})$/.test(code))return false;
 const digits=[...code].map(Number),check=digits.pop();
 let sum=0;
 for(let i=digits.length-1,j=0;i>=0;i--,j++)sum+=digits[i]*(j%2===0?3:1);
 return (10-sum%10)%10===check;
}
async function startCamera(){
 if(streaming)return stopCamera();
 if(!navigator.mediaDevices?.getUserMedia){status('Caméra non disponible. Saisissez le code manuellement.','warn');return}
 status('Autorisez la caméra, puis placez le code-barres horizontal dans le cadre.');
 try{
  const lib=await loadLibrary();reader=new lib.BrowserMultiFormatReader();
  streaming=true;$('csm-video-wrap').classList.add('active');$('csm-scan').textContent='■ Arrêter la caméra';
  const c=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}},video,result=>{
   if(!streaming||!result)return;
   const text=String(result.getText?.()||result.text||'').trim();
   if(!text)return;
   stopCamera();
   if(gtinValid(text)){try{navigator.vibrate?.(60)}catch{}lookup(text)}
   else if(/^https?:\/\//i.test(text))status('QR code détecté : c’est un lien Web, pas un code-barres du catalogue. Utilisez le code EAN ou créez une fiche.','warn');
   else status('Ce code ne correspond pas à un EAN valide. Réessayez.','warn');
  });
  if(streaming){controls=c;status('Caméra active : approchez les chiffres et évitez les reflets.')}
  else c?.stop();
 }catch(e){stopCamera();status('Caméra inaccessible : '+(e.message||'accès refusé')+'. Saisissez le code à la main.','warn')}
}
function getProducts(){
 try{
  const obj=JSON.parse(localStorage.getItem(KEY)||'null');
  return Array.isArray(obj?.products)?obj.products:Array.isArray(obj?.state?.products)?obj.state.products:[];
 }catch{return []}
}
function normalize(value){return String(value||'').replace(/^0+/,'').trim()}
function productEAN(product){
 const values=[product?.ean,product?.barcode,product?.gtin,product?.code_barre];
 for(const v of values){if(v&&gtinValid(String(v)))return String(v)}
 const notes=String(product?.notes||'');
 const m=notes.match(/(?:^|\n)\s*(?:EAN|GTIN|Code[- ]barres?)\s*[:：]\s*(\d{8,14})/i);
 return m?m[1]:'';
}
function matchingProduct(code){
 return getProducts().find(p=>normalize(productEAN(p))===normalize(code)&&productEAN(p))||null;
}
function renderResult(){
 const target=$('csm-result');if(!target)return;
 target.replaceChildren();
 const kicker=document.createElement('div');kicker.className='csm-kicker';
 const info=document.createElement('div');info.className='csm-muted';
 if(foundProduct){
  kicker.textContent='✓ DÉJÀ DANS LE CATALOGUE';
  const name=document.createElement('strong');name.textContent=foundProduct.name;
  info.textContent=[foundProduct.domain,foundProduct.volume,'Réf. '+foundProduct.id].filter(Boolean).join(' · ');
  target.append(kicker,name,info);
 }else if(currentCode){
  kicker.textContent='CODE LU · NOUVELLE RÉFÉRENCE';
  info.textContent='EAN '+currentCode+' — aucune correspondance dans votre catalogue. Vous pouvez créer sa fiche.';
  target.append(kicker,info);
 }else{
  kicker.textContent='FICHE PRODUIT';info.textContent='Aucune bouteille identifiée. Créez une fiche manuellement si besoin.';
  target.append(kicker,info);
 }
 $('csm-open').hidden=!foundProduct;
 $('csm-new').hidden=!!foundProduct;
}
async function lookup(input){
 if(loading)return;
 const code=String(input||'').replace(/[\s-]/g,'');
 if(!gtinValid(code)){status('Code incorrect. Vérifiez les 8, 12, 13 ou 14 chiffres du code-barres.','warn');return}
 loading=true;stopCamera();
 try{
  if(window.caveStorageReady)await window.caveStorageReady;
  currentCode=code;$('csm-ean').value=code;
  foundProduct=matchingProduct(code);
  renderResult();
  status(foundProduct?'✓ Produit retrouvé dans votre catalogue.':'✓ Code-barres lu. Pas encore enregistré dans votre catalogue.',''+(foundProduct?'ok':'warn'));
 }finally{loading=false}
}
function field(form,label){
 return [...form.querySelectorAll('label.field')].find(l=>l.querySelector('span')?.textContent?.trim()===label)?.querySelector('input,textarea,select')||null;
}
function setReactValue(element,value){
 if(!element||value==null||value==='')return false;
 const proto=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
 if(setter)setter.call(element,String(value));else element.value=String(value);
 element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}));
 return true;
}
function productForm(){
 const dialog=document.querySelector('.cave-dialog');
 return dialog?.querySelector('[data-slot="dialog-title"]')?.textContent?.includes('Fiche produit')?dialog.querySelector('form'):null;
}
function waitFor(callback,timeout=8000){
 return new Promise((resolve,reject)=>{
  const start=Date.now();
  function tick(){const v=callback();if(v)return resolve(v);if(Date.now()-start>timeout)return reject(new Error('Fiche produit inaccessible'));setTimeout(tick,80)}
  tick();
 });
}
async function fillFields(form,values){
 for(const [label,value] of values){
  if(value==null||value==='')continue;
  const control=field(form,label);if(!control)continue;
  setReactValue(control,value);
  // Le formulaire React doit terminer chaque mise à jour avant le champ suivant.
  await new Promise(resolve=>setTimeout(resolve,85));
 }
}
async function beginCreation(){
 if(loading||binding)return;
 loading=true;$('csm-new').disabled=true;
 const code=gtinValid(currentCode)?currentCode:'';
 const photo=photoFile;
 const before=new Set(getProducts().map(p=>p.id));
 try{
  close();
  window.caveNavigate?.('products');
  const button=await waitFor(()=>[...document.querySelectorAll('#root button')].find(b=>b.textContent?.trim()==='Nouveau produit'));
  button.click();
  const form=await waitFor(productForm);
  const note=code?'EAN : '+code:'';
  if(note)await fillFields(form,[['Notes',note]]);
  if(photo){installAttachAfterSave(form,before,photo);}
  field(form,'Cuvée / Nom du produit')?.focus();
  if(photo)showMessage('Photo prête : elle sera liée après validation de la nouvelle fiche.');
 }catch(e){open();status('Création impossible : '+e.message,'warn')}
 finally{loading=false;$('csm-new').disabled=false}
}
async function openExisting(){
 if(!foundProduct||loading)return;
 const p=foundProduct,selectedPhoto=photoFile;
 loading=true;
 try{
  if(selectedPhoto)await saveLinkedPhoto(p.id,selectedPhoto,p.name,currentCode);
  close();
  window.caveNavigate?.('products');
  const link=await waitFor(()=>[...document.querySelectorAll('.product-title .product-link')].find(b=>{
   const title=b.closest('.product-title');
   return title?.querySelector('.metadata')?.textContent?.split('·')[0]?.trim()===p.id;
  }),6000).catch(()=>null);
  if(link)link.click();
  else showMessage('Produit '+p.name+' retrouvé. Recherchez-le dans « Produits & stock ».');
 }catch(e){status('Impossible de rattacher la photo : '+e.message,'warn');return}
 finally{loading=false}
}
async function onPhoto(){
 const file=$('csm-file').files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){status('Sélectionnez une photo au format image.','warn');return}
 if(file.size>25*1024*1024){status('Photo trop volumineuse (25 Mo maximum).','warn');return}
 clearPhoto();photoFile=file;photoURL=URL.createObjectURL(file);
 const preview=$('csm-photo-preview');preview.src=photoURL;preview.classList.add('visible');
 status('Photo sélectionnée. Elle sera associée à la fiche produit après enregistrement.','ok');
}
async function jpegBlob(file){
 const bitmap=await createImageBitmap(file);
 const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Compression impossible')),'image/jpeg',.78));
}
async function saveLinkedPhoto(productId,file,title,ean){
 const blob=await jpegBlob(file);
 const id=crypto.randomUUID();
 const record={id,productId,title:title||'',ean:ean||'',notes:'',blob,created:Date.now()};
 await new Promise((resolve,reject)=>{
  const op=indexedDB.open(PHOTO_DB,1);
  op.onupgradeneeded=()=>{if(!op.result.objectStoreNames.contains(PHOTO_STORE))op.result.createObjectStore(PHOTO_STORE,{keyPath:'id'})};
  op.onerror=()=>reject(op.error);
  op.onsuccess=()=>{
   const db=op.result,tx=db.transaction(PHOTO_STORE,'readwrite');
   tx.objectStore(PHOTO_STORE).put(record);
   tx.oncomplete=()=>{db.close();resolve()};
   tx.onerror=()=>{db.close();reject(tx.error||new Error('Stockage indisponible'))};
  };
 });
 window.dispatchEvent(new CustomEvent('cave-photo-changed',{detail:{id}}));
 window.dispatchEvent(new CustomEvent('cave-photos-synced'));
}
function showMessage(message){
 const n=document.createElement('div');
 n.textContent=message;n.setAttribute('role','status');
 n.style.cssText='position:fixed;left:12px;right:12px;bottom:16px;margin:auto;max-width:540px;padding:13px 16px;background:#213e30;color:white;border:1px solid #98bc9c;border-radius:12px;z-index:2147483400;box-shadow:0 8px 25px #0004;font:14px system-ui;white-space:normal';
 document.body.append(n);setTimeout(()=>n.remove(),6500);
}
function installAttachAfterSave(form,before,file){
 if(binding)return;
 binding=true;let handlerDone=false;
 const handler=async e=>{
  if(handlerDone)return;
  handlerDone=true;form.removeEventListener('submit',handler,true);
  const expectedName=field(form,'Cuvée / Nom du produit')?.value?.trim()||'';
  let tries=0;
  const poll=setInterval(async()=>{
   if(++tries>130){
    clearInterval(poll);binding=false;
    showMessage('Photo non associée : ouvrez la fiche enregistrée pour l’ajouter.');
    return;
   }
   const newly=getProducts().filter(p=>!before.has(p.id));
   const result=newly.length===1?newly[0]:newly.find(p=>p.name?.trim().toLowerCase()===expectedName.toLowerCase());
   if(!result)return;
   clearInterval(poll);
   try{await saveLinkedPhoto(result.id,file,result.name,productEAN(result));showMessage('✓ Produit enregistré, photo rattachée à sa fiche.')}
   catch(error){showMessage('Produit enregistré, mais photo non associée : '+error.message)}
   finally{binding=false;clearPhoto()}
  },120);
 };
 form.addEventListener('submit',handler,true);
 // Si la boîte est fermée sans validation, le prochain ajout doit rester possible.
 const observer=new MutationObserver(()=>{
  if(!form.isConnected&&!handlerDone){form.removeEventListener('submit',handler,true);observer.disconnect();binding=false}
 });
 observer.observe(document.body,{childList:true,subtree:true});
 setTimeout(()=>{observer.disconnect();if(!handlerDone){form.removeEventListener('submit',handler,true);binding=false}},90000);
}
let scheduled=false;
function launcher(){
 const add=[...document.querySelectorAll('#root button')].find(b=>b.textContent?.trim()==='Nouveau produit');
 if(add&&!add.parentElement.querySelector('.cave-scan-launch')){
  const btn=document.createElement('button');btn.type='button';btn.className='cave-scan-launch';btn.textContent='▣ Scanner une bouteille';btn.onclick=()=>{reset();open()};
  add.parentElement.insertBefore(btn,add);
 }
 const form=productForm();
 if(form&&!form.querySelector('.cave-scan-launch')){
  const btn=document.createElement('button');btn.type='button';btn.className='cave-scan-launch';btn.textContent='▣ Scanner un code-barres';
  btn.style.marginBottom='10px';btn.onclick=()=>{reset();open()};form.prepend(btn);
 }
}
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;launcher()});
}
window.caveScanOpen=()=>{reset();open()};
function init(){
 makeUI();
 const root=$('root');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 launcher();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();