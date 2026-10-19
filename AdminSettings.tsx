import { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import type { GroupStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { GROUP_STATUS_LABEL } from '../../lib/calc';
import { isoToLocalInput, localInputToIso } from '../../lib/format';
import { ConfirmDialog } from '../Modal';

/** 團購活動設定 + 測試資料維護 */
export function AdminSettings() {
  const { data, saveGroupBuy, resetData, repoKind, notify } = useApp();
  const group = data.groupBuy!;

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [deadline, setDeadline] = useState(isoToLocalInput(group.deadline));
  const [status, setStatus] = useState<GroupStatus>(group.status);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      notify('請輸入團購活動名稱', 'error');
      return;
    }
    const iso = localInputToIso(deadline);
    if (!iso) {
      notify('請選擇有效的截止時間', 'error');
      return;
    }
    setSaving(true);
    await saveGroupBuy({ ...group, name: name.trim(), description: description.trim(), deadline: iso, status });
    setSaving(false);
  };

  const doReset = async () => {
    setBusy(true);
    const ok = await resetData();
    setBusy(false);
    // 重置後,上層會以新的 key 重新建立這個表單,顯示最新的示範資料
    if (ok) setResetting(false);
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="panel__title">團購活動設定</h2>
        <div className="form">
          <label className="field">
            <span className="field__label">團購活動名稱</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <label className="field">
            <span className="field__label">團購說明</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300} />
          </label>
          <div className="form__row">
            <label className="field">
              <span className="field__label">截止時間</span>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">活動狀態</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as GroupStatus)}>
                {(Object.keys(GROUP_STATUS_LABEL) as GroupStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {GROUP_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted small">
            只有「開放訂購」且尚未超過截止時間,團員才能修改訂單。商品的成團門檻、每人限購與活動總限購,請到「商品管理」設定。
          </p>
          <div className="actions">
            <button type="button" className="btn btn--gold" onClick={() => void save()} disabled={saving}>
              <Save size={16} /> {saving ? '儲存中…' : '儲存活動設定'}
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">測試資料維護</h2>
        <p className="muted">
          目前資料位置:{repoKind === 'cloud' ? 'Firebase 雲端(所有團員共用)' : '這個瀏覽器的 localStorage(僅此裝置)'}。
        </p>
        <p className="notice notice--warn">
          「重置測試資料」會<strong>刪除所有訂單、公告與你修改過的商品</strong>,並還原為示範資料。
          {repoKind === 'cloud' ? '雲端模式下會影響所有團員。' : ''}
        </p>
        <div className="actions">
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setResetting(true)}>
            <RotateCcw size={16} /> 重置測試資料
          </button>
        </div>
      </section>

      {resetting ? (
        <ConfirmDialog
          title="重置測試資料"
          danger
          confirmLabel="確認重置"
          busy={busy}
          onClose={() => !busy && setResetting(false)}
          onConfirm={doReset}
          message={<p>確定要清除所有訂單、公告與商品修改,並還原為示範資料嗎?這個動作無法復原。</p>}
        />
      ) : null}
    </div>
  );
}
