import { useState, useRef, useEffect } from 'react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM, localToUtcHHMM, DAILY_TYPES, EVENT_TYPES } from '../constants';
import { msUntilDeadline, formatCountdown, cdColor } from '../util/helpers';
import s from './InlineAddForm.module.css';
import shared from './shared.module.css';

const getCd = () => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') });

function addDaysToDate(dateStr, n) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

// ── InlineAddForm ─────────────────────────────────────────────────
// Unified add/edit form for all task and event types.
// Edit mode: pass item — onSave(updates) is called on submit.
// Add  mode: pass type — onAdd(item)    is called on submit.
// Props: game, item?, type?, onAdd?, onSave, onCancel
export function InlineAddForm({ game, item, type, onAdd, onSave, onCancel }) {
  const resolvedType = item?.type ?? type;
  const isEvent      = resolvedType === 'event';
  const isEdit       = !!item;
  const submitLabel  = isEdit ? t('save') : undefined;
  const defaultTime  = game?.resetTime ?? '';

  // ── State ────────────────────────────────────────────────────────
  const [name,         setName]         = useState(item?.name ?? '');
  // daily
  const [taskReset,    setTaskReset]    = useState(
    utcToLocalHHMM(item?.resetTime ?? game?.resetTime ?? '00:00')
  );
  // periodic
  const [monthDay,     setMonthDay]     = useState(item?.monthlyResetDay ?? 1);
  const [weeklyDow,    setWeeklyDow]    = useState(item?.weeklyResetDay ?? 1);
  const [halfStartDay, setHalfStartDay] = useState(item?.halfMonthlyStartDay ?? 1);
  // event
  const [date,         setDate]         = useState(item?.deadline ?? '');
  const [time,         setTime]         = useState(item?.deadlineTime ? utcToLocalHHMM(item.deadlineTime) : '');

  const inputRef = useRef(null);
  // Use setTimeout to allow AnimatePresence to finish mounting before focusing
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event helpers ────────────────────────────────────────────────
  // Auto-apply defaultTime on first date selection
  const handleDateChange = (val) => {
    setDate(val);
    if (val && !time && defaultTime) setTime(utcToLocalHHMM(defaultTime));
  };

  // Countdown to currently-set deadline
  const timeUtcForCd    = (date && time) ? localToUtcHHMM(time) : undefined;
  const deadlineMs      = isEvent && date ? msUntilDeadline(date, new Date(), timeUtcForCd) : null;
  const deadlineExpired = deadlineMs !== null && deadlineMs <= 0;
  const deadlineColor   = cdColor(deadlineMs ?? Infinity, 24, 48);

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!name.trim()) return;
    const task = { type: resolvedType, name: name.trim() };
    if (resolvedType === 'daily')           task.resetTime          = localToUtcHHMM(taskReset);
    if (resolvedType === 'monthly')         task.monthlyResetDay    = Number(monthDay);
    if (resolvedType === 'weekly')          task.weeklyResetDay     = Number(weeklyDow);
    if (resolvedType === 'halfmonthly')     task.halfMonthlyStartDay = Number(halfStartDay);
    if (resolvedType === 'event') {
      task.id = uid();
      task.deadline = date || null;
      task.deadlineTime = (date && time) ? localToUtcHHMM(time) : null;
    }
    if (onSave) onSave(task); else onAdd(task);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  // ── Reset controls (type-specific) ──────────────────────────────
  const resetControls = isEvent ? (
    // Event: [date][time][countdown] + quick +N day buttons stacked below
    <div className={s.eventControlGroup}>
      <div className={s.resetGroup}>
        <span className={s.deadlineLbl}>{t('resetLbl')}</span>
        <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className={`${shared.inputCls} ${s.dateInput}`} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} className={`${shared.inputCls} ${s.timeInput}${!date ? ` ${s.timeDisabled}` : ''}`} />
        {date && deadlineMs !== null && (
          <span className={s.deadlineInfo} style={{ color: deadlineColor }}>
            {deadlineExpired ? t('expired') : `⏱${formatCountdown(deadlineMs, getCd())}`}
          </span>
        )}
      </div>
      <div className={s.quickRow}>
        {[1, 2, 5, 10].map((n) => (
          <button key={n} className={`${shared.btn} ${s.quickBtn}`} onClick={() => {
            const newDate = addDaysToDate(date, n);
            setDate(newDate);
            if (!time && defaultTime) setTime(utcToLocalHHMM(defaultTime));
          }}>
            +{n}{t('cd.d')}
          </button>
        ))}
      </div>
    </div>
  ) : (
    // Task: [resetLbl] + type-specific input
    <div className={s.resetGroup}>
      <span className={s.deadlineLbl}>{t('resetLbl')}</span>
      {resolvedType === 'daily' && (
        <input type="time" value={taskReset} onChange={(e) => setTaskReset(e.target.value)} className={`${shared.inputCls} ${s.timeInput}`} />
      )}
      {resolvedType === 'monthly' && (
        <>
          <input type="number" value={monthDay} min={1} max={28} onChange={(e) => setMonthDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.dayInput}`} />
          <span className={s.deadlineLbl}>{t('dayUnit')}</span>
        </>
      )}
      {resolvedType === 'weekly' && (
        <select value={weeklyDow} onChange={(e) => setWeeklyDow(Number(e.target.value))} className={`${shared.inputCls} ${s.typeSelect}`}>
          {[0,1,2,3,4,5,6].map((d) => <option key={d} value={d}>{t('dayNamesFull.' + d)}</option>)}
        </select>
      )}
      {resolvedType === 'halfmonthly' && (
        <>
          <input type="number" value={halfStartDay} min={1} max={15} onChange={(e) => setHalfStartDay(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.dayInput}`} />
          <span className={s.deadlineLbl}>{t('halfMonthSuffix', { b: Number(halfStartDay) + 15 })}</span>
        </>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────
  // Layout:
  //   Wide:   [color?][name input ──────────────] [resetControls]
  //   Narrow: [color?][name input ──────────────]
  //                                    [resetControls] ←right-aligned
  //   Always: [add/save][cancel] ←own line, right-aligned
  return (
    <div className={s.form}>
      <div className={s.mainRow}>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(`types.${resolvedType}`)}
          className={`${shared.inputCls} ${s.nameInput}`}
        />
        {resetControls}
        <div className={s.btnRow}>
          <button className={`${shared.btn} ${shared.btnConfirm}`} onClick={handleSubmit} disabled={!name.trim()}>
            {submitLabel ?? t('add')}
          </button>
          <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
