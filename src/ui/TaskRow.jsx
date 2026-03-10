import { useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { DAILY_TYPES, EVENT_TYPES, utcToLocalHHMM } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, msUntilDeadline, formatCountdown, fmtDeadlineDate, checkKey, playCheckSound } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { Row, PrevBar } from './UI';
import s from './TaskRow.module.css';
import shared from './shared.module.css';

const BADGE_MAP = {
  daily:       shared.badgeDaily,
  weekly:      shared.badgeWeekly,
  webdaily:    shared.badgeWebdaily,
  monthly:     shared.badgeMonthly,
  halfmonthly: shared.badgeHalfmonthly,
  event:       shared.badgeEvent,
  todo:        shared.badgeTodo,
};

/**
 * Unified row component for both tasks and events/todos.
 *
 * Task mode  (type: daily | weekly | webdaily | monthly | halfmonthly):
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

  // ── Event mode logic ─────────────────────────────────────────────
  const deadlineMs    = isEvent && task.deadline ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null;
  const isExpired     = deadlineMs !== null && deadlineMs <= 0;
  const isDone        = isEvent ? !!task.done : false;
  const eventH        = deadlineMs !== null ? deadlineMs / 3600000 : Infinity;
  const eventCdColor  = isExpired      ? 'var(--danger)'
                      : eventH < 24    ? 'var(--cd-urgent)'
                      : eventH < 48    ? 'var(--cd-warn)'
                      :                  'var(--muted)';
  const dateColor     = isExpired ? 'var(--danger)' : 'var(--dim)';
  const hasTime            = isEvent && !!task.deadlineTime;
  const timeIsSameAsReset  = hasTime && gameResetTime && task.deadlineTime === gameResetTime;
  const showTime           = hasTime && !timeIsSameAsReset;
  const localDeadlineTime  = showTime ? utcToLocalHHMM(task.deadlineTime) : null;

  // ── Task mode logic ──────────────────────────────────────────────
  const isChecked   = !isEvent && !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !isEvent && !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = !isEvent && DAILY_TYPES.has(task.type);
  const taskMs      = !isEvent ? msUntilTaskReset(task, game, now) : 0;
  const taskH       = taskMs / 3600000;
  // Weekly resets on a day boundary, so use wider urgency windows (24h / 48h).
  // Other periodic/daily types reset within the day, so use narrow windows (3h / 6h).
  const taskCdColor = task.type === 'weekly'
    ? (taskH < 24 ? 'var(--cd-urgent)' : taskH < 48 ? 'var(--cd-warn)' : 'var(--muted)')
    : (taskH < 3  ? 'var(--cd-urgent)' : taskH < 6  ? 'var(--cd-warn)' : 'var(--muted)');
  const showTaskCD  = !isEvent && (
    task.type === 'weekly' || task.type === 'monthly' || task.type === 'halfmonthly' ||
    (task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime)
  );
  const localWebReset = !isEvent && task.webResetTime ? utcToLocalHHMM(task.webResetTime) : null;

  // ── Shared ───────────────────────────────────────────────────────
  const dimmed     = isEvent ? (isDone || isExpired) : isChecked;
  const showDelete = isEvent && (isDone || isExpired) && onDelete;

  const handleClick = (e) => {
    if (isEvent) e.stopPropagation();
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    if (isEvent) {
      if (!isDone) playCheckSound();
      onToggle?.(task.id);
    } else {
      onToggle(task.id, game);
    }
  };

  const trigger = useContextTrigger((x, y) => onContextMenu?.(task.id, x, y));

  const badgeLabel = isEvent
    ? (task.type === 'todo' ? t('todoName') : t('events'))
    : t(`types.${task.type}`);

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
          <span className={`${shared.badge} ${BADGE_MAP[task.type]}`}>{badgeLabel}</span>
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
          deadlineMs !== null ? (
            <span className={s.countdown} style={{ color: eventCdColor }}>
              {isExpired ? t('expired') : `⏱${formatCountdown(deadlineMs, cd)}`}
            </span>
          ) : null
        ) : (
          <>
            {showTaskCD && !isChecked && <span className={s.countdown} style={{ color: taskCdColor }}>⏱{formatCountdown(taskMs, cd)}</span>}
            {task.type === 'webdaily' && localWebReset && localWebReset !== utcToLocalHHMM(game.resetTime) && <span className={s.resetLbl}>{localWebReset}</span>}
            {task.type === 'weekly'  && <span className={s.resetLbl} style={{ color: 'var(--dim)' }}>{t('everyWeek', { day: t('dayNamesFull.' + (task.weeklyResetDay ?? 1)) })}</span>}
            {task.type === 'monthly' && <span className={s.resetLbl}>{t('everyDay', { day: task.monthlyResetDay ?? 1 })}</span>}
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

  // Wrap with context-menu trigger whenever a handler is provided (both task and event modes)
  if (isEvent || onContextMenu) {
    return <div {...trigger} style={{ userSelect: 'none' }}>{row}</div>;
  }
  return row;
}
