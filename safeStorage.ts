export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 記憶體儲存:瀏覽器禁用 localStorage(例如某些隱私模式)時的備援,也用於單元測試 */
export class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

export function getBrowserStorage(kind: 'local' | 'session'): StorageLike {
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__luxe_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return new MemoryStorage();
  }
}
