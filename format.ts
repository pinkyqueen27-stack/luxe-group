const pad = (n: number): string => String(n).padStart(2, '0');

export function formatCurrency(amount: number): string {
  return `NT$ ${Math.round(amount).toLocaleString('en-US')}`;
}

/** 顯示用:2026/10/19 12:30 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 檔名用:20261019 */
export function formatDateCompact(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** ISO → <input type="datetime-local"> 需要的格式 */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 匯出檔名:LUXE_GROUP_團購名稱_YYYYMMDD.xlsx(移除檔名不允許的字元) */
export function buildExportFileName(groupName: string, date: Date): string {
  const safe = groupName.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || '團購';
  return `LUXE_GROUP_${safe}_${formatDateCompact(date)}.xlsx`;
}
