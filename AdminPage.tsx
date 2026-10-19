import { useState, type FormEvent } from 'react';
import { Database, Download, LogOut, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportExcel } from '../lib/exportExcel';
import { AdminNotice } from '../components/admin/AdminNotice';
import { AdminOrders } from '../components/admin/AdminOrders';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminProducts } from '../components/admin/AdminProducts';
import { AdminSettings } from '../components/admin/AdminSettings';
import { Loading } from '../components/StateViews';

const TABS = [
  { id: 'overview', label: '成團總覽' },
  { id: 'orders', label: '團員訂單' },
  { id: 'products', label: '商品管理' },
  { id: 'settings', label: '活動設定' },
  { id: 'notice', label: '最終確認通知' },
] as const;

function AdminLogin() {
  const { loginAdmin, notify } = useApp();
  const [pin, setPin] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!loginAdmin(pin)) {
      notify('密碼不正確', 'error');
      setPin('');
    }
  };

  return (
    <section className="panel panel--narrow">
      <h2 className="panel__title">
        <ShieldAlert size={20} /> 主召後台測試入口
      </h2>
      <p className="notice notice--warn">
        這<strong>不是安全的正式登入機制</strong>:密碼存在網頁程式裡,任何人都能查到。它只能防止誤觸,
        不能保護資料。正式使用前請改為真正的帳號登入與權限控管。
      </p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="field__label">測試入口密碼</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="off"
            placeholder="請輸入測試密碼"
          />
        </label>
        <div className="actions">
          <button type="submit" className="btn btn--gold" disabled={!pin.trim()}>
            進入後台
          </button>
        </div>
      </form>
    </section>
  );
}

/** 雲端資料庫第一次使用時的初始化畫面 */
function InitPanel() {
  const { resetData, repoKind } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel state">
      <Database size={28} />
      <h2>{repoKind === 'cloud' ? '雲端資料庫尚未初始化' : '尚未建立團購資料'}</h2>
      <p>按下按鈕後,會寫入示範的團購活動、商品與團員名單(不含任何訂單)。之後可在後台自行修改。</p>
      <button
        type="button"
        className="btn btn--gold"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await resetData();
          setBusy(false);
        }}
      >
        {busy ? '初始化中…' : repoKind === 'cloud' ? '初始化雲端資料' : '建立示範資料'}
      </button>
    </section>
  );
}

export function AdminPage({ path }: { path: string }) {
  const { isAdmin, logoutAdmin, data, loaded, notify } = useApp();
  const [exporting, setExporting] = useState(false);

  if (!loaded) return <Loading />;
  if (!isAdmin) return <AdminLogin />;

  const sub = path.split('/')[2] || 'overview';
  const current = TABS.find((t) => t.id === sub)?.id ?? 'overview';

  const onExport = async () => {
    setExporting(true);
    try {
      const fileName = await exportExcel(data);
      notify(`已匯出 ${fileName}`, 'success');
    } catch (e) {
      notify(`匯出失敗:${e instanceof Error ? e.message : '未知錯誤'}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">主召後台</h1>
          <p className="muted small">測試入口(非正式登入)· 所有數字皆由訂單資料即時計算</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn--gold" onClick={() => void onExport()} disabled={exporting || !data.groupBuy}>
            <Download size={16} /> {exporting ? '匯出中…' : '匯出 Excel'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={logoutAdmin}>
            <LogOut size={16} /> 登出後台
          </button>
        </div>
      </div>

      {!data.groupBuy ? (
        <InitPanel />
      ) : (
        <>
          <nav className="tabs" aria-label="後台功能">
            {TABS.map((t) => (
              <a key={t.id} href={`#/admin/${t.id}`} className={`tabs__tab${current === t.id ? ' is-active' : ''}`}>
                {t.label}
              </a>
            ))}
          </nav>
          {current === 'overview' ? <AdminOverview /> : null}
          {current === 'orders' ? <AdminOrders /> : null}
          {current === 'products' ? <AdminProducts /> : null}
          {current === 'settings' ? <AdminSettings key={data.groupBuy.updatedAt} /> : null}
          {current === 'notice' ? <AdminNotice /> : null}
        </>
      )}
    </div>
  );
}
