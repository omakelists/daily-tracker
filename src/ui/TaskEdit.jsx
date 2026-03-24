import {t} from "../util/i18n.js";
import {cdColor, formatCountdown, localToUtcHHMM, msUntilDeadline, utcToLocalHHMM} from "../util/helpers.js";
import s from "./TaskEdit.module.css";
import shared from "./shared.module.css";
import {Badge, BADGE_MAP} from "./UI.jsx";
import {useEffect, useRef} from "react";

const getCd = () => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') });

function addDaysToDate(dateStr, n) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

/**
 * TaskEdit — Edit task row.
 * Symmetric structure to main-screen TaskRow:
 *   dragSlot | badgeSlot | content(.taskName) | meta(.resetGroup) | deleteSlot
 */
export function TaskEdit({item, onUpdate, handleSubmit, onCancel}) {
  // Countdown to currently-set deadline
  const timeUtcForCd    = (item.date && item.time) ? localToUtcHHMM(item.time) : undefined;
  const deadlineMs      = item.type === 'event' && item.date ? msUntilDeadline(item.date, new Date(), timeUtcForCd) : null;
  const deadlineExpired = deadlineMs !== null && deadlineMs <= 0;
  const deadlineColor   = cdColor(deadlineMs ?? Infinity, 24, 48);

  const inputRef = useRef(null);
  // Use setTimeout to allow AnimatePresence to finish mounting before focusing
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  const resetMeta = (
    <div className={s.resetGroup}>
      <div className={s.resetLbl}>{t('resetLbl')}</div>
      {
        item.type === 'daily' ? (
          <div className={s.resetInputGroup}>
            <input type="time" value={utcToLocalHHMM(item.resetTime ?? '00:00')}
                   onChange={(e) => onUpdate(item.id, 'resetTime', localToUtcHHMM(e.target.value))}
                   className={`${shared.inputCls} ${s.inputTime}`}/>
          </div>
        ) : item.type === 'weekly' ? (
          <div className={s.resetInputGroup}>
            <select value={item.weeklyResetDay ?? 1}
                    onChange={(e) => onUpdate(item.id, 'weeklyResetDay', Number(e.target.value))}
                    className={`${shared.inputCls} ${s.inputDow}`}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{t('dayNamesFull.' + d)}</option>)}
            </select>
          </div>
        ) : item.type === 'halfmonthly' ? (
          <div className={s.resetInputGroup}>
            <input type="number" min="1" max="15" value={item.halfMonthlyStartDay ?? 1}
                   onChange={(e) => onUpdate(item.id, 'halfMonthlyStartDay', Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                   className={`${shared.inputCls} ${s.inputNumber}`}/>
            <span className={s.resetLbl}>{t('halfMonthSuffix', {b: (item.halfMonthlyStartDay ?? 1) + 15})}</span>
          </div>
        ) : item.type === 'monthly' ? (
          <div className={s.resetInputGroup}>
            <input type="number" min="1" max="28" value={item.monthlyResetDay ?? 1}
                   onChange={(e) => onUpdate(item.id, 'monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                   className={`${shared.inputCls} ${s.inputNumber}`}/>
            <span className={s.resetLbl}>{t('dayUnit')}</span>
          </div>
        ) : item.type === 'event' ? (
          <div className={s.resetInputGroupLong}>
            <div className={s.resetInputBlock}>
              <div className={s.resetSupport}>
                <input type="date" value={item.deadline ?? ''}
                       onChange={(e) => onUpdate(item.id, 'deadline', e.target.value || null)}
                       className={`${shared.inputCls} ${s.inputDate}`}/>
              </div>
              <div className={s.resetSupport}>
                {item.date && deadlineMs !== null && (
                  <span className={s.deadlineInfo} style={{ color: deadlineColor }}>
                    {deadlineExpired ? t('expired') : `⏱${formatCountdown(deadlineMs, getCd())}`}
                  </span>
                )}
              </div>
              <div className={s.resetSupport}>
                {[1, 2, 5, 10].map((n) => (
                  <button key={n} className={`${shared.btn} ${s.quickBtn}`} onClick={() => onUpdate(item.id, 'deadline', addDaysToDate(item.date, n))}>
                    +{n}{t('cd.d')}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.resetInputBlock}>
              <input type="time" value={item.deadlineTime ? utcToLocalHHMM(item.deadlineTime) : ''}
                     onChange={(e) => onUpdate(item.id, 'deadlineTime', e.target.value ? localToUtcHHMM(e.target.value) : null)}
                     disabled={!item.deadline} className={`${shared.inputCls} ${s.inputTime}`}
                     style={{opacity: item.deadline ? 1 : 0.35}}/>
            </div>
          </div>
        ) : null
      }
    </div>
  )

  return (
    <div className={shared.taskInfo}>
      <div className={shared.badgeSlot}>
        <Badge item={item} />
      </div>
      <div className={shared.taskWrapSlot}>
        <div className={shared.taskLabelSlot}>
          <input
            ref={inputRef}
            value={item.name}
            onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${shared.inputCls} ${s.taskName}`}
            placeholder={t(`types.${item.type}`)}
          />
        </div>
        <div className={shared.meta}>
          {resetMeta}
        </div>
      </div>
    </div>
  );
}