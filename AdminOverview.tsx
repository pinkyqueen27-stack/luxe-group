import { useApp } from '../../context/AppContext';
import { summarizeMembers } from '../../lib/calc';
import { formatCurrency } from '../../lib/format';
import { ProgressBadge, ProgressBar } from '../ProgressBadge';

/** 商品成團進度總覽:所有數字都由目前訂單即時計算 */
export function AdminOverview() {
  const { data, products, stats } = useApp();
  const rows = summarizeMembers(data.members, data.orders, products);

  const confirmed = rows.filter((r) => r.order?.status === 'confirmed').length;
  const ordered = rows.filter((r) => r.totals.quantity > 0).length;
  const totalQty = rows.reduce((s, r) => s + r.totals.quantity, 0);
  const totalAmount = rows.reduce((s, r) => s + r.totals.amount, 0);
  const formed = products.filter((p) => stats.get(p.id)?.progress.status === 'formed').length;

  return (
    <div>
      <div className="summary">
        <div className="summary__item">
          <span>已最終確認</span>
          <strong>
            {confirmed} / {data.members.length} 人
          </strong>
        </div>
        <div className="summary__item">
          <span>已有訂購</span>
          <strong>{ordered} 人</strong>
        </div>
        <div className="summary__item">
          <span>訂購總件數</span>
          <strong>{totalQty} 件</strong>
        </div>
        <div className="summary__item">
          <span>訂單總金額</span>
          <strong>{formatCurrency(totalAmount)}</strong>
        </div>
        <div className="summary__item">
          <span>已成團商品</span>
          <strong>
            {formed} / {products.length} 項
          </strong>
        </div>
      </div>

      <p className="notice notice--info">
        成團只代表「數量達到門檻」,不代表供應商已接受訂單。統計包含「編輯中」與「已最終確認」的訂單,不含已取消的訂單。
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>商品</th>
              <th className="num">單價</th>
              <th className="num">訂購總數量</th>
              <th className="num">每團門檻</th>
              <th>成團狀態</th>
              <th className="num">未成團數量</th>
              <th className="num">下一團還差</th>
              <th className="num">總金額</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stat = stats.get(p.id);
              if (!stat) return null;
              const pr = stat.progress;
              return (
                <tr key={p.id}>
                  <td data-label="商品">
                    <strong>{p.name}</strong>
                    <small className="block">
                      {p.spec}
                      {p.active ? '' : '(已下架)'}
                    </small>
                  </td>
                  <td data-label="單價" className="num">{formatCurrency(p.price)}</td>
                  <td data-label="訂購總數量" className="num">{stat.total} {p.unit}</td>
                  <td data-label="每團門檻" className="num">{p.groupSize} {p.unit}</td>
                  <td data-label="成團狀態">
                    <ProgressBadge progress={pr} />
                    <ProgressBar progress={pr} />
                  </td>
                  <td data-label="未成團數量" className="num">{pr.remainder} {p.unit}</td>
                  <td data-label="下一團還差" className="num">{pr.shortfall} {p.unit}</td>
                  <td data-label="總金額" className="num">{formatCurrency(stat.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
