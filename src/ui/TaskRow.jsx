import { useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import {BADGE_MAP, DAILY_TYPES, EVENT_TYPES, utcToLocalHHMM} from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, msUntilDeadline, formatCountdown, cdColor, fmtDeadlineDate, checkKey } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { Row, PrevBar } from './UI';
import s from './TaskRow.module.css';
import shared from './shared.module.css';

/**
 * Unified row component for both tasks and events/todos.
 *
 * Task mode  (type: daily | weekly | monthly | halfmonthly):
 *   Required: task, game, checks, now, onToggle(taskId, game), cd
 *
 * Event mode (type: event | todo):
 *   Required: task (event item), now, cd, onToggle(itemId)
 *   Optional: onContextMenu(itemId, x, y), onDelete(itemId), gameResetTime
 */
export function TaskRow({
  task, game, checks, now, onToggle, cd,
  // Event mode extras
  onContextMenu, onDelete, gameResetTime,
}) {
  const [cbScope, animateCb] = useAnimate();
  const isEvent = EVENT_TYPES.has(task.type);

  // ── Checked state (unified: all types use checks map) ────────────
  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);

  // ── Event-specific ───────────────────────────────────────────────
  const deadlineMs = isEvent && task.deadline
    ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null;
  const isExpired  = deadlineMs !== null && deadlineMs <= 0;
  const eventCdColor      = cdColor(deadlineMs ?? Infinity, 24, 48);
  const dateColor         = isExpired ? 'var(--danger)' : 'var(--dim)';
  const hasTime           = isEvent && !!task.deadlineTime;
  const timeIsSameAsReset = hasTime && gameResetTime && task.deadlineTime === gameResetTime;
  const showTime          = hasTime && !timeIsSameAsReset;
  const localDeadlineTime = showTime ? utcToLocalHHMM(task.deadlineTime) : null;

  // ── Task-specific ────────────────────────────────────────────────
  const taskMs = !isEvent ? msUntilTaskReset(task, game, now) : 0;
  const [urgentH, warnH] = task.type === 'weekly'      ? [24,  48]
                         : task.type === 'monthly'      ? [72, 168]
                         : task.type === 'halfmonthly'  ? [48, 120]
                         :                               [3,   6];
  const taskCdColor    = cdColor(taskMs, urgentH, warnH);
  const localResetTime = !isEvent ? utcToLocalHHMM(task.resetTime || game?.resetTime) : null;

  // ── Shared ───────────────────────────────────────────────────────
  const dimmed     = isChecked || isExpired;
  const showDelete = isEvent && dimmed && onDelete;

  const handleClick = (e) => {
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    onToggle(task.id, game);
  };

  const trigger = useContextTrigger((x, y) => onContextMenu?.(task.id, x, y));

  const row = (
    <Row
      className={s.row}
      barSlot={<PrevBar show={showPrev} checked={prevChecked} />}
      checkbox={
        <button
          ref={cbScope}
          onClick={handleClick}
          className={`${shared.cb}${dimmed ? ` ${shared.cbChecked}` : ''}`}
        >
          {dimmed ? '✓' : ''}
        </button>
      }
      content={
        <>
          <span className={`${shared.badge} ${BADGE_MAP[task.type]}`}>{t(`types.${task.type}`)}</span>
          <span
            className={s.taskName}
            style={{
              color:                   dimmed ? 'var(--muted)' : 'var(--text)',
              textDecoration:          dimmed ? 'line-through' : 'none',
              textDecorationThickness: dimmed ? '2px' : undefined,
            }}
          >
            {task.name.trim() || (!isEvent ? t(`types.${task.type}`) : '')}
          </span>
        </>
      }
      meta={
        isEvent ? (
          deadlineMs !== null && !isChecked ? (
            <span className={s.countdown} style={{ color: eventCdColor }}>
              {isExpired ? t('expired') : `⏱${formatCountdown(deadlineMs, cd)}`}
            </span>
          ) : null
        ) : (
          <>
            {!isChecked && <span className={s.countdown} style={{ color: taskCdColor }}>⏱{formatCountdown(taskMs, cd)}</span>}
            {task.type === 'daily' && localResetTime && <span className={s.resetLbl}>{localResetTime}</span>}
            {task.type === 'weekly'      && <span className={s.resetLbl}>{t('everyWeek', { day: t('dayNamesFull.' + (task.weeklyResetDay ?? 1)) })}</span>}
            {task.type === 'monthly'     && <span className={s.resetLbl}>{t('everyDay', { day: task.monthlyResetDay ?? 1 })}</span>}
            {task.type === 'halfmonthly' && <span className={s.resetLbl}>{t('everyHalfMonth', { a: task.halfMonthlyStartDay ?? 1, b: (task.halfMonthlyStartDay ?? 1) + 15 })}</span>}
          </>
        )
      }
      rightSlot={
        isEvent
          ? showDelete
            ? (
              <button
                className={`${shared.btn} ${shared.btnDanger} ${s.deleteBtn}`}
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                title={t('delete')}
              >✕</button>
            )
            : task.deadline
              ? (
                <span className={s.deadlineDate} style={{ color: dateColor }}>
                  {fmtDeadlineDate(task.deadline, t)}
                  {localDeadlineTime && <span className={s.deadlineTime}>{localDeadlineTime}</span>}
                </span>
              )
              : null
          : null
      }
    />
  );

  // Wrap with context-menu trigger whenever a handler is provided
  if (onContextMenu) {
    return <div {...trigger} style={{ userSelect: 'none' }}>{row}</div>;
  }
  return row;
}
