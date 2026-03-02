import { html } from 'htm/preact';
import { useState, useEffect } from 'htm/preact';
import { t } from './i18n.js';
import { getDaysInMonth, fmtDate, DAILY_TYPES } from './constants.js';
import { checkKey } from './helpers.js';
import { IS, SB, Modal } from './UI.js';

/**
 * Calendar shows daily/webdaily completion only.
 * Weekly, monthly, and halfmonthly tasks are excluded because their
 * period spans multiple calendar days, making day-cell highlighting misleading.
 */
export function CalendarModal({ games, checks, now, onClose }) {
  const [year,  setYear]   = useState(now.getFullYear());
  const [month, setMonth]  = useState(now.getMonth());
  const [selGame, setSelGame] = useState(games[0]?.id || null);
  const [selTask, setSelTask] = useState(null);

  const game = games.find(g => g.id===selGame);
  // Only daily-type tasks (daily + webdaily) are shown in calendar
  const tasks = (game?.tasks || []).filter(tk => DAILY_TYPES.has(tk.type));

  useEffect(() => { setSelTask(null); }, [selGame]);

  const days = getDaysInMonth(year, month);
  const fd   = new Date(year, month, 1).getDay();
  const today = fmtDate(now);

  function getStatus(dateKey) {
    if (!game) return 'none';
    // Use selected daily task, or all daily tasks
    const tt = selTask ? tasks.filter(tk => tk.id===selTask) : tasks;
    if (!tt.length) return 'none';
    const done = tt.filter(tk => !!checks[checkKey(tk.id, dateKey)]).length;
    if (done===0) return 'none';
    return done===tt.length ? 'all' : 'partial';
  }

  const dayNames = t('dayNames');

  const nav = (delta) => {
    const d = new Date(year, month+delta);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  return html`
    <${Modal} title=${'📅 '+t('record')} onClose=${onClose}>
      <!-- Game / task selectors -->
      <div style=${{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <select value=${selGame||''} onChange=${e => setSelGame(e.target.value)}
          style=${{ ...IS, flex:1, minWidth:120 }}>
          ${games.map(g => html`<option key=${g.id} value=${g.id}>${g.name}</option>`)}
        </select>
        ${tasks.length>0 && html`
          <select value=${selTask||''} onChange=${e => setSelTask(e.target.value||null)}
            style=${{ ...IS, flex:1, minWidth:100 }}>
            <option value="">${t('taskAll')}</option>
            ${tasks.map(tk => html`
              <option key=${tk.id} value=${tk.id}>
                ${tk.name.trim() || t('types.'+tk.type)}
              </option>
            `)}
          </select>
        `}
      </div>

      <!-- Month navigation -->
      <div style=${{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button onClick=${() => nav(-1)} style=${SB}>‹</button>
        <span style=${{ fontWeight:700, fontSize:15 }}>
          ${new Date(year,month,1).toLocaleDateString([], {year:'numeric',month:'long'})}
        </span>
        <button onClick=${() => nav(1)} style=${SB}>›</button>
      </div>

      <!-- Calendar grid -->
      <div style=${{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        ${dayNames.map(d => html`
          <div key=${d} style=${{ textAlign:'center', fontSize:11, color:'#8b949e', padding:'3px 0' }}>${d}</div>
        `)}
        ${Array.from({length:fd}).map((_,i) => html`<div key=${'e'+i}/>`)}
        ${Array.from({length:days}).map((_,i) => {
          const day = i+1;
          const dk  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const s   = getStatus(dk);
          const isToday = dk===today;
          return html`
            <div key=${day} class="cal-day" style=${{
              fontWeight: isToday ? 700 : 400,
              background: s==='all' ? '#1a7f37' : s==='partial' ? '#1f3a27' : 'rgba(255,255,255,0.03)',
              border: isToday ? '2px solid #58a6ff' : '1px solid rgba(255,255,255,0.05)',
              color: s==='all' ? '#56d364' : s==='partial' ? '#3fb950' : '#484f58',
            }}>${day}</div>
          `;
        })}
      </div>

      <!-- Legend -->
      <div style=${{ display:'flex', gap:14, marginTop:12, fontSize:12, color:'#8b949e' }}>
        ${[['#1a7f37',t('allDone')],['#1f3a27',t('partial')],['rgba(255,255,255,0.05)',t('incomplete')]].map(([bg,lbl]) => html`
          <span key=${lbl}>
            <span style=${{
              display:'inline-block', width:11, height:11, background:bg,
              border: bg.includes('rgba') ? '1px solid rgba(255,255,255,0.1)' : 'none',
              borderRadius:3, marginRight:4,
            }}/>
            ${lbl}
          </span>
        `)}
      </div>
    </${Modal}>
  `;
}
