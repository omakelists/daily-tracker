import { useState } from 'react';
import { t } from '../util/i18n';
import { uid, utcToLocalHHMM } from '../util/helpers';
import { DAILY, WEEKLY, HALFMONTHLY, MONTHLY, EVENT } from '../constants';
import type { Game, Task, TaskDraft, TaskType, TimeString, YMDString } from '../types';
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

  const [draft, setDraft] = useState<TaskDraft>({
    id:                  item?.id ?? '',
    type:                item?.type ?? type ?? DAILY,
    name:                item?.name ?? '',
    resetTime:           item?.resetTime ?? game?.resetTime,
    weeklyResetDay:      item?.type === WEEKLY      ? item.weeklyResetDay      : undefined,
    monthlyResetDay:     item?.type === MONTHLY     ? item.monthlyResetDay     : undefined,
    halfMonthlyStartDay: item?.type === HALFMONTHLY ? item.halfMonthlyStartDay : undefined,
    deadline:     item?.type === EVENT ? item.deadline     : undefined,
    deadlineTime: item?.type === EVENT
      ? utcToLocalHHMM(item.deadlineTime)
      : game?.resetTime
        ? game.resetTime
        : undefined,
  });

  const updateDraft = (_id: string, key: string, val: unknown) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const name = draft.name.trim() || t(`types.${draft.type}`);
    let newTask: Task;
    switch (draft.type) {
      case DAILY:
        newTask = { id: uid(), type: DAILY, name, resetTime: (draft.resetTime ?? game.resetTime) as TimeString };
        break;
      case WEEKLY:
        newTask = { id: uid(), type: WEEKLY, name, weeklyResetDay: Number(draft.weeklyResetDay ?? 1) };
        break;
      case HALFMONTHLY:
        newTask = { id: uid(), type: HALFMONTHLY, name, halfMonthlyStartDay: Number(draft.halfMonthlyStartDay ?? 1) };
        break;
      case MONTHLY:
        newTask = { id: uid(), type: MONTHLY, name, monthlyResetDay: Number(draft.monthlyResetDay ?? 1) };
        break;
      case EVENT:
        newTask = {
          id: uid(), type: EVENT, name,
          deadline:     (draft.deadline     || new Date().toISOString().slice(0, 10)) as YMDString,
          deadlineTime: (draft.deadlineTime || game.resetTime) as TimeString,
        };
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
