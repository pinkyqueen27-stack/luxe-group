import { CircleCheck } from 'lucide-react';
import type { GroupProgress } from '../lib/calc';

/** 成團狀態標籤:已成團 = 橙色;尚未成團 / 尚未開始 = 灰色 */
export function ProgressBadge({ progress, className = '' }: { progress: GroupProgress; className?: string }) {
  const tone = progress.status === 'formed' ? 'formed' : 'pending';
  return (
    <span className={`badge badge--${tone} ${className}`} data-status={progress.status}>
      {progress.status === 'formed' ? <CircleCheck size={14} /> : null}
      {progress.label}
    </span>
  );
}

/** 本團進度條:餘數為 0 且已有數量時顯示為滿格(剛好成團),再往上才開始累計下一團 */
export function ProgressBar({ progress }: { progress: GroupProgress }) {
  const percent =
    progress.total === 0 ? 0 : progress.remainder === 0 ? 100 : Math.round((progress.remainder / progress.groupSize) * 100);
  const tone = progress.status === 'formed' ? 'formed' : 'pending';
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={progress.groupSize}
      aria-valuenow={progress.remainder === 0 && progress.total > 0 ? progress.groupSize : progress.remainder}
      aria-label="目前這一團的進度"
    >
      <div className={`progress__fill progress__fill--${tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
