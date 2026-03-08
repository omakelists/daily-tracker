import { useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { utcToLocalHHMM } from '../constants';
import { msUntilDeadline, formatCountdown, fmtDeadlineDate } from '../util/helpers';
import { playCheckSound } from '../util/helpers';
import { useContextTrigger } from '../util/useContextTrigger';
import { Row } from './UI';
import s from './EventRow.module.css';
import shared from './shared.module.css';

export function EventRow({ item, now, cd, onToggle, onContextMenu, onDelete, gameResetTime }) {
  const [cbScope, animateCb] = useAnimate();

  const ms        = item.deadline ? msUntilDeadline(item.deadline, now, item.deadlineTime) : null;
  const isExpired = ms !== null && ms <= 0;
  const isDone    = !!item.done;
  const h         = ms !== null ? ms / 3600000 : Infinity;

  // カウントダウン色（--muted ベース、他パネルと統一）
  const cdColor   = isExpired ? 'var(--danger)'
                  : h < 24   ? 'var(--cd-urgent)'
                  : h < 48   ? 'var(--cd-warn)'
                  :             'var(--muted)';

  // 日付表示色：期限切れのみ --danger、それ以外は常に --dim
  const dateColor = isExpired ? 'var(--danger)' : 'var(--dim)';

  const isTodo     = item.type === 'todo';
  const badgeClass = isTodo ? shared.badgeTodo : shared.badgeEvent;
  const badgeLabel = isTodo ? t('todoName') : t('events');
  const dimmed     = isDone || isExpired;
  const showDelete = (isDone || isExpired) && onDelete;

  // ゲームのリセット時刻と同じ場合は時刻を非表示
  const hasTime           = !!item.deadlineTime;
  const timeIsSameAsReset = hasTime && gameResetTime && item.deadlineTime === gameResetTime;
  const showTime          = hasTime && !timeIsSameAsReset;
  const localTime         = showTime ? utcToLocalHHMM(item.deadlineTime) : null;

  const handleCheck = (e) => {
    e.stopPropagation();
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    if (!isDone) playCheckSound();
    onToggle?.(item.id);
  };

  const trigger = useContextTrigger((x, y) => onContextMenu?.(item.id, x, y));

  return (
    <div {...trigger} style={{ userSelect: 'none' }}>
      <Row
        barSlot={null}
        checkbox={
          <button
            ref={cbScope}
            onClick={handleCheck}
            className={`${shared.cb}${isDone ? ` ${shared.cbChecked}` : ''}`}
          >
            {isDone ? '✓' : ''}
          </button>
        }
        content={
          <>
            <span className={`${shared.badge} ${badgeClass}`}>{badgeLabel}</span>
            <span
              className={s.name}
              style={{
                color:                   dimmed ? 'var(--muted)' : 'var(--text)',
                textDecoration:          dimmed ? 'line-through' : 'none',
                textDecorationThickness: dimmed ? '2px' : undefined,
              }}
            >
              {item.name}
            </span>
          </>
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
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                title={t('delete')}
              >✕</button>
            )
            : item.deadline
              ? (
                <span className={s.deadlineDate} style={{ color: dateColor }}>
                  {fmtDeadlineDate(item.deadline, t)}
                  {localTime && <span className={s.deadlineTime}>{localTime}</span>}
                </span>
              )
              : null
        }
      />
    </div>
  );
}
