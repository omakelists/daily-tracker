import { useState, useRef, useCallback } from 'react';

// Shared drop-indicator style
const dropStyle = (active) => ({
  borderTop: active ? '2px solid var(--link)' : '2px solid transparent',
  transition: 'border-color 0.12s',
});

/**
 * Drag-and-drop sort for a flat list.
 *
 * @param {function} onReorder  (fromIndex, toIndex) => void
 * @returns {{ itemProps, dropStyle, isDragging }}
 *
 * @example
 * const gameDnd = useDragSort((from, to) => reorderGames(from, to));
 * // In JSX:
 * <div {...gameDnd.itemProps(i)} style={{ ...gameDnd.dropStyle(i), opacity: gameDnd.isDragging(i) ? 0.4 : 1 }}>
 */
export function useDragSort(onReorder) {
  const [drag, setDrag] = useState({ from: null, over: null });

  // Ref keeps handlers closure-free from stale state
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const itemProps = useCallback((i) => ({
    draggable: true,
    onDragStart: (e) => {
      const next = { from: i, over: i };
      dragRef.current = next;
      setDrag(next);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragRef.current.from != null) setDrag((d) => ({ ...d, over: i }));
    },
    onDrop: (e) => {
      e.preventDefault();
      const { from } = dragRef.current;
      if (from == null || from === i) { setDrag({ from: null, over: null }); return; }
      onReorder(from, i);
      setDrag({ from: null, over: null });
    },
    onDragEnd: () => setDrag({ from: null, over: null }),
  }), [onReorder]);

  const getDropStyle  = useCallback((i) => dropStyle(drag.from != null && drag.over === i && drag.from !== i), [drag]);
  const getIsDragging = useCallback((i) => drag.from === i, [drag.from]);

  return { itemProps, dropStyle: getDropStyle, isDragging: getIsDragging };
}

/**
 * Drag-and-drop sort for a list that lives inside a parent scope (e.g. tasks inside a game).
 * Automatically calls stopPropagation to avoid interfering with parent-level D&D.
 *
 * @param {function} onReorder  (scope, fromIndex, toIndex) => void
 * @returns {{ itemProps, dropStyle, isDragging }}
 *
 * @example
 * const taskDnd = useScopedDragSort((gid, from, to) => reorderTasks(gid, from, to));
 * // In JSX:
 * <div {...taskDnd.itemProps(game.id, i)} style={{ ...taskDnd.dropStyle(game.id, i), opacity: taskDnd.isDragging(game.id, i) ? 0.4 : 1 }}>
 */
export function useScopedDragSort(onReorder) {
  const [drag, setDrag] = useState(null); // null | { scope, from, over }

  // Ref keeps handlers closure-free from stale state
  const dragRef = useRef(null);
  dragRef.current = drag;

  const itemProps = useCallback((scope, i) => ({
    draggable: true,
    onDragStart: (e) => {
      const next = { scope, from: i, over: i };
      dragRef.current = next;
      setDrag(next);
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (dragRef.current?.scope === scope) setDrag((d) => d ? { ...d, over: i } : d);
    },
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const d = dragRef.current;
      if (!d || d.scope !== scope || d.from === i) { setDrag(null); return; }
      onReorder(scope, d.from, i);
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
  }), [onReorder]);

  const getDropStyle  = useCallback((scope, i) => dropStyle(drag?.scope === scope && drag.over === i && drag.from !== i), [drag]);
  const getIsDragging = useCallback((scope, i) => drag?.scope === scope && drag.from === i, [drag]);

  return { itemProps, dropStyle: getDropStyle, isDragging: getIsDragging };
}
