// boss-model-store.js — locally persists uploaded boss model files (.glb/.gltf).
// localStorage only holds ~5 MB of strings, so a real model file cannot be saved
// there and was silently dropped: the admin form said "uploaded" but the battle
// arena fell back to the 2D sprite. Files are stored in IndexedDB instead and a
// short reference (idb-model:<id>) is kept in the boss record.

const DB_NAME = 'tc_boss_models';
const STORE = 'files';
const PREFIX = 'idb-model:';

export const isLocalModelRef = ref => typeof ref === 'string' && ref.startsWith(PREFIX);

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับ IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('เปิดที่จัดเก็บโมเดลไม่สำเร็จ'));
  });
}

/** Store a model file locally and return a short reference safe for localStorage. */
export async function saveBossModelFile(file) {
  const db = await openDb();
  const id = `boss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put({ id, blob: file, name: file.name, type: file.type });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error || new Error('บันทึกไฟล์โมเดลไม่สำเร็จ'));
      t.onabort = () => reject(t.error || new Error('บันทึกไฟล์โมเดลไม่สำเร็จ'));
    });
  } finally {
    db.close();
  }
  return `${PREFIX}${id}`;
}

/**
 * Turn a local model reference into an object URL for <model-viewer>.
 * Plain http(s)/data URLs are returned unchanged.
 */
export async function resolveBossModelUrl(ref) {
  if (!isLocalModelRef(ref)) return ref || '';
  const db = await openDb();
  let record = null;
  try {
    record = await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).get(ref.slice(PREFIX.length));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
  if (!record?.blob) return '';
  return URL.createObjectURL(record.blob);
}
