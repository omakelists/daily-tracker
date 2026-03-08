import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { utcToLocalHHMM } from '../constants';
import { msUntilDeadline, formatCountdown, fmtDeadlineDate } from '../util/helpers';
import { playCheckSound } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { Row } from './UI';
import { InlineAddForm } from './InlineAddForm';
import { ContextMenu } from './ContextMenu';
import s from './TodoCard.module.css';
import shared from './shared.module.css';

const formVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0,    transition: { duration: 0.18, ease: 'easeIn' } },
};

export function TodoCard({ todo, now, cd, onToggle, onEdit, onDelete }) {
  const [cbScope, animateCb] = useAnimate();
  const [ctxMenu, setCtxMenu] = useState(null);
  const [editing, setEditing] = useState(false);

  const color   = todo.color ?? '#58a6ff';
  const ms        = todo.deadline ? msUntilDeadline(todo.deadline, now, todo.deadlineTime) : null;
  const isExpired = ms !== null && ms <= 0;
  const isDone    = !!todo.done;
  const h         = ms !== null ? ms / 3600000 : Infinity;

  // カウントダウン色（--muted ベース）
  const cdColor   = isExpired ? 'var(--danger)'
                  : h < 24   ? 'var(--cd-urgent)'
                  : h < 48   ? 'var(--cd-warn)'
                  :             'var(--muted)';

  // 日付表示色：期限切れのみ --danger、それ以外は常に --dim
  const dateColor = isExpired ? 'var(--danger)' : 'var(--dim)';

  const dimmed     = isDone || isExpired;
  const showDelete = (isDone || isExpired) && !!onDelete;
  const localTime  = todo.deadlineTime ? utcToLocalHHMM(todo.deadlineTime) : null;

  const handleCheck = (e) => {
    e.stopPropagation();
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    if (!isDone) playCheckSound();
    onToggle(todo.id);
  };

  const trigger = useContextTrigger(
    useCallback((x, y) => setCtxMenu({ x, y }), [])
  );

  const ctxItems = [
    { label: t('ctxEditTodo'),   icon: '✏️', onClick: () => setEditing(true) },
    { separator: true },
    { label: t('ctxDeleteTodo'), icon: '🗑️', danger: true, onClick: () => onDelete(todo.id) },
  ];

  const headerBg = `linear-gradient(90deg, ${color}28 0%, ${color}10 40%, rgba(22,27,34,0.92) 100%)`;

  return (
    <div
      className={`${s.card}${dimmed ? ` ${s.cardDone}` : ''}`}
      style={{ border: `var(--card-border) solid ${color}60` }}
      {...trigger}
    >
      <Row
        bg={headerBg}
        borderBottom={editing ? '1px solid rgba(255,255,255,0.055)' : 'none'}
        checkbox={
          <button
            ref={cbScope}
            onClick={handleCheck}
            className={`${shared.cb} ${shared.cbGame}${isDone ? ` ${shared.cbChecked}` : ''}`}
          >
            {isDone ? '✓' : ''}
          </button>
        }
        content={
          <span
            className={s.name}
            style={{
              color:                   dimmed ? 'var(--muted)' : color,
              textDecoration:          dimmed ? 'line-through' : 'none',
              textDecorationThickness: dimmed ? '2px' : undefined,
            }}
          >
            {todo.name}
          </span>
        }
        meta={
          ms !== null ? (
            <span className={s.countdown} style={{ color: cdColor }}>
              {isExpired ? t('expired') : `⏱${formatCountdown(ms, cd)}`}
            </span>
          ) : null
        }
        rightSlot={
          showDelete
            ? (
              <button
                className={`${shared.btn} ${shared.btnDanger} ${s.deleteBtn}`}
                onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
                title={t('delete')}
              >✕</button>
            )
            : todo.deadline
              ? (
                <span className={s.deadlineDate} style={{ color: dateColor }}>
                  {fmtDeadlineDate(todo.deadline, t)}
                  {localTime && <span className={s.deadlineTime}>{localTime}</span>}
                </span>
              )
              : null
        }
      />

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="edit-form"
            variants={formVariants}
            initial="initial" animate="animate" exit="exit"
            className={shared.clipContents}
          >
            <InlineAddForm
              initialName={todo.name}
              initialDeadline={todo.deadline || ''}
              initialDeadlineTime={todo.deadlineTime || ''}
              initialColor={todo.color ?? '#58a6ff'}
              submitLabel={t('save')}
              onSave={(updates) => { onEdit(todo.id, updates); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctxMenu && (
          <ContextMenu
            key="ctx"
            x={ctxMenu.x} y={ctxMenu.y}
            items={ctxItems}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
