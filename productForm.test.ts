import { describe, expect, it } from 'vitest';
import { emptyProductForm, parseProductForm, productToForm } from './productForm';
import { makeProduct } from '../test/fixtures';

const valid = () => ({ ...emptyProductForm(), name: '新商品', price: '1200', groupSize: '5' });

describe('parseProductForm', () => {
  it('合法表單:空白的限購欄位代表「不限制」(null)', () => {
    const r = parseProductForm(valid());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.price).toBe(1200);
      expect(r.value.perPersonLimit).toBeNull();
      expect(r.value.totalLimit).toBeNull();
      expect(r.value.category).toBe('精選商品');
    }
  });

  it('必填與數字格式錯誤會逐欄回報', () => {
    const r = parseProductForm({ ...emptyProductForm(), price: '-5', groupSize: '0', minQty: '1.5' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['groupSize', 'minQty', 'name', 'price']);
    }
  });

  it('每人限購不可低於最低訂購量;圖片網址需為 http(s)', () => {
    const r = parseProductForm({ ...valid(), minQty: '3', perPersonLimit: '2', imageUrl: 'ftp://x' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.perPersonLimit).toContain('不可低於最低訂購量');
      expect(r.errors.imageUrl).toContain('http');
    }
  });

  it('既有商品可以轉成表單再解析回來', () => {
    const product = makeProduct({ perPersonLimit: 4, totalLimit: 20 });
    const r = parseProductForm(productToForm(product));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.perPersonLimit).toBe(4);
      expect(r.value.totalLimit).toBe(20);
      expect(r.value.groupSize).toBe(product.groupSize);
    }
  });
});
