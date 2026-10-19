import { describe, expect, it } from 'vitest';
import {
  calcGroupProgress,
  calcOrderTotals,
  computeProductStats,
  getOrderingState,
  latestOrderPerMember,
  normalizeItems,
  orderStatusLabel,
  summarizeMembers,
  sumByProduct,
} from './calc';
import { makeOrder, makeProduct, MEMBERS } from '../test/fixtures';

describe('calcGroupProgress(每團 5 盒)', () => {
  it('0 盒:尚未開始', () => {
    const p = calcGroupProgress(0, 5);
    expect(p.status).toBe('idle');
    expect(p.label).toBe('尚未開始');
    expect(p.shortfall).toBe(5);
  });

  it('4 盒:尚未成團,還差 1 盒', () => {
    const p = calcGroupProgress(4, 5);
    expect(p.status).toBe('partial');
    expect(p.label).toBe('尚未成團');
    expect(p.groups).toBe(0);
    expect(p.shortfall).toBe(1);
  });

  it('5 盒:第 1 團已成團,餘數 0 時下一團差額為完整一團(5),不是 0', () => {
    const p = calcGroupProgress(5, 5);
    expect(p.status).toBe('formed');
    expect(p.label).toBe('第 1 團已成團');
    expect(p.remainder).toBe(0);
    expect(p.shortfall).toBe(5);
  });

  it('7 盒:第 1 團已成團,未成團數 2,下一團還差 3', () => {
    const p = calcGroupProgress(7, 5);
    expect(p.groups).toBe(1);
    expect(p.remainder).toBe(2);
    expect(p.shortfall).toBe(3);
  });

  it('10 盒:第 2 團已成團', () => {
    expect(calcGroupProgress(10, 5).label).toBe('第 2 團已成團');
  });

  it('15 盒:第 3 團已成團,並可繼續累計第 4 團', () => {
    const p = calcGroupProgress(15, 5);
    expect(p.label).toBe('第 3 團已成團');
    expect(p.groups).toBe(3);
    expect(p.shortfall).toBe(5);
  });

  it('不合理的門檻或數量會被修正,不會產生 NaN 或除以 0', () => {
    const p = calcGroupProgress(-3, 0);
    expect(p.total).toBe(0);
    expect(p.groupSize).toBe(1);
  });
});

describe('normalizeItems', () => {
  it('合併重複商品、移除 0 與非法數量', () => {
    const items = normalizeItems([
      { productId: 'p1', quantity: 2 },
      { productId: 'p1', quantity: 3 },
      { productId: 'p2', quantity: 0 },
      { productId: 'p3', quantity: -1 },
      { productId: 'p4', quantity: Number.NaN },
    ]);
    expect(items).toEqual([{ productId: 'p1', quantity: 5 }]);
  });
});

describe('訂單小計與總額', () => {
  const products = [
    makeProduct({ id: 'p1', price: 100, sortOrder: 2 }),
    makeProduct({ id: 'p2', name: 'B', price: 250, sortOrder: 1 }),
  ];

  it('小計 = 單價 × 數量,總額為各項加總,依商品排序', () => {
    const order = makeOrder({ items: [{ productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 2 }] });
    const totals = calcOrderTotals(order, products);
    expect(totals.kinds).toBe(2);
    expect(totals.quantity).toBe(5);
    expect(totals.amount).toBe(100 * 3 + 250 * 2);
    expect(totals.lines[0].product.id).toBe('p2');
  });

  it('重複商品不會重複加總;空訂單為 0', () => {
    const dup = makeOrder({ items: [{ productId: 'p1', quantity: 1 }, { productId: 'p1', quantity: 1 }] });
    expect(calcOrderTotals(dup, products).amount).toBe(200);
    expect(calcOrderTotals(makeOrder(), products).amount).toBe(0);
    expect(calcOrderTotals(null, products).quantity).toBe(0);
  });
});

