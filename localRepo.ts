// 本機測試模式:資料存在瀏覽器 localStorage。
// ⚠ 這只是「這台裝置、這個瀏覽器」的資料,不會自動同步給其他團員或其他裝置。
import type { Announcement, AppData, GroupBuy, Order, Product } from '../types';
import type { StorageLike } from '../lib/safeStorage';
import { toError, type Repo, type Unsubscribe } from './repo';
import { createSeedData } from './seed';

export const LOCAL_STORAGE_KEY = 'luxe-group:data';
/** 資料格式版本:日後資料結構改變時把這個數字加 1,舊的本機資料會自動重新初始化 */
export const LOCAL_DATA_VERSION = 1;

interface Envelope {
  version: number;
  data: AppData;
}

interface Listener {
  onData: (data: AppData) => void;
  onError: (error: Error) => void;
}

function isAppData(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return Array.isArray(d.products) && Array.isArray(d.members) && Array.isArray(d.orders) && 'groupBuy' in d && 'announcement' in d;
}

export class LocalRepo implements Repo {
  readonly kind = 'local' as const;
  private listeners = new Set<Listener>();

  constructor(
    private storage: StorageLike,
    private now: () => Date = () => new Date(),
    /** 傳入 window 後,其他分頁修改資料時本分頁也會即時更新 */
    private source?: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  ) {}

  /** 讀取資料;沒有資料、格式損毀或版本不符時,自動寫入示範資料 */
  load(): AppData {
    const raw = this.storage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const envelope = JSON.parse(raw) as Envelope;
        if (envelope && envelope.version === LOCAL_DATA_VERSION && isAppData(envelope.data)) return envelope.data;
      } catch {
        /* 資料損毀,往下重新初始化 */
      }
    }
    const seed = createSeedData(this.now());
    this.persist(seed);
    return seed;
  }

  private persist(data: AppData): void {
    const envelope: Envelope = { version: LOCAL_DATA_VERSION, data };
    this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(envelope));
  }

  private write(data: AppData): void {
    this.persist(data);
    for (const listener of this.listeners) {
      try {
        listener.onData(data);
      } catch (e) {
        listener.onError(toError(e));
      }
    }
  }

  subscribe(onData: (data: AppData) => void, onError: (error: Error) => void): Unsubscribe {
    const listener: Listener = { onData, onError };
    this.listeners.add(listener);
    const onStorage = () => {
      try {
        onData(this.load());
      } catch (e) {
        onError(toError(e));
      }
    };
    this.source?.addEventListener('storage', onStorage);
    try {
      onData(this.load());
    } catch (e) {
      onError(toError(e));
    }
    return () => {
      this.listeners.delete(listener);
      this.source?.removeEventListener('storage', onStorage);
    };
  }

  async saveOrder(order: Order): Promise<void> {
    const data = this.load();
    const index = data.orders.findIndex((o) => o.id === order.id);
    if (index >= 0) data.orders[index] = order;
    else data.orders.push(order);
    this.write(data);
  }

  async saveGroupBuy(groupBuy: GroupBuy): Promise<void> {
    this.write({ ...this.load(), groupBuy });
  }

  async saveProduct(product: Product): Promise<void> {
    const data = this.load();
    const index = data.products.findIndex((p) => p.id === product.id);
    if (index >= 0) data.products[index] = product;
    else data.products.push(product);
    this.write(data);
  }

  async deleteProduct(productId: string): Promise<void> {
    const data = this.load();
    this.write({ ...data, products: data.products.filter((p) => p.id !== productId) });
  }

  async publishAnnouncement(announcement: Announcement): Promise<void> {
    this.write({ ...this.load(), announcement });
  }

  async clearAnnouncement(): Promise<void> {
    this.write({ ...this.load(), announcement: null });
  }

  async resetToSeed(seed: AppData): Promise<void> {
    this.write(seed);
  }
}
