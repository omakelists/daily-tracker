/**
 * Module-level drag state shared across all DnD interactions.
 * A plain mutable object avoids unnecessary re-render cycles during drag.
 */
export const dragState = {
  type:      null,  // 'game' | 'task'
  gameId:    null,  // id of the dragged game, or the task's parent game
  taskId:    null,  // id of the dragged task (type === 'task' only)
  taskGroup: null,  // 'daily' | 'period' — which visual section the task belongs to
};

export function clearDrag() {
  dragState.type      = null;
  dragState.gameId    = null;
  dragState.taskId    = null;
  dragState.taskGroup = null;
}

/**
 * Flag set by DragHandle's onMouseDown so that the parent draggable div can
 * verify the drag was initiated from the handle rather than from a button or
 * other interactive element.
 */
export let dragFromHandle = false;
export const markDragHandle  = () => { dragFromHandle = true;  };
export const clearDragHandle = () => { dragFromHandle = false; };
