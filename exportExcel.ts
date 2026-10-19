// Excel 匯出:三張工作表皆由目前訂單資料即時計算,沒有任何寫死的數字。
import type { AppData } from '../types';
import { computeProductStats, summarizeMembers } from './calc';
import { buildExportFileName, formatDateTime } from './format';

export type Cell = string | number;

export interface ExportSheet {
  name: string;
  header: string[];
  rows: Cell[][];
  /** 需要套用「千分位整數」格式的欄位(從 0 開始) */
  moneyColumns: number[];
}

export const SHEET_DETAIL = '團員訂購明細';
export const SHEET_PRODUCTS = '商品彙總';
export const SHEET_MEMBERS = '團員彙總';

/** 把資料整理成三張表(純函式,方便測試);最後一列為「合計」 */
export function buildExportSheets(data: AppData): ExportSheet[] {
  const products = [...data.products].sort((a, b) => a.sortOrder - b.sortOrder);
  const memberRows = summarizeMembers(data.members, data.orders, products);
  const stats = computeProductStats(products, data.orders);

  // 工作表 1:團員訂購明細(已取消與空訂單不會產生明細列)
  const detail: Cell[][] = [];
  let detailQty = 0;
  let detailAmount = 0;
  for (const row of memberRows) {
    for (const line of row.totals.lines) {
      detail.push([
        row.member.name,
        line.product.name,
        line.product.spec,
        line.product.price,
        line.quantity,
        line.subtotal,
        row.statusLabel,
        formatDateTime(row.order?.confirmedAt),
      ]);
      detailQty += line.quantity;
      detailAmount += line.subtotal;
    }
  }
  detail.push(['合計', '', '', '', detailQty, detailAmount, '', '']);

  // 工作表 2:商品彙總
  const productRows: Cell[][] = [];
  let productQty = 0;
  let productAmount = 0;
  for (const product of products) {
    const stat = stats.get(product.id)!;
    productRows.push([
      product.name,
      product.spec,
      product.price,
      stat.total,
      product.groupSize,
      stat.progress.groups,
      stat.progress.remainder,
      stat.amount,
    ]);
    productQty += stat.total;
    productAmount += stat.amount;
  }
  productRows.push(['合計', '', '', productQty, '', '', '', productAmount]);

  // 工作表 3:團員彙總(含未訂購、已取消的團員,金額一律以 0 計)
  const memberSheetRows: Cell[][] = [];
  let memberQty = 0;
  let memberAmount = 0;
  for (const row of memberRows) {
    memberSheetRows.push([row.member.name, row.totals.kinds, row.totals.quantity, row.totals.amount, row.statusLabel]);
    memberQty += row.totals.quantity;
    memberAmount += row.totals.amount;
  }
  memberSheetRows.push(['合計', '', memberQty, memberAmount, '']);

  return [
    {
      name: SHEET_DETAIL,
      header: ['團員姓名', '商品名稱', '商品規格', '單價', '購買數量', '小計', '訂單狀態', '最終確認時間'],
      rows: detail,
      moneyColumns: [3, 5],
    },
    {
      name: SHEET_PRODUCTS,
      header: ['商品名稱', '商品規格', '單價', '訂購總數量', '每團門檻', '已成團數', '尚未成團數量', '總金額'],
      rows: productRows,
      moneyColumns: [2, 7],
    },
    {
      name: SHEET_MEMBERS,
      header: ['團員姓名', '訂購商品種類數', '訂購總件數', '訂單總金額', '訂單狀態'],
      rows: memberSheetRows,
      moneyColumns: [3],
    },
  ];
}

/** 實際下載 .xlsx(動態載入 SheetJS,首頁不會因此變慢) */
export async function exportExcel(data: AppData, now: Date = new Date()): Promise<string> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  for (const sheet of buildExportSheets(data)) {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.header, ...sheet.rows]);

    // 欄寬:依內容長度估算(中文字寬度較大,以 2 倍計)
    const widthOf = (value: Cell): number => {
      const text = String(value ?? '');
      let w = 0;
      for (const ch of text) w += ch.charCodeAt(0) > 255 ? 2 : 1;
      return w;
    };
    worksheet['!cols'] = sheet.header.map((h, c) => ({
      wch: Math.min(40, Math.max(widthOf(h), ...sheet.rows.map((r) => widthOf(r[c] ?? ''))) + 2),
    }));

    // 金額欄位使用千分位整數格式
    for (let r = 1; r <= sheet.rows.length; r++) {
      for (const c of sheet.moneyColumns) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = '#,##0';
      }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  const fileName = buildExportFileName(data.groupBuy?.name ?? '團購', now);
  XLSX.writeFile(workbook, fileName);
  return fileName;
}
