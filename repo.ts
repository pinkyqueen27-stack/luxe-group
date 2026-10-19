import type { Announcement, AppData, GroupBuy, Order, Product } from '../types';

export type Unsubscribe = () => void;

/**
 * 資料存取介面。畫面只認這個介面,不關心資料實際存在哪裡:
 * - LocalRepo:存在這個瀏覽器的 localStorage(本機測試模式)
 * - FirebaseRepo:存在 Firebase Firestore(所有團員共用)
 */
export interface Repo {
  readonly kind: 'local' | 'cloud';
  /** 訂閱資料變更;訂閱後會立即(或載入完成後)回呼一次最新資料 */
  subscribe(onData: (data: AppData) => void, onError: (error: Error) => void): Unsubscribe;
  saveOrder(order: Order): Promise<void>;
  saveGroupBuy(groupBuy: GroupBuy): Promise<void>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
  publishAnnouncement(announcement: Announcement): Promise<void>;
  clearAnnouncement(): Promise<void>;
  /** 清除所有資料並寫入示範資料(重置 / 首次初始化) */
  resetToSeed(seed: AppData): Promise<void>;
}

export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}
