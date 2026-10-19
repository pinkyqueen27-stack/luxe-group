// 所有「成團、小計、總額、彙總」的計算都集中在這個檔案,
// 前台、後台、Excel 匯出共用同一套邏輯,避免各處算出不同的數字。
import type { GroupBuy, Member, Order, OrderItem, Product } from '../types';

/* ───────────── 成團進度 ───────────── */

export interface GroupProgress {
  total: number;
  groupSize: number;
  /** 已成團數 = floor(總數量 / 每團門檻) */
  groups: number;
  /** 未成團數量 = 總數量 % 每團門檻 */
  remainder: number;
  /** 下一團差額 = 每團門檻 - 未成團數量(餘數為 0 時是「完整的一團」,不是 0) */
  shortfall: number;
  status: 'idle' | 'partial' | 'formed';
  label: string;
}

export function calcGroupProgress(total: number, groupSize: number): GroupProgress {
  const size = Math.max(1, Math.floor(groupSize) || 1);
  const t = Math.max(0, Math.floor(total) || 0);
  const groups = Math.floor(t / size);
  const remainder = t % size;
  const shortfall = size - remainder;
  let status: GroupProgress['status'];
  let label: string;
  if (t === 0) {
    status = 'idle';
    label = '尚未開始';
  } else if (groups === 0) {
    status = 'partial';
    label = '尚未成團';
  } else {
    status = 'formed';
    label = `第 ${groups} 團已成團`;
  }
  return { total: t, groupSize: size, groups, remainder, shortfall, status, label };
}

/* ───────────── 訂單明細 ───────────── */

/** 合併重複商品、移除數量不合法或為 0 的項目,避免重複加總 */
export function normalizeItems(items: OrderItem[] | null | undefined): OrderItem[] {
  const merged = new Map<string, number>();
  for (const item of items ?? []) {
    if (!item || typeof item.productId !== 'string') continue;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export function lineSubtotal(price: number, quantity: number): number {
  return price * quantity;
}

export interface OrderLine {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface OrderTotals {
  lines: OrderLine[];
  /** 商品種類數 */
  kinds: number;
  /** 總件數 */
  quantity: number;
  /** 訂單總金額 */
  amount: number;
}

export const EMPTY_TOTALS: OrderTotals = { lines: [], kinds: 0, quantity: 0, amount: 0 };

/** 計算一張訂單的明細與總額(找不到商品的項目會被略過) */
export function calcOrderTotals(order: Order | null | undefined, products: Product[]): OrderTotals {
  if (!order) return EMPTY_TOTALS;
  const byId = new Map(products.map((p) => [p.id, p] as const));
  const lines: OrderLine[] = [];
  for (const item of normalizeItems(order.items)) {
    const product = byId.get(item.productId);
    if (!product) continue;
    lines.push({ product, quantity: item.quantity, subtotal: lineSubtotal(product.price, item.quantity) });
  }
  lines.sort((a, b) => a.product.sortOrder - b.product.sortOrder);
  return {
    lines,
    kinds: lines.length,
    quantity: lines.reduce((s, l) => s + l.quantity, 0),
    amount: lines.reduce((s, l) => s + l.subtotal, 0),
  };
}

/** 已取消的訂單在任何彙總中都視為 0 */
export function effectiveTotals(order: Order | null | undefined, products: Product[]): OrderTotals {
  if (!order || order.status === 'cancelled') return EMPTY_TOTALS;
  return calcOrderTotals(order, products);
}

export function orderStatusLabel(order: Order | null | undefined): string {
  if (!order) return '未訂購';
  if (order.status === 'cancelled') return '已取消';
  if (order.status === 'confirmed') return '已最終確認';
  return normalizeItems(order.items).length === 0 ? '未訂購' : '編輯中(尚未確認)';
}

/* ───────────── 彙總 ───────────── */

/** 每位團員只取最新的一張訂單(以 updatedAt 為準),避免同一人重複計算 */
export function latestOrderPerMember(orders: Order[]): Map<string, Order> {
  const latest = new Map<string, Order>();
  for (const order of orders) {
    const current = latest.get(order.memberId);
    if (!current || order.updatedAt > current.updatedAt) latest.set(order.memberId, order);
  }
  return latest;
}

/** 各商品目前的訂購總數(不含已取消訂單),可排除某位團員 */
export function sumByProduct(orders: Order[], excludeMemberId?: string | null): Map<string, number> {
  const totals = new Map<string, number>();
  for (const order of latestOrderPerMember(orders).values()) {
    if (order.status === 'cancelled') continue;
    if (excludeMemberId && order.memberId === excludeMemberId) continue;
    for (const item of normalizeItems(order.items)) {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }
  }
  return totals;
}

export interface ProductStat {
  product: Product;
  total: number;
  amount: number;
  progress: GroupProgress;
}

export function computeProductStats(products: Product[], orders: Order[]): Map<string, ProductStat> {
  const totals = sumByProduct(orders);
  const stats = new Map<string, ProductStat>();
  for (const product of products) {
    const total = totals.get(product.id) ?? 0;
    stats.set(product.id, {
      product,
      total,
      amount: total * product.price,
      progress: calcGroupProgress(total, product.groupSize),
    });
  }
  return stats;
}

export interface MemberRow {
  member: Member;
  order: Order | null;
  totals: OrderTotals;
  statusLabel: string;
}

export function summarizeMembers(members: Member[], orders: Order[], products: Product[]): MemberRow[] {
  const latest = latestOrderPerMember(orders);
  return members.map((member) => {
    const order = latest.get(member.id) ?? null;
    return { member, order, totals: effectiveTotals(order, products), statusLabel: orderStatusLabel(order) };
  });
}

/* ───────────── 活動狀態 ───────────── */

export interface OrderingState {
  open: boolean;
  reason: string | null;
}

export function getOrderingState(groupBuy: GroupBuy | null, now: Date): OrderingState {
  if (!groupBuy) return { open: false, reason: '團購活動尚未建立' };
  if (groupBuy.status === 'preparing') return { open: false, reason: '活動準備中,尚未開放訂購' };
  if (groupBuy.status === 'closed') return { open: false, reason: '主召已停止訂購' };
  if (groupBuy.status === 'finished') return { open: false, reason: '本次團購已結單' };
  const deadline = new Date(groupBuy.deadline).getTime();
  if (!Number.isNaN(deadline) && now.getTime() >= deadline) {
    return { open: false, reason: '已超過截止時間,無法再修改訂單' };
  }
  return { open: true, reason: null };
}

export const GROUP_STATUS_LABEL: Record<GroupBuy['status'], string> = {
  preparing: '準備中',
  open: '開放訂購',
  closed: '停止訂購',
  finished: '已結單',
};
