import { useState } from 'react';
import { ClipboardList, Clock, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GROUP_STATUS_LABEL } from '../lib/calc';
import { formatCurrency, formatDateTime } from '../lib/format';
import { AnnouncementBanner } from '../components/Announcement';
import { OrderStatusChip } from '../components/OrderDetail';
import { ProductCard } from '../components/ProductCard';
import { Loading, NotInitialized } from '../components/StateViews';

export function ShopPage() {
  const { data, loaded, activeProducts, ordering, member, myOrder, myTotals } = useApp();
  const [category, setCategory] = useState<string>('全部');

  if (!loaded) return <Loading />;
  const group = data.groupBuy;
  if (!group) return <NotInitialized />;

  const categories = ['全部', ...Array.from(new Set(activeProducts.map((p) => p.category)))];
  const visible = category === '全部' ? activeProducts : activeProducts.filter((p) => p.category === category);

  return (
    <div className="has-sticky">
      <section className="hero">
        <p className="eyebrow">精選好物・限量成團・優雅選購</p>
        <h1 className="hero__title">{group.name}</h1>
        <p className="hero__desc">{group.description}</p>

        <div className="hero__meta">
          <span className={`chip chip--status-${group.status}`}>活動狀態:{GROUP_STATUS_LABEL[group.status]}</span>
          <span className="hero__deadline">
            <Clock size={15} /> 截止時間 {formatDateTime(group.deadline)}
          </span>
          {member ? (
            <span className="hero__deadline">
              {member.name} 的訂單:<OrderStatusChip order={myOrder} />
            </span>
          ) : null}
        </div>

        {!ordering.open ? <p className="notice notice--warn">目前無法修改訂單:{ordering.reason}</p> : null}
        {!member ? <p className="notice notice--info">請先在上方選擇你的姓名,才能開始選購。</p> : null}

        <div className="hero__cta">
          <a className="btn btn--gold" href="#/cart">
            <ShoppingBag size={18} />
            前往購物清單({myTotals.quantity} 件)
          </a>
          <a className="btn btn--outline-light" href="#/orders">
            <ClipboardList size={18} />
            查看我的訂單
          </a>
        </div>
        <p className="hero__summary">
          目前已選購 <strong>{myTotals.kinds}</strong> 種商品、<strong>{myTotals.quantity}</strong> 件,小計{' '}
          <strong>{formatCurrency(myTotals.amount)}</strong>
        </p>
      </section>

      <AnnouncementBanner />

      <div className="filters" role="tablist" aria-label="商品分類">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            className={`filter${category === c ? ' is-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">目前沒有上架的商品。</p>
      ) : (
        <div className="grid">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="sticky-cart">
        <div className="sticky-cart__sum">
          <strong>{myTotals.quantity} 件</strong>
          <span>{formatCurrency(myTotals.amount)}</span>
        </div>
        <a className="btn btn--gold" href="#/cart">
          <ShoppingBag size={18} />
          前往購物清單
        </a>
      </div>
    </div>
  );
}
