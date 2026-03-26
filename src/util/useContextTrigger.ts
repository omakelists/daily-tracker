import { useRef, useCallback } from 'react';
import type { HTMLAttributes, MouseEvent, TouchEvent } from 'react';

const LONG_PRESS_MS = 600;

type ContextTriggerHandlers = Pick<
  HTMLAttributes<HTMLElement>,
  'onContextMenu' | 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'
>;

/**
 * Returns event handlers that fire onTrigger(x, y) on:
 *   - desktop: right-click (contextmenu)
 *   - mobile:  600 ms long press
 */
export function useContextTrigger(
  onTrigger: (x: number, y: number) => void,
): ContextTriggerHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);
  const firedRef = useRef(false);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTrigger(e.clientX, e.clientY);
  }, [onTrigger]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    movedRef.current = false;
    firedRef.current = false;
    const { clientX, clientY } = e.touches[0];
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        firedRef.current = true;
        onTrigger(clientX, clientY);
      }
    }, LONG_PRESS_MS);
  }, [onTrigger]);

  const handleTouchMove = useCallback(() => {
    movedRef.current = true;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  return {
    onContextMenu:  handleContextMenu,
    onTouchStart:   handleTouchStart,
    onTouchMove:    handleTouchMove,
    onTouchEnd:     handleTouchEnd,
    onTouchCancel:  handleTouchEnd,
  };
}
