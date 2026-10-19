import { describe, expect, it } from 'vitest';
import {
  cancelOrder,
  confirmOrder,
  createDraftOrder,
  OrderTransitionError,
  reopenOrder,
  restoreOrder,
  setItemQuantity,
} from './orderState';

const t0 = new Date('2026-10-19T01:00:00.000Z');
const t1 = new Date('2026-10-19T02:00:00.000Z');
const t2 = new Date('2026-10-19T03:00:00.000Z');

describe('訂單狀態轉換', () => {
  it('建立訂單有唯一 ID、團員 ID、狀態與時間戳記', () => {
    const order = createDraftOrder('g1', 'm1', t0);
    expect(order.id).toBe('g1__m1');
    expect(order.memberId).toBe('m1');
    expect(order.status).toBe('draft');
    expect(order.createdAt).toBe(t0.toISOString());
    expect(order.confirmedAt).toBeNull();
  });

  it('設定數量會新增、更新、移除(0)商品,且不修改原物件', () => {
    const base = createDraftOrder('g1', 'm1', t0);
    const a = setItemQuantity(base, 'p1', 2, t1);
    expect(base.items).toEqual([]);
    expect(a.items).toEqual([{ productId: 'p1', quantity: 2 }]);
    const b = setItemQuantity(a, 'p1', 5, t1);
    expect(b.items).toEqual([{ productId: 'p1', quantity: 5 }]);
    const c = setItemQuantity(b, 'p1', 0, t1);
    expect(c.items).toEqual([]);
    expect(c.updatedAt).toBe(t1.toISOString());
  });

  it('空訂單不能最終確認', () => {
    expect(() => confirmOrder(createDraftOrder('g1', 'm1', t0), t1)).toThrow('購物清單是空的');
  });

  it('最終確認:狀態變為 confirmed 並保存確認時間', () => {
    const order = setItemQuantity(createDraftOrder('g1', 'm1', t0), 'p1', 3, t0);
    const confirmed = confirmOrder(order, t1);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.confirmedAt).toBe(t1.toISOString());
  });

  it('已確認的訂單不可直接覆寫(修改數量或重複確認都會拋出錯誤)', () => {
    const order = setItemQuantity(createDraftOrder('g1', 'm1', t0), 'p1', 3, t0);
    const confirmed = confirmOrder(order, t1);
    expect(() => setItemQuantity(confirmed, 'p1', 9, t2)).toThrow(OrderTransitionError);
    expect(() => confirmOrder(confirmed, t2)).toThrow('已經最終確認');
  });

  it('主召解鎖後可重新編輯,並記錄解鎖時間', () => {
    const order = setItemQuantity(createDraftOrder('g1', 'm1', t0), 'p1', 3, t0);
    const reopened = reopenOrder(confirmOrder(order, t1), t2);
    expect(reopened.status).toBe('draft');
    expect(reopened.confirmedAt).toBeNull();
    expect(reopened.reopenedAt).toBe(t2.toISOString());
    expect(setItemQuantity(reopened, 'p1', 1, t2).items).toEqual([{ productId: 'p1', quantity: 1 }]);
  });

  it('只有已確認的訂單才能解鎖', () => {
    expect(() => reopenOrder(createDraftOrder('g1', 'm1', t0), t1)).toThrow('只有「已最終確認」');
  });

  it('取消與恢復', () => {
    const order = setItemQuantity(createDraftOrder('g1', 'm1', t0), 'p1', 3, t0);
    const cancelled = cancelOrder(order, t1);
    expect(cancelled.status).toBe('cancelled');
    expect(() => setItemQuantity(cancelled, 'p1', 1, t2)).toThrow('已被取消');
    expect(() => cancelOrder(cancelled, t2)).toThrow('已經是取消狀態');
    expect(restoreOrder(cancelled, t2).status).toBe('draft');
    expect(() => restoreOrder(order, t2)).toThrow('只有已取消');
  });
});
