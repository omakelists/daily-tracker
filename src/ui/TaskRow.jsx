import { useAnimate } from 'motion/react';
import { t } from '../util/i18n';
import { DAILY_TYPES, utcToLocalHHMM } from '../constants';
import { getPeriodKey, getPrevPeriodKey, msUntilTaskReset, formatCountdown, checkKey } from '../util/helpers';
import { Row, PrevBar } from './UI';
import s from './TaskRow.module.css';
import shared from './shared.module.css';

const BADGE_MAP = {
  daily:       shared.badgeDaily,
  weekly:      shared.badgeWeekly,
  webdaily:    shared.badgeWebdaily,
  monthly:     shared.badgeMonthly,
  halfmonthly: shared.badgeHalfmonthly,
};

export function TaskRow({ task, game, checks, now, onToggle, cd }) {
  const [cbScope, animateCb] = useAnimate();

  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);

  const ms      = msUntilTaskReset(task, game, now);
  const h       = ms / 3600000;
  const cdColor = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const showCD  = task.type === 'monthly' || task.type === 'halfmonthly' ||
    (task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime);

  const localWebReset = task.webResetTime ? utcToLocalHHMM(task.webResetTime) : null;

  const handleClick = () => {
    animateCb(cbScope.current, { scale: [1, 1.3, 0.92, 1.08, 1] }, { duration: 0.22 });
    onToggle(task.id, game);
  };

  return (
    <Row
      className={s.row}
      barSlot={<PrevBar show={showPrev} checked={prevChecked} />}
      checkbox={
        <button
          ref={cbScope}
          onClick={handleClick}
          className={`${shared.cb}${isChecked ? ` ${shared.cbChecked}` : ""}`}
        >
          {isChecked ? '✓' : ''}
        </button>
      }
      content={
        <>
          <span className={`${shared.badge} ${BADGE_MAP[task.type]}`}>{t(`types.${task.type}`)}</span>
          <span
            className={s.taskName}
            style={{
              color: isChecked ? 'var(--dim)' : 'var(--text)',
              textDecoration: isChecked ? 'line-through' : 'none',
            }}
          >
            {task.name.trim() || t(`types.${task.type}`)}
          </span>
        </>
      }
      meta={
        <>
          {showCD && !isChecked && <span className={s.countdown} style={{ color: cdColor }}>⏱{formatCountdown(ms, cd)}</span>}
          {task.type === 'webdaily' && localWebReset && localWebReset !== utcToLocalHHMM(game.resetTime) && <span className={s.resetLbl}>{localWebReset}</span>}
          {task.type === 'monthly' && <span className={s.resetLbl}>{t('everyDay', { day: task.monthlyResetDay ?? 1 })}</span>}
        </>
      }
      rightSlot={null}
    />
  );
}
