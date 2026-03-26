import { useRef, useCallback } from 'react';

const LONG_PRESS_MS = 600;

/**
 * Returns event handlers that fire onTrigger(x, y) on:
 *   - desktop: right-click (contextmenu)
 *   - mobile:  600 ms long press
 *
 * Spread the returned object onto any element:
 *   <div {...useContextTrigger(handler)} />
 */
export function useContextTrigger(onTrigger) {
  const timerRef = useRef(null);
  const movedRef = useRef(false);
  const firedRef = useRef(false);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onTrigger(e.clientX, e.clientY);
  }, [onTrigger]);

  const handleTouchStart = useCallback((e) => {
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
    clearTimeout(timerRef.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  return {
    onContextMenu:  handleContextMenu,
    onTouchStart:   handleTouchStart,
    onTouchMove:    handleTouchMove,
    onTouchEnd:     handleTouchEnd,
    onTouchCancel:  handleTouchEnd,
  };
}
