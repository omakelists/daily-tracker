import { useState } from 'react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM } from '../util/helpers';
import { DAILY, WEEKLY, HALFMONTHLY, MONTHLY, EVENT } from '../constants';
import type { Game, Task, TaskType, TimeString, YMDString } from '../types';
import { TaskEdit } from './TaskEdit';
import s from './TaskAddForm.module.css';
import shared from './shared.module.css';

interface TaskAddFormProps {
  game: Game;
  item?: Task;
  type?: TaskType;
  onAdd?: (task: Task) => void;
  onSave?: (task: Task) => void;
  onCancel?: () => void;
}

export function TaskAddForm({ game, item, type, onAdd, onSave, onCancel }: TaskAddFormProps) {
  const isEdit      = !!item;
  const submitLabel = isEdit ? t('save') : undefined;

  const [draft, setDraft] = useState<Task>({
    id:                  item?.id ?? '',
    type:                item?.type ?? type ?? DAILY,
    name:                item?.name ?? '',
    resetTime:           item?.resetTime ?? game?.resetTime,
    weeklyResetDay:      item?.type === WEEKLY      ? item.weeklyResetDay      : 1,
    monthlyResetDay:     item?.type === MONTHLY     ? item.monthlyResetDay     : 1,
    halfMonthlyStartDay: item?.type === HALFMONTHLY ? item.halfMonthlyStartDay : 1,
    deadline:     item?.type === EVENT ? item.deadline : new Date().toISOString().slice(0, 10) as YMDString,
    deadlineTime: item?.type === EVENT
      ? utcToLocalHHMM(item.deadlineTime)
      : game?.resetTime
        ? game.resetTime
        : '00:00' as TimeString,
  });

  const updateDraft = (_: string, key: string, val: unknown) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const name = draft.name.trim() || t(`types.${draft.type}`);
    let newTask: Task;
    switch (draft.type) {
      case DAILY:
        newTask = { id: uid(), type: DAILY, name, resetTime: draft.resetTime };
        break;
      case WEEKLY:
        newTask = { id: uid(), type: WEEKLY, name, weeklyResetDay: Number(draft.weeklyResetDay) };
        break;
      case HALFMONTHLY:
        newTask = { id: uid(), type: HALFMONTHLY, name, halfMonthlyStartDay: Number(draft.halfMonthlyStartDay) };
        break;
      case MONTHLY:
        newTask = { id: uid(), type: MONTHLY, name, monthlyResetDay: Number(draft.monthlyResetDay) };
        break;
      case EVENT:
        newTask = { id: uid(), type: EVENT, name, deadline: draft.deadline, deadlineTime: draft.deadlineTime };
        break;
      default:
        return;
    }
    if (onSave) onSave(newTask); else onAdd?.(newTask);
  };

  return (
    <div className={s.form}>
      <div className={s.mainRow}>
        <TaskEdit item={draft} onUpdate={updateDraft} handleSubmit={handleSubmit} onCancel={onCancel} />
      </div>
      <div className={s.btnRow}>
        <button className={`${shared.btn} ${shared.btnConfirm}`} onClick={handleSubmit}>
          {submitLabel ?? t('add')}
        </button>
        <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  );
}
