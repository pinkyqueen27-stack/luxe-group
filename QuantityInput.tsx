import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { stepQuantity, validateQuantity, type QuantityCheck, type QuantityLimits } from '../lib/quantity';

interface QuantityInputProps {
  value: number;
  limits: QuantityLimits;
  disabled?: boolean;
  /** 給螢幕閱讀器與錯誤訊息使用,例如商品名稱 */
  label: string;
  onCommit: (value: number) => Promise<QuantityCheck>;
}

/** 數量調整:增加、減少、直接輸入;輸入不合法時顯示繁體中文錯誤,且不會送出 */
export function QuantityInput({ value, limits, disabled, label, onCommit }: QuantityInputProps) {
  const [text, setText] = useState<string>(String(value));
  const [error, setError] = useState<string | null>(null);

  // 外部數量改變(例如儲存完成、其他裝置修改)時,同步輸入框
  useEffect(() => {
    setText(String(value));
    setError(null);
  }, [value]);

  const commit = async (next: number) => {
    const result = await onCommit(next);
    if (!result.ok) setError(result.error);
  };

  const onType = (raw: string) => {
    setText(raw);
    const check = validateQuantity(raw, limits);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    if (check.value !== value) void commit(check.value);
  };

  const step = (direction: 1 | -1) => {
    const check = stepQuantity(value, direction, limits);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    void commit(check.value);
  };

  return (
    <div className="qty">
      <div className={`qty__control${error ? ' is-invalid' : ''}`}>
        <button
          type="button"
          className="qty__btn"
          onClick={() => step(-1)}
          disabled={disabled || value <= 0}
          aria-label={`減少 ${label} 數量`}
        >
          <Minus size={16} />
        </button>
        <input
          className="qty__input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          disabled={disabled}
          aria-label={`${label} 購買數量`}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onType(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="qty__btn"
          onClick={() => step(1)}
          disabled={disabled}
          aria-label={`增加 ${label} 數量`}
        >
          <Plus size={16} />
        </button>
      </div>
      {error ? (
        <p className="qty__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