describe('商品彙總(不同團員、修改數量、取消訂單)', () => {
  const products = [makeProduct({ id: 'p1', price: 100, groupSize: 5 })];

  it('不同團員的數量分開記錄並正確加總', () => {
    const orders = [
      makeOrder({ memberId: 'm1', items: [{ productId: 'p1', quantity: 2 }] }),
      makeOrder({ memberId: 'm2', items: [{ productId: 'p1', quantity: 3 }] }),
    ];
    expect(computeProductStats(products, orders).get('p1')!.total).toBe(5);
    expect(sumByProduct(orders, 'm1').get('p1')).toBe(3);
    expect(computeProductStats(products, orders).get('p1')!.progress.label).toBe('第 1 團已成團');
  });

  it('修改數量後彙總同步更新(4 → 5 → 10 → 15)', () => {
    const labels = [4, 5, 10, 15].map((qty) => {
      const orders = [makeOrder({ items: [{ productId: 'p1', quantity: qty }] })];
      return computeProductStats(products, orders).get('p1')!.progress.label;
    });
    expect(labels).toEqual(['尚未成團', '第 1 團已成團', '第 2 團已成團', '第 3 團已成團']);
  });

  it('已取消的訂單不計入數量與金額', () => {
    const orders = [
      makeOrder({ memberId: 'm1', items: [{ productId: 'p1', quantity: 5 }], status: 'cancelled' }),
      makeOrder({ memberId: 'm2', items: [{ productId: 'p1', quantity: 2 }], status: 'confirmed' }),
    ];
    const stat = computeProductStats(products, orders).get('p1')!;
    expect(stat.total).toBe(2);
    expect(stat.amount).toBe(200);
  });

  it('同一位團員有多張訂單時,只取最新一張,不重複加總', () => {
    const orders = [
      makeOrder({ id: 'old', memberId: 'm1', items: [{ productId: 'p1', quantity: 4 }], updatedAt: '2026-10-19T01:00:00.000Z' }),
      makeOrder({ id: 'new', memberId: 'm1', items: [{ productId: 'p1', quantity: 1 }], updatedAt: '2026-10-19T02:00:00.000Z' }),
    ];
    expect(latestOrderPerMember(orders).get('m1')!.id).toBe('new');
    expect(computeProductStats(products, orders).get('p1')!.total).toBe(1);
  });
});

describe('團員彙總與狀態文字', () => {
  const products = [makeProduct({ id: 'p1', price: 100 })];

  it('區分已確認、編輯中、空訂單、取消、未訂購', () => {
    const orders = [
      makeOrder({ memberId: 'm1', items: [{ productId: 'p1', quantity: 2 }], status: 'confirmed' }),
      makeOrder({ memberId: 'm2', items: [{ productId: 'p1', quantity: 1 }], status: 'cancelled' }),
    ];
    const rows = summarizeMembers(MEMBERS, orders, products);
    expect(rows.map((r) => r.statusLabel)).toEqual(['已最終確認', '已取消', '未訂購']);
    expect(rows.map((r) => r.totals.amount)).toEqual([200, 0, 0]);
  });

  it('orderStatusLabel', () => {
    expect(orderStatusLabel(null)).toBe('未訂購');
    expect(orderStatusLabel(makeOrder())).toBe('未訂購');
    expect(orderStatusLabel(makeOrder({ items: [{ productId: 'p1', quantity: 1 }] }))).toBe('編輯中(尚未確認)');
  });
});

describe('getOrderingState', () => {
  const group = {
    id: 'g1', name: 'x', description: '', deadline: '2026-10-20T00:00:00.000Z',
    status: 'open' as const, updatedAt: '2026-10-19T00:00:00.000Z',
  };

  it('開放訂購且未截止才可訂購', () => {
    expect(getOrderingState(group, new Date('2026-10-19T12:00:00.000Z')).open).toBe(true);
  });

  it('超過截止時間、停止訂購、準備中、已結單都不可訂購', () => {
    expect(getOrderingState(group, new Date('2026-10-21T00:00:00.000Z')).open).toBe(false);
    expect(getOrderingState({ ...group, status: 'closed' }, new Date('2026-10-19T00:00:00.000Z')).open).toBe(false);
    expect(getOrderingState({ ...group, status: 'preparing' }, new Date('2026-10-19T00:00:00.000Z')).open).toBe(false);
    expect(getOrderingState({ ...group, status: 'finished' }, new Date('2026-10-19T00:00:00.000Z')).open).toBe(false);
    expect(getOrderingState(null, new Date()).open).toBe(false);
  });
});
