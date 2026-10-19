import { useState } from 'react';
import { ArrowLeft, CircleCheck, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../lib/format';
import { Modal } from '../components/Modal';
import { OrderDetail } from '../components/OrderDetail';
import { Loading, NotInitialized, PickMemberNotice } from '../components/StateViews';

/** 購物清單與結帳(模擬):確認視窗 → 最終確認 → 成功畫面 */
export function CartPage() {
  const { data, loaded, member, myOrder, myTotals, ordering, confirmMyOrder } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  if (!loaded) return <Loading />;
  if (!data.groupBuy) return <NotInitialized />;
  if (!member) return <PickMemberNotice />;

  const submit = async () => {
    setBusy(true);
    const ok = await confirmMyOrder();
    setBusy(false);
    if (ok) {
      setConfirming(false);
      setJustConfirmed(true);
    }
  };

  /* 已最終確認:唯讀顯示,不可覆寫 */
  if (myOrder?.status === 'confirmed') {
    return (
      <section className="panel">
        {justConfirmed ? (
          <div className="notice notice--success" role="status">
            <CircleCheck size={18} />
            <div>
              <strong>訂單已最終確認!</strong> 確認時間:{formatDateTime(myOrder.confirmedAt)}。這是模擬結帳,不會向你收款。
            </div>
          </div>
        ) : (
          <div className="notice notice--info">
            <Info size={18} />
            <div>你的訂單已於 {formatDateTime(myOrder.confirmedAt)} 最終確認,無法直接修改。如需調整,請聯繫主召解鎖。</div>
          </div>
        )}
        <h2 className="panel__title">{member.name} 的已確認訂單</h2>
        <OrderDetail totals={myTotals} order={myOrder} />
        <div className="actions">
          <a className="btn btn--ghost" href="#/orders">
            查看我的訂單
          </a>
          <a className="btn btn--ghost" href="#/">
            <ArrowLeft size={16} /> 回到團購首頁
          </a>
        </div>
      </section>
    );
  }

  if (myOrder?.status === 'cancelled') {
    return (
      <section className="panel">
        <p className="notice notice--warn">你的訂單已被主召取消,目前無法修改或結帳。請聯繫主召。</p>
        <a className="btn btn--ghost" href="#/orders">
          查看我的訂單
        </a>
      </section>
    );
  }

  if (myTotals.lines.length === 0) {
    return (
      <section className="panel state">
        <h2>購物清單是空的</h2>
        <p>回到團購首頁挑選喜歡的商品吧。</p>
        <a className="btn btn--gold" href="#/">
          前往選購
        </a>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2 className="panel__title">{member.name} 的購物清單</h2>
      <p className="notice notice--info">
        <Info size={16} /> 測試模式:「我要結帳」只會將訂單標記為最終確認,<strong>不會收款</strong>。
      </p>
      {!ordering.open ? <p className="notice notice--warn">目前無法送出訂單:{ordering.reason}</p> : null}

      <OrderDetail totals={myTotals} order={myOrder} />

      <div className="actions actions--split">
        <a className="btn btn--ghost" href="#/">
          <ArrowLeft size={16} /> 返回修改
        </a>
        <button type="button" className="btn btn--gold btn--lg" disabled={!ordering.open} onClick={() => setConfirming(true)}>
          我要結帳
        </button>
      </div>

      {confirming ? (
        <Modal
          title="最終確認訂單"
          onClose={() => !busy && setConfirming(false)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>
                返回修改
              </button>
              <button type="button" className="btn btn--gold" onClick={() => void submit()} disabled={busy}>
                {busy ? '送出中…' : '確認送出'}
              </button>
            </>
          }
        >
          <p className="prose">
            請再次核對你的訂單。送出後將標記為「已最終確認」,<strong>之後無法自行修改</strong>(需主召解鎖)。
          </p>
          <ul className="confirm-list">
            {myTotals.lines.map((line) => (
              <li key={line.product.id}>
                <span>
                  {line.product.name}
                  <small>{line.product.spec}</small>
                </span>
                <span>
                  {line.quantity} {line.product.unit} · {formatCurrency(line.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <p className="confirm-total">
            總金額 <strong>{formatCurrency(myTotals.amount)}</strong>({myTotals.quantity} 件)
          </p>
          <p className="muted small">此為 Prototype 模擬結帳,不會收款。</p>
        </Modal>
      ) : null}
    </section>
  );
}
