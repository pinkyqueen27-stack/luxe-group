import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../lib/format';
import { AnnouncementBanner } from '../components/Announcement';
import { OrderDetail, OrderStatusChip } from '../components/OrderDetail';
import { Loading, NotInitialized, PickMemberNotice } from '../components/StateViews';

/** 我的訂單:可隨時查看自己目前的訂單與最終確認結果 */
export function OrdersPage() {
  const { data, loaded, member, myOrder, myTotals } = useApp();

  if (!loaded) return <Loading />;
  if (!data.groupBuy) return <NotInitialized />;
  if (!member) return <PickMemberNotice />;

  return (
    <div>
      <AnnouncementBanner />
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">{member.name} 的訂單</h2>
          <OrderStatusChip order={myOrder} />
        </div>
        <p className="muted">團購活動:{data.groupBuy.name}</p>

        {myOrder?.status === 'confirmed' ? (
          <p className="notice notice--success">
            已於 {formatDateTime(myOrder.confirmedAt)} 最終確認,總金額 {formatCurrency(myTotals.amount)}。如需修改請聯繫主召解鎖。
          </p>
        ) : null}
        {myOrder?.status === 'draft' && myTotals.lines.length > 0 ? (
          <p className="notice notice--info">
            訂單尚未最終確認。{myOrder.reopenedAt ? `主召已於 ${formatDateTime(myOrder.reopenedAt)} 解鎖,` : ''}
            請到購物清單完成結帳。
          </p>
        ) : null}
        {myOrder?.status === 'cancelled' ? <p className="notice notice--warn">這張訂單已被主召取消,不會計入統計。</p> : null}

        {myTotals.lines.length === 0 ? (
          <div className="state">
            <p>你還沒有選購任何商品。</p>
            <a className="btn btn--gold" href="#/">
              前往選購
            </a>
          </div>
        ) : (
          <OrderDetail totals={myTotals} order={myOrder} />
        )}

        <div className="actions">
          <a className="btn btn--ghost" href="#/">
            回到團購首頁
          </a>
          {myOrder?.status === 'draft' && myTotals.lines.length > 0 ? (
            <a className="btn btn--gold" href="#/cart">
              前往購物清單
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
