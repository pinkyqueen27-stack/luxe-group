import { useState } from 'react';
import { Eye, LockOpen, Undo2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcOrderTotals, summarizeMembers, type MemberRow } from '../../lib/calc';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { ConfirmDialog, Modal } from '../Modal';
import { OrderDetail, OrderStatusChip } from '../OrderDetail';

type Pending = { kind: 'unlock' | 'cancel'; row: MemberRow };

/** 團員訂單管理:查看每位團員的明細、狀態、確認時間,並可解鎖 / 取消 / 恢復 */
export function AdminOrders() {
  const { data, products, unlockOrder, cancelMemberOrder, restoreMemberOrder } = useApp();
  const rows = summarizeMembers(data.members, data.orders, products);
  const [viewId, setViewId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const viewing = rows.find((r) => r.member.id === viewId) ?? null;

  const runPending = async () => {
    if (!pending?.row.order) return;
    setBusy(true);
    const order = pending.row.order;
    await (pending.kind === 'unlock' ? unlockOrder(order) : cancelMemberOrder(order));
    setBusy(false);
    setPending(null);
  };

  return (
    <div>
      <p className="notice notice--info">
        已「最終確認」的訂單不能由團員自行覆寫。需要修改時,按「解鎖」讓團員重新編輯,團員再次結帳後會重新記錄確認時間。
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>團員</th>
              <th className="num">商品種類</th>
              <th className="num">總件數</th>
              <th className="num">訂單金額</th>
              <th>訂單狀態</th>
              <th>最終確認時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = row.order?.status;
              return (
                <tr key={row.member.id}>
                  <td data-label="團員"><strong>{row.member.name}</strong></td>
                  <td data-label="商品種類" className="num">{row.totals.kinds}</td>
                  <td data-label="總件數" className="num">{row.totals.quantity}</td>
                  <td data-label="訂單金額" className="num">{formatCurrency(row.totals.amount)}</td>
                  <td data-label="訂單狀態"><OrderStatusChip order={row.order} /></td>
                  <td data-label="最終確認時間">{formatDateTime(row.order?.confirmedAt)}</td>
                  <td data-label="操作">
                    <div className="row-actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setViewId(row.member.id)}>
                        <Eye size={14} /> 明細
                      </button>
                      {status === 'confirmed' ? (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPending({ kind: 'unlock', row })}>
                          <LockOpen size={14} /> 解鎖
                        </button>
                      ) : null}
                      {status === 'draft' || status === 'confirmed' ? (
                        <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => setPending({ kind: 'cancel', row })}>
                          <X size={14} /> 取消
                        </button>
                      ) : null}
                      {status === 'cancelled' && row.order ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void restoreMemberOrder(row.order!)}
                        >
                          <Undo2 size={14} /> 恢復
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewing ? (
        <Modal
          title={`${viewing.member.name} 的訂購明細`}
          wide
          onClose={() => setViewId(null)}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setViewId(null)}>
              關閉
            </button>
          }
        >
          <p>
            狀態:<OrderStatusChip order={viewing.order} />
          </p>
          {viewing.order?.status === 'cancelled' ? (
            <p className="notice notice--warn">這張訂單已取消,下方為取消前的內容,不計入任何統計。</p>
          ) : null}
          {/* 已取消的訂單在彙總中視為 0,但這裡仍可檢視取消前的內容 */}
          <OrderDetail
            totals={viewing.order?.status === 'cancelled' ? calcOrderTotals(viewing.order, products) : viewing.totals}
            order={viewing.order}
          />
        </Modal>
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={pending.kind === 'unlock' ? '解鎖訂單' : '取消訂單'}
          danger={pending.kind === 'cancel'}
          confirmLabel={pending.kind === 'unlock' ? '確認解鎖' : '確認取消訂單'}
          busy={busy}
          onClose={() => !busy && setPending(null)}
          onConfirm={runPending}
          message={
            pending.kind === 'unlock' ? (
              <p>
                解鎖後,<strong>{pending.row.member.name}</strong> 可以重新修改訂單,並需要再次結帳確認。
              </p>
            ) : (
              <p>
                取消後,<strong>{pending.row.member.name}</strong> 的訂單將不再計入任何統計與 Excel 匯出,之後可按「恢復」。
              </p>
            )
          }
        />
      ) : null}
    </div>
  );
}
