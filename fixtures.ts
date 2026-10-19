// 測試用的資料工廠(不會被正式網頁使用)
import type { Member, Order, Product } from '../types';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    groupBuyId: 'g1',
    name: 'A 商品',
    spec: '每盒 6 入',
    category: '測試',
    unit: '盒',
    price: 100,
    groupSize: 5,
    minQty: 1,
    perPersonLimit: null,
    totalLimit: null,
    description: '',
    imageUrl: '',
    active: true,
    sortOrder: 1,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  const memberId = overrides.memberId ?? 'm1';
  return {
    id: `g1__${memberId}`,
    groupBuyId: 'g1',
    memberId,
    items: [],
    status: 'draft',
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
    confirmedAt: null,
    reopenedAt: null,
    ...overrides,
  };
}

export const MEMBERS: Member[] = [
  { id: 'm1', name: '王小美' },
  { id: 'm2', name: '林佳佳' },
  { id: 'm3', name: '陳怡君' },
];
