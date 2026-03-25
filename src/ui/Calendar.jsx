import { useState, useEffect } from 'react';
import { t, ta } from '../util/i18n';
import { DAILY, EVENT } from '../constants';
import { getDaysInMonth, fmtDate, checkKey } from '../util/helpers';
import { Modal } from './UI';
import s from './Calendar.module.css';
import shared from './shared.module.css';

const LEGEND_ITEMS = [
  { key: 'all',     dotClass: 'legendDotAll',     label: 'allDone'    },
  { key: 'partial', dotClass: 'legendDotPartial',  label: 'partial'    },
  { key: 'none',    dotClass: 'legendDotNone',     label: 'incomplete' },
];

export function CalendarModal({ games, checks, now, onClose }) {
  const [year,    setYear]    = useState(now.getUTCFullYear());
  const [month,   setMonth]   = useState(now.getUTCMonth());
  const [selGame, setSelGame] = useState(games[0]?.id ?? null);
  const [selTask, setSelTask] = useState(null);

  const game       = games.find((g) => g.id === selGame);
  const rawTasks   = (game?.items ?? []).filter((it) => it.type !== EVENT);
  const dailyTasks = rawTasks.length
    ? rawTasks.filter((tk) => tk.type === DAILY)
    : [{ id: `${game?.id}_solo`, type: DAILY, name: '' }];

  useEffect(() => { setSelTask(null); }, [selGame]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const today       = fmtDate(now);

  const getStatus = (dk) => {
    if (!game) return 'none';
    const tt   = selTask ? dailyTasks.filter((tk) => tk.id === selTask) : dailyTasks;
    if (!tt.length) return 'none';
    const done = tt.filter((tk) => !!checks[checkKey(tk.id, dk)]).length;
    if (done === 0)         return 'none';
    if (done === tt.length) return 'all';
    return 'partial';
  };

  const nav = (delta) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear()); setMonth(d.getUTCMonth());
  };

  const dayNames = ta('dayNames');

  return (
    <Modal title={`📅 ${t('record')}`} onClose={onClose}>
      <div>
        <div className={s.filters}>
          <select value={selGame ?? ''} onChange={(e) => setSelGame(e.target.value)} className={`${shared.inputCls} ${s.filterSelect}`}>
            {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {dailyTasks.length > 0 && (
            <select value={selTask ?? ''} onChange={(e) => setSelTask(e.target.value || null)} className={`${shared.inputCls} ${s.filterSelect}`}>
              <option value="">{t('taskAll')}</option>
              {dailyTasks.map((tk) => <option key={tk.id} value={tk.id}>{tk.name.trim() || t(`types.${tk.type}`)}</option>)}
            </select>
          )}
        </div>

        <div className={s.header}>
          <button onClick={() => nav(-1)} className={shared.btn}>‹</button>
          <span className={s.month}>{new Date(Date.UTC(year, month, 1)).toLocaleDateString([], { year: 'numeric', month: 'long' })}</span>
          <button onClick={() => nav(1)}  className={shared.btn}>›</button>
        </div>

        <div className={s.grid}>
          {dayNames.map((d) => <div key={d} className={s.dayName}>{d}</div>)}
          {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dk  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const st  = getStatus(dk);
            return (
              <div
                key={dk}
                className={`${st === 'all' ? s.dayAll : st === 'partial' ? s.dayPartial : s.dayDefault} ${s.day}${dk === today ? ` ${s.dayToday}` : ""}`}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className={s.legend}>
          {LEGEND_ITEMS.map(({ key, dotClass, label }) => (
            <span key={key}>
              <span className={`${s.legendDot} ${s[dotClass]}`} />
              {t(label)}
            </span>
          ))}
        </div>
      </div>
    </Modal>
  );
}
