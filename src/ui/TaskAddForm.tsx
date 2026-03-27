import { useState } from 'react'
import { match } from 'ts-pattern'
import { t } from '../util/i18n'
import { uid, localToUtcHHMM, asLocal } from '../util/helpers'
import { DAILY, WEEKLY, HALFMONTHLY, MONTHLY, EVENT } from '../constants'
import type { Game, Task, TaskType, YMDString } from '../types'
import { TaskEdit } from './TaskEdit'
import s from './TaskAddForm.module.css'
import shared from './shared.module.css'

interface TaskAddFormProps {
  game: Game
  item?: Task
  type?: TaskType
  onAdd?: (task: Task) => void
  onSave?: (task: Task) => void
  onCancel?: () => void
}

export function TaskAddForm({
  game,
  item,
  type,
  onAdd,
  onSave,
  onCancel,
}: TaskAddFormProps) {
  const isEdit = !!item
  const submitLabel = isEdit ? t('save') : undefined

  const [draft, setDraft] = useState<Task>({
    id: item?.id ?? '',
    type: item?.type ?? type ?? DAILY,
    name: item?.name ?? '',
    resetTime: item?.resetTime ?? game?.resetTime,
    weeklyResetDay: item?.type === WEEKLY ? item.weeklyResetDay : 1,
    monthlyResetDay: item?.type === MONTHLY ? item.monthlyResetDay : 1,
    halfMonthlyStartDay:
      item?.type === HALFMONTHLY ? item.halfMonthlyStartDay : 1,
    deadline:
      item?.type === EVENT ?
        item.deadline
      : (new Date().toISOString().slice(0, 10) as YMDString),
    // deadlineTime stays as UtcTimeString throughout the draft lifecycle —
    // TaskEdit handles the UTC↔local conversion internally for the <input> display.
    deadlineTime:
      item?.type === EVENT ?
        item.deadlineTime
      : (game?.resetTime ?? localToUtcHHMM(asLocal('00:00'))),
  })

  const updateDraft = (_: string, key: string, val: unknown) =>
    setDraft((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = () => {
    const name = draft.name.trim() || t(`types.${draft.type}`)
    const newTask = match(draft)
      .with(
        { type: DAILY },
        (d) =>
          ({
            id: uid(),
            type: DAILY,
            name,
            resetTime: d.resetTime,
          }) satisfies Task
      )
      .with(
        { type: WEEKLY },
        (d) =>
          ({
            id: uid(),
            type: WEEKLY,
            name,
            weeklyResetDay: Number(d.weeklyResetDay),
          }) satisfies Task
      )
      .with(
        { type: HALFMONTHLY },
        (d) =>
          ({
            id: uid(),
            type: HALFMONTHLY,
            name,
            halfMonthlyStartDay: Number(d.halfMonthlyStartDay),
          }) satisfies Task
      )
      .with(
        { type: MONTHLY },
        (d) =>
          ({
            id: uid(),
            type: MONTHLY,
            name,
            monthlyResetDay: Number(d.monthlyResetDay),
          }) satisfies Task
      )
      .with(
        { type: EVENT },
        (d) =>
          ({
            id: uid(),
            type: EVENT,
            name,
            deadline: d.deadline,
            deadlineTime: d.deadlineTime,
          }) satisfies Task
      )
      .exhaustive()
    if (onSave) onSave(newTask)
    else onAdd?.(newTask)
  }

  return (
    <div className={s.form}>
      <div className={s.mainRow}>
        <TaskEdit
          item={draft}
          onUpdate={updateDraft}
          handleSubmit={handleSubmit}
          onCancel={onCancel}
        />
      </div>
      <div className={s.btnRow}>
        <button
          className={`${shared.btn} ${shared.btnConfirm}`}
          onClick={handleSubmit}
        >
          {submitLabel ?? t('add')}
        </button>
        <button className={shared.btn} onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
