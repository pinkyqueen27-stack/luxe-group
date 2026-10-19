import type { Order } from '../types';
import type { OrderTotals } from '../lib/calc';
import { formatCurrency, formatDateTime } from '../lib/format';
import { orderStatusLabel } from '../lib/calc';

export function OrderStatusChip({ order }: { order: Order | null }) {
  const tone = !order ? 'none' : order.status;
  return <span className={`chip chip--order-${tone}`}>{orderStatusLabel(order)}</span>;
}

/** 訂單明細表:商品、規格、單價、數量、小計與總金額 */
export function OrderDetail({ totals, order }: { totals: OrderTotals; order?: Order | null }) {
  if (totals.lines.length === 0) {
    return <p className="empty">這張訂單目前沒有任何商品。</p>;
  }
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>商品名稱</th>
              <th>規格</th>
              <th className="num">單價</th>
              <th className="num">數量</th>
              <th className="num">小計</th>
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((line) => (
              <tr key={line.product.id}>
                <td data-label="商品名稱">{line.product.name}</td>
                <td data-label="規格">{line.product.spec}</td>
                <td data-label="單價" className="num">{formatCurrency(line.product.price)}</td>
                <td data-label="數量" className="num">{line.quantity} {line.product.unit}</td>
                <td data-label="小計" className="num">{formatCurrency(line.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>合計(共 {totals.kinds} 種商品)</td>
              <td className="num">{totals.quantity} 件</td>
              <td className="num">{formatCurrency(totals.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {order ? (
        <p className="muted small">
          訂單編號:{order.id} · 最後更新:{formatDateTime(order.updatedAt)}
          {order.confirmedAt ? ` · 最終確認:${formatDateTime(order.confirmedAt)}` : ''}
          {order.reopenedAt ? ` · 主召解鎖:${formatDateTime(order.reopenedAt)}` : ''}
        </p>
      ) : null}
    </>
  );
}
