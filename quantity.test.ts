import { describe, expect, it } from 'vitest';
import { getQuantityLimits, stepQuantity, validateOrderLimits, validateQuantity } from './quantity';
import { makeOrder, makeProduct } from '../test/fixtures';

const plain = getQuantityLimits(makeProduct(), 0);

function errorOf(raw: string | number, limits = plain): string {
  const r = validateQuantity(raw, limits);
  return r.ok ? '' : r.error;
}

describe('validateQuantity 基本規則', () => {
  it('接受 0 與正整數', () => {
    expect(validateQuantity('0', plain)).toEqual({ ok: true, value: 0 });
    expect(validateQuantity('7', plain)).toEqual({ ok: true, value: 7 });
    expect(validateQuantity(' 12 ', plain)).toEqual({ ok: true, value: 12 });
  });

  it('負數、小數、非數字、空白都會顯示清楚的繁體中文錯誤', () => {
    expect(errorOf('-1')).toBe('數量不可為負數');
    expect(errorOf('2.5')).toBe('數量必須是整數,不可輸入小數');
    expect(errorOf('abc')).toContain('必須是數字');
    expect(errorOf('1e3')).toContain('必須是數字');
    expect(errorOf('')).toContain('請輸入數量');
    expect(errorOf(Number.NaN)).toContain('有效的數字');
  });

  it('沒有設定限制時預設為 0~99', () => {
    expect(validateQuantity('99', plain).ok).toBe(true);
    expect(errorOf('100')).toBe('單一商品最多訂購 99 盒');
  });
});

describe('限購規則', () => {
  it('每人限購', () => {
    const limits = getQuantityLimits(makeProduct({ perPersonLimit: 3 }), 0);
    expect(validateQuantity('3', limits).ok).toBe(true);
    expect(errorOf('4', limits)).toBe('每人限購 3 盒,請調整數量');
  });

  it('活動總限購:扣除其他團員已訂的數量', () => {
    const product = makeProduct({ totalLimit: 10, perPersonLimit: 8 });
    const limits = getQuantityLimits(product, 7); // 其他人已訂 7,還剩 3
    expect(limits.max).toBe(3);
    expect(validateQuantity('3', limits).ok).toBe(true);
    expect(errorOf('4', limits)).toBe('超過活動總限購量,目前最多還可訂 3 盒');
  });

  it('最低訂購量:低於最低量(但不是 0)會被拒絕', () => {
    const limits = getQuantityLimits(makeProduct({ minQty: 2 }), 0);
    expect(validateQuantity('0', limits).ok).toBe(true);
    expect(errorOf('1', limits)).toContain('最低訂購量為 2 盒');
    expect(validateQuantity('2', limits).ok).toBe(true);
  });

  it('活動總量剩餘低於最低訂購量時顯示名額不足', () => {
    const limits = getQuantityLimits(makeProduct({ minQty: 3, totalLimit: 10 }), 9);
    expect(errorOf('1', limits)).toContain('名額不足');
  });
});

describe('stepQuantity(+ / − 按鈕)', () => {
  it('從 0 增加時直接跳到最低訂購量;減到最低量以下歸 0', () => {
    const limits = getQuantityLimits(makeProduct({ minQty: 3 }), 0);
    expect(stepQuantity(0, 1, limits)).toEqual({ ok: true, value: 3 });
    expect(stepQuantity(3, -1, limits)).toEqual({ ok: true, value: 0 });
    expect(stepQuantity(5, -1, limits)).toEqual({ ok: true, value: 4 });
  });

  it('增加到超過上限時回傳錯誤而不是默默放行', () => {
    const limits = getQuantityLimits(makeProduct({ perPersonLimit: 2 }), 0);
    expect(stepQuantity(2, 1, limits).ok).toBe(false);
  });
});

describe('validateOrderLimits(最終確認前的整單檢查)', () => {
  it('其他人在這段期間訂走名額時,會列出有問題的商品', () => {
    const product = makeProduct({ id: 'p1', name: '限量茶', totalLimit: 5 });
    const order = makeOrder({ items: [{ productId: 'p1', quantity: 4 }] });
    expect(validateOrderLimits(order, [product], new Map([['p1', 0]]))).toEqual([]);
    const problems = validateOrderLimits(order, [product], new Map([['p1', 3]]));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('限量茶');
  });
});
