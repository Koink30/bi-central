/* Les Caves de Saint-Jean — Scanner produit v28 (scan + OCR, sans faux résultat).
   Une fiche n'est jamais enregistrée sans validation dans le formulaire existant. */
(() => {
'use strict';
if (window.caveScanOpen) return;
const DATA_KEY = 'bi-caviste-saint-jean-v1';
const CDN = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
const BACKUP_CDN = 'https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
let modal, video, controls, reader, active = false, busy = false, draft = null, lastCode = '';
let imgUrl = '';
let photoOCRText = '';
const $ = id => document.getElementById(id);
const escapeText = value => String(value || '');
const buttonLabel = '✦ Scanner une bouteille';
const css = [
'.cave-scan-launch{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;border:1px solid #b99a60!important;border-radius:11px!important;background:linear-gradient(115deg,#243d32,#3b6049)!important;color:#fff!important;padding:10px 14px!important;font-weight:700!important;cursor:pointer;box-shadow:0 3px 14px #1d372b28}',
'.cave-scan-launch:hover{filter:brightness(1.13)}',
'#cave-scan-backdrop{position:fixed;inset:0;z-index:2147483600;background:#080e0bcf;backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:12px;overflow-y:auto}',
'#cave-scan-backdrop.cave-scan-open{display:flex}',
'#cave-scan-modal{position:relative;box-sizing:border-box;width:min(850px,100%);max-height:94dvh;overflow:auto;border:1px solid #bea67d66;border-radius:22px;background:linear-gradient(155deg,#172b24,#101e1a 65%,#222c22);color:#f5f0e7;box-shadow:0 24px 100px #0009;font:15px/1.4 Arial,sans-serif}',
'#cave-scan-modal *{box-sizing:border-box}',
'.csm-head{padding:20px 22px 11px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}',
'.csm-kicker{font-size:10px;letter-spacing:.23em;text-transform:uppercase;color:#d1b77e;font-weight:800}',
'.csm-head h2{font-family:Georgia,serif;font-size:clamp(23px,4vw,32px);font-weight:500;margin:5px 0 3px;color:#fff}',
'.csm-sub{color:#bacbbf;font-size:13px}',
'.csm-close{border:1px solid #8aa49455!important;background:#fff1!important;color:white!important;border-radius:10px!important;padding:7px 12px!important;cursor:pointer}',
'.csm-body{padding:10px 22px 22px}',
'.csm-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:18px}',
'.csm-camera{position:relative;aspect-ratio:4/3;border:1px solid #8aaf9677;border-radius:17px;background:radial-gradient(circle at center,#365a464d,#07100c 74%);overflow:hidden;display:flex;align-items:center;justify-content:center}',
'.csm-camera video{width:100%;height:100%;object-fit:cover;display:none}',
'.csm-camera.csm-live video{display:block}',
'.csm-camera.csm-live .csm-camera-placeholder{display:none}',
'.csm-camera-placeholder{text-align:center;color:#b9c6b6;padding:18px}',
'.csm-bottle{font-size:67px;line-height:1.5;filter:drop-shadow(0 12px 15px #0008)}',
'.csm-frame{position:absolute;inset:23%;border:2px solid #dbbc75;border-radius:15px;pointer-events:none;box-shadow:0 0 22px #e9d99a33}',
'.csm-sweep{height:2px;position:absolute;left:4%;right:4%;top:10%;background:#e9d08a;box-shadow:0 0 12px 3px #f7d282;animation:csmScan 2.4s ease-in-out infinite alternate}',
'@keyframes csmScan{from{top:12%}to{top:88%}}',
'.csm-camera:not(.csm-live) .csm-frame{display:none}',
'.csm-controls{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}',
'#cave-scan-modal button{font:inherit;cursor:pointer}',
'.csm-action{border:0;border-radius:11px;padding:11px 14px;font-weight:700;background:#dfc38a;color:#12241b}',
'.csm-alt{border:1px solid #78927c66!important;border-radius:11px!important;padding:10px 12px!important;background:#ffffff13!important;color:#fff!important}',
'.csm-action:disabled,.csm-alt:disabled{opacity:.45;cursor:not-allowed}',
'.csm-field{display:block;margin:10px 0;color:#b7c5ba;font-size:12px}',
'.csm-field input,.csm-field select{display:block;width:100%;border:1px solid #80968255!important;border-radius:9px!important;padding:10px!important;margin-top:4px;background:#f4f1e9!important;color:#1c2a21!important;outline-offset:2px}',
'.csm-inline{display:flex;gap:8px;align-items:end}.csm-inline .csm-field{flex:1;margin:0}',
'.csm-status{border:1px solid #95b29b36;background:#ffffff0c;border-radius:11px;padding:11px;margin:12px 0;min-height:43px;font-size:13px;color:#d4e0d5}',
'.csm-result{border:1px solid #d4b97d55;border-radius:13px;background:linear-gradient(135deg,#ffffff16,#ffffff08);padding:13px;min-height:160px}',
'.csm-product{display:flex;gap:12px;align-items:center}',
'.csm-product img{width:89px;height:103px;object-fit:contain;border-radius:10px;background:#fff}',
'.csm-product .csm-product-name{font-family:Georgia,serif;font-size:21px;color:#fff}',
'.csm-small{font-size:12px;color:#c8d4c7;margin:5px 0}',
'.csm-chip{display:inline-block;border:1px solid #a9c1a37a;border-radius:20px;padding:3px 8px;font-size:11px;color:#dbe9d6;margin:4px 4px 0 0}',
'.csm-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
'.csm-footer{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:15px}',
'.csm-warning{font-size:11px;color:#bdcbbd;margin-top:10px;line-height:1.55}',
'.csm-demo{border:1px dashed #bda06d;border-radius:10px;padding:11px;background:#b4953917}',
'.csm-qr{overflow-wrap:anywhere}',
'.csm-camera{display:none}',
'.csm-camera.csm-live{display:flex}',
'.csm-camera.csm-preview{display:flex}',
'.csm-grid{grid-template-columns:1fr!important;gap:12px}',
'#cave-scan-modal{width:min(690px,100%);background:#172920}',
'.csm-head h2{font:600 27px/1.1 system-ui,sans-serif}',
'.csm-kicker{letter-spacing:.1em}',
'.csm-result{min-height:70px}',
'.csm-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
'.csm-controls button{min-height:62px}',
'.csm-status{margin:6px 0 10px}',
'.csm-manual{margin:8px 0}',
'.csm-manual summary{cursor:pointer;padding:9px 2px;font-size:13px;color:#e7d5ae}',
'.csm-editor-title{font-weight:700;color:#edddbf;margin-top:10px}',
'.csm-ocr-lines{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0}',
'.csm-ocr-lines button{padding:6px 9px;border-radius:7px;border:1px solid #80968277;background:#fff1;color:#fff;font-size:12px}',
'.csm-ocr-note{font-size:12px;color:#d0d9cb;margin:8px 0}',
'@media(max-width:430px){.csm-controls{grid-template-columns:1fr}.csm-controls button{min-height:54px}}',
'@media(max-width:650px){#cave-scan-backdrop{padding:0;align-items:stretch}#cave-scan-modal{max-height:100dvh;height:100dvh;border-radius:0}.csm-head{padding:17px 16px 8px}.csm-body{padding:8px 16px 24px}.csm-grid{grid-template-columns:1fr}.csm-camera{aspect-ratio:16/9}.csm-row{gap:7px}}'
].join('\n');
function makeUI() {
 if (modal) return;
 const style = document.createElement('style');
 style.id='cave-scan-style';style.textContent=css;document.head.appendChild(style);
 modal=document.createElement('div');modal.id='cave-scan-backdrop';modal.setAttribute('aria-hidden','true');
 modal.innerHTML=[
 '<section id="cave-scan-modal" role="dialog" aria-modal="true" aria-label="Scanner une bouteille">',
 '<div class="csm-head"><div><div class="csm-kicker">Les Caves de Saint-Jean</div><h2>Ajouter une bouteille</h2><div class="csm-sub">Une photo ou un scan. Vérifiez, puis enregistrez.</div></div><button class="csm-close" type="button" id="csm-close" aria-label="Fermer">✕</button></div>',
 '<div class="csm-body"><div class="csm-grid"><div>',
 '<div class="csm-camera" id="csm-camera"><div class="csm-camera-placeholder"><div class="csm-bottle">🍾</div><div>Placez le code dans le cadre</div></div><video id="csm-video" playsinline muted autoplay></video><div class="csm-frame"><div class="csm-sweep"></div></div></div>',
 '<div class="csm-controls"><button class="csm-action" id="csm-photo-btn" type="button">📷 Prendre / choisir une photo</button><button class="csm-alt" id="csm-camera-btn" type="button">▣ Scanner un code</button><input id="csm-image-file" type="file" accept="image/*" hidden></div>',
 '<details class="csm-manual"><summary>J’ai un code à saisir manuellement</summary><div class="csm-inline"><label class="csm-field">Code-barres<input id="csm-ean" inputmode="numeric" autocomplete="off" placeholder="8 à 14 chiffres"></label><button class="csm-action" id="csm-lookup" type="button">Rechercher</button></div></details>',
 '<div class="csm-status" role="status" id="csm-status" aria-live="polite">Prêt. Photographiez l’étiquette même si elle n’a pas de code-barres.</div>',
 '',
 '<div class="csm-warning">Reconnaissance assistée : aucune identification n’est garantie. Seules les informations vérifiées seront proposées.</div>',
 '</div><div>',
 '<div class="csm-result" id="csm-result"><div class="csm-kicker">RÉSULTAT</div><p>Le résultat apparaîtra ici. Aucun produit n’est ajouté sans validation.</p></div><button class="csm-alt" id="csm-manual-new" type="button" style="margin-top:9px">✎ Créer une fiche sans reconnaissance</button>',
 '<div id="csm-editor" hidden><div class="csm-editor-title">Vérifiez les informations avant de continuer</div>',
 '<div class="csm-row"><label class="csm-field">Cuvée / Nom<input id="csm-name" maxlength="180"></label><label class="csm-field">Domaine / Marque<input id="csm-domain" maxlength="180"></label></div>',
 '<div class="csm-row"><label class="csm-field">Contenance<input id="csm-volume" placeholder="75 cl"></label><label class="csm-field">Millésime<input id="csm-vintage" placeholder="2024"></label></div>',
 '<div class="csm-row"><label class="csm-field">Famille<select id="csm-family"><option>Vin</option><option>Bière</option><option>Champagne</option><option>Spiritueux</option><option>Autre</option></select></label><label class="csm-field">Couleur<select id="csm-color"><option>À préciser</option><option>Rouge</option><option>Blanc</option><option>Rosé</option><option>Autre</option></select></label></div>',
 '<div class="csm-footer"><button class="csm-action" id="csm-use" type="button">✓ Continuer dans la fiche produit →</button><button class="csm-alt" id="csm-rescan" type="button">↻ Autre bouteille</button></div>',
 '<div class="csm-warning">Données externes à vérifier : cuvée, millésime et format. Le prix et le stock restent à saisir par le caviste. Enregistrement uniquement depuis le formulaire habituel.</div>',
 '</div></div></div></div></section>'
 ].join('');
 document.body.appendChild(modal);
 video=$('csm-video');
 $('csm-close').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 $('csm-camera-btn').onclick=()=>active?stopCamera():startCamera();
 $('csm-photo-btn').onclick=()=>$('csm-image-file').click();
 $('csm-image-file').onchange=readPhoto;
 $('csm-lookup').onclick=()=>lookup($('csm-ean').value);
 $('csm-ean').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookup(e.target.value)}});
 $('csm-manual-new').onclick=manualDraft;
 $('csm-rescan').onclick=reset;
 $('csm-use').onclick=applyToForm;
 $('csm-name').oninput=()=>{$('csm-use').disabled=!$('csm-name').value.trim()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('cave-scan-open'))close()});
}
function status(text){if($('csm-status'))$('csm-status').textContent=text}
function open(){
 makeUI();modal.classList.add('cave-scan-open');modal.setAttribute('aria-hidden','false');
 document.documentElement.style.overflow='hidden';$('csm-photo-btn').focus();
}
function close(){stopCamera();if(modal){modal.classList.remove('cave-scan-open');modal.setAttribute('aria-hidden','true')}document.documentElement.style.overflow=''}
function stopCamera(){
 active=false;
 try{controls?.stop()}catch{}
 controls=null;
 if(video?.srcObject){for(const t of video.srcObject.getTracks())t.stop();video.srcObject=null}
 $('csm-camera')?.classList.remove('csm-live');
 if($('csm-camera-btn'))$('csm-camera-btn').textContent='▣ Scanner un code';
}
function getLibrary(){
 if(window.ZXingBrowser?.BrowserMultiFormatReader)return Promise.resolve(window.ZXingBrowser);
 return new Promise((resolve,reject)=>{
  const load=(url,other)=>{const s=document.createElement('script');s.src=url;s.async=true;
   s.onload=()=>window.ZXingBrowser?.BrowserMultiFormatReader?resolve(window.ZXingBrowser):other?load(BACKUP_CDN,false):reject(new Error('Lecteur indisponible'));
   s.onerror=()=>other?load(BACKUP_CDN,false):reject(new Error('Bibliothèque de scan inaccessible'));
   document.head.appendChild(s)};
  load(CDN,true);
 });
}
async function startCamera(){
 if(active){stopCamera();return}
 if(!navigator.mediaDevices?.getUserMedia){status('Caméra indisponible. Utilisez une photo ou saisissez le code.');return}
 status('Activation de la caméra… Autorisez son accès si votre téléphone le demande.');
 try{
  const lib=await getLibrary();
  reader=new lib.BrowserMultiFormatReader();
  active=true;$('csm-camera').classList.add('csm-live');$('csm-camera-btn').textContent='■ Arrêter le scan';
  const newControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},video,(result,error,c)=>{
   if(!active||!result)return;
   const value=String(result.getText?.()||result.text||'').trim();
   if(!value)return;
   try{navigator.vibrate?.(90)}catch{}
   stopCamera();onDecoded(value);
  });
  if(active)controls=newControls;else newControls?.stop();
  if(active)status('Caméra active. Placez le code-barres dans le cadre, avec un bon éclairage.');
 }catch(e){
  stopCamera();status('Caméra non disponible : '+(e.message||'accès refusé')+'. Essayez la photo ou saisissez les chiffres.');
 }
}

