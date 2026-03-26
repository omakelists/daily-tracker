import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import s from './ContextMenu.module.css';

export interface ContextMenuItem {
  separator?: boolean;
  label?: string;
  icon?: string;
  danger?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    el.style.left = `${x + width  > vw ? x - width  : x}px`;
    el.style.top  = `${y + height > vh ? y - height : y}px`;
  }, [x, y]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      ref={menuRef}
      className={s.menu}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.93, y: -4 }}
      animate={{ opacity: 1, scale: 1,    y: 0, transition: { duration: 0.13 } }}
      exit={{    opacity: 0, scale: 0.93, y: -4, transition: { duration: 0.1 } }}
    >
      {items.map((item, i) =>
        item.separator
          ? <div key={i} className={s.separator} />
          : (
            <button
              key={i}
              className={`${s.item}${item.danger ? ` ${s.itemDanger}` : ''}`}
              onClick={() => { item.onClick?.(); onClose(); }}
            >
              {item.icon && <span className={s.icon}>{item.icon}</span>}
              {item.label}
            </button>
          )
      )}
    </motion.div>,
    document.body
  );
}
