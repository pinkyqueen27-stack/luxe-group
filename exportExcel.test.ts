import { describe, expect, it } from 'vitest';
import { buildExportSheets, SHEET_DETAIL, SHEET_MEMBERS, SHEET_PRODUCTS, type Cell } from './exportExcel';
import { buildExportFileName } from './format';
import type { AppData } from '../types';
import { makeOrder, makeProduct, MEMBERS } from '../test/fixtures';

function sampleData(): AppData {
  return {
    groupBuy: {
      id: 'g1', name: '秋季精選好物團購', description: '', deadline: '2026-10-26T00:00:00.000Z',
      status: 'open', updatedAt: '2026-10-19T00:00:00.000Z',
    },
    products: [
      makeProduct({ id: 'p1', name: '橄欖油', spec: '500ml', price: 1280, groupSize: 5, sortOrder: 1 }),
      makeProduct({ id: 'p2', name: '烏龍茶', spec: '150g', price: 2200, groupSize: 3, sortOrder: 2 }),
      makeProduct({ id: 'p3', name: '無人訂購商品', price: 500, groupSize: 4, sortOrder: 3 }),
    ],
    members: MEMBERS,
    orders: [
      makeOrder({
        memberId: 'm1', status: 'confirmed', confirmedAt: '2026-10-19T04:00:00.000Z',
        // 故意放重複商品,確認不會重複加總
        items: [{ productId: 'p1', quantity: 3 }, { productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }],
      }),
      makeOrder({ memberId: 'm2', status: 'draft', items: [{ productId: 'p1', quantity: 5 }, { productId: 'p2', quantity: 2 }] }),
      // m3:已取消的訂單,不得計入任何數字
      makeOrder({ memberId: 'm3', status: 'cancelled', items: [{ productId: 'p1', quantity: 9 }] }),
    ],
    announcement: null,
  };
}

const num = (c: Cell | undefined): number => (typeof c === 'number' ? c : 0);
const body = (rows: Cell[][]): Cell[][] => rows.slice(0, -1); // 去掉最後一列「合計」
const lastRow = (rows: Cell[][]): Cell[] => rows[rows.length - 1];

describe('buildExportSheets', () => {
  const sheets = buildExportSheets(sampleData());
  const byName = (name: string) => sheets.find((s) => s.name === name)!;

  it('包含三張指定名稱的工作表與正確欄位', () => {
    expect(sheets.map((s) => s.name)).toEqual([SHEET_DETAIL, SHEET_PRODUCTS, SHEET_MEMBERS]);
    expect(byName(SHEET_DETAIL).header).toEqual([
      '團員姓名', '商品名稱', '商品規格', '單價', '購買數量', '小計', '訂單狀態', '最終確認時間',
    ]);
    expect(byName(SHEET_PRODUCTS).header).toEqual([
      '商品名稱', '商品規格', '單價', '訂購總數量', '每團門檻', '已成團數', '尚未成團數量', '總金額',
    ]);
    expect(byName(SHEET_MEMBERS).header).toEqual([
      '團員姓名', '訂購商品種類數', '訂購總件數', '訂單總金額', '訂單狀態',
    ]);
  });

  it('團員訂購明細:重複商品合併、取消訂單不出現', () => {
    const rows = body(byName(SHEET_DETAIL).rows);
    expect(rows.map((r) => r[0])).toEqual(['王小美', '王小美', '林佳佳', '林佳佳']);
    // 王小美 橄欖油 3+2 = 5 件,小計 6400
    expect(rows[0].slice(1, 6)).toEqual(['橄欖油', '500ml', 1280, 5, 6400]);
    expect(rows[0][6]).toBe('已最終確認');
    expect(rows[2][6]).toBe('編輯中(尚未確認)');
    expect(rows[2][7]).toBe('—');
  });

  it('商品彙總:總量、成團數、餘數、金額都由訂單計算', () => {
    const rows = body(byName(SHEET_PRODUCTS).rows);
    // 橄欖油:5 + 5 = 10,每團 5 → 2 團、餘 0;金額 12800
    expect(rows[0]).toEqual(['橄欖油', '500ml', 1280, 10, 5, 2, 0, 12800]);
    // 烏龍茶:1 + 2 = 3,每團 3 → 1 團、餘 0;金額 6600
    expect(rows[1]).toEqual(['烏龍茶', '150g', 2200, 3, 3, 1, 0, 6600]);
    // 無人訂購的商品也要列出
    expect(rows[2]).toEqual(['無人訂購商品', '每盒 6 入', 500, 0, 4, 0, 0, 0]);
  });

  it('團員彙總:包含取消與未訂購的團員', () => {
    const rows = body(byName(SHEET_MEMBERS).rows);
    expect(rows).toEqual([
      ['王小美', 2, 6, 8600, '已最終確認'],
      ['林佳佳', 2, 7, 10800, '編輯中(尚未確認)'], // 5×1280 + 2×2200
      ['陳怡君', 0, 0, 0, '已取消'],
    ]);
  });

  it('三張表的「合計」互相吻合(件數與金額)', () => {
    const detail = byName(SHEET_DETAIL).rows;
    const products = byName(SHEET_PRODUCTS).rows;
    const members = byName(SHEET_MEMBERS).rows;

    const detailQty = body(detail).reduce((s, r) => s + num(r[4]), 0);
    const detailAmount = body(detail).reduce((s, r) => s + num(r[5]), 0);
    expect(num(lastRow(detail)[4])).toBe(detailQty);
    expect(num(lastRow(detail)[5])).toBe(detailAmount);

    expect(num(lastRow(products)[3])).toBe(detailQty);
    expect(num(lastRow(products)[7])).toBe(detailAmount);
    expect(num(lastRow(members)[2])).toBe(detailQty);
    expect(num(lastRow(members)[3])).toBe(detailAmount);
    // 王小美 8600 + 林佳佳 10800(已取消的陳怡君不計入)
    expect(detailAmount).toBe(19400);
  });

  it('完全沒有訂單時仍可匯出(全部為 0)', () => {
    const empty = buildExportSheets({ ...sampleData(), orders: [] });
    expect(empty[0].rows).toEqual([['合計', '', '', '', 0, 0, '', '']]);
    expect(num(lastRow(empty[1].rows)[7])).toBe(0);
  });
});

describe('buildExportFileName', () => {
  it('格式為 LUXE_GROUP_團購名稱_YYYYMMDD.xlsx', () => {
    expect(buildExportFileName('秋季精選好物團購', new Date(2026, 9, 19))).toBe('LUXE_GROUP_秋季精選好物團購_20261019.xlsx');
  });

  it('移除檔名不允許的字元與空白', () => {
    expect(buildExportFileName('  年終/感恩:團購? ', new Date(2026, 0, 5))).toBe('LUXE_GROUP_年終_感恩_團購_20260105.xlsx');
  });

  it('名稱為空時使用預設名稱', () => {
    expect(buildExportFileName('///', new Date(2026, 0, 5))).toBe('LUXE_GROUP_團購_20260105.xlsx');
  });
});
