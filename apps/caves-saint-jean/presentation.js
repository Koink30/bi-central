(() => {
 'use strict';
 const themes=[['soft','Lumière douce'],['dark','Cave sombre'],['vine','Vignoble'],['light','Clair classique']];
 function applyTheme(value){const theme=themes.some(([id])=>id===value)?value:'soft';document.documentElement.dataset.caveTheme=theme;try{localStorage.setItem('cave-display-theme',theme);}catch{}const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content={dark:'#1c181c',vine:'#deded0',soft:'#e8dfd2',light:'#f6f4f0'}[theme];}
 function decoration(){const n=el('div',{class:'cave-ornament','aria-hidden':'true'});n.innerHTML='<svg viewBox="0 0 220 90" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 68C42 62 44 29 91 23C110 20 123 25 135 15M51 51C31 48 29 31 31 23C45 24 56 33 51 51ZM74 30C65 14 73 6 85 4C88 19 87 24 74 30ZM98 23C102 10 115 8 123 11C117 25 110 29 98 23Z"/><path d="M86 30L88 38M155 11h10v22c0 8 10 10 10 21v25q0 5-5 5h-20q-5 0-5-5V54c0-11 10-13 10-21V11ZM153 8h14M145 55h30M145 71h30M192 42h21l-3 19q-1 8-8 8t-8-8l-2-19ZM202 69v14M193 84h18"/><g fill="currentColor" fill-opacity=".16"><circle cx="81" cy="45" r="7"/><circle cx="95" cy="45" r="7"/><circle cx="74" cy="57" r="7"/><circle cx="88" cy="57" r="7"/><circle cx="102" cy="57" r="7"/><circle cx="81" cy="69" r="7"/><circle cx="95" cy="69" r="7"/><circle cx="88" cy="81" r="7"/></g></g></svg>';return n;}
 const navLabels = ['Accueil','Produits & stock','Ventes & factures','Livraisons','Clients'];
 let tools, mobile, dialog, previousFocus, userMenu;
 const account=()=>window.caveAccount||{role:'local'};
 const el=(tag,attrs={},text='')=>{const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));n.textContent=text;return n;};
 function menuItems(){return [...document.querySelectorAll('[data-sidebar="menu-button"]')];}
 function navigate(label){const target={'Accueil':'home','Produits & stock':'products','Ventes & factures':'sales','Livraisons':'orders','Clients':'clients'}[label];if(window.caveNavigate&&target){window.caveNavigate(target);window.scrollTo({top:0,behavior:'smooth'});return;}const item=menuItems().find(n=>n.textContent.trim()===label);if(item){item.click();document.querySelector('[data-slot="sheet-content"] button[aria-label="Close"]')?.click();window.scrollTo({top:0,behavior:'smooth'});}}
 function show(title,body){previousFocus=document.activeElement;dialog.hidden=false;dialog.querySelector('h2').textContent=title;dialog.querySelector('.cave-help-content').replaceChildren(body);dialog.querySelector('.cave-close').focus();}
 function close(){dialog.querySelector('.cave-help-content')?.replaceChildren();dialog.hidden=true;previousFocus?.focus();}
 function showTemporaryPassword(result){
  const body=el('div');
  body.append(el('p',{},'Le mot de passe de ce compte a été remplacé. Aucun e-mail n’a été envoyé. Copiez-le maintenant : il disparaîtra à la fermeture.'));
  body.append(el('p',{},result.email));
  const input=el('input',{type:'text',readonly:'',id:'cave-temp-password','aria-label':'Mot de passe provisoire'});
  input.value=result.temporaryPassword;input.style.cssText='width:100%;box-sizing:border-box;padding:13px;border-radius:9px;font:700 15px monospace;letter-spacing:.03em';
  const copy=el('button',{type:'button'},'Copier le mot de passe');
  const info=el('p',{class:'cave-message','aria-live':'polite'},'Transmets-le directement à l’utilisateur par un canal de confiance. Demande-lui de le changer après sa connexion.');
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);info.textContent='Mot de passe copié. Le presse-papiers contient ce secret jusqu’au prochain copier.';}catch{input.focus();input.select();info.textContent='Copie le mot de passe sélectionné avec Ctrl+C (ou Copier sur iPhone).';}};
  body.append(input,copy,info);show('Mot de passe provisoire — affichage unique',body);
 }
 function help(){const body=el('div');const sections=[['Vendre au comptoir','Accueil → Nouvelle vente. Recherchez les produits, indiquez les quantités et le règlement, puis validez.'],['Établir une facture','Accueil → Créer une facture. Choisissez le client, ajoutez les produits, vérifiez les prix et imprimez le document.'],['Suivre les bouteilles','Produits & stock permet de rechercher une référence, mettre à jour une fiche et saisir les entrées ou sorties. Photos permet d’ajouter une image depuis le téléphone.'],['Préparer une livraison','Livraisons regroupe les commandes à préparer et le suivi de leur livraison.'],['PC et téléphone','La même application s’adapte à l’écran. Connectez-vous avec votre compte sur chaque appareil. Sur iPhone : Safari → Partager → Sur l’écran d’accueil. Sur PC : utilisez Installer l’application si le navigateur le propose.'],['Utilisateur et administrateur','L’utilisateur gère produits, stocks, ventes, clients et livraisons. L’administrateur dispose aussi des réglages, sauvegardes et autorisations des comptes.'],['Pendant la démonstration','Sans connexion, l’application fonctionne localement. Les ventes saisies dans la cave connectée sont des opérations réelles. Le bouton Animation permet d’afficher l’accueil animé.']];for(const [t,d] of sections){body.append(el('h3',{},t),el('p',{},d));}show('Prendre en main la cave',body);}
 async function team(){if(account().role!=='admin')return;const body=el('div');body.append(el('p',{},'Autorisez un compte Supabase existant, puis gérez ses accès. Le propriétaire administrateur peut aussi définir un nouveau mot de passe provisoire pour un utilisateur, sans envoyer d’e-mail.'));
 const form=el('form');const label=el('label',{},'Adresse e-mail du compte');const email=el('input',{type:'email',required:'',autocomplete:'off',placeholder:'prenom@exemple.fr'});label.append(email);const roleLabel=el('label',{},'Accès');const role=el('select');role.append(el('option',{value:'user'},'Utilisateur — activité quotidienne'),el('option',{value:'admin'},'Administrateur — réglages et accès'));roleLabel.append(role);const submit=el('button',{type:'submit'},'Autoriser ce compte');const message=el('p',{class:'cave-message','aria-live':'polite'});form.append(label,roleLabel,submit,message);const list=el('div');body.append(form,list);show('Gestion des accès',body);
 async function refresh(){const members=await window.caveTeamList();const table=el('table');const head=el('tr');head.append(el('th',{},'Compte'),el('th',{},'Accès'),el('th',{},''));table.append(head);for(const m of members){const row=el('tr');row.append(el('td',{},m.email),el('td',{},m.role==='admin'?'Administrateur':'Utilisateur'));const cell=el('td');if(m.role==='user'&&m.user_id!==m.owner_id){const reset=el('button',{type:'button',class:'cave-member-reset'},'Réinitialiser MDP');reset.style.marginRight='8px';reset.onclick=async()=>{if(!confirm('Remplacer le mot de passe de '+m.email+' ? L’ancien ne fonctionnera plus. Aucun e-mail ne sera envoyé.'))return;reset.disabled=true;message.textContent='Génération du nouveau mot de passe…';try{const result=await window.caveResetMemberPassword(m.email);message.textContent='';showTemporaryPassword(result);}catch(e){message.textContent=e.message;}finally{reset.disabled=false;}};cell.append(reset);}if(m.user_id!==m.owner_id){const remove=el('button',{type:'button',class:'cave-member-remove'},'Retirer');remove.onclick=async()=>{if(!confirm('Retirer l’accès à la cave pour '+m.email+' ?'))return;try{await window.caveSetMember(m.email,'remove');await refresh();}catch(e){message.textContent=e.message;}};cell.append(remove);}row.append(cell);table.append(row);}list.replaceChildren(table);}
 form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{await window.caveSetMember(email.value.trim(),role.value);message.textContent='Accès enregistré. Le compte peut se reconnecter à la cave.';email.value='';await refresh();}catch(e){message.textContent=e.message;}finally{submit.disabled=false;}};try{await refresh();}catch(e){message.textContent=e.message;}}

 function syncView(){
  const a=account(),status=window.caveSyncState||{kind:a.role==='local'?'local':'busy',label:a.role==='local'?'Mode local':'Vérification cloud…',lastSuccess:0};
  const roles={admin:'Administrateur',user:'Utilisateur',pending:'Accès en attente',local:'Mode local'};
  const kind=['ok','busy','offline','error','conflict','pending','local'].includes(status.kind)?status.kind:'busy';
  const summary={ok:'Synchronisé',busy:'En cours',offline:'Hors ligne',error:'Erreur',conflict:'Conflit',pending:'En attente',local:'Local'};
  return {a,kind,role:roles[a.role]||'Utilisateur',email:a.email||'Aucun compte connecté',
    compact:a.email?a.email.split('@')[0]:'Invité',label:status.label||summary[kind],
    summary:summary[kind],last:status.lastSuccess?new Date(status.lastSuccess).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''};
 }
 function updateUserMenu(){
  if(!userMenu)return;
  const v=syncView();
  const setText=(selector,value)=>{const node=userMenu.querySelector(selector);if(node&&node.textContent!==value)node.textContent=value;};
  setText('.cave-user-name',v.compact);
  setText('.cave-user-sync-label',v.summary);
  setText('#cave-user-full-email',v.email);
  setText('#cave-user-role',v.role);
  setText('#cave-user-state-label',v.label);
  setText('#cave-user-last-sync',v.last?'Dernière synchronisation confirmée : '+v.last:'Aucune synchronisation confirmée sur cet appareil');
  const title='Compte : '+v.email+' · '+v.label;
  const summary=userMenu.querySelector('summary');
  if(summary&&summary.title!==title)summary.title=title;
  if(userMenu.dataset.sync!==v.kind)userMenu.dataset.sync=v.kind;
  const access=userMenu.querySelector('[data-admin-only]');
  if(access&&access.hidden!==(v.a.role!=='admin'))access.hidden=v.a.role!=='admin';
  const sync=userMenu.querySelector('#cave-user-sync-now');
  const cannotSync=v.a.role!=='admin'&&v.a.role!=='user';
  if(sync&&sync.hidden!==cannotSync)sync.hidden=cannotSync;
  setText('#cave-user-open-account',v.a.role==='local'?'Se connecter / Créer un compte':'Mon compte / Se déconnecter');
 }
 function makeUserMenu(access){
  const box=el('details',{id:'cave-user-menu'});
  const summary=el('summary',{'aria-label':'Compte utilisateur et état de la synchronisation'});
  const avatar=el('span',{class:'cave-user-avatar','aria-hidden':'true'},'👤');
  const name=el('span',{class:'cave-user-name'},'Invité');
  const sync=el('span',{class:'cave-user-sync'});
  sync.append(el('span',{class:'cave-sync-dot','aria-hidden':'true'}),el('span',{class:'cave-user-sync-label'},'Local'));
  summary.append(avatar,name,sync,el('span',{class:'cave-user-caret','aria-hidden':'true'},'⌄'));
  const panel=el('div',{class:'cave-user-panel'});
  const heading=el('div',{class:'cave-user-heading'});
  heading.append(el('strong',{},'Utilisateur connecté'),el('span',{id:'cave-user-full-email'},'Aucun compte connecté'),el('small',{id:'cave-user-role'},'Mode local'));
  const state=el('div',{class:'cave-user-state'});
  state.append(el('span',{class:'cave-sync-dot','aria-hidden':'true'}),el('span',{id:'cave-user-state-label','aria-live':'polite'},'Mode local'));
  const last=el('small',{id:'cave-user-last-sync'},'Aucune synchronisation confirmée');
  const actions=el('div',{class:'cave-user-actions'});
  const open=el('button',{type:'button',id:'cave-user-open-account'},'Mon compte');
  open.onclick=()=>{box.open=false;window.caveOpenAccount?.();};
  const force=el('button',{type:'button',id:'cave-user-sync-now'},'↻ Synchroniser maintenant');
  const message=el('small',{id:'cave-user-feedback','aria-live':'polite'});
  force.onclick=async()=>{
   force.disabled=true;message.textContent='Vérification du cloud…';
   try {
    if(typeof window.caveSynchronizeNow!=='function')throw new Error('La synchronisation n’est pas encore chargée.');
    await window.caveSynchronizeNow();
    message.textContent=window.caveSyncState?.kind==='ok'?'Synchronisation confirmée.':'Vérifiez l’état affiché ci-dessus.';
   }catch(error){message.textContent=error?.message||'Synchronisation impossible.';}
   finally{force.disabled=false;}
  };
  access.textContent='Gestion des utilisateurs';
  access.onclick=()=>{box.open=false;team();};
  actions.append(open,force,access);
  panel.append(heading,state,last,actions,message);
  box.append(summary,panel);
  return box;
 }
 const buttonPalettes={
  wine:['Bordeaux','#78234f','#43172f'],
  ocean:['Océan','#1657ac','#17336f'],
  emerald:['Émeraude','#16745d','#123d45'],
  violet:['Améthyste','#7137bb','#36225f'],
  copper:['Cuivre','#a34922','#632e37'],
  midnight:['Nuit électrique','#285779','#25234f']
 };
 function applyButtonColor(choice,custom){
  const valid=buttonPalettes[choice]||choice==='custom';choice=valid?choice:'wine';
  const base=/^#[0-9a-f]{6}$/i.test(custom||'')?custom:'#7137bb';
  const darken=(hex,f)=>'#'+[1,3,5].map(p=>Math.round(parseInt(hex.slice(p,p+2),16)*f).toString(16).padStart(2,'0')).join('');
  const colors=buttonPalettes[choice]?.slice(1)||[darken(base,.55),darken(base,.30)];
  const root=document.documentElement;root.style.setProperty('--cave-gradient-start',colors[0]);root.style.setProperty('--cave-gradient-end',colors[1]);root.style.setProperty('--cave-gradient-glow',colors[0]+'40');
  root.dataset.caveButtonColor=choice;
  try{localStorage.setItem('cave-button-palette',choice);localStorage.setItem('cave-button-custom',base);}catch{}
 }
 function makeColorPicker(){
  const label=el('label',{class:'cave-color-label'},'Couleur');
  const select=el('select',{'aria-label':'Couleur des boutons',id:'cave-button-color'});
  Object.entries(buttonPalettes).forEach(([id,p])=>select.append(el('option',{value:id},p[0])));
  select.append(el('option',{value:'custom'},'Sur mesure'));
  const input=el('input',{type:'color','aria-label':'Choisir une couleur personnalisée',id:'cave-button-custom'});
  let choice='wine',custom='#7137bb';try{choice=localStorage.getItem('cave-button-palette')||choice;custom=localStorage.getItem('cave-button-custom')||custom;}catch{}
  select.value=buttonPalettes[choice]||choice==='custom'?choice:'wine';input.value=/^#[0-9a-f]{6}$/i.test(custom)?custom:'#7137bb';
  input.hidden=select.value!=='custom';
  select.onchange=()=>{input.hidden=select.value!=='custom';applyButtonColor(select.value,input.value);};
  input.oninput=()=>applyButtonColor('custom',input.value);
  label.append(select,input);applyButtonColor(select.value,input.value);return label;
 }


 function refresh(){const top=document.querySelector('.topbar');if(!top)return;if(!tools){tools=el('div',{id:'cave-tools'});const badge=el('span',{class:'cave-role'});const animation=el('button',{type:'button','aria-pressed':'false'},'Animation');animation.onclick=()=>{const on=document.body.classList.toggle('cave-show-animation');animation.setAttribute('aria-pressed',String(on));};const guide=el('button',{type:'button'},'Aide');guide.onclick=help;const access=el('button',{type:'button','data-admin-only':''},'Gestion des accès');access.onclick=team;const themeLabel=el('label',{class:'cave-theme-label'},'Thème');const themeSelect=el('select',{id:'cave-theme-select','aria-label':'Ambiance visuelle'});for(const [id,name] of themes)themeSelect.append(el('option',{value:id},name));themeSelect.value=document.documentElement.dataset.caveTheme||'soft';themeSelect.onchange=()=>applyTheme(themeSelect.value);themeLabel.append(themeSelect);const menu=el('details',{id:'cave-main-menu'});const summary=el('summary',{},'☰ Menu');summary.setAttribute('aria-label','Ouvrir le menu de la cave');const panel=el('div',{class:'cave-menu-panel'});const heading=el('div',{class:'cave-menu-heading'},'Votre cave');heading.append(badge);panel.append(heading);
 const group=(title,id)=>{const section=el('section',{id});section.append(el('h3',{},title));panel.append(section);return section;};
 const action=(parent,label,run)=>{const b=el('button',{type:'button'},label);b.onclick=()=>{menu.open=false;summary.focus();run();};parent.append(b);return b;};
 const activity=group('Activité','cave-menu-activity');for(const [label,page] of [['Accueil','home'],['Produits & stock','products'],['Ventes & factures','sales'],['Livraisons','orders'],['Clients','clients'],['Analyse','analysis']])action(activity,label,()=>window.caveNavigate?.(page));
 const products=group('Photos & produits','cave-menu-products');action(products,'Scanner une bouteille',()=>{if(typeof window.caveScanOpen==='function'){window.caveScanOpen();}else{const message=el('p',{},'Le module scanner n’a pas pu être chargé. Actualisez l’application puis réessayez.');show('Scanner indisponible',message);}});
 const display=group('Apparence','cave-menu-display');display.append(animation);
 const data=group('Données & sauvegardes','cave-menu-data');action(data,'Actualiser les données',()=>top.querySelector(':scope > .row button[title="Actualiser"]')?.click());const backup=action(data,'Télécharger une sauvegarde JSON',()=>top.querySelector(':scope > .row button.primary')?.click());backup.dataset.backupAction='';
 const settings=action(data,'Réglages de la cave',()=>window.caveNavigate?.('settings'));settings.dataset.settingsAction='';
  const support=group('Aide','cave-menu-help');support.append(guide);
 menu.append(summary,panel);userMenu=makeUserMenu(access);
 menu.addEventListener('toggle',()=>{if(menu.open&&userMenu?.open)userMenu.open=false;});
 userMenu.addEventListener('toggle',()=>{if(userMenu.open)menu.open=false;});
 const appearance=el('div',{class:'cave-appearance-controls'});appearance.append(themeLabel,makeColorPicker());tools.append(menu,userMenu,appearance);top.append(tools);
 panel.addEventListener('click',e=>{if(e.target.closest('button,a')&&!e.target.closest('#cave-menu-display')){menu.open=false;}});
 document.addEventListener('pointerdown',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;if(userMenu?.open&&!userMenu.contains(e.target))userMenu.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;summary.focus();}if(e.key==='Escape'&&userMenu?.open){userMenu.open=false;userMenu.querySelector('summary')?.focus();}});
 const style=el('style');style.textContent=`
 .topbar{flex-wrap:nowrap!important;min-height:62px!important}.topbar>.row:nth-child(2){display:none!important}#cave-tools{width:auto!important;flex:0 0 auto!important;margin-left:auto!important;display:flex!important;align-items:center;gap:9px;min-width:0}
 #cave-main-menu{position:relative}#cave-main-menu>summary{list-style:none;cursor:pointer;padding:10px 17px;border-radius:10px;background:var(--cave-button);color:var(--cave-on-button);font:650 14px system-ui;min-height:44px;display:flex;align-items:center;gap:8px}#cave-main-menu>summary::-webkit-details-marker{display:none}
 .cave-menu-panel{position:absolute;right:0;top:calc(100% + 10px);width:min(620px,calc(100vw - 28px));max-height:calc(100dvh - 100px);overflow:auto;overscroll-behavior:contain;background:var(--cave-surface);color:var(--cave-ink);border:1px solid var(--cave-line);border-radius:16px;padding:18px;box-shadow:0 18px 60px #0003;z-index:1000;display:grid;grid-template-columns:1fr 1fr;gap:16px}
 #cave-main-menu:not([open])>.cave-menu-panel{display:none}.cave-menu-heading{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:19px;font-weight:700;border-bottom:1px solid var(--cave-line);padding-bottom:12px}
 .cave-menu-panel section{min-width:0}.cave-menu-panel h3{font:700 11px system-ui;text-transform:uppercase;letter-spacing:1px;color:var(--cave-muted);margin:0 0 7px}
 #cave-tools .cave-menu-panel :is(button,a){position:static!important;display:flex!important;width:100%!important;min-height:44px!important;align-items:center;justify-content:flex-start;text-align:left;white-space:normal!important;margin:3px 0!important;padding:10px 12px!important;border:1px solid transparent!important;border-radius:8px!important;box-shadow:none!important;font:550 14px system-ui!important;text-decoration:none;color:var(--cave-ink)!important;background:var(--cave-surface)!important}
 #cave-tools .cave-menu-panel :is(button,a):hover{background:var(--cave-soft)!important;border-color:var(--cave-line)!important}#cave-tools .cave-menu-panel [hidden]{display:none!important}
 #cave-tools .cave-theme-label{display:flex;font-size:13px;flex-direction:column;align-items:flex-start;margin:0;padding:8px 12px;gap:7px}#cave-tools #cave-theme-select{max-width:100%;width:100%}
 #cave-tools :is(button,a,summary,select):focus-visible{outline:2px solid var(--cave-accent);outline-offset:2px}
 #cave-user-menu{position:relative;flex:0 1 auto;min-width:0}
 #cave-user-menu>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:44px;max-width:min(345px,45vw);padding:7px 11px;background:var(--cave-surface);color:var(--cave-ink);border:1px solid var(--cave-line);border-radius:12px;font:650 12px system-ui;box-shadow:0 2px 8px #0000000a}
 #cave-user-menu>summary::-webkit-details-marker{display:none}
 #cave-user-menu .cave-user-avatar{width:27px;height:27px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--cave-soft);font-size:15px}
 #cave-user-menu .cave-user-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px;font-weight:700}
 #cave-user-menu .cave-user-sync{display:flex;align-items:center;gap:5px;white-space:nowrap;border-radius:99px;padding:5px 8px;background:var(--cave-soft);color:var(--cave-ink);font-size:11px}
 #cave-user-menu .cave-sync-dot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:#8b8b8b;box-shadow:0 0 0 3px #88888820}
 #cave-user-menu[data-sync="ok"] .cave-sync-dot{background:#268754;box-shadow:0 0 0 3px #26875420}
 #cave-user-menu[data-sync="busy"] .cave-sync-dot{background:#b47b1d;box-shadow:0 0 0 3px #b47b1d22}
 #cave-user-menu:is([data-sync="error"],[data-sync="conflict"]) .cave-sync-dot{background:#c23546;box-shadow:0 0 0 3px #c2354622}
 #cave-user-menu[data-sync="offline"] .cave-sync-dot{background:#777;box-shadow:0 0 0 3px #77777722}
 #cave-user-menu[data-sync="pending"] .cave-sync-dot{background:#c47e22;box-shadow:0 0 0 3px #c47e2222}
 #cave-user-menu .cave-user-caret{flex:none;color:var(--cave-muted);font-size:14px}
 #cave-user-menu .cave-user-panel{position:absolute;right:0;top:calc(100% + 10px);width:min(335px,calc(100vw - 22px));max-height:min(78dvh,590px);overflow:auto;z-index:1100;background:var(--cave-surface);color:var(--cave-ink);border:1px solid var(--cave-line);border-radius:16px;padding:17px;box-shadow:0 18px 56px #0003;font:13px system-ui}
 #cave-user-menu:not([open])>.cave-user-panel{display:none}
 #cave-user-menu .cave-user-heading{display:flex;flex-direction:column;gap:5px;min-width:0}
 #cave-user-menu .cave-user-heading strong{font-size:12px;color:var(--cave-muted)}
 #cave-user-menu #cave-user-full-email{overflow-wrap:anywhere;font-weight:750;font-size:15px}
 #cave-user-menu #cave-user-role{color:var(--cave-muted);font-size:12px}
 #cave-user-menu .cave-user-state{display:flex;align-items:center;gap:9px;margin:14px 0 5px;font-weight:700}
 #cave-user-menu #cave-user-last-sync{display:block;color:var(--cave-muted);line-height:1.5;margin-bottom:11px}
 #cave-user-menu .cave-user-actions{display:grid;gap:6px;padding-top:10px;border-top:1px solid var(--cave-line)}
 #cave-tools #cave-user-menu .cave-user-actions button{display:block!important;position:static!important;width:100%;text-align:left;font:650 13px system-ui!important;padding:12px!important;background:var(--cave-soft)!important;color:var(--cave-ink)!important;border:1px solid var(--cave-line)!important;border-radius:9px;min-height:44px}
 #cave-tools #cave-user-menu .cave-user-actions button:disabled{opacity:.55;cursor:wait}
 #cave-tools #cave-user-menu .cave-user-actions button[hidden]{display:none!important}
 #cave-user-menu #cave-user-feedback{display:block;color:var(--cave-muted);line-height:1.5;min-height:0;margin-top:8px}
 #cloud-sync-button[hidden]{display:none!important}
 
 @media(max-width:767px){.topbar{padding:8px!important;gap:5px!important}.topbar>.row:first-child{min-width:0;gap:5px;flex:1 1 auto}.topbar>.row:first-child>span{display:none}.topbar>.row:first-child>b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:24vw}#cave-tools{gap:5px!important;max-width:calc(100% - 75px)}#cave-main-menu>summary{padding:9px 10px;min-height:42px;font-size:12px}#cave-user-menu>summary{min-height:42px;max-width:53vw;padding:6px 7px;gap:5px}#cave-user-menu .cave-user-avatar{width:22px;height:22px;font-size:12px}#cave-user-menu .cave-user-name{max-width:8ch;font-size:11px}#cave-user-menu .cave-user-sync{padding:4px 5px;font-size:10px}#cave-user-menu .cave-user-caret{display:none}#cave-user-menu .cave-user-panel{position:fixed;top:calc(66px + env(safe-area-inset-top));right:10px;left:10px;width:auto;max-height:calc(100dvh - 120px);padding:15px}.cave-menu-panel{position:fixed;top:calc(68px + env(safe-area-inset-top));right:10px;left:10px;width:auto;max-height:calc(100dvh - 150px);padding:14px;gap:14px;grid-template-columns:1fr}.cave-menu-panel section{border-bottom:1px solid var(--cave-line);padding-bottom:10px}}
 @media(max-width:400px){#cave-user-menu .cave-user-sync{font-size:9px}#cave-user-menu .cave-user-name{max-width:6ch}#cave-main-menu>summary{padding:8px 7px;font-size:11px}}
 @media print{#cave-tools{display:none!important}}
 `;document.head.append(style);}
 if(tools.parentElement!==top)top.append(tools);
 const cloud=document.getElementById('cloud-sync-button');if(cloud&&!cloud.hidden)cloud.hidden=true;const photos=document.getElementById('photo-module-link');if(photos&&photos.parentElement!==tools.querySelector('#cave-menu-products'))tools.querySelector('#cave-menu-products').append(photos);
 document.body.dataset.cavePage=window.caveCurrentPage||'home';const a=account();document.body.classList.toggle('cave-operator',a.role==='user');document.body.classList.toggle('cave-pending',a.role==='pending');const badgeText={admin:'Administrateur',user:'Utilisateur',pending:'Accès en attente',local:'Mode local'}[a.role]||'Mode local';if(tools.querySelector('.cave-role').textContent!==badgeText)tools.querySelector('.cave-role').textContent=badgeText;updateUserMenu();for(const b of tools.querySelectorAll('[data-backup-action],[data-settings-action]'))b.hidden=a.role==='user'||a.role==='pending';
 menuItems().forEach(n=>{if(/Réglages|sauvegarde/.test(n.textContent))n.toggleAttribute('data-admin-only',true);});
 const workspace=document.querySelector('.workspace');const home=document.querySelector('.quick-grid');let intro=document.querySelector('.cave-intro');if(home&&!intro){intro=el('div',{class:'cave-intro'});intro.append(el('strong',{},'Que souhaitez-vous faire ?'),el('span',{},'Commencez par une vente, une facture ou une livraison. Le catalogue et les clients restent accessibles dans le menu.'));intro.append(decoration());workspace.querySelector('.page-heading')?.after(intro);}if(!home&&intro)intro.remove();
 if(!mobile){mobile=el('nav',{id:'cave-mobile-nav','aria-label':'Navigation principale'});for(const label of navLabels){const b=el('button',{type:'button'},label==='Produits & stock'?'Stock':label==='Ventes & factures'?'Ventes':label);b.dataset.target=label;b.onclick=()=>navigate(label);mobile.append(b);}document.body.append(mobile);}
 for(const b of mobile.children){const original=menuItems().find(n=>n.textContent.trim()===b.dataset.target);if(original){if(!b.querySelector('svg')){const icon=original.querySelector('svg');if(icon)b.prepend(icon.cloneNode(true));}if(original.dataset.active==='true')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}else{const target={'Accueil':'home','Produits & stock':'products','Ventes & factures':'sales','Livraisons':'orders','Clients':'clients'}[b.dataset.target];if(window.caveCurrentPage===target)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
 let pending=document.getElementById('cave-pending');if(!pending){pending=el('div',{id:'cave-pending',hidden:''});pending.append(el('h2',{},'Votre accès attend une autorisation'),el('p',{},'Un administrateur doit ajouter votre adresse dans Gestion des accès. Vous pouvez ouvrir Mon compte pour vous déconnecter.'));document.body.append(pending);}pending.hidden=a.role!=='pending';
 }
 function boot(){applyTheme(document.documentElement.dataset.caveTheme);window.addEventListener('storage',e=>{if(e.key==='cave-display-theme'){applyTheme(e.newValue);const select=document.getElementById('cave-theme-select');if(select)select.value=document.documentElement.dataset.caveTheme;}});dialog=el('div',{id:'cave-help',hidden:''});const card=el('section',{class:'cave-help-card',role:'dialog','aria-modal':'true','aria-labelledby':'cave-help-title'});const c=el('button',{type:'button',class:'cave-close','aria-label':'Fermer'},'Fermer');c.onclick=close;card.append(c,el('h2',{id:'cave-help-title'}),el('div',{class:'cave-help-content'}));dialog.append(card);dialog.onclick=e=>{if(e.target===dialog)close();};document.body.append(dialog);document.addEventListener('keydown',e=>{if(dialog.hidden)return;if(e.key==='Escape')close();if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button,input,select,a')].filter(n=>!n.disabled&&!n.hidden);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refresh,50);}).observe(document.getElementById('root'),{childList:true,subtree:true});window.addEventListener('cave-account-changed',refresh);window.addEventListener('cave-sync-state-changed',updateUserMenu);refresh();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
