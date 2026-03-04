const DB_NAME    = 'dt-images';
const DB_VERSION = 1;
const STORE      = 'images';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Get a stored image by key. Returns the data-URL string, or null if not found. */
export async function imgGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch { return null; }
}

/** Store a data-URL under key. Overwrites existing value. */
export async function imgSet(key, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(dataUrl, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Delete a stored image by key. No-op if key doesn't exist. */
export async function imgDelete(key) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch { /* ignore */ }
}

/** Return all stored keys. */
export async function imgKeys() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror   = () => reject(req.error);
    });
  } catch { return []; }
}

/**
 * Remove any game-* keys that are no longer referenced.
 * Call after games array changes (delete or import).
 */
export async function imgPurgeOrphans(liveGameIds) {
  const live = new Set(liveGameIds.map((id) => `game-${id}`));
  live.add('app-bg');
  const keys = await imgKeys();
  await Promise.all(keys.filter((k) => !live.has(k)).map(imgDelete));
}
