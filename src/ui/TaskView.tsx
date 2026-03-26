import { useMemo } from 'react';
import { t } from '../util/i18n';
import {
  cdColor, fmtDeadlineDate, formatCountdown,
  msUntilDeadline, msUntilTaskReset, utcToLocalHHMM,
} from '../util/helpers';
import { DAILY, WEEKLY, HALFMONTHLY, MONTHLY, EVENT, DAY_MS } from '../constants';
import type { Game, Task } from '../types';
import { Badge } from './UI';
import s from './TaskView.module.css';
import shared from './shared.module.css';

interface TaskViewProps {
  game: Game;
  task: Task;
  now: Date;
  isChecked: boolean;
  showDeadline?: boolean;
}

export function TaskView({ game, task, now, isChecked, showDeadline }: TaskViewProps) {
  const isEvent = task.type === EVENT;

  const deadlineMs = isEvent ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null;
  const isExpired  = deadlineMs !== null && deadlineMs <= 0;

  const taskMs = !isEvent
    ? msUntilTaskReset(task, game, now)
    : msUntilDeadline(task.deadline, now, task.deadlineTime);

  const [urgentH, warnH] =
    task.type === DAILY       ? [3, 6]    :
    task.type === WEEKLY      ? [24, 48]  :
    task.type === HALFMONTHLY ? [48, 120] :
    task.type === MONTHLY     ? [72, 168] :
    task.type === EVENT       ? [72, 168] :
    [3, 6];

  const cd = useMemo(() => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') }), []);
  const taskCdColor   = cdColor(taskMs ?? 0, urgentH, warnH);
  const localResetTime = task.type === DAILY ? utcToLocalHHMM(task.resetTime) : null;

  return (
    <div className={shared.taskInfo}>
      <div className={shared.badgeSlot}>
        <Badge item={task} />
      </div>
      <div className={shared.taskWrapSlot}>
        <div className={shared.taskLabelSlot}>
          <span
            className={s.taskName}
            style={{
              color: isChecked ? 'var(--muted)' : 'var(--text)',
              textDecoration: isChecked ? 'line-through' : 'none',
              textDecorationThickness: isChecked ? '2px' : undefined,
            }}
          >
            {task.name.trim() || t(`types.${task.type}`)}
          </span>
        </div>
        <div className={shared.meta}>
          {!isChecked && taskMs !== null && (
            <span className={s.countdown} style={{ color: taskCdColor }}>
              {isExpired ? t('expired') : `⏱${formatCountdown(taskMs, cd)}`}
            </span>
          )}
          {task.type === DAILY && localResetTime && (
            <span className={s.resetLbl}>{localResetTime}</span>
          )}
          {task.type === WEEKLY && (
            <span className={s.resetLbl}>{t('everyWeek', { day: t('dayNamesFull.' + task.weeklyResetDay) })}</span>
          )}
          {task.type === HALFMONTHLY && (
            <span className={s.resetLbl}>{t('everyHalfMonth', { a: task.halfMonthlyStartDay, b: task.halfMonthlyStartDay + 15 })}</span>
          )}
          {task.type === MONTHLY && (
            <span className={s.resetLbl}>{t('everyDay', { day: task.monthlyResetDay })}</span>
          )}
          {task.type === EVENT && showDeadline && (
            <span className={s.resetLbl}>
              {(deadlineMs !== null && (deadlineMs >= DAY_MS || isExpired)) && fmtDeadlineDate(task.deadline, t)}
              {(deadlineMs !== null && deadlineMs < DAY_MS && !isExpired) && utcToLocalHHMM(task.deadlineTime)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
