import { describe, expect, it } from 'vitest';
import { LOCAL_DATA_VERSION, LOCAL_STORAGE_KEY, LocalRepo } from './localRepo';
import { createSeedData } from './seed';
import { MemoryStorage } from '../lib/safeStorage';
import { createDraftOrder, setItemQuantity } from '../lib/orderState';
import type { AppData } from '../types';

const NOW = new Date('2026-10-19T04:00:00.000Z');

describe('LocalRepo(本機測試資料)', () => {
  it('第一次載入會建立示範資料(至少 5 項商品、5 位團員、沒有預先寫死的訂單)', () => {
    const repo = new LocalRepo(new MemoryStorage(), () => NOW);
    const data = repo.load();
    expect(data.products.length >= 5).toBe(true);
    expect(data.members.map((m) => m.name)).toEqual(['王小美', '林佳佳', '陳怡君', '張雅婷', '李佩珊']);
    expect(data.orders).toEqual([]);
    expect(data.groupBuy?.status).toBe('open');
    expect(data.announcement).toBeNull();
  });

  it('「重新整理網頁」(建立新的 repo 讀同一份儲存)後,已儲存的資料仍存在', async () => {
    const storage = new MemoryStorage();
    const first = new LocalRepo(storage, () => NOW);
    const order = setItemQuantity(createDraftOrder('gb-autumn-2026', 'm1', NOW), 'p-olive', 5, NOW);
    await first.saveOrder(order);
    await first.publishAnnouncement({
      id: 'a1', groupBuyId: 'gb-autumn-2026', title: '最終確認', body: '請核對', publishedAt: NOW.toISOString(),
    });

    const afterRefresh = new LocalRepo(storage, () => NOW).load();
    expect(afterRefresh.orders).toHaveLength(1);
    expect(afterRefresh.orders[0].items).toEqual([{ productId: 'p-olive', quantity: 5 }]);
    expect(afterRefresh.announcement?.title).toBe('最終確認');
  });

  it('同一張訂單重複儲存是更新,不會產生重複訂單', async () => {
    const repo = new LocalRepo(new MemoryStorage(), () => NOW);
    const base = createDraftOrder('gb-autumn-2026', 'm1', NOW);
    await repo.saveOrder(setItemQuantity(base, 'p-olive', 1, NOW));
    await repo.saveOrder(setItemQuantity(base, 'p-olive', 4, NOW));
    const orders = repo.load().orders;
    expect(orders).toHaveLength(1);
    expect(orders[0].items[0].quantity).toBe(4);
  });

  it('不同團員的訂單分開保存', async () => {
    const repo = new LocalRepo(new MemoryStorage(), () => NOW);
    await repo.saveOrder(setItemQuantity(createDraftOrder('gb-autumn-2026', 'm1', NOW), 'p-olive', 1, NOW));
    await repo.saveOrder(setItemQuantity(createDraftOrder('gb-autumn-2026', 'm2', NOW), 'p-olive', 2, NOW));
    const orders = repo.load().orders;
    expect(orders.map((o) => o.memberId).sort()).toEqual(['m1', 'm2']);
  });

  it('訂閱者會在資料變更時收到通知,取消訂閱後不再收到', async () => {
    const repo = new LocalRepo(new MemoryStorage(), () => NOW);
    const seen: AppData[] = [];
    const unsubscribe = repo.subscribe((d) => seen.push(d), () => undefined);
    expect(seen).toHaveLength(1); // 訂閱時立即收到一次
    await repo.saveOrder(setItemQuantity(createDraftOrder('gb-autumn-2026', 'm1', NOW), 'p-olive', 1, NOW));
    expect(seen).toHaveLength(2);
    expect(seen[1].orders).toHaveLength(1);
    unsubscribe();
    await repo.clearAnnouncement();
    expect(seen).toHaveLength(2);
  });

  it('資料版本不符或內容損毀時,自動重新初始化', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ version: LOCAL_DATA_VERSION + 1, data: {} }));
    expect(new LocalRepo(storage, () => NOW).load().products.length >= 5).toBe(true);

    storage.setItem(LOCAL_STORAGE_KEY, '{這不是 JSON');
    expect(new LocalRepo(storage, () => NOW).load().members).toHaveLength(5);
  });

  it('重置測試資料會清掉訂單與公告', async () => {
    const repo = new LocalRepo(new MemoryStorage(), () => NOW);
    await repo.saveOrder(setItemQuantity(createDraftOrder('gb-autumn-2026', 'm1', NOW), 'p-olive', 1, NOW));
    await repo.resetToSeed(createSeedData(NOW));
    expect(repo.load().orders).toEqual([]);
  });

  it('商品新增、修改、刪除', async () => {
    const repo = new LocalRepo(new MemoryStorage(), () => NOW);
    const [first] = repo.load().products;
    await repo.saveProduct({ ...first, price: 9999 });
    expect(repo.load().products.find((p) => p.id === first.id)?.price).toBe(9999);
    await repo.deleteProduct(first.id);
    expect(repo.load().products.some((p) => p.id === first.id)).toBe(false);
  });
});
