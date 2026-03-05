const DB_NAME = "dt-images";
const DB_VERSION = 1;
const STORE = "images";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
async function imgGet(key) {
  try {
    const db = await openDB();
    const raw = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return { dataUrl: raw, opacity: 1 };
    }
  } catch {
    return null;
  }
}
async function imgSet(key, dataUrl, opacity = 1) {
  const db = await openDB();
  const value = JSON.stringify({ dataUrl, opacity });
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
async function imgDelete(key) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
  }
}
async function imgKeys() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}
async function imgPurgeOrphans(liveGameIds) {
  const live = new Set(liveGameIds.map((id) => `game-${id}`));
  live.add("app-bg");
  const keys = await imgKeys();
  await Promise.all(keys.filter((k) => !live.has(k)).map(imgDelete));
}
export {
  imgDelete,
  imgGet,
  imgKeys,
  imgPurgeOrphans,
  imgSet
};
