import type { ImageEntry } from '../types';

const DB_NAME    = 'dt-images';
const DB_VERSION = 1;
const STORE      = 'images';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Get stored image by key. Returns {dataUrl, opacity} or null. */
export async function imgGet(key: string): Promise<ImageEntry | null> {
  try {
    const db = await openDB();
    const raw = await new Promise<string | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror   = () => reject(req.error);
    });
    if (!raw) return null;
    try { return JSON.parse(raw) as ImageEntry; }
    catch { return { dataUrl: raw, opacity: 1 }; }
  } catch { return null; }
}

/** Store a data-URL + opacity under key as JSON. */
export async function imgSet(key: string, dataUrl: string, opacity = 1): Promise<void> {
  const db = await openDB();
  const value = JSON.stringify({ dataUrl, opacity });
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Delete a stored image by key. No-op if key doesn't exist. */
export async function imgDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch { /* ignore */ }
}

/** Return all stored keys. */
export async function imgKeys(): Promise<IDBValidKey[]> {
  try {
    const db = await openDB();
    return await new Promise<IDBValidKey[]>((resolve, reject) => {
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
export async function imgPurgeOrphans(liveGameIds: string[]): Promise<void> {
  const live = new Set(liveGameIds.map((id) => `game-${id}`));
  live.add('app-bg');
  const keys = await imgKeys();
  await Promise.all(
    keys.filter((k) => !live.has(k as string)).map((k) => imgDelete(k as string))
  );
}
