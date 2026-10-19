// 示範資料。只用於「初始化 / 重置測試資料」,不含任何訂單:所有訂單與統計都來自使用者實際操作。
import type { AppData, Product } from '../types';

export const GROUP_BUY_ID = 'gb-autumn-2026';

export function createSeedData(now: Date): AppData {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(23, 59, 0, 0);
  const iso = now.toISOString();

  const base = { groupBuyId: GROUP_BUY_ID, active: true, imageUrl: '' } as const;
  const products: Product[] = [
    {
      ...base, id: 'p-olive', sortOrder: 1,
      name: '特級初榨橄欖油禮盒', spec: '500ml × 2 瓶', category: '饗宴食品', unit: '盒',
      price: 1280, groupSize: 5, minQty: 1, perPersonLimit: 10, totalLimit: null,
      description: '西班牙莊園冷壓初榨,果香柔和,適合送禮與日常料理。',
    },
    {
      ...base, id: 'p-scallop', sortOrder: 2,
      name: '北海道生食級干貝', spec: '1kg(約 30–35 顆)', category: '饗宴食品', unit: '包',
      price: 2480, groupSize: 3, minQty: 1, perPersonLimit: 6, totalLimit: 30,
      description: '急速冷凍鎖鮮,肉質飽滿甜美,可生食或輕煎。',
    },
    {
      ...base, id: 'p-choco', sortOrder: 3,
      name: '瑞士手工松露巧克力禮盒', spec: '24 入', category: '饗宴食品', unit: '盒',
      price: 1680, groupSize: 4, minQty: 1, perPersonLimit: 8, totalLimit: 60,
      description: '手工製作,入口即化,附精緻絲絨提袋。',
    },
    {
      ...base, id: 'p-coffee', sortOrder: 4,
      name: '義式莊園精品咖啡豆', spec: '中深焙 1kg', category: '茶與咖啡', unit: '袋',
      price: 980, groupSize: 6, minQty: 1, perPersonLimit: null, totalLimit: null,
      description: '堅果與焦糖尾韻,適合義式濃縮與手沖。',
    },
    {
      ...base, id: 'p-tea', sortOrder: 5,
      name: '阿里山高山烏龍茶禮盒', spec: '150g × 2 罐', category: '茶與咖啡', unit: '盒',
      price: 2200, groupSize: 5, minQty: 1, perPersonLimit: 5, totalLimit: 40,
      description: '海拔 1,200 公尺高山茶,蘭花香明顯,回甘持久。',
    },
    {
      ...base, id: 'p-candle', sortOrder: 6,
      name: '玫瑰琥珀香氛蠟燭', spec: '220g 玻璃罐', category: '家居香氛', unit: '罐',
      price: 1580, groupSize: 5, minQty: 1, perPersonLimit: 4, totalLimit: null,
      description: '大豆蠟基底,玫瑰與琥珀調,燃燒時間約 50 小時。',
    },
  ];

  return {
    groupBuy: {
      id: GROUP_BUY_ID,
      name: '秋季精選好物團購',
      description: '嚴選海內外頂級食品、茶飲與香氛,限量成團。請於截止前完成選購並最終確認。',
      deadline: deadline.toISOString(),
      status: 'open',
      updatedAt: iso,
    },
    products,
    members: [
      { id: 'm1', name: '王小美' },
      { id: 'm2', name: '林佳佳' },
      { id: 'm3', name: '陳怡君' },
      { id: 'm4', name: '張雅婷' },
      { id: 'm5', name: '李佩珊' },
    ],
    orders: [],
    announcement: null,
  };
}
