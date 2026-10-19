// 訂單狀態轉換:draft(編輯中)→ confirmed(已最終確認)→(主召解鎖)→ draft;
// 任何有效狀態都可由主召取消(cancelled),取消後可恢復成 draft。
// 這些都是「純函式」:不修改傳入的訂單,回傳新的訂單物件,方便測試。
import type { Order } from '../types';
import { normalizeItems } from './calc';

export class OrderTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderTransitionError';
  }
}

export const makeOrderId = (groupBuyId: string, memberId: string): string => `${groupBuyId}__${memberId}`;

export function createDraftOrder(groupBuyId: string, memberId: string, now: Date): Order {
  const iso = now.toISOString();
  return {
    id: makeOrderId(groupBuyId, memberId),
    groupBuyId,
    memberId,
    items: [],
    status: 'draft',
    createdAt: iso,
    updatedAt: iso,
    confirmedAt: null,
    reopenedAt: null,
  };
}

/** 設定某商品的數量(0 = 移除)。只有「編輯中」的訂單可以修改。 */
export function setItemQuantity(order: Order, productId: string, quantity: number, now: Date): Order {
  if (order.status === 'confirmed') throw new OrderTransitionError('訂單已最終確認,無法直接修改,請聯繫主召解鎖');
  if (order.status === 'cancelled') throw new OrderTransitionError('訂單已被取消,無法修改');
  const items = normalizeItems(order.items).filter((i) => i.productId !== productId);
  if (quantity > 0) items.push({ productId, quantity: Math.floor(quantity) });
  return { ...order, items, updatedAt: now.toISOString() };
}

export function confirmOrder(order: Order, now: Date): Order {
  if (order.status === 'confirmed') throw new OrderTransitionError('這張訂單已經最終確認過了');
  if (order.status === 'cancelled') throw new OrderTransitionError('已取消的訂單無法確認');
  if (normalizeItems(order.items).length === 0) throw new OrderTransitionError('購物清單是空的,請先選購商品');
  const iso = now.toISOString();
  return { ...order, items: normalizeItems(order.items), status: 'confirmed', confirmedAt: iso, updatedAt: iso };
}

/** 主召解鎖:已確認 → 編輯中,保留解鎖時間 */
export function reopenOrder(order: Order, now: Date): Order {
  if (order.status !== 'confirmed') throw new OrderTransitionError('只有「已最終確認」的訂單才能解鎖');
  const iso = now.toISOString();
  return { ...order, status: 'draft', confirmedAt: null, reopenedAt: iso, updatedAt: iso };
}

export function cancelOrder(order: Order, now: Date): Order {
  if (order.status === 'cancelled') throw new OrderTransitionError('這張訂單已經是取消狀態');
  return { ...order, status: 'cancelled', updatedAt: now.toISOString() };
}

export function restoreOrder(order: Order, now: Date): Order {
  if (order.status !== 'cancelled') throw new OrderTransitionError('只有已取消的訂單才能恢復');
  return { ...order, status: 'draft', confirmedAt: null, updatedAt: now.toISOString() };
}
