import { useEffect, useRef, type ReactNode } from 'react';
import { ClipboardList, FlaskConical, Gem, ShieldAlert, ShoppingBag, Store, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

function MemberPicker() {
  const { members, memberId, member, selectMember } = useApp();
  return (
    <div className="member-picker">
      <label htmlFor="member-select">團員身分</label>
      <select
        id="member-select"
        value={member ? member.id : ''}
        onChange={(e) => selectMember(e.target.value || null)}
        aria-describedby="member-hint"
      >
        <option value="">— 請選擇你的姓名 —</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <span id="member-hint" className="member-picker__hint">
        {member ? `目前身分:${member.name}` : memberId ? '找不到先前選擇的團員,請重新選擇' : '尚未選擇身分'}
      </span>
    </div>
  );
}

function ModeBar() {
  const { repoKind } = useApp();
  return (
    <div className="modebar">
      <div className="container modebar__inner">
        <span className="chip chip--test">
          <FlaskConical size={13} /> 測試模式
        </span>
        <span>身分未經驗證:選擇姓名即可操作,並非正式登入。結帳為模擬,不會收款。</span>
        <span className="modebar__data">
          {repoKind === 'cloud'
            ? '資料:Firebase 雲端(所有團員共用)'
            : repoKind === 'local'
              ? '資料:僅存在這個瀏覽器(未連接雲端,無法與其他人同步)'
              : '資料:載入中…'}
        </span>
      </div>
    </div>
  );
}

function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastView key={t.id} id={t.id} tone={t.tone} message={t.message} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastView({
  id,
  tone,
  message,
  onDismiss,
}: {
  id: number;
  tone: 'success' | 'error' | 'info';
  message: string;
  onDismiss: (id: number) => void;
}) {
  // 用 ref 保存最新的 onDismiss,避免畫面重新渲染時重設計時器
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(id), tone === 'error' ? 7000 : 3500);
    return () => window.clearTimeout(timer);
  }, [id, tone]);
  return (
    <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      <button type="button" className="icon-btn" onClick={() => onDismiss(id)} aria-label="關閉訊息">
        <X size={14} />
      </button>
    </div>
  );
}

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  const { myTotals, error } = useApp();
  const nav = [
    { to: '/', label: '團購首頁', icon: <Store size={16} /> },
    { to: '/cart', label: '購物清單', icon: <ShoppingBag size={16} />, badge: myTotals.quantity },
    { to: '/orders', label: '我的訂單', icon: <ClipboardList size={16} /> },
    { to: '/admin', label: '主召後台', icon: <ShieldAlert size={16} /> },
  ];
  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <>
      <ModeBar />
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#/" aria-label="LUXE GROUP 首頁">
            <Gem size={24} />
            <span className="brand__text">
              <span className="brand__name">LUXE GROUP</span>
              <span className="brand__sub">精選好物・限量成團・優雅選購</span>
            </span>
          </a>
          <MemberPicker />
        </div>
      </header>
      {/* 只有導覽列會固定在畫面頂端,避免手機上頁首佔掉太多空間 */}
      <div className="nav-bar">
        <nav className="container nav" aria-label="主選單">
          {nav.map((item) => (
            <a key={item.to} href={`#${item.to}`} className={`nav__link${isActive(item.to) ? ' is-active' : ''}`}>
              {item.icon}
              {item.label}
              {item.badge ? <span className="nav__badge">{item.badge}</span> : null}
            </a>
          ))}
        </nav>
      </div>

      <main className="container main">
        {error ? (
          <p className="notice notice--error" role="alert">
            資料連線發生問題:{error}
          </p>
        ) : null}
        {children}
      </main>

      <footer className="site-footer">
        <div className="container">
          <strong>LUXE GROUP 精品團購</strong> · Prototype 測試版。成團僅代表達到數量門檻,不代表供應商已接受訂單;本站不處理金流。
        </div>
      </footer>
      <ToastHost />
    </>
  );
}
