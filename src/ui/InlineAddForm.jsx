import { useState, useRef, useEffect } from 'react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM, localToUtcHHMM, DAILY_TYPES, EVENT_TYPES, DAILY_TYPE_OPTS, PERIOD_TYPE_OPTS } from '../constants';
import { msUntilDeadline, formatCountdown, cdColor } from '../util/helpers';
import s from './InlineAddForm.module.css';
import shared from './shared.module.css';

const getCd = () => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') });

function addDaysToDate(dateStr, n) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

// ── DailyAddForm ──────────────────────────────────────────────────
// Props: game, item (optional — omit for add mode),
//        onAdd(task) | onSave(task), onCancel, submitLabel
function DailyAddForm({
  game,
  item,
  onAdd, onSave, onCancel,
  submitLabel,
}) {
  const typeOpts    = DAILY_TYPE_OPTS;
  const [type,      setType]      = useState(item?.type ?? typeOpts[0]);
  const [name,      setName]      = useState(item?.name ?? '');
  const [taskReset, setTaskReset] = useState(
    utcToLocalHHMM(item?.resetTime ?? game?.resetTime ?? '00:00')
  );

  const inputRef = useRef(null);
  // Use setTimeout to allow AnimatePresence to finish mounting before focusing
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (!name.trim()) return;
    const task = { type, name: name.trim() };
    if (taskReset) task.resetTime = localToUtcHHMM(taskReset);
    if (onSave) onSave(task); else onAdd(task);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className={s.form}>
      {/* Row 1: [type select] [name] */}
      <div className={s.row}>
        {typeOpts.length > 1 && (
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${shared.inputCls} ${s.typeSelect}`}>
            {typeOpts.map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
          </select>
        )}
        <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder={t(`types.${type}`)} className={`${shared.inputCls} ${s.nameInput}`} />
      </div>
      {/* Row 2: [resetLbl] [time] --spacer-- [add/save] [cancel] */}
      <div className={s.actionRow}>
        <span className={s.deadlineLbl}>{t('resetLbl')}</span>
        <input type="time" value={taskReset} onChange={(e) => setTaskReset(e.target.value)} className={`${shared.inputCls} ${s.timeInput}`} />
        <div className={s.spacer} />
        <button className={`${shared.btn} ${shared.btnConfirm}`} onClick={handleSubmit} disabled={!name.trim()}>
          {submitLabel ?? t('add')}
        </button>
        <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  );
}

// ── PeriodicAddForm ───────────────────────────────────────────────
// Props: game, item (optional — omit for add mode),
//        onAdd(task) | onSave(task), onCancel, submitLabel
function PeriodicAddForm({
  game,
  item,
  onAdd, onSave, onCancel,
  submitLabel,
}) {
  const typeOpts = PERIOD_TYPE_OPTS;
  const [type,         setType]         = useState(item?.type ?? typeOpts[0]);
  const [name,         setName]         = useState(item?.name ?? '');
  const [monthDay,     setMonthDay]     = useState(item?.monthlyResetDay ?? 1);
  const [weeklyDow,    setWeeklyDow]    = useState(item?.weeklyResetDay ?? 1);
  const [halfStartDay, setHalfStartDay] = useState(item?.halfMonthlyStartDay ?? 1);

  const inputRef = useRef(null);
  // Use setTimeout to allow AnimatePresence to finish mounting before focusing
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (!name.trim()) return;
    const task = { type, name: name.trim() };
    if (type === 'monthly') task.monthlyResetDay = Number(monthDay);
    if (type === 'weekly')      task.weeklyResetDay        = Number(weeklyDow);
    if (type === 'halfmonthly') task.halfMonthlyStartDay   = Number(halfStartDay);
    if (onSave) onSave(task); else onAdd(task);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className={s.form}>
      {/* Row 1: [type select] [name] */}
      <div className={s.row}>
        {typeOpts.length > 1 && (
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${shared.inputCls} ${s.typeSelect}`}>
            {typeOpts.map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
          </select>
        )}
        <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder={t(`types.${type}`)} className={`${shared.inputCls} ${s.nameInput}`} />
      </div>
      {/* Row 2: [resetLbl] [type-specific controls] --spacer-- [add/save] [cancel] */}
      <div className={s.actionRow}>
        <span className={s.deadlineLbl}>{t('resetLbl')}</span>
        {type === 'monthly' && (
          <>
            <input type="number" value={monthDay} min={1} max={28} onChange={(e) => setMonthDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.dayInput}`} />
            <span className={s.deadlineLbl}>{t('dayUnit')}</span>
          </>
        )}
        {type === 'weekly' && (
          <select value={weeklyDow} onChange={(e) => setWeeklyDow(Number(e.target.value))} className={`${shared.inputCls} ${s.typeSelect}`}>
            {[0,1,2,3,4,5,6].map((d) => <option key={d} value={d}>{t('dayNamesFull.' + d)}</option>)}
          </select>
        )}
        {type === 'halfmonthly' && (
          <>
            <input type="number" value={halfStartDay} min={1} max={15} onChange={(e) => setHalfStartDay(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))} className={`${shared.inputCls} ${s.dayInput}`} />
            <span className={s.deadlineLbl}>{t('halfMonthSuffix', { b: Number(halfStartDay) + 15 })}</span>
          </>
        )}
        <div className={s.spacer} />
        <button className={`${shared.btn} ${shared.btnConfirm}`} onClick={handleSubmit} disabled={!name.trim()}>
          {submitLabel ?? t('add')}
        </button>
        <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  );
}

// ── EventAddForm ──────────────────────────────────────────────────
// Props: game, item (optional — omit for add mode),
//        onAdd(item) | onSave(item), onCancel, submitLabel
function EventAddForm({
  game,
  item,
  initialColor,
  onAdd, onSave, onCancel,
  submitLabel,
}) {
  const [name,  setName]  = useState(item?.name ?? '');
  const [date,  setDate]  = useState(item?.deadline ?? '');
  const [time,  setTime]  = useState(item?.deadlineTime ? utcToLocalHHMM(item.deadlineTime) : '');
  const [color, setColor] = useState(initialColor ?? '#4a9eff');
  const showColor  = initialColor !== undefined;
  const defaultTime = game?.resetTime ?? '';

  const inputRef = useRef(null);
  // Use setTimeout to allow AnimatePresence to finish mounting before focusing
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-apply defaultTime on first date selection
  const handleDateChange = (val) => {
    setDate(val);
    if (val && !time && defaultTime) setTime(utcToLocalHHMM(defaultTime));
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item = {
      name:         trimmed,
      deadline:     date || null,
      deadlineTime: (date && time) ? localToUtcHHMM(time) : null,
    };
    if (showColor) item.color = color;
    if (onSave) onSave(item); else onAdd({ id: uid(), ...item });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  // Countdown to currently-set deadline
  const timeUtcForCd    = (date && time) ? localToUtcHHMM(time) : undefined;
  const deadlineMs      = date ? msUntilDeadline(date, new Date(), timeUtcForCd) : null;
  const deadlineExpired = deadlineMs !== null && deadlineMs <= 0;
  const deadlineColor   = cdColor(deadlineMs ?? Infinity, 24, 48);

  return (
    <div className={s.form}>
      {/* Row 1: [color] [name] -- full width */}
      <div className={s.row}>
        {showColor && (
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className={s.colorInput} />
        )}
        <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('scheduleLabel')} className={`${shared.inputCls} ${s.nameInput}`} />
      </div>

      {/* Row 2: Reset [date] [time] [countdown] --spacer-- [add] [cancel] */}
      <div className={s.actionRow}>
        <span className={s.deadlineLbl}>{t('resetLbl')}</span>
        <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className={`${shared.inputCls} ${s.dateInput}`} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} className={`${shared.inputCls} ${s.timeInput}${!date ? ` ${s.timeDisabled}` : ''}`} />
        {date && deadlineMs !== null && (
          <span className={s.deadlineInfo} style={{ color: deadlineColor }}>
            {deadlineExpired ? t('expired') : `⏱${formatCountdown(deadlineMs, getCd())}`}
          </span>
        )}
        <div className={s.spacer} />
        <button className={`${shared.btn} ${shared.btnConfirm}`} onClick={handleSubmit} disabled={!name.trim()}>
          {submitLabel ?? t('add')}
        </button>
        <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
      </div>

      {/* Row 3: [+N day quick buttons] */}
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
  );
}

// ── InlineAddForm ─────────────────────────────────────────────────
// Unified add/edit form. Branches internally on item.type (edit) or type prop (add).
// Edit mode: pass item — onSave(updates) is called on submit.
// Add  mode: pass type — onAdd(item) is called on submit.
// Props: game, item?, type?, onAdd?, onSave, onCancel
export function InlineAddForm({ game, item, type, onAdd, onSave, onCancel }) {
  const resolvedType = item?.type ?? type;
  const isEdit       = !!item;
  const submitLabel  = isEdit ? t('save') : undefined;
  if (EVENT_TYPES.has(resolvedType)) {
    return <EventAddForm game={game} item={item} onAdd={onAdd} onSave={onSave} onCancel={onCancel} submitLabel={submitLabel} />;
  }
  if (DAILY_TYPES.has(resolvedType)) {
    return <DailyAddForm game={game} item={item} onAdd={onAdd} onSave={onSave} onCancel={onCancel} submitLabel={submitLabel} />;
  }
  return <PeriodicAddForm game={game} item={item} onAdd={onAdd} onSave={onSave} onCancel={onCancel} submitLabel={submitLabel} />;
}
