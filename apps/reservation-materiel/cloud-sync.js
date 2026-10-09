/* Réservation matériel — couche de synchronisation Supabase V22.
   Local-first : si cloud-config.js reste disabled, le BI fonctionne exactement en local.
   Multi-utilisateur : état partagé + révision optimiste + détection de conflit. */
(() => {
  'use strict';
  const CFG = window.MERLET_CLOUD_CONFIG || {};
  const SESSION_KEY = 'merlet-cloud-session-v22';
  const REV_KEY = 'merlet-cloud-revision-v22';
  const WATCHED_KEYS = new Set([
    'merlet_reservation_materiel_v5_local',
    'merlet_material_infos_v6_local',
    'merlet_material_observations_v6_local',
    'merlet-reservation-discussions-v14',
    'merlet-material-source-v12',
    'merlet-bdd-vehicule-import-v12'
  ]);

  let session = readJson(SESSION_KEY);
  let dirty = false;
  let applying = false;
  let pushTimer = null;
  let pollTimer = null;
  let conflictRemote = null;

  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  function writeJson(key, val) { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); }
  function revision() { return Number(localStorage.getItem(REV_KEY) || 0); }
  function setRevision(v) { localStorage.setItem(REV_KEY, String(Number(v) || 0)); }
  function configured() { return !!(CFG.enabled && CFG.url && CFG.publishableKey); }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function snapshot() {
    return {
      schemaVersion: 1,
      reservations: readJson('merlet_reservation_materiel_v5_local') || [],
      materialInfos: readJson('merlet_material_infos_v6_local') || [],
      materialObservations: readJson('merlet_material_observations_v6_local') || [],
      reservationDiscussions: readJson('merlet-reservation-discussions-v14') || [],
      materials: readJson('merlet-material-source-v12') || null,
      merletImport: readJson('merlet-bdd-vehicule-import-v12') || null
    };
  }

  function useful(s) {
    return !!(s && (
      (s.reservations || []).length ||
      (s.materialInfos || []).length ||
      (s.materialObservations || []).length
    ));
  }

  function same(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } }

  function applySnapshot(s) {
    applying = true;
    writeJson('merlet_reservation_materiel_v5_local', s.reservations || []);
    writeJson('merlet_material_infos_v6_local', s.materialInfos || []);
    writeJson('merlet_material_observations_v6_local', s.materialObservations || []);
    writeJson('merlet-reservation-discussions-v14', s.reservationDiscussions || []);
    if (s.materials) writeJson('merlet-material-source-v12', s.materials);
    if (s.merletImport) writeJson('merlet-bdd-vehicule-import-v12', s.merletImport);
    applying = false;
  }

  function authHeaders(token = session?.access_token) {
    const headers = { apikey: CFG.publishableKey, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function ensureSession() {
    if (!session?.refresh_token) return;
    if (Number(session.expires_at || 0) > Date.now() / 1000 + 60) return;
    const response = await fetch(`${CFG.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!response.ok) {
      saveSession(null);
      throw new Error('Session expirée');
    }
    const fresh = await response.json();
    fresh.expires_at = Math.floor(Date.now() / 1000) + Number(fresh.expires_in || 3600);
    saveSession(fresh);
  }

  async function api(path, options = {}) {
    await ensureSession();
    const response = await fetch(CFG.url + path, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) }
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || detail.msg || `Erreur cloud ${response.status}`);
    }
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('json') ? response.json() : response.text();
  }

  function saveSession(value) {
    session = value;
    writeJson(SESSION_KEY, value);
    renderStatus();
  }

  async function signIn(email, password) {
    const response = await fetch(`${CFG.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify({ email, password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.msg || 'Connexion refusée');
    result.expires_at = Math.floor(Date.now() / 1000) + Number(result.expires_in || 3600);
    saveSession(result);
    await initialSync();
  }

  async function signOut() {
    try {
      if (session?.access_token) {
        await fetch(`${CFG.url}/auth/v1/logout`, { method: 'POST', headers: authHeaders() });
      }
    } catch {}
    saveSession(null);
    stopPoll();
  }

  async function remoteState() {
    const table = encodeURIComponent(CFG.stateTable || 'material_reservation_state');
    const id = encodeURIComponent(CFG.stateId || 'shared');
    const rows = await api(`/rest/v1/${table}?id=eq.${id}&select=id,revision,state,updated_at,updated_by&limit=1`);
    return rows?.[0] || null;
  }

  async function insertInitial(local) {
    const table = encodeURIComponent(CFG.stateTable || 'material_reservation_state');
    const body = {
      id: CFG.stateId || 'shared',
      revision: 1,
      state: local,
      updated_at: new Date().toISOString(),
      updated_by: session?.user?.email || 'utilisateur'
    };
    const rows = await api(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body)
    });
    setRevision(rows?.[0]?.revision || 1);
    dirty = false;
    renderStatus('Synchronisé', 'ok');
  }

  async function push(expected = revision(), force = false) {
    if (!configured() || !session || applying) return;
    const local = snapshot();
    const remote = await remoteState();

    if (!remote) {
      await insertInitial(local);
      return;
    }

    if (same(local, remote.state)) {
      setRevision(remote.revision);
      dirty = false;
      renderStatus('Synchronisé', 'ok');
      return;
    }

    const base = force ? Number(remote.revision) : Number(expected);
    const table = encodeURIComponent(CFG.stateTable || 'material_reservation_state');
    const id = encodeURIComponent(CFG.stateId || 'shared');
    const next = base + 1;

    renderStatus('Envoi…', 'busy');
    const rows = await api(`/rest/v1/${table}?id=eq.${id}&revision=eq.${base}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        revision: next,
        state: local,
        updated_at: new Date().toISOString(),
        updated_by: session?.user?.email || 'utilisateur'
      })
    });

    if (!rows?.length) {
      conflictRemote = await remoteState();
      showConflict();
      return;
    }

    setRevision(rows[0].revision);
    dirty = false;
    conflictRemote = null;
    renderStatus('Synchronisé', 'ok');
  }

  function schedulePush() {
    if (!configured() || !session || applying) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push().catch(showError), 1300);
    renderStatus('Modifications locales…', 'busy');
  }

  async function pull() {
    if (!configured() || !session || document.hidden) return;
    const remote = await remoteState();
    if (!remote || Number(remote.revision) <= revision()) return;

    if (dirty) {
      conflictRemote = remote;
      showConflict();
      return;
    }

    applySnapshot(remote.state || {});
    setRevision(remote.revision);
    renderStatus('Mise à jour reçue', 'ok');
    location.reload();
  }

  async function initialSync() {
    if (!session) return;
    startPoll();
    renderStatus('Connexion…', 'busy');

    const remote = await remoteState();
    const local = snapshot();

    if (!remote) {
      await insertInitial(local);
      return;
    }

    if (same(local, remote.state)) {
      setRevision(remote.revision);
      dirty = false;
      renderStatus('Synchronisé', 'ok');
      return;
    }

    if (revision() === 0 && useful(local)) {
      conflictRemote = remote;
      showConflict(true);
      return;
    }

    if (Number(remote.revision) > revision()) {
      applySnapshot(remote.state || {});
      setRevision(remote.revision);
      renderStatus('Cloud chargé', 'ok');
      location.reload();
      return;
    }

    await push();
  }

  function installWatcher() {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const watched = this === localStorage && WATCHED_KEYS.has(String(key));
      const old = watched ? this.getItem(key) : null;
      originalSet.call(this, key, value);
      if (watched && old !== String(value) && !applying) schedulePush();
    };

    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      const watched = this === localStorage && WATCHED_KEYS.has(String(key));
      originalRemove.call(this, key);
      if (watched && !applying) schedulePush();
    };
  }

  function addUI() {
    const style = document.createElement('style');
    style.textContent = `
      #merletCloudBtn{position:fixed;right:14px;bottom:14px;z-index:9997;border:1px solid #0f766e;border-radius:999px;padding:9px 13px;background:#fff;color:#0f3d36;font:700 12px system-ui;box-shadow:0 8px 24px #0002;cursor:pointer}
      #merletCloudBtn.busy{border-color:#d97706;color:#92400e}
      #merletCloudBtn.err{border-color:#dc2626;color:#991b1b}
      #merletCloudBtn.ok{border-color:#16a34a;color:#166534}
      #merletCloudPanel{position:fixed;right:14px;bottom:62px;z-index:9998;width:min(360px,calc(100vw - 28px));background:#fff;color:#172033;border:1px solid #cbd5e1;border-radius:16px;padding:14px;box-shadow:0 20px 60px #0004;display:none;font:13px system-ui}
      #merletCloudPanel.show{display:block}
      #merletCloudPanel h3{margin:0 0 8px;font-size:15px}
      #merletCloudPanel input{width:100%;box-sizing:border-box;margin:5px 0;padding:9px;border:1px solid #cbd5e1;border-radius:9px}
      #merletCloudPanel .row{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}
      #merletCloudPanel button{padding:8px 10px;border-radius:9px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer;font-weight:700}
      #merletConflict{position:fixed;inset:0;z-index:10050;background:#0008;display:none;align-items:center;justify-content:center;padding:20px;font-family:system-ui}
      #merletConflict.show{display:flex}
      #merletConflict>div{max-width:520px;background:#fff;border-radius:18px;padding:20px;color:#172033;box-shadow:0 30px 90px #0007}
      #merletConflict .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      #merletConflict button{padding:9px 12px;border-radius:9px;border:1px solid #94a3b8;background:#fff;font-weight:800;cursor:pointer}
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.id = 'merletCloudBtn';
    button.textContent = configured() ? '☁ Cloud' : '☁ Cloud prêt';
    document.body.appendChild(button);

    const panel = document.createElement('div');
    panel.id = 'merletCloudPanel';
    panel.innerHTML = `
      <h3>☁ Données partagées</h3>
      <div id="merletCloudMsg">${configured() ? 'Connexion nécessaire' : 'Supabase pas encore configuré. Le BI reste local.'}</div>
      <div id="merletCloudAuth">
        <input id="merletCloudEmail" type="email" placeholder="Adresse e-mail">
        <input id="merletCloudPassword" type="password" placeholder="Mot de passe">
        <div class="row"><button data-cloud="login">Connexion</button></div>
      </div>
      <div id="merletCloudConnected" style="display:none">
        <div id="merletCloudWho"></div>
        <div class="row">
          <button data-cloud="sync">Synchroniser</button>
          <button data-cloud="logout">Déconnexion</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    const conflict = document.createElement('div');
    conflict.id = 'merletConflict';
    conflict.innerHTML = `
      <div>
        <h3>⚠️ Modification simultanée détectée</h3>
        <p>Une autre personne a enregistré une version plus récente pendant que tu travaillais. Rien n'est écrasé automatiquement.</p>
        <div id="merletConflictMeta"></div>
        <div class="actions">
          <button data-conflict="remote">Charger la version équipe</button>
          <button data-conflict="local">Conserver ma version</button>
          <button data-conflict="later">Décider plus tard</button>
        </div>
      </div>
    `;
    document.body.appendChild(conflict);

    button.onclick = () => panel.classList.toggle('show');

    panel.addEventListener('click', async event => {
      const action = event.target.closest('[data-cloud]')?.dataset.cloud;
      if (!action) return;
      try {
        if (action === 'login') {
          await signIn(
            document.getElementById('merletCloudEmail').value.trim(),
            document.getElementById('merletCloudPassword').value
          );
        }
        if (action === 'sync') {
          await pull();
          if (!conflictRemote) await push();
        }
        if (action === 'logout') await signOut();
      } catch (error) { showError(error); }
    });

    conflict.addEventListener('click', async event => {
      const action = event.target.closest('[data-conflict]')?.dataset.conflict;
      if (!action) return;
      try {
        if (action === 'remote' && conflictRemote) {
          applySnapshot(conflictRemote.state || {});
          setRevision(conflictRemote.revision);
          dirty = false;
          conflict.classList.remove('show');
          location.reload();
        }
        if (action === 'local') {
          await push(revision(), true);
          conflict.classList.remove('show');
        }
        if (action === 'later') conflict.classList.remove('show');
      } catch (error) { showError(error); }
    });

    renderStatus();
  }

  function renderStatus(message, kind) {
    const button = document.getElementById('merletCloudBtn');
    const msg = document.getElementById('merletCloudMsg');
    const auth = document.getElementById('merletCloudAuth');
    const connected = document.getElementById('merletCloudConnected');
    const who = document.getElementById('merletCloudWho');
    if (!button) return;

    button.className = kind || '';

    if (!configured()) {
      button.textContent = '☁ Cloud prêt';
      if (msg) msg.textContent = 'Supabase pas encore configuré. Le BI fonctionne en local.';
      return;
    }

    button.textContent = session ? '☁ ' + (message || 'Connecté') : '☁ Connexion';
    if (msg) msg.textContent = message || (session ? 'Données partagées actives.' : 'Connecte-toi avec ton compte équipe.');
    if (auth) auth.style.display = session ? 'none' : 'block';
    if (connected) connected.style.display = session ? 'block' : 'none';
    if (who) who.textContent = session?.user?.email || '';
  }

  function showConflict(initial = false) {
    const conflict = document.getElementById('merletConflict');
    if (!conflict) return;

    const meta = document.getElementById('merletConflictMeta');
    if (meta) {
      meta.innerHTML = `
        <small>Version locale : ${revision()} · version équipe : ${Number(conflictRemote?.revision || 0)}
        ${conflictRemote?.updated_by ? ' · dernière modification : ' + esc(conflictRemote.updated_by) : ''}</small>
        ${initial ? '<p><strong>Premier raccordement :</strong> le navigateur contient déjà des données locales et le cloud contient une autre version.</p>' : ''}
      `;
    }

    conflict.classList.add('show');
    renderStatus('Conflit à résoudre', 'err');
  }

  function showError(error) {
    console.error(error);
    renderStatus(error?.message || 'Erreur cloud', 'err');
  }

  function startPoll() {
    stopPoll();
    pollTimer = setInterval(() => pull().catch(console.warn), Number(CFG.pollMs) || 12000);
  }

  function stopPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  window.addEventListener('load', async () => {
    addUI();
    if (!configured()) return;

    installWatcher();

    if (session) {
      try { await initialSync(); }
      catch (error) { showError(error); }
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && session) pull().catch(console.warn);
    });
  });
})();
