/* Les Caves de Saint-Jean — Scanner produit v29 (QR enrichi, EAN multi-source, OCR assisté).
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
let lastPhotoUrl = '';
let qrBusy = false;
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
'.csm-extras{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
'.csm-link{display:inline-flex;align-items:center;text-decoration:none;padding:9px 11px;border:1px solid #ae976c;border-radius:10px;color:#f9d994;font-size:13px;overflow-wrap:anywhere}',
'.csm-help{padding:9px 11px;border-radius:9px;background:#ffffff0c;color:#bdcdc0;font-size:12px;line-height:1.5}',
'.csm-status[data-state="warn"]{border-color:#d4b97980;color:#f7d9a5}',
'.csm-status[data-state="success"]{border-color:#80bda17d;color:#caedd9}',
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
 '<div class="csm-warning">Seuls les éléments vérifiés sont proposés. Une lecture OCR n’identifie pas à elle seule la bouteille.</div>',
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
function status(text,state=''){const el=$('csm-status');if(el){el.textContent=text;el.dataset.state=state}}
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
  const newControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}},video,(result,error,c)=>{
   if(!active||!result)return;
   const value=String(result.getText?.()||result.text||'').trim();
   if(!value)return;
   try{navigator.vibrate?.(90)}catch{}
   stopCamera();onDecoded(value);
  });
  if(active)controls=newControls;else newControls?.stop();
  if(active)status('Caméra active : approchez le code, bien horizontal et net. Retournez la bouteille pour l’EAN.');
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
function manualDraft(keepPhoto=false){
 stopCamera();
 if(!keepPhoto){lastPhotoUrl='';if(imgUrl){URL.revokeObjectURL(imgUrl);imgUrl=''}}
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
  name:Number(confidence)>=55?(nameLine||domain):'',domain:Number(confidence)>=55?domain:'',
  volume:Number(confidence)>=50?normalizeQuantity(quantity):'',vintage:Number(confidence)>=50?year:'',
  family:/champagne/.test(lc)?'Champagne':/bi[eè]re|brasserie/.test(lc)?'Bière':/rhum|gin|vodka|whisky|liqueur/.test(lc)?'Spiritueux':'Vin',
  color:/\bros[eé]\b/.test(lc)?'Rosé':/\bblanc\b/.test(lc)?'Blanc':/\brouge\b/.test(lc)?'Rouge':'À préciser',
  lines:clean.slice(0,8)
 };
}

async function nativeCode(source){
 if(!('BarcodeDetector' in window))return '';
 try{
  const formats=await window.BarcodeDetector.getSupportedFormats();
  const desired=['ean_13','ean_8','upc_a','upc_e','qr_code','code_128'].filter(f=>formats.includes(f));
  if(!desired.length)return '';
  const results=await new window.BarcodeDetector({formats:desired}).detect(source);
  return results.map(v=>String(v.rawValue||'').trim()).find(v=>/^https?:\/\//i.test(v)||gtin(v.replace(/[\s-]/g,'')))||'';
 }catch{return ''}
}
async function imageCode(img){
 const native=await nativeCode(img);if(native)return native;
 try{
  const lib=await getLibrary();
  const r=await new lib.BrowserMultiFormatReader().decodeFromImageElement(img);
  const value=String(r.getText?.()||r.text||'').trim();
  return /^https?:\/\//i.test(value)||gtin(value.replace(/[\s-]/g,''))?value:'';
 }catch{return ''}
}
async function readPhoto(){
 const file=$('csm-image-file').files?.[0];if(!file)return;
 stopCamera();
 if(imgUrl){URL.revokeObjectURL(imgUrl);imgUrl=''}
 imgUrl=URL.createObjectURL(file);lastPhotoUrl=imgUrl;photoOCRText='';
 status('Lecture de la photo : recherche de QR code et de code-barres…');
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=imgUrl});
  const found=await imageCode(img);
  if(found){onDecoded(found);return}
  manualDraft(true);draft.image=imgUrl;draft.source='Photo sans code détectable';renderDraft(false);
  const row=document.createElement('div');row.className='csm-extras';
  const ocr=document.createElement('button');ocr.type='button';ocr.className='csm-alt';ocr.textContent='🔤 Essayer de lire le texte';
  ocr.onclick=runPhotoOCR;row.append(ocr);$('csm-result').append(row);
  status('Aucun code trouvé sur cette photo. Saisissez le nom ou essayez l’OCR (non garanti).','warn');
 }catch(e){status('Photo illisible ou format non pris en charge. Réessayez.','warn')}
 finally{$('csm-image-file').value=''}
}
async function runPhotoOCR(){
 if(!lastPhotoUrl){status('Choisissez d’abord une photo.','warn');return}
 status('Lecture du texte de la bouteille…');
 try{
  const engine=await getOCRLibrary();
  const out=await engine.recognize(lastPhotoUrl,'fra+eng');
  const parsed=parseLabel(String(out?.data?.text||''),Number(out?.data?.confidence||0));
  photoOCRText=String(out?.data?.text||'');
  if(!draft)manualDraft(true);
  // Pas de nom supposé : les lignes OCR ne sont que des propositions à choisir.
  draft.ocrLines=parsed.lines;draft.ocrConfidence=Number(out?.data?.confidence||0);
  draft.source='OCR assisté — contrôle humain';draft.image=lastPhotoUrl;
  renderDraft(false);
  status(parsed.lines.length?'Lignes proposées : touchez uniquement celle qui correspond à la cuvée.':'Étiquette non reconnue. Saisissez le nom manuellement.','warn');
 }catch(e){status('OCR indisponible ou lecture échouée. Saisissez le nom manuellement.','warn')}
}

function secureQrUrl(value){
 try{
  const url=new URL(value);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hostname==='localhost')return null;
  if(/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)||/\.local$/i.test(url.hostname))return null;
  return url.href;
 }catch{return null}
}
function makeQrLink(url){
 const link=document.createElement('a');
 link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.className='csm-link';
 link.textContent='↗ Consulter la fiche du producteur';return link;
}
function parseQrFields(text){
 const lines=String(text||'').slice(0,50000).split(/\r?\n/).map(x=>x.replace(/^[\s#>*|•-]+/,'').replace(/[*_]+/g,'').trim()).filter(Boolean).slice(0,350);
 const patterns=[
  ['name',/^(?:nom du vin|nom de la cuv[eé]e|nom du produit|cuv[eé]e|wine name|product name)\s*[:：-]\s*(.+)$/i],
  ['domain',/^(?:domaine|producteur|ch[aâ]teau|winery|producer)\s*[:：-]\s*(.+)$/i],
  ['vintage',/^(?:mill[eé]sime|vintage)\s*[:：-]\s*(.+)$/i],
  ['volume',/^(?:contenance|volume net|volume)\s*[:：-]\s*(.+)$/i],
  ['appellation',/^(?:appellation|aop|aoc|igp)\s*[:：-]\s*(.+)$/i],
  ['color',/^(?:couleur|type de vin)\s*[:：-]\s*(.+)$/i]
 ];
 const data={};
 for(let i=0;i<lines.length;i++){
  for(const [key,re] of patterns){
   let match=lines[i].match(re);
   if(!match&&lines[i+1])match=(lines[i]+': '+lines[i+1]).match(re);
   if(match&&!data[key]){
    const value=match[1].trim().slice(0,125);
    if(value&&/[a-zà-ÿ0-9]/i.test(value))data[key]=value;
   }
  }
 }
 if(data.vintage)data.vintage=(data.vintage.match(/\b(?:19\d{2}|20\d{2})\b/)||[])[0]||'';
 if(data.volume)data.volume=normalizeQuantity(data.volume);
 if(data.color)data.color=/ros[eé]/i.test(data.color)?'Rosé':/blanc|white/i.test(data.color)?'Blanc':/rouge|red/i.test(data.color)?'Rouge':'À préciser';
 return data;
}
function parseQrHTML(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 let structured={};
 for(const script of doc.querySelectorAll('script[type="application/ld+json"]')){
  try{
   const root=JSON.parse(script.textContent);
   const items=Array.isArray(root)?root:[root];
   const entries=items.flatMap(item=>item&&item['@graph']?item['@graph']:[item]);
   for(const item of entries){
    if(!item||!/(product|wine|beverage)/i.test(String(item['@type']||'')))continue;
    if(typeof item.name==='string')structured.name=item.name.slice(0,120);
    if(item.brand)structured.domain=String(typeof item.brand==='string'?item.brand:item.brand.name||'').slice(0,120);
   }
  }catch{}
 }
 doc.querySelectorAll('script,style,nav,footer,noscript').forEach(node=>node.remove());
 const body=doc.body?.textContent||'';
 return {...parseQrFields(body),...structured};
}
async function getQRPage(url,viaReader){
 const timer=new AbortController();const kill=setTimeout(()=>timer.abort(),viaReader?11000:8000);
 try{
  const endpoint=viaReader?'https://r.jina.ai/'+url:url;
  const res=await fetch(endpoint,{signal:timer.signal,mode:'cors',cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const body=(await res.text()).slice(0,230000);
  return viaReader?parseQrFields(body):parseQrHTML(body);
 }finally{clearTimeout(kill)}
}
function showQRTools(url){
 const wrap=document.createElement('div');wrap.className='csm-extras';wrap.append(makeQrLink(url));
 const btn=document.createElement('button');btn.className='csm-alt';btn.type='button';btn.textContent='↻ Relancer l’extraction';
 btn.onclick=()=>enrichQR(url);wrap.append(btn);$('csm-result').append(wrap);
}
async function enrichQR(url){
 if(qrBusy||!draft||draft.url!==url)return;
 qrBusy=true;
 status('QR détecté : lecture de la page du producteur…');
 try{
  let fields={};
  try{fields=await getQRPage(url,false)}catch{}
  if(!fields.name&&!fields.domain&&!fields.vintage&&!fields.appellation){
   try{fields=await getQRPage(url,true)}catch{}
  }
  if(!draft||draft.url!==url)return;
  const count=['name','domain','vintage','volume','appellation','color'].filter(k=>fields[k]).length;
  if(count>0){
   draft={...draft,name:fields.name||'',domain:fields.domain||'',vintage:fields.vintage||'',
    volume:fields.volume||'',color:fields.color||'À préciser',appellation:fields.appellation||'',
    source:'QR du producteur — à vérifier'};
   renderDraft(false);showQRTools(url);
   status('QR : '+count+' champ(s) récupéré(s). Vérifiez les informations avant de valider.','success');
  }else{
   const notice=document.createElement('p');notice.className='csm-help';
   notice.textContent='QR lu correctement mais la page ne livre pas de données produit accessibles. Consultez-la puis remplissez la fiche.';
   $('csm-result').append(notice);showQRTools(url);
   status('QR lu, mais la fiche externe ne permet pas de préremplir automatiquement.','warn');
  }
 }finally{qrBusy=false}
}
function onDecoded(value){
 const link=secureQrUrl(value);
 if(link){
  stopCamera();
  draft={code:'',name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'Lien QR du producteur',url:link};
  renderDraft(false);
  $('csm-result').append(makeQrLink(link));
  enrichQR(link);
  return;
 }
 const code=String(value||'').replace(/[\s-]/g,'');
 if(!gtin(code)){status('Code non reconnu. Essayez le code horizontal au dos de la bouteille.','warn');return}
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

async function externalJSON(url,ms=10000){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),ms);
 try{
  const response=await fetch(url,{signal:controller.signal,mode:'cors',cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Service HTTP '+response.status);
  return response.json();
 }finally{clearTimeout(timeout)}
}
function normalizeProduct(p,code,source){
 const name=String(p.product_name_fr||p.product_name||p.generic_name||p.title||'').trim().slice(0,180);
 if(!name)return null;
 const brand=String(p.brands||p.brand||'').trim().slice(0,180);
 const volume=normalizeQuantity(p.quantity||p.dimension||'');
 const year=(name.match(/\b(?:19\d{2}|20\d{2})\b/)||[])[0]||'';
 return {code,name,domain:brand,volume,vintage:year,family:source==='Open Food Facts'?inferFamily(p):'Autre',
   color:source==='Open Food Facts'?inferColor(p):'À préciser',image:p.image_front_url||p.image_url||p.images?.[0]||'',
   source};
}
async function publicBarcode(code){
 const fields='code,product_name,product_name_fr,generic_name,brands,quantity,categories,categories_tags,image_front_url,image_url';
 const off='https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+fields+'&product_type=all';
 let unavailable=false;
 try{
  const data=await externalJSON(off,10500);
  if(data?.status===1&&data?.product){
   const normalized=normalizeProduct(data.product,code,'Open Food Facts');
   if(normalized)return {item:normalized};
  }
 }catch{unavailable=true}
 // Lookup complémentaire. La version publique UPCitemdb est limitée et peut bloquer les navigateurs (CORS).
 try{
  const info=await externalJSON('https://api.upcitemdb.com/prod/trial/lookup?upc='+encodeURIComponent(code),6500);
  const item=(Array.isArray(info?.items)?info.items:[]).find(p=>{
   const candidates=[p.ean,p.upc,p.gtin].filter(Boolean).map(String);
   return candidates.some(c=>c===code||c.replace(/^0+/,'')===code.replace(/^0+/,''));
  });
  if(item){
   const normalized=normalizeProduct(item,code,'UPCitemdb');
   if(normalized)return {item:normalized};
  }
 }catch{unavailable=true}
 return {item:null,unavailable};
}
function appendWebSearch(code){
 const area=$('csm-result');
 if(!area||area.querySelector('.csm-web-link'))return;
 const a=document.createElement('a');a.className='csm-link csm-web-link';a.target='_blank';a.rel='noopener noreferrer';
 a.href='https://www.google.com/search?q='+encodeURIComponent('"'+code+'" vin bouteille');
 a.textContent='↗ Rechercher cet EAN sur le Web';
 const row=document.createElement('div');row.className='csm-extras';row.append(a);area.append(row);
}
async function lookup(input){
 const code=String(input||'').replace(/[\s-]/g,'');
 if(busy)return;
 if(!gtin(code)){status('Code invalide. Vérifiez les chiffres imprimés sous les barres.','warn');return}
 stopCamera();busy=true;lastCode=code;draft=null;
 $('csm-editor').hidden=true;$('csm-lookup').disabled=true;
 status('✓ EAN '+code+' lu. Recherche de la référence dans les bases produits…');
 try{
  const found=existing(code);
  if(found){
   renderExisting(found,code);
   status('✓ Ce code existe déjà dans la cave : '+found.name,'success');
   return;
  }
  const result=await publicBarcode(code);
  if(result.item){
   draft=result.item;renderDraft(true);
   status('✓ Produit trouvé via '+draft.source+'. Vérifiez qu’il s’agit de la bonne cuvée.','success');
  }else{
   draft={code,name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'EAN identifié, référence absente des bases accessibles'};
   renderDraft(false);appendWebSearch(code);
   status(result.unavailable?'✓ EAN '+code+' valide, mais certaines bases ne répondent pas. Essayez le lien de recherche.':'✓ EAN '+code+' valide, référence non trouvée. Complétez la fiche ou cherchez sur le Web.','warn');
  }
 }catch(e){
  draft={code,name:'',domain:'',volume:'',vintage:'',family:'Vin',color:'À préciser',source:'EAN lu, recherche externe indisponible'};
  renderDraft(false);appendWebSearch(code);
  status('✓ Code lu : '+code+'. Base indisponible. Vous pouvez remplir la fiche.','warn');
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
 stopCamera();if(imgUrl){URL.revokeObjectURL(imgUrl);imgUrl=''}lastPhotoUrl='';draft=null;lastCode='';photoOCRText='';$('csm-ean').value='';$('csm-editor').hidden=true;
 $('csm-result').innerHTML='<div class="csm-kicker">PRÉVISUALISATION</div><p>Prêt pour une nouvelle bouteille.</p>';
 status('Prêt. Scannez un QR code, un EAN ou choisissez une photo.');
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
  const note= (data.code?'EAN : '+data.code+'\n':'')+'Source : '+data.source+(draft.url?'\nURL QR : '+draft.url:'')+(draft.appellation?'\nAppellation : '+draft.appellation:'')+' — informations à vérifier avant validation.';
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