const OCR_CDN='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const OCR_BACKUP='https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js';
let ocrLoading=null;
function getOCRLibrary(){
 if(window.Tesseract?.recognize)return Promise.resolve(window.Tesseract);
 if(ocrLoading)return ocrLoading;
 ocrLoading=new Promise((resolve,reject)=>{
  function load(url,fallback){
   const script=document.createElement('script');script.src=url;script.async=true;
   script.onload=()=>window.Tesseract?.recognize?resolve(window.Tesseract):fallback?load(OCR_BACKUP,false):reject(new Error('OCR indisponible'));
   script.onerror=()=>fallback?load(OCR_BACKUP,false):reject(new Error('OCR inaccessible : connexion nécessaire'));
   document.head.appendChild(script);
  }
  load(OCR_CDN,true);
 }).catch(e=>{ocrLoading=null;throw e});
 return ocrLoading;
}
function manualDraft(){
 stopCamera();
 draft={code:'',name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'Saisie manuelle'};
 photoOCRText='';
 $('csm-ean').value='';
 renderDraft(false);
 status('Fiche vierge. Indiquez le nom de la bouteille pour continuer.');
 $('csm-name').focus();
}
function parseLabel(text,confidence){
 const lines=String(text||'').split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>=3).slice(0,30);
 const clean=lines.filter(s=>/[A-Za-zÀ-ÿ]{3}/.test(s)&&!/(contient|sulfites?|ingr[eé]dients?|mis en bouteille|embouteill|produit de|alcool|volume|www\.|https?:|tel\s*:|^\s*(?:vin de france|appellation|indication g[eé]ographique)|\b(?:75\s*c[l1]|75O\s*m[l1])\b)/i.test(s));
 const domain=clean.find(s=>/\b(ch[aâ]teau|domaine|clos|maison|brasserie)\b/i.test(s))||'';
 const nameLine=clean.find(s=>s!==domain&&s.length<=65&&!/\d{5,}/.test(s))||'';
 const year=(String(text).match(/\b(?:19[89]\d|20[0-3]\d)\b/)||[])[0]||'';
 const quantity=(String(text).match(/\b(?:\d+(?:[.,]\d+)?)\s*(?:cl|ml|l)\b/i)||[])[0]||'';
 const lc=String(text).toLowerCase();
 return {
  name:Number(confidence)>=55?nameLine:'',domain:Number(confidence)>=55?domain:'',
  volume:normalizeQuantity(quantity),vintage:year,
  family:/champagne/.test(lc)?'Champagne':/bi[eè]re|brasserie/.test(lc)?'Bière':/rhum|gin|vodka|whisky|liqueur/.test(lc)?'Spiritueux':'Vin',
  color:/\bros[eé]\b/.test(lc)?'Rosé':/\bblanc\b/.test(lc)?'Blanc':/\brouge\b/.test(lc)?'Rouge':'À préciser',
  lines:clean.slice(0,8)
 };
}
async function readPhoto(){
 const file=$('csm-image-file').files?.[0];if(!file)return;
 stopCamera();
 if(imgUrl){URL.revokeObjectURL(imgUrl);imgUrl=''}
 imgUrl=URL.createObjectURL(file);
 photoOCRText='';
 status('Analyse de la photo…');
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=imgUrl});
  try{
   const lib=await getLibrary();
   const result=await new lib.BrowserMultiFormatReader().decodeFromImageElement(img);
   const code=String(result.getText?.()||result.text||'').trim();
   if(/^https?:\/\//i.test(code)||gtin(code.replace(/[\s-]/g,''))){
    onDecoded(code);return;
   }
  }catch(e){/* Pas de code : on tente l'OCR au lieu d'inventer un produit. */}
  status('Aucun code détecté. Lecture de l’étiquette en cours…');
  try{
   const engine=await getOCRLibrary();
   const out=await engine.recognize(imgUrl,'fra+eng');
   const words=String(out?.data?.text||'').trim();
   const confidence=Number(out?.data?.confidence||0);
   const parsed=parseLabel(words,confidence);
   photoOCRText=words;
   draft={code:'',name:parsed.name,domain:parsed.domain,volume:parsed.volume,vintage:parsed.vintage,
     family:parsed.family,color:parsed.color,image:imgUrl,source:'OCR de la photo (à vérifier)',ocrLines:parsed.lines,ocrConfidence:confidence};
   renderDraft(false);
   if(parsed.lines.length){
    status('Texte extrait de la vraie photo. Confirmez le nom et les autres champs.');
   }else{
    status('Étiquette peu lisible. Complétez le nom manuellement ou reprenez la photo de face.');
   }
  }catch(e){
   draft={code:'',name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',image:imgUrl,source:'Photo non reconnue'};
   renderDraft(false);
   status('Lecture automatique indisponible. Votre photo reste visible et vous pouvez saisir le nom.');
  }
 }catch(e){
  status('Impossible de lire cette photo. Essayez une autre image.');
 }finally{$('csm-image-file').value=''}
}

