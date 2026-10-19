import { useState } from 'react';
import { Megaphone, Send, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { summarizeMembers } from '../../lib/calc';
import { formatDateTime } from '../../lib/format';
import { Modal } from '../Modal';

export const DEFAULT_NOTICE_TITLE = '最終確認通知';
export const DEFAULT_NOTICE_BODY =
  '本次團購已進入最終確認階段,請各位團員再次核對自己的商品、規格及數量。如有錯誤,請於公告指定期限內聯繫主召。逾期後將依最終確認資料彙整訂單。';

/** 最終確認通知:預覽 → 編輯 → 發布(儲存後前台顯示公告) */
export function AdminNotice() {
  const { data, products, publishNotice, retractNotice } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(DEFAULT_NOTICE_TITLE);
  const [body, setBody] = useState(DEFAULT_NOTICE_BODY);
  const [busy, setBusy] = useState(false);

  const rows = summarizeMembers(data.members, data.orders, products);
  const notConfirmed = rows.filter((r) => r.order?.status !== 'confirmed' && r.order?.status !== 'cancelled');
  const current = data.announcement;

  const openPreview = () => {
    setTitle(current?.title ?? DEFAULT_NOTICE_TITLE);
    setBody(current?.body ?? DEFAULT_NOTICE_BODY);
    setOpen(true);
  };

  const publish = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const ok = await publishNotice(title, body);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="panel__title">最終確認通知</h2>
        <p className="notice notice--info">
          <strong>Prototype 模擬通知:</strong>發布後只會在本網站顯示公告(進入網站時跳出提醒,並常駐於首頁與「我的訂單」),
          <strong>不會寄送 Email、LINE 或手機推播</strong>。請另外透過原本的群組通知團員。
        </p>

        {current ? (
          <div className="announce announce--static">
            <div className="announce__icon">
              <Megaphone size={20} />
            </div>
            <div className="announce__main">
              <p className="announce__title">目前公告:{current.title}</p>
              <p className="announce__body">{current.body}</p>
              <p className="muted small">發布時間:{formatDateTime(current.publishedAt)}</p>
            </div>
          </div>
        ) : (
          <p className="empty">目前沒有已發布的公告。</p>
        )}

        <div className="actions">
          <button type="button" className="btn btn--gold" onClick={openPreview}>
            <Send size={16} /> 發送最終確認通知
          </button>
          {current ? (
            <button type="button" className="btn btn--ghost" onClick={() => void retractNotice()}>
              <Undo2 size={16} /> 撤回公告
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel__title panel__title--sm">尚未最終確認的團員({notConfirmed.length} 人)</h3>
        {notConfirmed.length === 0 ? (
          <p className="empty">所有未取消的團員都已最終確認。</p>
        ) : (
          <ul className="plain-list">
            {notConfirmed.map((r) => (
              <li key={r.member.id}>
                {r.member.name} <span className="muted">— {r.statusLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <Modal
          title="通知預覽"
          wide
          onClose={() => !busy && setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={busy}>
                取消
              </button>
              <button type="button" className="btn btn--gold" onClick={() => void publish()} disabled={busy || !body.trim()}>
                {busy ? '發布中…' : '確認發布'}
              </button>
            </>
          }
        >
          <div className="form">
            <label className="field">
              <span className="field__label">通知標題</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
            </label>
            <label className="field">
              <span className="field__label">通知內容(可自行編輯,例如加入核對期限)</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={600} />
            </label>
            <div>
              <p className="field__label">團員看到的樣子</p>
              <div className="announce announce--static">
                <div className="announce__icon">
                  <Megaphone size={20} />
                </div>
                <div className="announce__main">
                  <p className="announce__title">
                    {title.trim() || DEFAULT_NOTICE_TITLE} <span className="chip chip--test">Prototype 模擬通知</span>
                  </p>
                  <p className="announce__body" style={{ whiteSpace: 'pre-wrap' }}>{body}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
