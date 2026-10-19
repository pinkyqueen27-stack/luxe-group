// 雲端模式:資料存在 Firebase Firestore,所有團員與主召共用同一份資料。
//
// Firestore 結構:
//   meta/groupBuy       團購活動設定(單一文件)
//   meta/announcement   最終確認公告(單一文件,沒有公告時不存在)
//   products/{id}       商品
//   members/{id}        團員
//   orders/{團購ID__團員ID}   訂單(每位團員一張,只有本人與主召會寫入)
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';
import type { Announcement, AppData, GroupBuy, Member, Order, Product } from '../types';
import type { Repo, Unsubscribe } from './repo';

/** 把 Firebase 的英文錯誤轉成看得懂的繁體中文說明 */
export function describeFirebaseError(e: unknown): Error {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code.includes('permission-denied')) {
    return new Error('沒有權限讀寫雲端資料庫:請確認已發布 Firestore 規則(firestore.rules)並啟用「匿名登入」。');
  }
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
    return new Error('尚未在 Firebase 啟用「匿名登入」:請到 Authentication → Sign-in method 啟用 Anonymous。');
  }
  if (code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' || code === 'auth/invalid-api-key') {
    return new Error('Firebase API Key 無效,請檢查 GitHub 的 Actions 變數設定。');
  }
  if (code.includes('unavailable')) return new Error('目前連不上雲端資料庫,請檢查網路連線。');
  return e instanceof Error ? e : new Error(String(e));
}

type Op = (batch: WriteBatch) => void;

const byOrder = <T extends { sortOrder: number }>(a: T, b: T): number => a.sortOrder - b.sortOrder;

export class FirebaseRepo implements Repo {
  readonly kind = 'cloud' as const;
  private db: Firestore;
  private ready: Promise<void>;

  constructor(config: FirebaseOptions) {
    const app = initializeApp(config);
    this.db = getFirestore(app);
    // 匿名登入:團員不需要帳號,但 Firestore 規則只允許「已登入(含匿名)」的使用者讀寫。
    // 這不能證明「你是誰」,只是擋掉沒有經過本網站的隨意存取。
    this.ready = signInAnonymously(getAuth(app)).then(() => undefined);
  }

  subscribe(onData: (data: AppData) => void, onError: (error: Error) => void): Unsubscribe {
    let cancelled = false;
    const unsubscribers: Unsubscribe[] = [];
    const state: AppData = { groupBuy: null, products: [], members: [], orders: [], announcement: null };
    const loaded = new Set<string>();
    const emit = (key: string) => {
      loaded.add(key);
      // 五個來源都至少載入一次後才通知畫面,避免畫面先閃過「空資料」
      if (loaded.size === 5 && !cancelled) onData({ ...state });
    };
    const fail = (e: unknown) => {
      if (!cancelled) onError(describeFirebaseError(e));
    };

    this.ready
      .then(() => {
        if (cancelled) return;
        const { db } = this;
        unsubscribers.push(
          onSnapshot(doc(db, 'meta', 'groupBuy'), (snap) => {
            state.groupBuy = snap.exists() ? (snap.data() as GroupBuy) : null;
            emit('groupBuy');
          }, fail),
          onSnapshot(doc(db, 'meta', 'announcement'), (snap) => {
            state.announcement = snap.exists() ? (snap.data() as Announcement) : null;
            emit('announcement');
          }, fail),
          onSnapshot(collection(db, 'products'), (snap) => {
            state.products = snap.docs.map((d) => d.data() as Product).sort(byOrder);
            emit('products');
          }, fail),
          onSnapshot(collection(db, 'members'), (snap) => {
            state.members = snap.docs
              .map((d) => d.data() as Member)
              .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
            emit('members');
          }, fail),
          onSnapshot(collection(db, 'orders'), (snap) => {
            state.orders = snap.docs.map((d) => d.data() as Order);
            emit('orders');
          }, fail),
        );
      })
      .catch(fail);

    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u());
    };
  }

  private async write(action: () => Promise<void>): Promise<void> {
    try {
      await this.ready;
      await action();
    } catch (e) {
      throw describeFirebaseError(e);
    }
  }

  saveOrder(order: Order): Promise<void> {
    return this.write(() => setDoc(doc(this.db, 'orders', order.id), order));
  }

  saveGroupBuy(groupBuy: GroupBuy): Promise<void> {
    return this.write(() => setDoc(doc(this.db, 'meta', 'groupBuy'), groupBuy));
  }

  saveProduct(product: Product): Promise<void> {
    return this.write(() => setDoc(doc(this.db, 'products', product.id), product));
  }

  deleteProduct(productId: string): Promise<void> {
    return this.write(() => deleteDoc(doc(this.db, 'products', productId)));
  }

  publishAnnouncement(announcement: Announcement): Promise<void> {
    return this.write(() => setDoc(doc(this.db, 'meta', 'announcement'), announcement));
  }

  clearAnnouncement(): Promise<void> {
    return this.write(() => deleteDoc(doc(this.db, 'meta', 'announcement')));
  }

  resetToSeed(seed: AppData): Promise<void> {
    return this.write(async () => {
      const { db } = this;
      const ops: Op[] = [];
      // 先刪除所有舊的訂單、商品、團員
      for (const name of ['orders', 'products', 'members']) {
        const snap = await getDocs(collection(db, name));
        snap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
      }
      // 再寫入示範資料
      if (seed.groupBuy) {
        const groupBuy = seed.groupBuy;
        ops.push((b) => b.set(doc(db, 'meta', 'groupBuy'), groupBuy));
      }
      ops.push((b) => b.delete(doc(db, 'meta', 'announcement')));
      seed.products.forEach((p) => ops.push((b) => b.set(doc(db, 'products', p.id), p)));
      seed.members.forEach((m) => ops.push((b) => b.set(doc(db, 'members', m.id), m)));
      seed.orders.forEach((o) => ops.push((b) => b.set(doc(db, 'orders', o.id), o)));

      // Firestore 每個 batch 最多 500 筆操作,這裡每 400 筆送出一次
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => op(batch));
        await batch.commit();
      }
    });
  }
}
