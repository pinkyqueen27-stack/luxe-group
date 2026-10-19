import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../lib/format';
import {
  emptyProductForm,
  parseProductForm,
  productToForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '../../lib/productForm';
import { ConfirmDialog, Modal } from '../Modal';

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

/** 商品管理:新增、編輯、上下架、刪除(已有訂單的商品只能下架) */
export function AdminProducts() {
  const { data, products, saveProduct, removeProduct } = useApp();
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyProductForm());
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setForm(emptyProductForm());
    setErrors({});
    setEditing({ product: null });
  };
  const openEdit = (product: Product) => {
    setForm(productToForm(product));
    setErrors({});
    setEditing({ product });
  };
  const set = (key: keyof ProductFormValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!editing || !data.groupBuy) return;
    const parsed = parseProductForm(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    const existing = editing.product;
    const product: Product = existing
      ? { ...existing, ...parsed.value }
      : {
          ...parsed.value,
          id: `p-${Date.now().toString(36)}`,
          groupBuyId: data.groupBuy.id,
          active: true,
          sortOrder: products.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1,
        };
    const ok = await saveProduct(product);
    setSaving(false);
    if (ok) setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await removeProduct(deleting.id);
    setBusy(false);
    setDeleting(null);
  };

  return (
    <div>
      <div className="actions actions--end">
        <button type="button" className="btn btn--gold" onClick={openNew}>
          <Plus size={16} /> 新增商品
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>商品</th>
              <th className="num">單價</th>
              <th className="num">每團門檻</th>
              <th className="num">最低訂購</th>
              <th className="num">每人限購</th>
              <th className="num">活動總限購</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'is-muted'}>
                <td data-label="商品">
                  <strong>{p.name}</strong>
                  <small className="block">
                    {p.category} · {p.spec}
                  </small>
                </td>
                <td data-label="單價" className="num">{formatCurrency(p.price)}</td>
                <td data-label="每團門檻" className="num">{p.groupSize} {p.unit}</td>
                <td data-label="最低訂購" className="num">{p.minQty} {p.unit}</td>
                <td data-label="每人限購" className="num">{p.perPersonLimit ?? '不限(上限 99)'}</td>
                <td data-label="活動總限購" className="num">{p.totalLimit ?? '不限'}</td>
                <td data-label="狀態">{p.active ? '上架中' : '已下架'}</td>
                <td data-label="操作">
                  <div className="row-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(p)}>
                      <Pencil size={14} /> 編輯
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => void saveProduct({ ...p, active: !p.active })}
                    >
                      {p.active ? <EyeOff size={14} /> : <Eye size={14} />} {p.active ? '下架' : '上架'}
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => setDeleting(p)}>
                      <Trash2 size={14} /> 刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing.product ? '編輯商品' : '新增商品'}
          wide
          onClose={() => !saving && setEditing(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
                取消
              </button>
              <button type="button" className="btn btn--gold" onClick={() => void submit()} disabled={saving}>
                {saving ? '儲存中…' : '儲存商品'}
              </button>
            </>
          }
        >
          <div className="form">
            <Field label="商品名稱 *" error={errors.name}>
              <input value={form.name} onChange={set('name')} maxLength={60} />
            </Field>
            <div className="form__row">
              <Field label="商品規格" error={errors.spec}>
                <input value={form.spec} onChange={set('spec')} placeholder="例如:500ml × 2 瓶" maxLength={60} />
              </Field>
              <Field label="分類" error={errors.category}>
                <input value={form.category} onChange={set('category')} placeholder="例如:饗宴食品" maxLength={20} />
              </Field>
            </div>
            <div className="form__row">
              <Field label="單價(元)*" error={errors.price}>
                <input inputMode="numeric" value={form.price} onChange={set('price')} />
              </Field>
              <Field label="單位" error={errors.unit}>
                <input value={form.unit} onChange={set('unit')} placeholder="盒、瓶、袋…" maxLength={6} />
              </Field>
            </div>
            <div className="form__row">
              <Field label="每團成團門檻 *" error={errors.groupSize} hint="達到這個數量即成 1 團">
                <input inputMode="numeric" value={form.groupSize} onChange={set('groupSize')} />
              </Field>
              <Field label="最低訂購量" error={errors.minQty} hint="預設 1">
                <input inputMode="numeric" value={form.minQty} onChange={set('minQty')} />
              </Field>
            </div>
            <div className="form__row">
              <Field label="每人限購數量" error={errors.perPersonLimit} hint="留白 = 不限制(系統上限 99)">
                <input inputMode="numeric" value={form.perPersonLimit} onChange={set('perPersonLimit')} />
              </Field>
              <Field label="活動總限購數量" error={errors.totalLimit} hint="留白 = 不限制">
                <input inputMode="numeric" value={form.totalLimit} onChange={set('totalLimit')} />
              </Field>
            </div>
            <Field label="商品說明" error={errors.description}>
              <textarea value={form.description} onChange={set('description')} rows={2} maxLength={200} />
            </Field>
            <Field label="商品圖片網址(選填)" error={errors.imageUrl} hint="留白會使用系統產生的示意圖">
              <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
            </Field>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="刪除商品"
          danger
          confirmLabel="確認刪除"
          busy={busy}
          onClose={() => !busy && setDeleting(null)}
          onConfirm={confirmDelete}
          message={
            <p>
              確定要刪除「<strong>{deleting.name}</strong>」嗎?已有訂單包含的商品無法刪除,請改用「下架」。
            </p>
          }
        />
      ) : null}
    </div>
  );
}
