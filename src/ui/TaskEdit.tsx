import { useEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { match } from 'ts-pattern'
import { t } from '../util/i18n'
import {
  cdColor,
  formatCountdown,
  msUntilDeadline,
  asLocal,
  parseYYYYMMDD,
} from '../util/helpers'
import { DAILY, WEEKLY, HALFMONTHLY, MONTHLY, EVENT } from '../constants'
import type { LocalYMDString, Task } from '../types'
import { Badge } from './UI'
import s from './TaskEdit.module.css'
import shared from './shared.module.css'

function addDaysToDate(dateStr: LocalYMDString, n: number): LocalYMDString {
  const [y, m, d] = parseYYYYMMDD(dateStr)
  const base = new Date(y, m, d)
  base.setDate(base.getDate() + n)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}` as LocalYMDString
}

interface TaskEditProps {
  item: Task
  onUpdate: (taskId: string, key: string, val: unknown) => void
  handleSubmit?: () => void
  onCancel?: () => void
}

export function TaskEdit({
  item,
  onUpdate,
  handleSubmit,
  onCancel,
}: TaskEditProps) {
  const timeUtcForCd = item.type === EVENT ? item.deadlineTime : undefined
  const deadlineMs =
    item.type === EVENT && timeUtcForCd ?
      msUntilDeadline(item.deadline, new Date(), timeUtcForCd)
    : null
  const deadlineExpired = deadlineMs !== null && deadlineMs <= 0
  const deadlineColor = cdColor(deadlineMs ?? Infinity, 24, 48)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cd = useMemo(() => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') }), [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit?.()
    if (e.key === 'Escape') onCancel?.()
  }

  const resetMeta = (
    <div className={s.resetGroup}>
      <div className={s.resetLbl}>{t('resetLbl')}</div>
      {match(item)
        .with({ type: DAILY }, (it) => (
          <div className={s.resetInputGroup}>
            <input
              type="time"
              value={it.resetTime}
              onChange={(e) =>
                onUpdate?.(it.id, 'resetTime', asLocal(e.target.value))
              }
              className={`${shared.inputCls} ${s.inputTime}`}
            />
          </div>
        ))
        .with({ type: WEEKLY }, (it) => (
          <div className={s.resetInputGroup}>
            <select
              value={it.weeklyResetDay ?? 1}
              onChange={(e) =>
                onUpdate?.(it.id, 'weeklyResetDay', Number(e.target.value))
              }
              className={`${shared.inputCls} ${s.inputDow}`}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {t('dayNamesFull.' + d)}
                </option>
              ))}
            </select>
          </div>
        ))
        .with({ type: HALFMONTHLY }, (it) => (
          <div className={s.resetInputGroup}>
            <input
              type="number"
              min="1"
              max="15"
              value={it.halfMonthlyStartDay ?? 1}
              onChange={(e) =>
                onUpdate?.(
                  it.id,
                  'halfMonthlyStartDay',
                  Math.max(1, Math.min(15, parseInt(e.target.value) || 1))
                )
              }
              className={`${shared.inputCls} ${s.inputNumber}`}
            />
            <span className={s.resetLbl}>
              {t('halfMonthSuffix', { b: (it.halfMonthlyStartDay ?? 1) + 15 })}
            </span>
          </div>
        ))
        .with({ type: MONTHLY }, (it) => (
          <div className={s.resetInputGroup}>
            <input
              type="number"
              min="1"
              max="28"
              value={it.monthlyResetDay ?? 1}
              onChange={(e) =>
                onUpdate?.(
                  it.id,
                  'monthlyResetDay',
                  Math.max(1, Math.min(28, parseInt(e.target.value) || 1))
                )
              }
              className={`${shared.inputCls} ${s.inputNumber}`}
            />
            <span className={s.resetLbl}>{t('dayUnit')}</span>
          </div>
        ))
        .with({ type: EVENT }, (it) => (
          <div className={s.resetInputGroupLong}>
            <div className={s.resetInputBlock}>
              <div className={s.resetSupport}>
                <input
                  type="date"
                  value={it.deadline ?? ''}
                  onChange={(e) =>
                    onUpdate?.(it.id, 'deadline', e.target.value || null)
                  }
                  className={`${shared.inputCls} ${s.inputDate}`}
                />
              </div>
              <div className={s.resetSupport}>
                {it.deadline && deadlineMs !== null && (
                  <span
                    className={s.deadlineInfo}
                    style={{ color: deadlineColor }}
                  >
                    {deadlineExpired ?
                      t('expired')
                    : `⏱${formatCountdown(deadlineMs, cd)}`}
                  </span>
                )}
              </div>
              <div className={s.resetSupport}>
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    className={`${shared.btn} ${s.quickBtn}`}
                    onClick={() =>
                      onUpdate?.(
                        it.id,
                        'deadline',
                        addDaysToDate(it.deadline, n)
                      )
                    }
                  >
                    +{n}
                    {t('cd.d')}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.resetInputBlock}>
              <input
                type="time"
                value={it.deadlineTime ? it.deadlineTime : ''}
                onChange={(e) =>
                  onUpdate?.(
                    it.id,
                    'deadlineTime',
                    e.target.value ? asLocal(e.target.value) : null
                  )
                }
                disabled={!it.deadline}
                className={`${shared.inputCls} ${s.inputTime}`}
                style={{ opacity: it.deadline ? 1 : 0.35 }}
              />
            </div>
          </div>
        ))
        .exhaustive()}
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
            onChange={(e) => onUpdate?.(item.id, 'name', e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${shared.inputCls} ${s.taskName}`}
            placeholder={t(`types.${item.type}`)}
          />
        </div>
        <div className={shared.meta}>{resetMeta}</div>
      </div>
    </div>
  )
}
