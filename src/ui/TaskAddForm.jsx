import {useState} from 'react';
import {t} from '../util/i18n';
import {uid, utcToLocalHHMM} from '../util/helpers';
import s from './TaskAddForm.module.css';
import shared from './shared.module.css';
import {TaskEdit} from "./TaskEdit.jsx";

export function TaskAddForm({ game, item, type, onAdd, onSave, onCancel }) {
  const isEdit      = !!item;
  const submitLabel = isEdit ? t('save') : undefined;

  // ── State ────────────────────────────────────────────────────────
  const [task, setTask] = useState({
    type: item?.type ?? type,
    name: item?.name ?? '',
    resetTime: utcToLocalHHMM(item?.resetTime ?? game?.resetTime ?? '00:00'),
    monthlyResetDay: item?.monthlyResetDay ?? 1,
    weeklyResetDay: item?.weeklyResetDay ?? 1,
    halfMonthlyStartDay: item?.halfMonthlyStartDay ?? 1,
    deadline: item?.deadline ?? '',
    deadlineTime:
      item?.deadlineTime ? utcToLocalHHMM(item.deadlineTime)
      : game?.resetTime ? game.resetTime
      : '',
  });
  const updateTask = (id, key, val) => setTask(prev => ({ ...prev, [key]: val}));

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = () => {
    const newTask = { id: uid(), type: task.type, name: task.name.trim() || t(`types.${task.type}`) };
    switch (task.type) {
      case 'daily'      : newTask.resetTime           = task.resetTime; break;
      case 'monthly'    : newTask.monthlyResetDay     = Number(task.monthlyResetDay); break;
      case 'weekly'     : newTask.weeklyResetDay      = Number(task.weeklyResetDay); break;
      case 'halfmonthly': newTask.halfMonthlyStartDay = Number(task.halfMonthlyStartDay); break;
      case 'event':
        newTask.deadline = task.deadline || null;
        newTask.deadlineTime = task.deadlineTime || null;
        break;
    }
    if (onSave) onSave(newTask); else onAdd(newTask);
  };

  return (
    <div className={s.form}>
      <div className={s.mainRow}>
        <TaskEdit item={task} onUpdate={updateTask} handleSubmit={handleSubmit} onCancel={onCancel} />
      </div>
      <div className={s.btnRow}>
        <button className={`${shared.btn} ${shared.btnConfirm}`} onClick={handleSubmit}>{submitLabel ?? t('add')}</button>
        <button className={shared.btn} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  );
}
