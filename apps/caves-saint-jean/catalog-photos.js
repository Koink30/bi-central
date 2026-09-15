/* Photo display for the existing catalogue. Photos remain in local IndexedDB. */
(() => {
  const DB = 'caves-saint-jean-photos', STORE = 'photos';
  let photos = new Map(), activeId = null, scheduled = false;
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
    const dialogTitle = document.querySelector('.cave-dialog [role="heading"], .cave-dialog h2');
    if (!dialogTitle?.textContent?.includes('Fiche produit')) return;
    const records = photos.get(activeId);
    if (!records?.length) return;
    const section = document.createElement('section');
    section.className = 'catalog-photo-gallery';
    const heading = document.createElement('h3'); heading.textContent = `Photos du produit (${records.length})`;
    const grid = document.createElement('div'); grid.className = 'catalog-photo-grid';
    for (const record of records) {
      const image = document.createElement('img'); image.src = url(record);
      image.alt = record.title || 'Photo du produit'; image.loading = 'lazy';
      const link = document.createElement('a'); link.href = './photos.html';
      link.title = `Voir ou modifier ${record.title || 'cette photo'}`;
      link.append(image); grid.append(link);
    }
    section.append(heading, grid); form.prepend(section);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('.product-link');
    if (link) { activeId = productId(link.closest('.product-title')); schedule(); }
  }, true);
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; render(); });
  }
  new MutationObserver(schedule).observe(document.getElementById('root'), { childList: true, subtree: true });
  window.addEventListener('pageshow', reload);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reload(); });
  reload();
})();
