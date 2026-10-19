// 後台「商品管理」表單的解析與驗證(純函式,可單獨測試)。
import type { Product } from '../types';

export interface ProductFormValues {
  name: string;
  spec: string;
  category: string;
  unit: string;
  price: string;
  groupSize: string;
  minQty: string;
  perPersonLimit: string;
  totalLimit: string;
  description: string;
  imageUrl: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;
export type ParsedProduct = Pick<
  Product,
  | 'name' | 'spec' | 'category' | 'unit' | 'price' | 'groupSize' | 'minQty'
  | 'perPersonLimit' | 'totalLimit' | 'description' | 'imageUrl'
>;

export const emptyProductForm = (): ProductFormValues => ({
  name: '', spec: '', category: '', unit: '件', price: '', groupSize: '5', minQty: '1',
  perPersonLimit: '', totalLimit: '', description: '', imageUrl: '',
});

export function productToForm(p: Product): ProductFormValues {
  return {
    name: p.name, spec: p.spec, category: p.category, unit: p.unit,
    price: String(p.price), groupSize: String(p.groupSize), minQty: String(p.minQty),
    perPersonLimit: p.perPersonLimit == null ? '' : String(p.perPersonLimit),
    totalLimit: p.totalLimit == null ? '' : String(p.totalLimit),
    description: p.description, imageUrl: p.imageUrl,
  };
}

function toInt(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

export function parseProductForm(
  v: ProductFormValues,
): { ok: true; value: ParsedProduct } | { ok: false; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = '請輸入商品名稱';

  const price = toInt(v.price);
  if (price === null) errors.price = '單價必須是 0 以上的整數';

  const groupSize = toInt(v.groupSize);
  if (groupSize === null || groupSize < 1) errors.groupSize = '每團門檻必須是 1 以上的整數';

  const minQty = v.minQty.trim() === '' ? 1 : toInt(v.minQty);
  if (minQty === null || minQty < 1) errors.minQty = '最低訂購量必須是 1 以上的整數';

  let perPersonLimit: number | null = null;
  if (v.perPersonLimit.trim() !== '') {
    perPersonLimit = toInt(v.perPersonLimit);
    if (perPersonLimit === null || perPersonLimit < 1) errors.perPersonLimit = '每人限購必須是 1 以上的整數(不限制請留白)';
    else if (minQty !== null && perPersonLimit < minQty) errors.perPersonLimit = '每人限購不可低於最低訂購量';
  }

  let totalLimit: number | null = null;
  if (v.totalLimit.trim() !== '') {
    totalLimit = toInt(v.totalLimit);
    if (totalLimit === null || totalLimit < 1) errors.totalLimit = '活動總限購必須是 1 以上的整數(不限制請留白)';
    else if (minQty !== null && totalLimit < minQty) errors.totalLimit = '活動總限購不可低於最低訂購量';
  }

  const imageUrl = v.imageUrl.trim();
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) errors.imageUrl = '圖片網址需以 http:// 或 https:// 開頭(留白則使用系統示意圖)';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      spec: v.spec.trim(),
      category: v.category.trim() || '精選商品',
      unit: v.unit.trim() || '件',
      price: price as number,
      groupSize: groupSize as number,
      minQty: minQty as number,
      perPersonLimit,
      totalLimit,
      description: v.description.trim(),
      imageUrl,
    },
  };
}
