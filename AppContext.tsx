// 全站共用狀態:資料訂閱、目前團員、成團統計,以及所有「會改資料」的動作。
// 畫面元件只呼叫這裡的函式,不直接碰儲存層,規則(限購、狀態轉換)也只在這裡與 lib/ 裡寫一次。
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Announcement, AppData, GroupBuy, Member, Order, Product } from '../types';
import type { Repo } from '../data/repo';
import { createRepo } from '../data/createRepo';
import { createSeedData } from '../data/seed';
import { getAdminPin } from '../data/config';
import {
  calcOrderTotals,
  computeProductStats,
  getOrderingState,
  latestOrderPerMember,
  sumByProduct,
  type OrderingState,
  type OrderTotals,
  type ProductStat,
} from '../lib/calc';
import {
  cancelOrder,
  confirmOrder,
  createDraftOrder,
  reopenOrder,
  restoreOrder,
  setItemQuantity,
} from '../lib/orderState';
import { getQuantityLimits, validateOrderLimits, validateQuantity, type QuantityCheck } from '../lib/quantity';
import { getBrowserStorage } from '../lib/safeStorage';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface AppCtx {
  data: AppData;
  loaded: boolean;
  error: string | null;
  repoKind: 'local' | 'cloud' | null;
  now: Date;

  members: Member[];
  /** 所有商品(含下架) */
  products: Product[];
  /** 前台顯示的商品(上架中) */
  activeProducts: Product[];
  stats: Map<string, ProductStat>;
  /** 排除我自己之後,各商品其他團員已訂的數量 */
  othersTotals: Map<string, number>;
  ordering: OrderingState;

  memberId: string | null;
  member: Member | null;
  selectMember: (id: string | null) => void;
  myOrder: Order | null;
  myTotals: OrderTotals;

  isAdmin: boolean;
  loginAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;

  toasts: ToastItem[];
  dismissToast: (id: number) => void;
  notify: (message: string, tone?: ToastItem['tone']) => void;

  // 團員動作
  setQuantity: (productId: string, quantity: number) => Promise<QuantityCheck>;
  confirmMyOrder: () => Promise<boolean>;

  // 主召動作(Prototype 沒有真正的權限控管,見 README)
  saveGroupBuy: (groupBuy: GroupBuy) => Promise<boolean>;
  saveProduct: (product: Product) => Promise<boolean>;
  removeProduct: (productId: string) => Promise<boolean>;
  unlockOrder: (order: Order) => Promise<boolean>;
  cancelMemberOrder: (order: Order) => Promise<boolean>;
  restoreMemberOrder: (order: Order) => Promise<boolean>;
  publishNotice: (title: string, body: string) => Promise<boolean>;
  retractNotice: () => Promise<boolean>;
  resetData: () => Promise<boolean>;
}

