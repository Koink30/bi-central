/* Synchronisation Supabase — Les Caves de Saint Jean.
   La clé publishable est publique par conception. Aucune clé secrète n'est embarquée. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://pkvrabliaorhpittelwe.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_LMvpanipzKoVownEbIYj8w_eZiO4toc';
  const DATA_KEY = 'bi-caviste-saint-jean-v1';
  const SESSION_KEY = 'cave-supabase-session-v1';
  const CLOUD_REV_KEY = 'cave-cloud-revision-v1';
  const PHOTO_DB = 'caves-saint-jean-photos';
  const PHOTO_STORE = 'photos';
  const PHOTO_BUCKET = 'cave-product-photos';
  const META_DB = 'caves-saint-jean-cloud-meta';
  const META_STORE = 'meta';

  let session = readJson(SESSION_KEY);
  let pushTimer = null;
  let applyingCloud = false;
  let dirty = false;
  let panel = null;
  let membership = null;
  let refreshPromise = null;
  let syncPromise = null;
  let queuedPush = false;
  window.caveAccount = { role: 'local', email: '' };
  function ownerId() { return membership?.owner_id || session?.user?.id; }
  async function loadMembership() {
    membership = null;
    if (session) {
      const rows = await api('/rest/v1/cave_members?select=user_id,owner_id,role,email&user_id=eq.' + session.user.id);
      membership = rows?.[0] || null;
    }
    window.caveAccount = {role: membership?.role || (session ? 'pending' : 'local'), email: session?.user?.email || '', ownerId: ownerId()};
    window.dispatchEvent(new CustomEvent('cave-account-changed', {detail: window.caveAccount}));
    renderStatus();
  }
  window.caveOpenAccount = () => openPanel();
  window.caveTeamList = () => api('/rest/v1/cave_members?select=email,role,user_id,owner_id&order=created_at');
  window.caveSetMember = (email,role) => api('/rest/v1/rpc/cave_set_member', {method:'POST',body:JSON.stringify({member_email:email,member_role:role})});

  function readJson(key) {
    try {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key);
      return JSON.parse(value || 'null');
    } catch { return null; }
  }

  function writeSmallValue(key, value) {
    try { localStorage.setItem(key, String(value)); }
    catch { try { sessionStorage.setItem(key, String(value)); } catch {} }
  }

  function openMetaDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(META_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(META_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function metaStore(mode, action) {
    const db = await openMetaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, mode);
      const request = action(tx.objectStore(META_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function restoreStoredSession() {
    if (session) return session;
    try {
      session = await metaStore('readonly', store => store.get(SESSION_KEY));
      if (session) renderStatus();
    } catch (error) { console.warn('Session cloud locale indisponible', error); }
    return session;
  }

  function saveSession(value) {
    session = value;
    if (!value) {
      membership = null;
      window.caveAccount = { role: 'local', email: '' };
      window.dispatchEvent(new CustomEvent('cave-account-changed'));
    }
    if (!value) { clearTimeout(pushTimer); queuedPush = false; try { sessionStorage.removeItem(SESSION_KEY); } catch {} }
    const serialized = value ? JSON.stringify(value) : '';
    try {
      if (value) localStorage.setItem(SESSION_KEY, serialized);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // Tous les BI GitHub Pages du domaine partagent le même petit quota localStorage.
      try {
        if (value) sessionStorage.setItem(SESSION_KEY, serialized);
        else sessionStorage.removeItem(SESSION_KEY);
      } catch {}
    }
    if (value) metaStore('readwrite', store => store.put(value, SESSION_KEY)).catch(error => console.warn('Session cloud non persistée', error));
    else metaStore('readwrite', store => store.delete(SESSION_KEY)).catch(() => {});
    renderStatus();
  }

  function authHeaders(token = session?.access_token) {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function api(path, options = {}) {
    await ensureSession();
    const response = await fetch(SUPABASE_URL + path, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) }
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).message || ''; } catch { detail = await response.text(); }
      const error = new Error(detail || `Erreur cloud ${response.status}`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('json') ? response.json() : response.blob();
  }

  async function refreshSession() {
    if (!session?.refresh_token) return;
    const expiresAt = Number(session.expires_at || 0);
    if (expiresAt && Date.now() / 1000 < expiresAt - 60) return;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: authHeaders(null), body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!response.ok) { saveSession(null); throw new Error('Session expirée. Reconnecte le cloud.'); }
    const fresh = await response.json();
    fresh.expires_at = Math.floor(Date.now() / 1000) + Number(fresh.expires_in || 3600);
    saveSession(fresh);
  }

  async function ensureSession() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshSession().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function authenticate(mode, email, password) {
    const path = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
    const body = { email, password };
    if (mode === 'signup') body.options = { emailRedirectTo: location.href.split('#')[0].split('?')[0] };
    const response = await fetch(SUPABASE_URL + path, {
      method: 'POST', headers: authHeaders(null), body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.msg || result.message || 'Connexion refusée.');
    const nextSession = result.access_token ? result : result.session;
    if (!nextSession) return { confirmation: true };
    nextSession.expires_at = Math.floor(Date.now() / 1000) + Number(nextSession.expires_in || 3600);
    saveSession(nextSession);
    await loadMembership();
    if (membership) await initialSync();
    return { confirmation: false };
  }

  function localSnapshot() { return readJson(DATA_KEY); }
  function cloudRevision() {
    let persistent = 0;
    let temporary = 0;
    try { persistent = Number(localStorage.getItem(CLOUD_REV_KEY) || 0); } catch {}
    try { temporary = Number(sessionStorage.getItem(CLOUD_REV_KEY) || 0); } catch {}
    return Math.max(persistent, temporary);
  }

  async function getRemoteSnapshot() {
    const rows = await api('/rest/v1/cave_snapshots?select=revision,state,updated_at&user_id=eq.' + ownerId() + '&limit=1');
    return rows?.[0] || null;
  }

  async function pushSnapshot(allowRevision = null) {
    if (!session || !membership || applyingCloud) return;
    const snapshot = localSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (!snapshot) return;
    setCloudState('Synchronisation…', 'busy');
    const remote = await getRemoteSnapshot();
    if (remote && Number(remote.revision) > cloudRevision() && Number(remote.revision) !== allowRevision) { showConflict(remote); return; }
    const revision = Math.max(cloudRevision(), Number(remote?.revision || 0)) + 1;
    const response = await api(remote ? '/rest/v1/cave_snapshots?user_id=eq.' + ownerId() + '&revision=eq.' + remote.revision : '/rest/v1/cave_snapshots?on_conflict=user_id', {
      method: remote ? 'PATCH' : 'POST',
      headers: { Prefer: remote ? 'return=representation' : 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: ownerId(), revision, state: snapshot, updated_at: new Date().toISOString() })
    });
    if (!response?.length) throw new Error('Un autre appareil a modifié la cave. Synchronise avant de réessayer.');
    writeSmallValue(CLOUD_REV_KEY, response[0].revision);
    dirty = JSON.stringify(localSnapshot()) !== serialized;
    if (dirty) schedulePush();
    else setCloudState('Synchronisé', 'ok');
  }

  function schedulePush() {
    if (!session || !membership || applyingCloud) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { if (syncPromise) { queuedPush = true; return; } syncPromise = pushSnapshot().catch(showCloudError).finally(() => { syncPromise = null; if (queuedPush) { queuedPush = false; schedulePush(); } }); }, 1200);
  }

  async function applyRemote(remote) {
    if (!remote?.state) return;
    applyingCloud = true;
    localStorage.setItem(DATA_KEY, JSON.stringify(remote.state));
    if (window.caveStorageFlush) await window.caveStorageFlush();
    writeSmallValue(CLOUD_REV_KEY, remote.revision || 0);
    applyingCloud = false;
    dirty = false;
    setCloudState('Données cloud chargées', 'ok');
    // Le moteur conserve une copie de l'état en mémoire : un rechargement est
    // nécessaire pour afficher l'instantané reçu. La révision est inscrite
    // dans l'URL afin qu'une même version ne puisse jamais relancer la page en
    // boucle, même si sessionStorage est vidé par iOS.
    const revision = String(Number(remote.revision || 0));
    const nextUrl = new URL(location.href);
    if (revision !== '0' && nextUrl.searchParams.get('cloud_revision') !== revision) {
      nextUrl.searchParams.set('cloud_revision', revision);
      location.replace(nextUrl.toString());
    }
  }

  function hasUsefulLocalData(snapshot) {
    const state = snapshot?.state || {};
    return ['sales', 'invoices', 'orders', 'clients', 'movements'].some(key => Array.isArray(state[key]) && state[key].length > 0);
  }

  async function initialSync() {
    if (!session || !membership) return;
    setCloudState('Connexion au cloud…', 'busy');
    // Les données métier ne doivent jamais attendre le téléchargement des photos.
    const remote = await getRemoteSnapshot();
    syncAllPhotos().catch(error => console.warn('Synchronisation des photos différée', error));
    const local = localSnapshot();
    if (!remote) {
      await pushSnapshot();
      return;
    }
    const remoteRevision = Number(remote.revision || 0);
    const sameSnapshot = local && JSON.stringify(local) === JSON.stringify(remote.state);
    if (sameSnapshot || (local && remoteRevision > 0 && remoteRevision === cloudRevision())) {
      writeSmallValue(CLOUD_REV_KEY, remoteRevision);
      setCloudState('Synchronisé', 'ok');
      return;
    }
    if (!local || !hasUsefulLocalData(local)) {
      await applyRemote(remote);
      return;
    }
    showConflict(remote);
  }

  async function pullIfNewer() {
    if (!session || !membership || document.hidden || dirty || syncPromise) return;
    try {
      const remote = await getRemoteSnapshot();
      if (remote && Number(remote.revision) > cloudRevision()) await applyRemote(remote);
    } catch (error) { console.warn('Lecture cloud impossible', error); }
  }

  async function synchronizeNow() {
    const remote = await getRemoteSnapshot();
    if (remote && Number(remote.revision) > cloudRevision()) {
      await applyRemote(remote);
      return;
    }
    await pushSnapshot();
    syncAllPhotos().catch(error => console.warn('Synchronisation des photos différée', error));
  }

  function openPhotoDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(PHOTO_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function photoStore(mode, action) {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, mode);
      const request = action(tx.objectStore(PHOTO_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function uploadPhoto(record) {
    if (!session || !membership || !record?.blob) return;
    const path = `${ownerId()}/${record.id}.jpg`;
    await ensureSession();
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': record.blob.type || 'image/jpeg', 'x-upsert': 'true' },
      body: record.blob
    });
    if (!upload.ok) throw new Error((await upload.json().catch(() => ({}))).message || 'Envoi de la photo impossible.');
    await api('/rest/v1/product_photos?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: record.id, user_id: ownerId(), product_id: record.productId,
        title: record.title || '', notes: record.notes || '', vintage: record.vintage || '',
        appellation: record.appellation || '', ean: record.ean || '', storage_path: path,
        created_at: new Date(record.created || Date.now()).toISOString(), updated_at: new Date().toISOString()
      })
    });
  }

  async function downloadPhoto(meta) {
    const blob = await api(`/storage/v1/object/authenticated/${PHOTO_BUCKET}/${encodeURI(meta.storage_path)}`);
    return {
      id: meta.id, productId: meta.product_id, title: meta.title || '', notes: meta.notes || '',
      vintage: meta.vintage || '', appellation: meta.appellation || '', ean: meta.ean || '',
      created: Date.parse(meta.created_at) || Date.now(), blob
    };
  }

  async function syncAllPhotos() {
    if (!session || !membership) return;
    const [local, remote] = await Promise.all([
      photoStore('readonly', store => store.getAll()),
      api('/rest/v1/product_photos?select=*')
    ]);
    const localIds = new Set(local.map(item => item.id));
    const remoteIds = new Set(remote.map(item => item.id));
    for (const record of local) if (!remoteIds.has(record.id)) await uploadPhoto(record);
    for (const meta of remote) if (!localIds.has(meta.id)) {
      const record = await downloadPhoto(meta);
      await photoStore('readwrite', store => store.put(record));
    }
    window.dispatchEvent(new CustomEvent('cave-photos-synced'));
  }

  async function removeRemotePhoto(id) {
    if (!session || !membership || !id) return;
    const rows = await api(`/rest/v1/product_photos?select=storage_path&id=eq.${encodeURIComponent(id)}`);
    const path = rows?.[0]?.storage_path;
    if (path) await api(`/storage/v1/object/${PHOTO_BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) });
    await api(`/rest/v1/product_photos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function installStorageWatcher() {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const watched = this === localStorage && key === DATA_KEY;
      const previous = watched ? this.getItem(key) : null;
      original.call(this, key, value);
      // Le moteur peut réécrire le même instantané pendant son démarrage.
      // Ne pas créer une nouvelle révision cloud si rien n'a changé.
      if (watched && previous !== String(value)) schedulePush();
    };
  }

  function addInterface() {
    const style = document.createElement('style');
    style.textContent = `
      #cloud-sync-button{position:fixed;right:16px;bottom:76px;z-index:9998;border:0;border-radius:999px;padding:10px 14px;background:#17251c;color:#fff;font:600 13px Arial;box-shadow:0 8px 26px #0003;cursor:pointer}
      #cloud-sync-button[data-kind="ok"]{background:#286c42}#cloud-sync-button[data-kind="busy"]{background:#896c2c}#cloud-sync-button[data-kind="error"]{background:#a22d37}
      #cloud-sync-panel{position:fixed;inset:0;z-index:10000;background:#0009;display:grid;place-items:center;padding:16px;font-family:Arial;color:#17251c}
      #cloud-sync-panel[hidden]{display:none}#cloud-sync-panel .cloud-card{width:min(430px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 80px #0007}
      #cloud-sync-panel h2{font-size:22px;margin:0 0 8px}#cloud-sync-panel p{line-height:1.45;margin:8px 0 16px}#cloud-sync-panel label{display:block;font-weight:700;margin:12px 0 5px}
      #cloud-sync-panel input{box-sizing:border-box;width:100%;border:1px solid #c8c8c0;border-radius:10px;padding:12px;font-size:16px}
      #cloud-sync-panel .cloud-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}#cloud-sync-panel button{border:0;border-radius:10px;padding:11px 14px;background:#286c42;color:#fff;font-weight:700;cursor:pointer}
      #cloud-sync-panel button.secondary{background:#eee;color:#17251c}#cloud-sync-panel button.danger{background:#a22d37}#cloud-sync-message{font-size:13px;color:#a22d37;min-height:18px}
      @media(max-width:600px){#cloud-sync-button{right:12px;bottom:72px;max-width:52vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
    `;
    document.head.append(style);
    const button = document.createElement('button');
    button.id = 'cloud-sync-button'; button.type = 'button'; button.onclick = openPanel;
    document.body.append(button);
    panel = document.createElement('div'); panel.id = 'cloud-sync-panel'; panel.hidden = true;
    panel.innerHTML = `<div class="cloud-card" role="dialog" aria-modal="true" aria-labelledby="cloud-title">
      <h2 id="cloud-title">Mon compte</h2>
      <div id="cloud-panel-content"></div>
    </div>`;
    panel.addEventListener('click', event => { if (event.target === panel) closePanel(); });
    document.body.append(panel);
    renderStatus();
  }

  function renderStatus() {
    const button = document.getElementById('cloud-sync-button');
    if (!button) return;
    button.textContent = session ? (membership ? '☁ Connecté' : '☁ Accès en attente') : '☁ Se connecter';
    button.dataset.kind = session && membership ? 'ok' : '';
  }

  function setCloudState(text, kind = '') {
    const button = document.getElementById('cloud-sync-button');
    if (!button) return;
    button.textContent = `☁ ${text}`; button.dataset.kind = kind;
  }

  function showCloudError(error) {
    console.error(error);
    const missingSchema = /relation .* does not exist|schema cache|cave_snapshots/i.test(error.message || '');
    setCloudState(missingSchema ? 'Base à initialiser' : 'Erreur de synchronisation', 'error');
  }

  function closePanel() { panel.hidden = true; }

  function openPanel() {
    panel.hidden = false;
    const content = document.getElementById('cloud-panel-content');
    if (session) {
      content.innerHTML = `<p>Connecté avec <strong>${escapeHtml(session.user?.email || 'compte Supabase')}</strong>.</p>
        <p>${membership ? 'Accès <strong>' + (membership.role === 'admin' ? 'administrateur' : 'utilisateur') + '</strong> · Cave partagée sur PC et téléphone.' : 'Compte créé. Un administrateur doit autoriser cet e-mail dans Gestion des accès.'}</p>
        <div class="cloud-actions"><button id="cloud-sync-now">Synchroniser maintenant</button><button id="cloud-logout" class="secondary">Se déconnecter</button><button id="cloud-close" class="secondary">Fermer</button></div>
        <p id="cloud-sync-message"></p>`;
      document.getElementById('cloud-sync-now').onclick = async () => { try { await synchronizeNow(); document.getElementById('cloud-sync-message').textContent = 'Données synchronisées. Les photos continuent en arrière-plan.'; } catch (e) { document.getElementById('cloud-sync-message').textContent = e.message; showCloudError(e); } };
      document.getElementById('cloud-logout').onclick = async () => { if (dirty) { document.getElementById('cloud-sync-message').textContent = 'Synchronise les modifications avant de te déconnecter.'; return; } try { await api('/auth/v1/logout', {method:'POST'}); } catch {} saveSession(null); await metaStore('readwrite', store => store.delete(SESSION_KEY)); localStorage.removeItem(DATA_KEY); if (window.caveStorageFlush) await window.caveStorageFlush(); await photoStore('readwrite', store => store.clear()); writeSmallValue(CLOUD_REV_KEY,0); await loadMembership(); location.reload(); };
      document.getElementById('cloud-close').onclick = closePanel;
      return;
    }
    content.innerHTML = `<p>Connectez-vous pour retrouver la cave sur tous vos appareils. Chaque personne utilise son propre compte. Un nouveau compte doit être autorisé par un administrateur.</p>
      <label for="cloud-email">Adresse e-mail</label><input id="cloud-email" type="email" autocomplete="email">
      <label for="cloud-password">Mot de passe</label><input id="cloud-password" type="password" autocomplete="current-password" minlength="6">
      <div class="cloud-actions"><button id="cloud-login">Se connecter</button><button id="cloud-signup" class="secondary">Créer le compte</button><button id="cloud-close" class="secondary">Annuler</button></div>
      <p id="cloud-sync-message"></p>`;
    const submit = async mode => {
      const email = document.getElementById('cloud-email').value.trim();
      const password = document.getElementById('cloud-password').value;
      const message = document.getElementById('cloud-sync-message');
      if (!email || password.length < 6) { message.textContent = 'Renseigne un e-mail et un mot de passe d’au moins 6 caractères.'; return; }
      message.textContent = 'Connexion…';
      try {
        const result = await authenticate(mode, email, password);
        if (result.confirmation) message.textContent = 'Compte créé. Confirme l’e-mail reçu, puis reviens ici pour te connecter.';
        else { if (membership) closePanel(); else openPanel(); }
      } catch (error) { message.textContent = error.message; }
    };
    document.getElementById('cloud-login').onclick = () => submit('login');
    document.getElementById('cloud-signup').onclick = () => submit('signup');
    document.getElementById('cloud-close').onclick = closePanel;
  }

  function showConflict(remote) {
    openPanel();
    const content = document.getElementById('cloud-panel-content');
    content.innerHTML = `<p><strong>Des données différentes existent déjà.</strong></p><p>Choisis la version à conserver pour éviter tout écrasement involontaire.</p>
      <div class="cloud-actions"><button id="use-cloud">Charger la version cloud</button><button id="use-device" class="danger">Envoyer cet appareil</button></div><p id="cloud-sync-message"></p>`;
    document.getElementById('use-cloud').onclick = () => applyRemote(remote);
    document.getElementById('use-device').onclick = async () => { try { await pushSnapshot(Number(remote.revision)); if (!dirty) closePanel(); } catch (e) { document.getElementById('cloud-sync-message').textContent = e.message; } };
  }

  function escapeHtml(value) {
    const div = document.createElement('div'); div.textContent = value; return div.innerHTML;
  }

  installStorageWatcher();
  window.addEventListener('cave-photo-changed', event => {
    if (!session) return;
    photoStore('readonly', store => store.get(event.detail?.id)).then(uploadPhoto).then(() => setCloudState('Synchronisé', 'ok')).catch(showCloudError);
  });
  window.addEventListener('cave-photo-deleted', event => removeRemotePhoto(event.detail?.id).catch(showCloudError));
  window.addEventListener('online', () => { if (session) initialSync().catch(showCloudError); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pullIfNewer(); });
  window.addEventListener('storage', event => { if (event.key === DATA_KEY) pullIfNewer(); });
  async function bootCloud() {
    if (window.caveStorageReady) await window.caveStorageReady;
    if (window.caveAppReady) await window.caveAppReady;
    addInterface();
    await restoreStoredSession();
    try { await loadMembership(); } catch (error) { window.caveAccount={role:session?'pending':'local',email:session?.user?.email||''}; window.dispatchEvent(new CustomEvent('cave-account-changed')); showCloudError(error); }
    if (session && membership) initialSync().catch(showCloudError);
    setInterval(pullIfNewer, 30000);
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootCloud, { once: true });
  else bootCloud().catch(error => console.error('Démarrage cloud impossible', error));
})();
