/* Photo display for the existing catalogue. Photos remain in local IndexedDB. */
(() => {
  const DB = 'caves-saint-jean-photos', STORE = 'photos';
  let photos = new Map(), activeId = null, scheduled = false;
  let createRequested = new URLSearchParams(location.search).has('newProduct');
  const urls = new Map();
  function url(record) {
    if (!urls.has(record.id)) urls.set(record.id, URL.createObjectURL(record.blob));
    return urls.get(record.id);
  }
  function readPhotos() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction(STORE, 'readonly');
        const all = tx.objectStore(STORE).getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => reject(all.error);
        tx.oncomplete = () => db.close();
      };
    });
  }
  function savePhoto(record) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
  }
  async function compress(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image illisible')), 'image/jpeg', .78));
  }
  async function reload() {
    try {
      const records = await readPhotos(), grouped = new Map();
      records.sort((a, b) => b.created - a.created);
      for (const record of records) if (record.productId) {
        if (!grouped.has(record.productId)) grouped.set(record.productId, []);
        grouped.get(record.productId).push(record);
      }
      for (const [id, source] of urls) if (!records.some(record => record.id === id)) {
        URL.revokeObjectURL(source); urls.delete(id);
      }
      photos = grouped;
      document.querySelectorAll('.catalog-photo, .catalog-photo-gallery').forEach(node => node.remove());
      render();
    } catch (error) { console.warn('Photos du catalogue indisponibles', error); }
  }
  function productId(title) {
    const metadata = title.querySelector('.metadata')?.textContent || '';
    return metadata.split('·')[0].trim();
  }
  function render() {
    if (createRequested) {
      const buttons = [...document.querySelectorAll('#root button')];
      const add = buttons.find(button => button.textContent?.trim() === 'Nouveau produit');
      if (add) { createRequested = false; add.click(); history.replaceState(null, '', location.pathname); }
      else buttons.find(button => button.textContent?.includes('Produits & stock'))?.click();
    }
    for (const title of document.querySelectorAll('.product-title')) {
      const id = productId(title), records = photos.get(id);
      if (!records?.length || title.querySelector('.catalog-photo')) continue;
      const image = document.createElement('img');
      image.className = 'catalog-photo'; image.src = url(records[0]);
      image.alt = `Photo de ${title.querySelector('.product-link')?.textContent || id}`;
      image.title = `${records.length} photo${records.length > 1 ? 's' : ''} — ouvrir la fiche`;
      const mark = title.querySelector('.product-mark');
      if (mark) mark.replaceWith(image); else title.prepend(image);
    }
    const form = document.querySelector('.cave-dialog form');
    if (!form || form.querySelector('.catalog-photo-gallery')) return;
    const dialogTitle = document.querySelector('.cave-dialog [data-slot="dialog-title"]');
    if (!dialogTitle?.textContent?.includes('Fiche produit')) return;
    const records = photos.get(activeId) || [];
    const section = document.createElement('section');
    section.className = 'catalog-photo-gallery';
    const heading = document.createElement('h3'); heading.textContent = `Photo du produit${records.length ? ` (${records.length})` : ''}`;
    const status = document.createElement('p'); status.className = 'catalog-photo-status';
    if (activeId) {
      const label = document.createElement('label'); label.className = 'catalog-photo-upload';
      label.textContent = '📷 Ajouter une photo à cette fiche';
      const input = document.createElement('input'); input.type = 'file';
      input.accept = 'image/*'; input.setAttribute('capture', 'environment');
      input.onchange = async () => {
        const file = input.files?.[0]; if (!file) return;
        try {
          status.textContent = 'Enregistrement de la photo…';
          const blob = await compress(file);
          const id = crypto.randomUUID();
          await savePhoto({ id, productId: activeId, title: '', notes: '', blob, created: Date.now() });
          window.dispatchEvent(new CustomEvent('cave-photo-changed', { detail: { id } }));
          status.textContent = 'Photo enregistrée et liée à cette fiche.';
          await reload();
        } catch (error) { status.textContent = `Photo non enregistrée : ${error.message}`; }
      };
      label.append(input); section.append(label);
    } else status.textContent = 'Enregistre d’abord le nouveau produit, puis rouvre sa fiche pour ajouter une photo.';
    const grid = document.createElement('div'); grid.className = 'catalog-photo-grid';
    for (const record of records) {
      const image = document.createElement('img'); image.src = url(record);
      image.alt = record.title || 'Photo du produit'; image.loading = 'lazy';
      const link = document.createElement('a'); link.href = './photos.html';
      link.title = `Voir ou modifier ${record.title || 'cette photo'}`;
      link.append(image); grid.append(link);
    }
    section.prepend(heading); section.append(status, grid); form.prepend(section);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('.product-link');
    if (link) { activeId = productId(link.closest('.product-title')); schedule(); }
    else if (event.target.closest?.('button')?.textContent?.includes('Nouveau produit')) activeId = null;
  }, true);
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; render(); });
  }
  // Radix renders product dialogs in a portal under body, outside #root.
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('pageshow', reload);
  window.addEventListener('cave-photos-synced', reload);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reload(); });
  reload();
})();
