import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../lib/format';
import { getBrowserStorage } from '../lib/safeStorage';
import { Modal } from './Modal';

const SEEN_KEY = 'luxe-group:seenAnnouncement';

/** 常駐公告橫幅(首頁與我的訂單頁) */
export function AnnouncementBanner() {
  const { data } = useApp();
  const a = data.announcement;
  if (!a) return null;
  return (
    <section className="announce" aria-label="團購公告">
      <div className="announce__icon">
        <Megaphone size={20} />
      </div>
      <div className="announce__main">
        <p className="announce__title">
          {a.title} <span className="chip chip--test">站內公告</span>
        </p>
        <p className="announce__body">{a.body}</p>
        <p className="muted small">發布時間:{formatDateTime(a.publishedAt)}</p>
        <a className="btn btn--gold btn--sm" href="#/orders">
          再次核對我的訂單
        </a>
      </div>
    </section>
  );
}

/** 團員進入網站時,若有「還沒看過」的新公告,自動跳出提醒(每則公告只提醒一次) */
export function AnnouncementPopup() {
  const { data, loaded } = useApp();
  const a = data.announcement;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loaded || !a) {
      setOpen(false);
      return;
    }
    setOpen(getBrowserStorage('local').getItem(SEEN_KEY) !== a.id);
  }, [loaded, a?.id]);

  if (!open || !a) return null;

  const dismiss = () => {
    getBrowserStorage('local').setItem(SEEN_KEY, a.id);
    setOpen(false);
  };

  return (
    <Modal
      title={a.title}
      onClose={dismiss}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            我知道了
          </button>
          <a
            className="btn btn--gold"
            href="#/orders"
            onClick={dismiss}
          >
            核對我的訂單
          </a>
        </>
      }
    >
      <p className="prose" style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
      <p className="muted small">發布時間:{formatDateTime(a.publishedAt)} · 站內公告(未寄送 Email、LINE 或手機推播)</p>
    </Modal>
  );
}
