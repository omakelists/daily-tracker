import { t } from '../util/i18n'
import { useContextTrigger } from '../util/useContextTrigger'
import type { ReactNode, CSSProperties } from 'react'
import type { Task } from '../types'
import s from './TaskRow.module.css'
import shared from './shared.module.css'

interface TaskRowProps {
  task: Task
  showDragHandle?: boolean
  showDelete?: boolean | null
  dndProps?: Record<string, unknown>
  dndStyle?: CSSProperties
  onContextMenu?: (taskId: string, x: number, y: number) => void
  onDelete?: (taskId: string) => void
  children?: ReactNode
}

export function TaskRow({
  task,
  showDragHandle,
  showDelete,
  dndProps = {},
  dndStyle = {},
  onContextMenu,
  onDelete,
  children,
}: TaskRowProps) {
  const trigger = useContextTrigger((x, y) => onContextMenu?.(task.id, x, y))

  return (
    <div
      {...dndProps}
      {...trigger}
      className={s.taskRow}
      style={{ ...dndStyle, userSelect: 'none' }}
    >
      {showDragHandle ?
        <div className={shared.handleSlot}>
          <span className={shared.dragHandle}>⠿</span>
        </div>
      : null}
      <div className={shared.rowContent}>{children}</div>
      <div className={shared.deleteSlot}>
        {showDelete ?
          <button
            className={`${shared.btn} ${shared.btnDanger} ${shared.deleteBtn}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(task.id)
            }}
            title={t('delete')}
          >
            ✕
          </button>
        : null}
      </div>
    </div>
  )
}