function onDecoded(value){
 if(/^https?:\/\//i.test(value)){
  stopCamera();
  draft={code:'',name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'Lien QR du producteur',url:value};
  renderDraft(false);
  const dest=$('csm-result');
  const link=document.createElement('a');link.href=value;link.target='_blank';link.rel='noopener noreferrer';
  link.textContent='↗ Voir les informations du producteur';link.style.color='#edcd8d';
  const p=document.createElement('p');p.className='csm-ocr-note';p.textContent='QR code lu. Ce site externe ne permet pas forcément un import automatique : complétez la fiche avec les informations affichées.';
  dest.append(p,link);
  status('QR code détecté. Ouvrez la fiche du producteur et confirmez les informations.');
  return;
 }
 const code=String(value||'').replace(/[\s-]/g,'');
 if(!gtin(code)){status('Ce code ne correspond pas à un EAN valide. Essayez de photographier l’étiquette.');return}
 $('csm-ean').value=code;
 lookup(code);
}
function gtin(code){
 if(!/^\d{8}$|^\d{12,14}$/.test(code))return false;
 const digits=[...code].map(Number);
 const given=digits.pop();let sum=0;
 for(let i=digits.length-1,j=0;i>=0;i--,j++)sum+=digits[i]*(j%2===0?3:1);
 return ((10-(sum%10))%10)===given;
}
function getProducts(){
 try{
  const obj=JSON.parse(localStorage.getItem(DATA_KEY)||'null');
  return Array.isArray(obj?.products)?obj.products:[];
 }catch{return []}
}
function existing(code){
 return getProducts().find(p=>new RegExp('(?:EAN|GTIN|Code-barres)\\s*[:：]\\s*'+code+'(?:\\D|$)','i').test(p.notes||''));
}
function normalizeQuantity(q){
 const match=String(q||'').match(/(\d+(?:[.,]\d+)?)\s*(cl|ml|l|litres?|centilitres?)/i);
 if(!match)return '';
 let n=Number(match[1].replace(',','.')), u=match[2].toLowerCase();
 if(u==='ml'&&n%10===0)return (n/10)+' cl';
 if(u==='cl'||u.startsWith('centil'))return n+' cl';
 if(u.startsWith('l'))return n+' L';
 return n+' ml';
}
function inferFamily(p){
 const t=[p.categories_tags?.join(' '),p.categories,p.product_name,p.generic_name].join(' ').toLowerCase();
 if(/champagne|sparkling.*wine/.test(t))return 'Champagne';
 if(/bi[eè]re|beer|ale|lager|stout/.test(t))return 'Bière';
 if(/whisky|vodka|gin|rhum|rum|spirit|liqueur|pastis/.test(t))return 'Spiritueux';
 if(/vin|wine|merlot|chardonnay|ros[eé]/.test(t))return 'Vin';
 return 'Autre';
}
function inferColor(p){
 const t=[p.categories_tags?.join(' '),p.product_name,p.generic_name].join(' ').toLowerCase();
 if(/ros[eé]|rosé/.test(t))return 'Rosé';
 if(/blanc|white.wine/.test(t))return 'Blanc';
 if(/rouge|red.wine/.test(t))return 'Rouge';
 return 'À préciser';
}
async function lookup(input){
 const code=String(input||'').replace(/[\s-]/g,'');
 if(busy)return;
 if(!gtin(code)){status('Code invalide : entrez un EAN-8, UPC-12, EAN-13 ou GTIN-14 avec chiffre de contrôle valide.');return}
 stopCamera();busy=true;lastCode=code;draft=null;
 $('csm-editor').hidden=true;$('csm-lookup').disabled=true;
 status('Code '+code+' ✓ · Recherche dans le catalogue, puis dans la base publique…');
 try{
  const found=existing(code);
  if(found){
   draft=null;renderExisting(found,code);
   status('Référence déjà dans le catalogue : aucune fiche en double ne sera créée.');return;
  }
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
  let result;
  try{
   const url='https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=code,product_name,product_name_fr,generic_name,brands,quantity,packaging,labels,categories,categories_tags,image_front_url,image_url,alcohol_value';
   const response=await fetch(url,{signal:ctrl.signal,cache:'no-store',mode:'cors'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   result=await response.json();
  }finally{clearTimeout(timeout)}
  const p=result?.status===1?result.product:null;
  if(!p){draft={code,name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'Code valide, produit absent de la base publique'};renderDraft(false);status('Code valide, mais aucune fiche publique trouvée. Complétez le nom pour continuer.');return}
  const name=escapeText(p.product_name_fr||p.product_name||p.generic_name).trim();
  const volume=normalizeQuantity(p.quantity)||'';
  const year=(name.match(/\b(19|20)\d{2}\b/)||[])[0]||'';
  draft={code,name,domain:escapeText(p.brands).trim(),volume,vintage:year,family:inferFamily(p),color:inferColor(p),image:p.image_front_url||p.image_url||'',source:'Open Food Facts'};
  renderDraft(true);status('✓ Résultat retrouvé en ligne. Contrôlez les champs avant de créer la fiche.');
 }catch(error){
  draft={code,name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'Recherche indisponible'};
  renderDraft(false);
  status('Recherche externe indisponible ('+(error.name==='AbortError'?'délai dépassé':error.message)+'). Saisie assistée disponible, sans inventer de données.');
 }finally{busy=false;$('csm-lookup').disabled=false}
}
function renderExisting(p,code){
 const container=$('csm-result');container.replaceChildren();
 const t=document.createElement('div');t.className='csm-kicker';t.textContent='✓ DÉJÀ DANS LA CAVE';
 const n=document.createElement('h3');n.className='csm-product-name';n.textContent=p.name;
 const sub=document.createElement('p');sub.className='csm-small';sub.textContent=[p.domain,p.volume,'Réf. '+p.id].filter(Boolean).join(' · ');
 const mark=document.createElement('span');mark.className='csm-chip';mark.textContent='EAN '+code;
 container.append(t,n,sub,mark);
}
function renderDraft(recognized){
 $('csm-editor').hidden=false;
 const target=$('csm-result');target.replaceChildren();
 const kicker=document.createElement('div');kicker.className='csm-kicker';kicker.textContent=recognized?'✓ CODE-BARRES RECONNU EN LIGNE':draft.source.startsWith('OCR')?'📷 TEXTE LU SUR LA PHOTO — À VÉRIFIER':draft.url?'▣ QR CODE LU — FICHE À COMPLÉTER':'FICHE À COMPLÉTER';
 const row=document.createElement('div');row.className='csm-product';
 if(draft.image&&/^(https:\/\/|blob:)/.test(draft.image)){
  const img=document.createElement('img');img.loading='lazy';img.alt='Visuel référencé par la base publique';img.referrerPolicy='no-referrer';img.src=draft.image;img.onerror=()=>img.remove();row.append(img);
 }
 const right=document.createElement('div');
 const name=document.createElement('div');name.className='csm-product-name';name.textContent=draft.name||'Nouvelle référence';
 const domain=document.createElement('div');domain.className='csm-small';domain.textContent=draft.domain||'Domaine à renseigner';
 const src=document.createElement('span');src.className='csm-chip';src.textContent=draft.source;
 right.append(name,domain);
 if(draft.code){const chip=document.createElement('span');chip.className='csm-chip';chip.textContent='EAN '+draft.code;right.append(chip)}
 right.append(src);row.append(right);target.append(kicker,row);
 if(Array.isArray(draft.ocrLines)&&draft.ocrLines.length){
  const hint=document.createElement('p');hint.className='csm-ocr-note';hint.textContent='Texte détecté : touchez la ligne correspondant au nom de la cuvée pour le choisir.';
  const chips=document.createElement('div');chips.className='csm-ocr-lines';
  draft.ocrLines.forEach(line=>{const b=document.createElement('button');b.type='button';b.textContent=line;b.title='Utiliser comme nom du produit';b.onclick=()=>{$('csm-name').value=line;draft.name=line;$('csm-use').disabled=false;status('Nom choisi : vérifiez et continuez.');};chips.append(b)});
  target.append(hint,chips);
 }
 for(const k of ['name','domain','volume','vintage','family','color'])$('csm-'+k).value=draft[k]||'';
 $('csm-use').disabled=!draft.name.trim();
}
function reset(){
 stopCamera();if(imgUrl){URL.revokeObjectURL(imgUrl);imgUrl=''}draft=null;lastCode='';photoOCRText='';$('csm-ean').value='';$('csm-editor').hidden=true;
 $('csm-result').innerHTML='<div class="csm-kicker">PRÉVISUALISATION</div><p>Prêt pour une nouvelle bouteille.</p>';
 status('Prêt. Scannez une autre bouteille ou saisissez son code.');
}
function fillControl(form,label,value){
 if(value==null)return false;
 const field=[...form.querySelectorAll('label.field')].find(l=>l.querySelector('span')?.textContent?.trim()===label);
 const input=field?.querySelector('input,select,textarea');if(!input)return false;
 const proto=input instanceof HTMLSelectElement?HTMLSelectElement.prototype:input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
 if(setter)setter.call(input,String(value));else input.value=String(value);
 input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));
 return true;
}
function getProductForm(){
 const dialog=document.querySelector('.cave-dialog');
 const title=dialog?.querySelector('[data-slot="dialog-title"]')?.textContent||'';
 return title.includes('Fiche produit')?dialog.querySelector('form'):null;
}
function waitFor(fn,timeout=6500){
 return new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{const el=fn();if(el)return resolve(el);if(Date.now()-start>timeout)return reject(new Error('Formulaire produit non accessible'));setTimeout(check,90)};check()});
}
async function applyToForm(){
 if(!draft)return;
 const name=$('csm-name').value.trim();
 if(!name){status('Indiquez au moins le nom du produit.');return}
 const data={name,domain:$('csm-domain').value.trim(),volume:$('csm-volume').value.trim(),vintage:$('csm-vintage').value.trim(),family:$('csm-family').value,color:$('csm-color').value,code:draft.code,source:draft.source};
 if(data.code&&existing(data.code)){status('Référence déjà enregistrée. Évitez un doublon.');return}
 $('csm-use').disabled=true;
 try{
  close();
  let form=getProductForm();
  if(!form){
   window.caveNavigate?.('products');
   const add=await waitFor(()=>[...document.querySelectorAll('#root button')].find(b=>b.textContent?.trim()==='Nouveau produit'),6500);
   add.click();form=await waitFor(getProductForm,6500);
  }
  const assignments=[
   ['Cuvée / Nom du produit',data.name],['Domaine / Marque',data.domain],
   ['Contenance (75 cl, 10 L…)',data.volume],['Millésime',data.vintage],
   ['Famille',data.family],['Couleur',data.color]
  ];
  for(const [label,value]of assignments)fillControl(form,label,value);
  const note= (data.code?'EAN : '+data.code+'\n':'')+'Source : '+data.source+(draft.url?'\nURL QR : '+draft.url:'')+' — informations à vérifier avant validation.';
  const existingNotes=[...form.querySelectorAll('label.field')].find(x=>x.querySelector('span')?.textContent==='Notes')?.querySelector('textarea')?.value||'';
  fillControl(form,'Notes',existingNotes?[existingNotes,note].join('\n'):note);
  const first=form.querySelector('input');first?.focus();
  // Aucune écriture directe en BDD : sauvegarde avec le bouton habituel.
 }catch(err){open();status('Impossible d’ouvrir la fiche produit : '+err.message+'. Votre résultat est conservé ici.')}
 finally{$('csm-use').disabled=false}
}
function launcher(){
 let changed=false;
 const buttons=[...document.querySelectorAll('#root button')];
 const add=buttons.find(b=>b.textContent?.trim()==='Nouveau produit');
 if(add&&!add.parentElement.querySelector('.cave-scan-launch')){
  const b=document.createElement('button');b.type='button';b.className='cave-scan-launch';b.textContent=buttonLabel;b.onclick=open;
  add.parentElement.insertBefore(b,add);changed=true;
 }
 const form=getProductForm();
 if(form&&!form.querySelector('.cave-scan-launch')){
  const b=document.createElement('button');b.type='button';b.className='cave-scan-launch';b.textContent='⌗ Préremplir par code-barres';b.style.marginBottom='12px';b.onclick=open;
  form.prepend(b);changed=true;
 }
 return changed;
}
let scheduled=false;
function schedule(){
 if(scheduled)return;
 scheduled=true;requestAnimationFrame(()=>{scheduled=false;launcher()});
}
window.caveScanOpen=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
function init(){
 makeUI();
 const root=document.getElementById('root');
 if(root)new MutationObserver(schedule).observe(root,{subtree:true,childList:true});
 launcher();
}
})();