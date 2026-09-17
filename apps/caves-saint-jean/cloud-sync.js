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

  let session = readJson(SESSION_KEY);
  let pushTimer = null;
  let applyingCloud = false;
  let dirty = false;
  let panel = null;

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function saveSession(value) {
    session = value;
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
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

  async function ensureSession() {
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
    await initialSync();
    return { confirmation: false };
  }

  function localSnapshot() { return readJson(DATA_KEY); }
  function cloudRevision() { return Number(localStorage.getItem(CLOUD_REV_KEY) || 0); }

  async function getRemoteSnapshot() {
    const rows = await api('/rest/v1/cave_snapshots?select=revision,state,updated_at&limit=1');
    return rows?.[0] || null;
  }

  async function pushSnapshot() {
    if (!session || applyingCloud) return;
    const snapshot = localSnapshot();
    if (!snapshot) return;
    setCloudState('Synchronisation…', 'busy');
    const remote = await getRemoteSnapshot();
    const revision = Math.max(cloudRevision(), Number(remote?.revision || 0)) + 1;
    const response = await api('/rest/v1/cave_snapshots?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: session.user.id, revision, state: snapshot, updated_at: new Date().toISOString() })
    });
    localStorage.setItem(CLOUD_REV_KEY, String(response?.[0]?.revision || revision));
    dirty = false;
    setCloudState('Synchronisé', 'ok');
  }

  function schedulePush() {
    if (!session || applyingCloud) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushSnapshot().catch(showCloudError), 1200);
  }

  async function applyRemote(remote, reload = true) {
    if (!remote?.state) return;
    applyingCloud = true;
    localStorage.setItem(DATA_KEY, JSON.stringify(remote.state));
    localStorage.setItem(CLOUD_REV_KEY, String(remote.revision || 0));
    applyingCloud = false;
    dirty = false;
    setCloudState('Données cloud chargées', 'ok');
    if (reload) location.reload();
  }

  function hasUsefulLocalData(snapshot) {
    const state = snapshot?.state || {};
    return ['sales', 'invoices', 'orders', 'clients', 'movements'].some(key => Array.isArray(state[key]) && state[key].length > 0);
  }

  async function initialSync() {
    if (!session) return;
    setCloudState('Connexion au cloud…', 'busy');
    const [remote] = await Promise.all([getRemoteSnapshot(), syncAllPhotos()]);
    const local = localSnapshot();
    if (!remote) {
      await pushSnapshot();
      return;
    }
    if (!local || !hasUsefulLocalData(local)) {
      await applyRemote(remote);
      return;
    }
    if (JSON.stringify(local) === JSON.stringify(remote.state)) {
      localStorage.setItem(CLOUD_REV_KEY, String(remote.revision || 0));
      setCloudState('Synchronisé', 'ok');
      return;
    }
    showConflict(remote);
  }

  async function pullIfNewer() {
    if (!session || document.hidden || dirty) return;
    try {
      const remote = await getRemoteSnapshot();
      if (remote && Number(remote.revision) > cloudRevision()) await applyRemote(remote);
    } catch (error) { console.warn('Lecture cloud impossible', error); }
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
    if (!session || !record?.blob) return;
    const path = `${session.user.id}/${record.id}.jpg`;
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
        id: record.id, user_id: session.user.id, product_id: record.productId,
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
    if (!session) return;
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
    if (!session || !id) return;
    const rows = await api(`/rest/v1/product_photos?select=storage_path&id=eq.${encodeURIComponent(id)}`);
    const path = rows?.[0]?.storage_path;
    if (path) await api(`/storage/v1/object/${PHOTO_BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) });
    await api(`/rest/v1/product_photos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function installStorageWatcher() {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      original.call(this, key, value);
      if (this === localStorage && key === DATA_KEY) schedulePush();
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
      <h2 id="cloud-title">Synchronisation PC / iPhone</h2>
      <div id="cloud-panel-content"></div>
    </div>`;
    panel.addEventListener('click', event => { if (event.target === panel) closePanel(); });
    document.body.append(panel);
    renderStatus();
  }

  function renderStatus() {
    const button = document.getElementById('cloud-sync-button');
    if (!button) return;
    button.textContent = session ? '☁ Synchronisé' : '☁ Connecter le cloud';
    button.dataset.kind = session ? 'ok' : '';
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
        <p>Les données et les photos sont synchronisées avec les autres appareils utilisant ce même compte.</p>
        <div class="cloud-actions"><button id="cloud-sync-now">Synchroniser maintenant</button><button id="cloud-logout" class="secondary">Se déconnecter</button><button id="cloud-close" class="secondary">Fermer</button></div>
        <p id="cloud-sync-message"></p>`;
      document.getElementById('cloud-sync-now').onclick = async () => { try { await pushSnapshot(); await syncAllPhotos(); document.getElementById('cloud-sync-message').textContent = 'Synchronisation terminée.'; } catch (e) { document.getElementById('cloud-sync-message').textContent = e.message; showCloudError(e); } };
      document.getElementById('cloud-logout').onclick = () => { saveSession(null); closePanel(); };
      document.getElementById('cloud-close').onclick = closePanel;
      return;
    }
    content.innerHTML = `<p>Utilise le même compte sur le PC et l’iPhone pour retrouver produits, ventes, stocks et photos.</p>
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
        else closePanel();
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
    document.getElementById('use-device').onclick = async () => { try { await pushSnapshot(); closePanel(); } catch (e) { document.getElementById('cloud-sync-message').textContent = e.message; } };
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
  window.addEventListener('DOMContentLoaded', () => {
    addInterface();
    if (session) initialSync().catch(showCloudError);
    setInterval(pullIfNewer, 30000);
  });
})();
