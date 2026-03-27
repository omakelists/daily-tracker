import { useMemo } from 'react'
import { t } from '../util/i18n'
import {
  cdColor,
  fmtDeadlineDate,
  formatCountdown,
  msUntilDeadline,
  msUntilTaskReset,
} from '../util/helpers'
import {
  DAILY,
  WEEKLY,
  HALFMONTHLY,
  MONTHLY,
  EVENT,
  DAY_MS,
} from '../constants'
import type { Game, Task } from '../types'
import { Badge } from './UI'
import s from './TaskView.module.css'
import shared from './shared.module.css'
import { match } from 'ts-pattern'

interface TaskViewProps {
  game: Game
  task: Task
  now: Date
  isChecked: boolean
  showDeadline?: boolean
}

export function TaskView({
  game,
  task,
  now,
  isChecked,
  showDeadline,
}: TaskViewProps) {
  const isEvent = task.type === EVENT

  const deadlineMs =
    isEvent ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null
  const isExpired = deadlineMs !== null && deadlineMs <= 0

  const taskMs =
    !isEvent ?
      msUntilTaskReset(task, game, now)
    : msUntilDeadline(task.deadline, now, task.deadlineTime)

  const [urgentH, warnH] =
    task.type === DAILY ? [3, 6]
    : task.type === WEEKLY ? [24, 48]
    : task.type === HALFMONTHLY ? [48, 120]
    : task.type === MONTHLY ? [72, 168]
    : task.type === EVENT ? [72, 168]
    : [3, 6]

  const cd = useMemo(() => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') }), [])
  const taskCdColor = cdColor(taskMs ?? 0, urgentH, warnH)

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
          {match(task)
            .with({ type: DAILY }, (tk) => (
              <span className={s.resetLbl}>
                {tk.resetTime ?? game.resetTime}
              </span>
            ))
            .with({ type: WEEKLY }, (tk) => (
              <span className={s.resetLbl}>
                {t('everyWeek', {
                  day: t('dayNamesFull.' + tk.weeklyResetDay),
                })}
              </span>
            ))
            .with({ type: HALFMONTHLY }, (tk) => (
              <span className={s.resetLbl}>
                {t('everyHalfMonth', {
                  a: tk.halfMonthlyStartDay,
                  b: tk.halfMonthlyStartDay + 15,
                })}
              </span>
            ))
            .with({ type: MONTHLY }, (tk) => (
              <span className={s.resetLbl}>
                {t('everyDay', { day: tk.monthlyResetDay })}
              </span>
            ))
            .with({ type: EVENT }, (tk) =>
              showDeadline ?
                <span className={s.resetLbl}>
                  {deadlineMs !== null
                    && (deadlineMs >= DAY_MS || isExpired)
                    && fmtDeadlineDate(tk.deadline, t)}
                  {deadlineMs !== null
                    && deadlineMs < DAY_MS
                    && !isExpired
                    && tk.deadlineTime}
                </span>
              : null
            )
            .exhaustive()}
        </div>
      </div>
    </div>
  )
}
