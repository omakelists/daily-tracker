import { useState, useRef, useCallback } from 'react'
import type { HTMLAttributes, CSSProperties } from 'react'

interface DragState {
  from: number | null
  over: number | null
}

type DragProps = Pick<
  HTMLAttributes<HTMLElement>,
  'draggable' | 'onDragStart' | 'onDragOver' | 'onDrop' | 'onDragEnd'
>

interface DragSortHandle {
  itemProps: (i: number) => DragProps
  dropStyle: (i: number) => CSSProperties
  isDragging: (i: number) => boolean
}

// Shared drop-indicator style
const dropIndicatorStyle = (active: boolean): CSSProperties => ({
  borderTop: active ? '2px solid var(--link)' : '2px solid transparent',
  transition: 'border-color 0.12s',
})

export function useDragSort(
  onReorder: (from: number, to: number) => void
): DragSortHandle {
  const [drag, setDrag] = useState<DragState>({ from: null, over: null })
  const dragRef = useRef(drag)
  dragRef.current = drag

  const itemProps = useCallback(
    (i: number): DragProps => ({
      draggable: true,
      onDragStart: (e) => {
        const next = { from: i, over: i }
        dragRef.current = next
        setDrag(next)
        e.dataTransfer.effectAllowed = 'move'
      },
      onDragOver: (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragRef.current.from != null) setDrag((d) => ({ ...d, over: i }))
      },
      onDrop: (e) => {
        e.preventDefault()
        const { from } = dragRef.current
        if (from == null || from === i) {
          setDrag({ from: null, over: null })
          return
        }
        onReorder(from, i)
        setDrag({ from: null, over: null })
      },
      onDragEnd: () => setDrag({ from: null, over: null }),
    }),
    [onReorder]
  )

  const getDropStyle = useCallback(
    (i: number) =>
      dropIndicatorStyle(
        drag.from != null && drag.over === i && drag.from !== i
      ),
    [drag]
  )
  const getIsDragging = useCallback((i: number) => drag.from === i, [drag.from])

  return { itemProps, dropStyle: getDropStyle, isDragging: getIsDragging }
}

// ── Scoped variant ────────────────────────────────────────────────

interface ScopedDragState {
  scope: string
  from: number
  over: number
}

type ScopedDragProps = Pick<
  HTMLAttributes<HTMLElement>,
  'draggable' | 'onDragStart' | 'onDragOver' | 'onDrop' | 'onDragEnd'
>

interface ScopedDragSortHandle {
  itemProps: (scope: string, i: number) => ScopedDragProps
  dropStyle: (scope: string, i: number) => CSSProperties
  isDragging: (scope: string, i: number) => boolean
}

export function useScopedDragSort(
  onReorder: (scope: string, from: number, to: number) => void
): ScopedDragSortHandle {
  const [drag, setDrag] = useState<ScopedDragState | null>(null)
  const dragRef = useRef<ScopedDragState | null>(null)
  dragRef.current = drag

  const itemProps = useCallback(
    (scope: string, i: number): ScopedDragProps => ({
      draggable: true,
      onDragStart: (e) => {
        const next = { scope, from: i, over: i }
        dragRef.current = next
        setDrag(next)
        e.dataTransfer.effectAllowed = 'move'
        e.stopPropagation()
      },
      onDragOver: (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        if (dragRef.current?.scope === scope)
          setDrag((d) => (d ? { ...d, over: i } : d))
      },
      onDrop: (e) => {
        e.preventDefault()
        e.stopPropagation()
        const d = dragRef.current
        if (!d || d.scope !== scope || d.from === i) {
          setDrag(null)
          return
        }
        onReorder(scope, d.from, i)
        setDrag(null)
      },
      onDragEnd: () => setDrag(null),
    }),
    [onReorder]
  )

  const getDropStyle = useCallback(
    (scope: string, i: number) =>
      dropIndicatorStyle(
        drag?.scope === scope && drag.over === i && drag.from !== i
      ),
    [drag]
  )
  const getIsDragging = useCallback(
    (scope: string, i: number) => drag?.scope === scope && drag.from === i,
    [drag]
  )

  return { itemProps, dropStyle: getDropStyle, isDragging: getIsDragging }
}
