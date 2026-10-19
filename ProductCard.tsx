import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { Product } from '../types';
import { useApp } from '../context/AppContext';
import { calcGroupProgress } from '../lib/calc';
import { formatCurrency } from '../lib/format';
import { productArtDataUri } from '../lib/productArt';
import { DEFAULT_MAX_QTY, getQuantityLimits, validateQuantity } from '../lib/quantity';
import { ProgressBadge, ProgressBar } from './ProgressBadge';
import { QuantityInput } from './QuantityInput';

export function ProductCard({ product }: { product: Product }) {
  const { stats, myOrder, othersTotals, ordering, member, setQuantity } = useApp();
  const [imageFailed, setImageFailed] = useState(false);

  const total = stats.get(product.id)?.total ?? 0;
  const progress = stats.get(product.id)?.progress ?? calcGroupProgress(0, product.groupSize);
  const mine = myOrder?.items.find((i) => i.productId === product.id)?.quantity ?? 0;
  const limits = getQuantityLimits(product, othersTotals.get(product.id) ?? 0);

  // 為什麼不能操作?(依序判斷,顯示第一個原因)
  let lockReason: string | null = null;
  if (!member) lockReason = '請先在上方選擇團員身分,才能選購';
  else if (!ordering.open) lockReason = ordering.reason;
  else if (myOrder?.status === 'confirmed') lockReason = '訂單已最終確認,如需修改請聯繫主召解鎖';
  else if (myOrder?.status === 'cancelled') lockReason = '你的訂單已被主召取消,請聯繫主召';

  const unit = product.unit;
  const overLimit = mine > 0 ? validateQuantity(mine, limits) : null;
  const image = imageFailed || !product.imageUrl ? productArtDataUri(product) : product.imageUrl;

  const limitTexts: string[] = [];
  if (product.minQty > 1) limitTexts.push(`最低訂購 ${product.minQty} ${unit}`);
  limitTexts.push(product.perPersonLimit != null ? `每人限購 ${product.perPersonLimit} ${unit}` : `每人最多 ${DEFAULT_MAX_QTY} ${unit}`);
  if (product.totalLimit != null) {
    limitTexts.push(`活動總量 ${product.totalLimit} ${unit}(剩 ${Math.max(0, product.totalLimit - total)} ${unit})`);
  }

  return (
    <article className="card product" data-testid={`product-${product.id}`}>
      <div className="product__media">
        <img src={image} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} />
        <span className="tag">{product.category}</span>
        <ProgressBadge progress={progress} className="product__badge" />
      </div>

      <div className="product__body">
        <h3 className="product__name">{product.name}</h3>
        <p className="product__spec">{product.spec}</p>
        {product.description ? <p className="product__desc">{product.description}</p> : null}

        <p className="product__price">
          <strong>{formatCurrency(product.price)}</strong>
          <span> / {unit}</span>
        </p>

        <dl className="facts">
          <div>
            <dt>成團門檻</dt>
            <dd>每團 {product.groupSize} {unit}</dd>
          </div>
          <div>
            <dt>目前團購總數量</dt>
            <dd>{total} {unit}</dd>
          </div>
          <div>
            <dt>已成團數量</dt>
            <dd>
              {progress.groups} 團{progress.groups > 0 ? `(${progress.groups * progress.groupSize} ${unit})` : ''}
            </dd>
          </div>
          <div>
            <dt>距離下一團</dt>
            <dd>還差 {progress.shortfall} {unit}</dd>
          </div>
        </dl>

        <ProgressBar progress={progress} />
        <p className="product__limits">{limitTexts.join(' · ')}</p>

        <div className="product__buy">
          <span className="product__buy-label">我的選購數量</span>
          <QuantityInput
            value={mine}
            limits={limits}
            disabled={lockReason !== null}
            label={product.name}
            onCommit={(next) => setQuantity(product.id, next)}
          />
        </div>

        {mine > 0 ? (
          <p className="product__subtotal">
            我的小計 <strong>{formatCurrency(mine * product.price)}</strong>
          </p>
        ) : null}

        {overLimit && !overLimit.ok && lockReason === null ? (
          <p className="notice notice--warn" role="alert">
            你目前的數量已超過限制:{overLimit.error}。請調整後再結帳。
          </p>
        ) : null}

        {lockReason ? (
          <p className="product__lock">
            <Lock size={14} /> {lockReason}
          </p>
        ) : null}
      </div>
    </article>
  );
}
