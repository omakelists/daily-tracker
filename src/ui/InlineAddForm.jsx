import { useState, useRef, useEffect } from 'react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM, localToUtcHHMM } from '../constants';
import { msUntilDeadline, formatCountdown, fmtDeadlineDate } from '../util/helpers';
import s from './InlineAddForm.module.css';
import shared from './shared.module.css';

const getCd = () => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') });

function addDaysToDate(dateStr, n) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

/**
 * Props:
 *   onAdd(item) / onSave(item) / onCancel()
 *   initialName / initialDeadline / initialDeadlineTime / initialColor
 *   initialColor   — if provided, shows color picker
 *   submitLabel    — override "追加" label
 */
export function InlineAddForm({
  onAdd, onSave, onCancel,
  initialName = '', initialDeadline = '', initialDeadlineTime = '',
  initialColor,
  submitLabel,
  defaultTime = '',
}) {
  const [name,  setName]  = useState(initialName);
  const [date,  setDate]  = useState(initialDeadline);
  const [time,  setTime]  = useState(initialDeadlineTime ? utcToLocalHHMM(initialDeadlineTime) : '');
  const [color, setColor] = useState(initialColor ?? '#4a9eff');
  const inputRef  = useRef(null);
  const showColor = initialColor !== undefined;

  // 初回日付選択時、時刻未設定ならゲームのリセット時刻をデフォルト適用
  const handleDateChange = (val) => {
    setDate(val);
    if (val && !time && defaultTime) {
      setTime(utcToLocalHHMM(defaultTime));
    }
  };

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item = {
      name:         trimmed,
      deadline:     date || null,
      deadlineTime: (date && time) ? localToUtcHHMM(time) : null,
    };
    if (showColor) item.color = color;
    if (onSave) { onSave(item); } else { onAdd({ id: uid(), ...item }); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  // Countdown to currently-set deadline (with optional time)
  const timeUtcForCd    = (date && time) ? localToUtcHHMM(time) : undefined;
  const deadlineMs      = date ? msUntilDeadline(date, new Date(), timeUtcForCd) : null;
  const deadlineExpired = deadlineMs !== null && deadlineMs <= 0;
  const dh              = deadlineMs != null ? deadlineMs / 3600000 : Infinity;
  const deadlineColor   = deadlineExpired ? 'var(--danger)'
                        : dh < 24        ? 'var(--cd-urgent)'
                        : dh < 48        ? 'var(--cd-warn)'
                        :                  'var(--muted)';

  return (
    <div className={s.form}>
      {/* Row 1: [color] [name] [date] [time] */}
      <div className={s.row}>
        {showColor && (
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className={s.colorInput} />
        )}
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('scheduleLabel')}
          className={`${shared.inputCls} ${s.nameInput}`}
        />
        <div className={s.dateWrap}>
          <span className={s.deadlineLbl}>{t('resetLbl')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className={`${shared.inputCls} ${s.dateInput}`}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={!date}
            className={`${shared.inputCls} ${s.timeInput}${!date ? ` ${s.timeDisabled}` : ''}`}
          />
        </div>
      </div>

      {/* Row 2: [+N日 buttons] [⏱残り] ─spacer─ [追加][キャンセル] */}
      <div className={s.quickRow}>
        {[1, 2, 5, 10].map((n) => (
          <button
            key={n}
            className={`${shared.btn} ${s.quickBtn}`}
            onClick={() => {
              const newDate = addDaysToDate(date, n);
              setDate(newDate);
              if (!time && defaultTime) setTime(utcToLocalHHMM(defaultTime));
            }}
          >
            +{n}{t('cd.d')}
          </button>
        ))}

        {date && deadlineMs !== null && (
          <span className={s.deadlineInfo} style={{ color: deadlineColor }}>
            {deadlineExpired ? t('expired') : `⏱${formatCountdown(deadlineMs, getCd())}`}
          </span>
        )}

        <div className={s.spacer} />
        <button
          className={`${shared.btn} ${shared.btnConfirm}`}
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {submitLabel ?? t('add')}
        </button>
        <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  );
}
