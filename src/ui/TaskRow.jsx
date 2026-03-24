import {t} from '../util/i18n';
import {useContextTrigger} from '../util/useContextTrigger';
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
  task, showDragHandle, showDelete,
  dndProps={}, dndStyle={},
  // Event mode extras
  onContextMenu, onDelete, children,
}) {
  const trigger = useContextTrigger((x, y) => onContextMenu?.(task.id, x, y));

  return (
    <div {...dndProps} {...trigger} className={s.taskRow} style={{...dndStyle, userSelect: 'none'}}>
      {showDragHandle ? <div className={shared.handleSlot}><span className={shared.dragHandle}>⠿</span></div> : null}
      <div className={`${shared.rowContent}`}>
        {children}
      </div>
      <div className={shared.deleteSlot}>
        {
          showDelete ? (
            <button
              className={`${shared.btn} ${shared.btnDanger} ${shared.deleteBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title={t('delete')}
            >✕</button>
          ) : null
        }
      </div>
    </div>
  );
}
