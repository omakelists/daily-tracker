import { useState } from 'react';
import { cx } from '../util/cx';
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
  const [pop, setPop] = useState(false);
  const firePop = () => { setPop(true); setTimeout(() => setPop(false), 260); };

  const isChecked   = !!checks[checkKey(task.id, getPeriodKey(task, game, now))];
  const prevChecked = !!checks[checkKey(task.id, getPrevPeriodKey(task, game, now))];
  const showPrev    = DAILY_TYPES.has(task.type);

  const ms      = msUntilTaskReset(task, game, now);
  const h       = ms / 3600000;
  const cdColor = h < 3 ? 'var(--cd-urgent)' : h < 6 ? 'var(--cd-warn)' : 'var(--muted)';
  const showCD  = task.type === 'monthly' || task.type === 'halfmonthly' ||
    (task.type === 'webdaily' && task.webResetTime && task.webResetTime !== game.resetTime);

  const localWebReset = task.webResetTime ? utcToLocalHHMM(task.webResetTime) : null;

  return (
    <Row
      className={s.row}
      barSlot={<PrevBar show={showPrev} checked={prevChecked} />}
      checkbox={
        <button onClick={() => { firePop(); onToggle(task.id, game); }} className={cx(shared.cb, isChecked && shared.cbChecked, pop && shared.cbPop)}>
          {isChecked ? '✓' : ''}
        </button>
      }
      content={
        <>
          <span className={cx(shared.badge, BADGE_MAP[task.type])}>{t(`types.${task.type}`)}</span>
          <span style={{
            fontSize: 13, color: isChecked ? 'var(--dim)' : 'var(--text)',
            textDecoration: isChecked ? 'line-through' : 'none',
            WebkitTextStroke: '0.6px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
            transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
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
