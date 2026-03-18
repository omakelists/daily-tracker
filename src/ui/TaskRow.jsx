import { useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import {DAILY_TYPES, EVENT_TYPES, DAY_MS} from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, msUntilDeadline, formatCountdown, cdColor, fmtDeadlineDate, checkKey, utcToLocalHHMM } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { PrevBar, BADGE_MAP } from './UI';
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
 *   Optional: onContextMenu(itemId, x, y), onDelete(itemId)
 */
export function TaskRow({
  task, game, checks, now, onToggle, cd,
  // Event mode extras
  onContextMenu, onDelete,
}) {
  const [cbScope, animateCb] = useAnimate();
  const isEvent = task.type === 'event';

  // ── Checked state (unified: all types use checks map) ────────────
  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);

  // ── Event-specific ───────────────────────────────────────────────
  const deadlineMs = isEvent && task.deadline
    ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null;
  const isExpired  = deadlineMs !== null && deadlineMs <= 0;

  // ── Task-specific ────────────────────────────────────────────────
  const taskMs = !isEvent ? msUntilTaskReset(task, game, now) : task.deadline
    ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null;
  const [urgentH, warnH] =
                           task.type === 'daily'        ? [ 3,   6]
                         : task.type === 'weekly'       ? [24,  48]
                         : task.type === 'halfmonthly'  ? [48, 120]
                         : task.type === 'monthly'      ? [72, 168]
                         : task.type === 'event'        ? [72, 168]
                         :                                [ 3,   6];
  const taskCdColor    = cdColor(taskMs, urgentH, warnH);
  const localResetTime = !isEvent ? utcToLocalHHMM(task.resetTime || game?.resetTime) : null;

  // ── Shared ───────────────────────────────────────────────────────
  const showDelete = isEvent && isChecked && onDelete;

  const handleClick = (e) => {
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    onToggle(task.id, game);
  };

  const trigger = useContextTrigger((x, y) => onContextMenu?.(task.id, x, y));

  // Wrap with context-menu trigger whenever a handler is provided
  if (onContextMenu) {
    return <div {...trigger} style={{ userSelect: 'none' }}>
      <div
        className={`${shared.row} ${s.taskRow}`}
      >
        <div className={shared.barSlot}>
          <PrevBar show={showPrev} checked={prevChecked} />
        </div>
        <div className={shared.cbWrap}     onClick={(e) => e.stopPropagation()}>
          <button
            ref={cbScope}
            onClick={handleClick}
            className={`${shared.cb}${isChecked ? ` ${shared.cbChecked}` : ''}`}
          >
            {isChecked ? '✓' : ''}
          </button>
        </div>
        <div className={shared.badgeSlot}>
          <span className={`${shared.taskBadge} ${BADGE_MAP[task.type]}`}>
            <span className={shared.badgeText}>{t(`types.${task.type}`)}</span>
          </span>
        </div>
        <div className={shared.content}>
          <div className={s.nameGroup}>
            <span
              className={s.taskName}
              style={{
                color:                   isChecked ? 'var(--muted)' : 'var(--text)',
                textDecoration:          isChecked ? 'line-through' : 'none',
                textDecorationThickness: isChecked ? '2px' : undefined,
              }}
            >
              {task.name.trim() || t(`types.${task.type}`)}
            </span>
          </div>
        </div>
        <div className={shared.metaRight}>
          <div className={shared.meta}>
            {!isChecked && <span className={s.countdown} style={{ color: taskCdColor }}>{(isEvent && isExpired) ? t('expired') : `⏱${formatCountdown(taskMs, cd)}`}</span>}
            {task.type === 'daily' && localResetTime && <span className={s.resetLbl}>{localResetTime}</span>}
            {task.type === 'weekly'      && <span className={s.resetLbl}>{t('everyWeek', { day: t('dayNamesFull.' + (task.weeklyResetDay ?? 1)) })}</span>}
            {task.type === 'monthly'     && <span className={s.resetLbl}>{t('everyDay', { day: task.monthlyResetDay ?? 1 })}</span>}
            {task.type === 'halfmonthly' && <span className={s.resetLbl}>{t('everyHalfMonth', { a: task.halfMonthlyStartDay ?? 1, b: (task.halfMonthlyStartDay ?? 1) + 15 })}</span>}
            {task.type === 'event' && !showDelete && task.deadline && <span className={s.resetLbl}>
              {(deadlineMs >= DAY_MS || isExpired) && fmtDeadlineDate(task.deadline, t)}
                  {(deadlineMs < DAY_MS && !isExpired) && utcToLocalHHMM(task.deadlineTime)}
            </span>}
          </div>
        </div>
        <div className={shared.deleteSlot}>
          {
            showDelete ? (
              <button
                className={`${shared.btn} ${shared.btnDanger} ${s.deleteBtn}`}
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                title={t('delete')}
              >✕</button>
            ) : null
          }
        </div>
      </div>
    </div>;
  }
  return row;
}
