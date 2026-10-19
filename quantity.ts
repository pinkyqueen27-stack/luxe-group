// 數量規則:非負整數、最低訂購量、每人限購、活動總限購(預設 0~99)。
import type { Order, Product } from '../types';
import { normalizeItems } from './calc';

export const DEFAULT_MAX_QTY = 99;

export interface QuantityLimits {
  min: number;
  /** 這位團員目前最多能訂幾件(已考慮每人限購與活動總量剩餘) */
  max: number;
  personMax: number;
  hasPersonLimit: boolean;
  /** 扣除其他團員後,活動總量還剩多少;無限制時為 Infinity */
  totalRemaining: number;
  unit: string;
}

export function getQuantityLimits(product: Product, othersTotal: number): QuantityLimits {
  const hasPersonLimit = product.perPersonLimit != null;
  const personMax = product.perPersonLimit ?? DEFAULT_MAX_QTY;
  const totalRemaining =
    product.totalLimit == null ? Infinity : Math.max(0, product.totalLimit - Math.max(0, othersTotal));
  return {
    min: Math.max(1, product.minQty || 1),
    max: Math.min(personMax, totalRemaining),
    personMax,
    hasPersonLimit,
    totalRemaining,
    unit: product.unit || '件',
  };
}

export type QuantityCheck = { ok: true; value: number } | { ok: false; error: string };

/** 驗證使用者輸入的數量(字串或數字),錯誤訊息為繁體中文 */
export function validateQuantity(raw: string | number, limits: QuantityLimits): QuantityCheck {
  let text: string;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, error: '請輸入有效的數字' };
    text = String(raw);
  } else {
    text = raw.trim();
  }
  if (text === '') return { ok: false, error: '請輸入數量(0 表示不訂購)' };
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return { ok: false, error: '數量必須是數字,請勿輸入文字或符號' };
  if (text.startsWith('-')) return { ok: false, error: '數量不可為負數' };
  if (text.includes('.')) return { ok: false, error: '數量必須是整數,不可輸入小數' };
  const value = Number(text.replace(/^\+/, ''));
  if (!Number.isSafeInteger(value)) return { ok: false, error: '數量過大,請重新輸入' };
  if (value === 0) return { ok: true, value: 0 };

  const { min, max, personMax, hasPersonLimit, totalRemaining, unit } = limits;
  if (max < min) {
    return {
      ok: false,
      error: totalRemaining < min ? `名額不足:活動總量僅剩 ${totalRemaining} ${unit},低於最低訂購量 ${min} ${unit}` : `限購量低於最低訂購量,請聯繫主召`,
    };
  }
  if (value > max) {
    if (totalRemaining < personMax) {
      return { ok: false, error: `超過活動總限購量,目前最多還可訂 ${totalRemaining} ${unit}` };
    }
    return {
      ok: false,
      error: hasPersonLimit ? `每人限購 ${personMax} ${unit},請調整數量` : `單一商品最多訂購 ${DEFAULT_MAX_QTY} ${unit}`,
    };
  }
  if (value < min) return { ok: false, error: `此商品最低訂購量為 ${min} ${unit}(不訂購請輸入 0)` };
  return { ok: true, value };
}

/** + / − 按鈕:從 0 增加時直接跳到最低訂購量,減少到低於最低訂購量時歸 0 */
export function stepQuantity(current: number, direction: 1 | -1, limits: QuantityLimits): QuantityCheck {
  if (direction === 1) {
    const next = current <= 0 ? limits.min : current + 1;
    return validateQuantity(next, limits);
  }
  if (current <= limits.min) return { ok: true, value: 0 };
  return { ok: true, value: current - 1 };
}

/** 最終確認前,逐項檢查整張訂單是否仍符合限制(其他人可能在這段期間訂走名額) */
export function validateOrderLimits(
  order: Order,
  products: Product[],
  othersTotals: Map<string, number>,
): string[] {
  const byId = new Map(products.map((p) => [p.id, p] as const));
  const problems: string[] = [];
  for (const item of normalizeItems(order.items)) {
    const product = byId.get(item.productId);
    if (!product) {
      problems.push('訂單包含已不存在的商品,請聯繫主召');
      continue;
    }
    const check = validateQuantity(item.quantity, getQuantityLimits(product, othersTotals.get(product.id) ?? 0));
    if (!check.ok) problems.push(`${product.name}:${check.error}`);
  }
  return problems;
}
