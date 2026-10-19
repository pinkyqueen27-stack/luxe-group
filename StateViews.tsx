import { Database } from 'lucide-react';

export function Loading() {
  return (
    <div className="state" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>資料載入中…</p>
    </div>
  );
}

/** 雲端資料庫還是空的(尚未由主召初始化)時顯示 */
export function NotInitialized() {
  return (
    <div className="state card">
      <Database size={28} />
      <h2>雲端資料庫尚未初始化</h2>
      <p>請主召進入「主召後台」,按下「初始化雲端資料」後,團購活動與商品就會出現在這裡。</p>
      <a className="btn btn--gold" href="#/admin">
        前往主召後台
      </a>
    </div>
  );
}

export function PickMemberNotice() {
  return (
    <div className="state card">
      <h2>請先選擇團員身分</h2>
      <p>請在頁面上方「團員身分」選單選擇你的姓名。測試模式不需要密碼,但身分並未驗證。</p>
      <a className="btn btn--ghost" href="#/">
        回到團購首頁
      </a>
    </div>
  );
}
