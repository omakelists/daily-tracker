import { useState, useRef, useEffect } from 'react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM, localToUtcHHMM } from '../constants';
import { msUntilDeadline, formatCountdown } from '../util/helpers';
import s from './InlineAddForm.module.css';
import shared from './shared.module.css';

const getCd = () => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') });

function addDaysToDate(dateStr, n) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

/**
 * Unified inline form for adding/editing tasks and events.
 *
 * Task mode — enabled when `typeOpts` array is provided:
 *   Props : typeOpts, gameResetTime, onAdd(task) / onSave(task), onCancel
 *           initialName, initialType, initialWebResetTime, initialMonthlyResetDay
 *           submitLabel — override button label (e.g. t('save') for edit mode)
 *   Fields: type select, name input, optional webReset time / monthlyResetDay
 *
 * Event mode — default when `typeOpts` is omitted:
 *   Props : onAdd(item) / onSave(item), onCancel
 *           initialName, initialDeadline, initialDeadlineTime, initialColor,
 *           submitLabel, defaultTime
 *   Fields: optional color picker, name input, date + time inputs, quick +N day buttons
 */
export function InlineAddForm({
  // Task mode props
  typeOpts,
  gameResetTime,
  initialType,
  initialWebResetTime,
  initialMonthlyResetDay,
  // Event mode props
  onAdd, onSave, onCancel,
  initialName = '', initialDeadline = '', initialDeadlineTime = '',
  initialColor,
  submitLabel,
  defaultTime = '',
}) {
  const isTaskMode = Array.isArray(typeOpts) && typeOpts.length > 0;

  // --- Task mode state ---
  const [type,     setType]     = useState(isTaskMode ? (initialType ?? typeOpts[0]) : '');
  const [webReset, setWebReset] = useState(isTaskMode
    ? (initialWebResetTime ? utcToLocalHHMM(initialWebResetTime) : utcToLocalHHMM(gameResetTime ?? '00:00'))
    : '');
  const [monthDay, setMonthDay] = useState(initialMonthlyResetDay ?? 1);

  // --- Shared / event mode state ---
  const [name,  setName]  = useState(initialName);
  const [date,  setDate]  = useState(initialDeadline);
  const [time,  setTime]  = useState(initialDeadlineTime ? utcToLocalHHMM(initialDeadlineTime) : '');
  const [color, setColor] = useState(initialColor ?? '#4a9eff');
  const showColor = !isTaskMode && initialColor !== undefined;

  const inputRef = useRef(null);

  useEffect(() => {
    // Task mode uses setTimeout to allow AnimatePresence to finish mounting first
    if (isTaskMode) setTimeout(() => inputRef.current?.focus(), 0);
    else inputRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Event mode: auto-apply defaultTime on first date selection ---
  const handleDateChange = (val) => {
    setDate(val);
    if (val && !time && defaultTime) setTime(utcToLocalHHMM(defaultTime));
  };

  // --- Submit ---
  const handleTaskSubmit = () => {
    if (!name.trim()) return;
    const task = { type, name: name.trim() };
    if (type === 'webdaily') task.webResetTime      = localToUtcHHMM(webReset);
    if (type === 'monthly')  task.monthlyResetDay   = Number(monthDay);
    if (onSave) onSave(task); else onAdd(task);
  };

  const handleEventSubmit = () => {
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

  const handleSubmit = isTaskMode ? handleTaskSubmit : handleEventSubmit;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  // --- Event mode: countdown to currently-set deadline ---
  const timeUtcForCd    = (date && time) ? localToUtcHHMM(time) : undefined;
  const deadlineMs      = date ? msUntilDeadline(date, new Date(), timeUtcForCd) : null;
  const deadlineExpired = deadlineMs !== null && deadlineMs <= 0;
  const dh              = deadlineMs != null ? deadlineMs / 3600000 : Infinity;
  const deadlineColor   = deadlineExpired    ? 'var(--danger)'
                        : dh < 24           ? 'var(--cd-urgent)'
                        : dh < 48           ? 'var(--cd-warn)'
                        :                     'var(--muted)';

  // ── Task mode ────────────────────────────────────────────────────
  if (isTaskMode) {
    return (
      <div className={s.form}>
        {/* Row 1: [type select] [name] [webReset time | monthDay] */}
        <div className={s.row}>
          {typeOpts.length > 1 && (
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`${shared.inputCls} ${s.typeSelect}`}
            >
              {typeOpts.map((ty) => (
                <option key={ty} value={ty}>{t(`types.${ty}`)}</option>
              ))}
            </select>
          )}
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(`types.${type}`)}
            className={`${shared.inputCls} ${s.nameInput}`}
          />
          {type === 'webdaily' && (
            <>
              <span className={s.deadlineLbl}>{t('resetLbl')}</span>
              <input
                type="time"
                value={webReset}
                onChange={(e) => setWebReset(e.target.value)}
                className={`${shared.inputCls} ${s.timeInput}`}
              />
            </>
          )}
          {type === 'monthly' && (
            <>
              <span className={s.deadlineLbl}>{t('resetLbl')}</span>
              <input
                type="number"
                value={monthDay}
                min={1}
                max={31}
                onChange={(e) => setMonthDay(e.target.value)}
                className={`${shared.inputCls} ${s.dayInput}`}
              />
              <span className={s.deadlineLbl}>{t('dayUnit')}</span>
            </>
          )}
        </div>
        {/* Row 2: spacer + action buttons */}
        <div className={s.quickRow}>
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

  // ── Event mode ───────────────────────────────────────────────────
  return (
    <div className={s.form}>
      {/* Row 1: [color] [name] [date] [time] */}
      <div className={s.row}>
        {showColor && (
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={s.colorInput}
          />
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

      {/* Row 2: [+N day buttons] [⏱ countdown] ─spacer─ [add/save] [cancel] */}
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