const EMPTY_DATA: AppData = { groupBuy: null, products: [], members: [], orders: [], announcement: null };
const MEMBER_KEY = 'luxe-group:memberId';
const ADMIN_KEY = 'luxe-group:admin';

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp 必須在 AppProvider 裡面使用');
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(() => getBrowserStorage('local').getItem(MEMBER_KEY));
  const [isAdmin, setIsAdmin] = useState<boolean>(() => getBrowserStorage('session').getItem(ADMIN_KEY) === '1');
  const [now, setNow] = useState<Date>(() => new Date());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  // 建立資料儲存層(有設定 Firebase 用雲端,否則用本機)
  useEffect(() => {
    let alive = true;
    createRepo()
      .then((r) => {
        if (alive) setRepo(r);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '資料儲存層初始化失敗');
      });
    return () => {
      alive = false;
    };
  }, []);

  // 訂閱資料變更(雲端模式下,其他團員的修改會即時出現)
  useEffect(() => {
    if (!repo) return;
    return repo.subscribe(
      (next) => {
        setData(next);
        setLoaded(true);
        setError(null);
      },
      (e) => setError(e.message),
    );
  }, [repo]);

  // 每 30 秒更新一次「現在時間」,讓截止時間到了之後畫面自動鎖定
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const notify = (message: string, tone: ToastItem['tone'] = 'info') => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((list) => [...list, { id, message, tone }]);
  };
  const dismissToast = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  /* ───── 衍生資料 ───── */
  const products = useMemo(() => [...data.products].sort((a, b) => a.sortOrder - b.sortOrder), [data.products]);
  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const stats = useMemo(() => computeProductStats(products, data.orders), [products, data.orders]);
  const member = useMemo(() => data.members.find((m) => m.id === memberId) ?? null, [data.members, memberId]);
  const myOrder = useMemo(
    () => (member ? (latestOrderPerMember(data.orders).get(member.id) ?? null) : null),
    [data.orders, member],
  );
  const myTotals = useMemo(() => calcOrderTotals(myOrder, products), [myOrder, products]);
  const othersTotals = useMemo(() => sumByProduct(data.orders, member?.id ?? null), [data.orders, member]);
  const ordering = useMemo(() => getOrderingState(data.groupBuy, now), [data.groupBuy, now]);

  /* ───── 共用:執行動作並顯示結果訊息 ───── */
  const run = async (action: () => Promise<void>, successMessage?: string): Promise<boolean> => {
    try {
      if (!repo) throw new Error('資料尚未載入完成,請稍候再試');
      await action();
      if (successMessage) notify(successMessage, 'success');
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : '操作失敗,請稍後再試', 'error');
      return false;
    }
  };

  /* ───── 團員動作 ───── */
  const setQuantity = async (productId: string, quantity: number): Promise<QuantityCheck> => {
    if (!repo || !data.groupBuy) return { ok: false, error: '資料尚未載入完成,請稍候再試' };
    if (!member) return { ok: false, error: '請先在上方選擇團員身分' };
    if (!ordering.open) return { ok: false, error: ordering.reason ?? '目前無法訂購' };
    const product = data.products.find((p) => p.id === productId);
    if (!product) return { ok: false, error: '找不到這個商品,可能已被主召移除' };

    // 再驗證一次(不信任畫面傳來的數字)
    const check = validateQuantity(quantity, getQuantityLimits(product, othersTotals.get(productId) ?? 0));
    if (!check.ok) return check;
    if (!myOrder && check.value === 0) return check; // 沒有訂單又設為 0:不需要建立空訂單

    try {
      const base = myOrder ?? createDraftOrder(data.groupBuy.id, member.id, new Date());
      await repo.saveOrder(setItemQuantity(base, productId, check.value, new Date()));
      return check;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : '儲存失敗,請稍後再試' };
    }
  };

  const confirmMyOrder = async (): Promise<boolean> => {
    if (!myOrder) {
      notify('購物清單是空的,請先選購商品', 'error');
      return false;
    }
    if (!ordering.open) {
      notify(ordering.reason ?? '目前無法送出訂單', 'error');
      return false;
    }
    // 其他團員可能在這段期間訂走名額,送出前再檢查一次
    const problems = validateOrderLimits(myOrder, products, othersTotals);
    if (problems.length > 0) {
      notify(`無法送出:${problems.join(';')}`, 'error');
      return false;
    }
    return run(async () => {
      await repo!.saveOrder(confirmOrder(myOrder, new Date()));
    }, '訂單已最終確認');
  };

  /* ───── 主召動作 ───── */
  const saveGroupBuy = (groupBuy: GroupBuy) =>
    run(() => repo!.saveGroupBuy({ ...groupBuy, updatedAt: new Date().toISOString() }), '活動設定已儲存');

  const saveProduct = (product: Product) => run(() => repo!.saveProduct(product), `已儲存商品「${product.name}」`);

  const removeProduct = async (productId: string): Promise<boolean> => {
    const used = data.orders.some((o) => o.items.some((i) => i.productId === productId && i.quantity > 0));
    if (used) {
      notify('已有訂單包含這個商品,不能刪除。請改用「下架」,既有訂單與統計會保留。', 'error');
      return false;
    }
    return run(() => repo!.deleteProduct(productId), '商品已刪除');
  };

  const unlockOrder = (order: Order) =>
    run(() => repo!.saveOrder(reopenOrder(order, new Date())), '已解鎖,團員可以重新修改這張訂單');
  const cancelMemberOrder = (order: Order) =>
    run(() => repo!.saveOrder(cancelOrder(order, new Date())), '訂單已取消(不再計入統計)');
  const restoreMemberOrder = (order: Order) =>
    run(() => repo!.saveOrder(restoreOrder(order, new Date())), '訂單已恢復為編輯中');

  const publishNotice = async (title: string, body: string): Promise<boolean> => {
    if (!data.groupBuy) return false;
    const announcement: Announcement = {
      id: `ann-${Date.now()}`,
      groupBuyId: data.groupBuy.id,
      title: title.trim() || '最終確認通知',
      body: body.trim(),
      publishedAt: new Date().toISOString(),
    };
    return run(() => repo!.publishAnnouncement(announcement), '公告已發布,團員進入網站即可看到');
  };

  const retractNotice = () => run(() => repo!.clearAnnouncement(), '公告已撤回');

  const resetData = () =>
    run(async () => {
      await repo!.resetToSeed(createSeedData(new Date()));
    }, '已重置為示範資料');

  /* ───── 身分 ───── */
  const selectMember = (id: string | null) => {
    setMemberId(id);
    const storage = getBrowserStorage('local');
    if (id) storage.setItem(MEMBER_KEY, id);
    else storage.removeItem(MEMBER_KEY);
  };

  const loginAdmin = (pin: string): boolean => {
    if (pin.trim() !== getAdminPin()) return false;
    getBrowserStorage('session').setItem(ADMIN_KEY, '1');
    setIsAdmin(true);
    return true;
  };
  const logoutAdmin = () => {
    getBrowserStorage('session').removeItem(ADMIN_KEY);
    setIsAdmin(false);
  };

  const value: AppCtx = {
    data, loaded, error, repoKind: repo?.kind ?? null, now,
    members: data.members, products, activeProducts, stats, othersTotals, ordering,
    memberId, member, selectMember, myOrder, myTotals,
    isAdmin, loginAdmin, logoutAdmin,
    toasts, dismissToast, notify,
    setQuantity, confirmMyOrder,
    saveGroupBuy, saveProduct, removeProduct, unlockOrder, cancelMemberOrder, restoreMemberOrder,
    publishNotice, retractNotice, resetData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
