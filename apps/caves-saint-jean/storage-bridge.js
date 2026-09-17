/* Stockage principal des Caves de Saint Jean dans IndexedDB.
   L'API synchrone localStorage est conservée pour le BI existant, mais la
   valeur volumineuse n'occupe plus le petit quota partagé de GitHub Pages. */
(() => {
  'use strict';

  const DATA_KEY = 'bi-caviste-saint-jean-v1';
  const DB_NAME = 'caves-saint-jean-state';
  const STORE_NAME = 'state';
  const RECORD_KEY = 'snapshot';
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  let cached = null;
  let ready = false;
  let pendingWrite = Promise.resolve();

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB indisponible'));
    });
  }

  async function dbAction(mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Écriture IndexedDB impossible'));
      tx.oncomplete = () => db.close();
      tx.onabort = () => { db.close(); reject(tx.error || new Error('Transaction IndexedDB annulée')); };
    });
  }

  function persist(value) {
    pendingWrite = pendingWrite.catch(() => {}).then(() => value === null
      ? dbAction('readwrite', store => store.delete(RECORD_KEY))
      : dbAction('readwrite', store => store.put(value, RECORD_KEY)));
    pendingWrite.catch(error => console.error('Stockage des Caves non enregistré', error));
    return pendingWrite;
  }

  function isCaveValue(storage, key) {
    return storage === window.localStorage && key === DATA_KEY;
  }

  Storage.prototype.getItem = function (key) {
    if (isCaveValue(this, key)) return cached;
    return nativeGet.call(this, key);
  };

  Storage.prototype.setItem = function (key, value) {
    if (!isCaveValue(this, key)) return nativeSet.call(this, key, value);
    cached = String(value);
    persist(cached);
  };

  Storage.prototype.removeItem = function (key) {
    if (!isCaveValue(this, key)) return nativeRemove.call(this, key);
    cached = null;
    persist(null);
  };

  window.caveStorageFlush = () => pendingWrite;
  window.caveStorageReady = (async () => {
    const legacy = nativeGet.call(window.localStorage, DATA_KEY);
    try {
      const stored = await dbAction('readonly', store => store.get(RECORD_KEY));
      if (typeof stored === 'string') {
        cached = stored;
      } else if (legacy !== null) {
        cached = legacy;
        await persist(legacy);
        const verified = await dbAction('readonly', store => store.get(RECORD_KEY));
        if (verified !== legacy) throw new Error('Vérification de la migration impossible');
      }

      // Suppression limitée à la grosse copie des Caves, après lecture ou
      // migration vérifiée. Les autres BI et les petites clés restent intactes.
      if (legacy !== null) nativeRemove.call(window.localStorage, DATA_KEY);
      ready = true;
      window.dispatchEvent(new CustomEvent('cave-storage-ready'));
      return true;
    } catch (error) {
      // Si IndexedDB est bloqué, l'application conserve l'ancienne copie et
      // continue de fonctionner sans supprimer quoi que ce soit.
      cached = legacy;
      ready = true;
      console.error('Migration du stockage des Caves impossible', error);
      window.dispatchEvent(new CustomEvent('cave-storage-error', { detail: { message: error.message } }));
      return false;
    }
  })();

  // Permet aux outils de diagnostic de vérifier que l'interception est active.
  window.caveStorageStatus = () => ({ ready, backend: 'indexedDB', hasData: cached !== null });
})();
