import { html } from 'htm/preact';
import { useState, useEffect, useCallback } from 'htm/preact';
import { t } from './i18n.js';
import { DEFAULT_GAMES, DAILY_TYPES, L } from './constants.js';
import { loadGames, saveGames, loadChecks, saveChecks } from './storage.js';
import { getPeriodKey, getPrevPeriodKey, checkKey, playCheckSound, playAllDoneSound } from './helpers.js';
import { dragState, clearDrag, dragFromHandle, clearDragHandle } from './dnd.js';
import { btnStyle, ConfirmDialog } from './UI.js';
import { GameCard } from './GameCard.js';
import { SettingsModal } from './Settings.js';
import { CalendarModal } from './Calendar.js';

export function App() {
  const [games,   setGames]   = useState(null);
  const [checks,  setChecks]  = useState({});
  const [now,     setNow]     = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // { id: gameId, before: bool } — visual drop-target indicator for game cards
  const [gameDrop, setGameDrop] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setGames(loadGames() || DEFAULT_GAMES);
    setChecks(loadChecks());
  }, []);

  useEffect(() => { if (games !== null) saveGames(games); }, [games]);

  const cd = { d: t('cd.d'), h: t('cd.h'), m: t('cd.m') };

  // ── Reorder helpers ──────────────────────────────────────────────

  const reorderGames = useCallback((fromId, toId, insertBefore) => {
    if (fromId === toId) return;
    setGames(g => {
      const from = g.find(gm => gm.id === fromId);
      if (!from) return g;
      const rest = g.filter(gm => gm.id !== fromId);
      const toIdx = rest.findIndex(gm => gm.id === toId);
      if (toIdx === -1) return g;
      rest.splice(insertBefore ? toIdx : toIdx + 1, 0, from);
      return rest;
    });
  }, []);

  const reorderTasks = useCallback((gameId, fromTaskId, toTaskId, insertBefore) => {
    if (fromTaskId === toTaskId) return;
    setGames(g => g.map(game => {
      if (game.id !== gameId) return game;
      const from = game.tasks.find(tk => tk.id === fromTaskId);
      if (!from) return game;
      const rest = game.tasks.filter(tk => tk.id !== fromTaskId);
      const toIdx = rest.findIndex(tk => tk.id === toTaskId);
      if (toIdx === -1) return game;
      rest.splice(insertBefore ? toIdx : toIdx + 1, 0, from);
      return { ...game, tasks: rest };
    }));
  }, []);

  // ── Game drag handlers ───────────────────────────────────────────

  const onGameDragStart = useCallback((e, gameId) => {
    if (!dragFromHandle) { e.preventDefault(); return; }
    clearDragHandle();
    dragState.type   = 'game';
    dragState.gameId = gameId;
    e.dataTransfer.effectAllowed = 'move';
    // Dim the card being dragged
    e.currentTarget.style.opacity = '0.4';
  }, []);

  const onGameDragOver = useCallback((e, gameId) => {
    if (dragState.type !== 'game' || dragState.gameId === gameId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setGameDrop(prev =>
      prev?.id === gameId && prev?.before === before ? prev : { id: gameId, before }
    );
  }, []);

  const onGameDrop = useCallback((e, gameId) => {
    if (dragState.type !== 'game') return;
    e.preventDefault();
    const before = gameDrop?.id === gameId ? gameDrop.before : true;
    reorderGames(dragState.gameId, gameId, before);
    setGameDrop(null);
    clearDrag();
  }, [gameDrop, reorderGames]);

  const onGameDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '';
    setGameDrop(null);
    clearDrag();
    clearDragHandle();
  }, []);

  // ── Check logic ──────────────────────────────────────────────────

  const soloId = (game) => game.id + '_solo';

  const getDailyTasks = useCallback((game) => {
    const tasks = game.tasks.length ? game.tasks : [{ id: soloId(game), type: 'daily' }];
    return tasks.filter(tk => DAILY_TYPES.has(tk.type));
  }, []);

  const isAllDone = useCallback((game) => {
    const dt = getDailyTasks(game);
    return dt.length > 0 && dt.every(tk => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);
  }, [checks, now, getDailyTasks]);

  const sorted = games ? [...games].sort((a, b) => {
    const aD = isAllDone(a), bD = isAllDone(b);
    return aD === bD ? 0 : aD ? 1 : -1;
  }) : [];

  const toggle = useCallback((taskId, game, isMaster = false) => {
    setChecks(prev => {
      const next = { ...prev };
      const dailyTasks = getDailyTasks(game);
      if (isMaster) {
        const allDone = dailyTasks.every(tk => !!prev[checkKey(tk.id, getPeriodKey(tk, game, now))]);
        dailyTasks.forEach(tk => { next[checkKey(tk.id, getPeriodKey(tk, game, now))] = !allDone; });
        if (!allDone) playAllDoneSound(); else playCheckSound();
      } else {
        const allTasks = game.tasks.length ? game.tasks : [{ id: soloId(game), type: 'daily' }];
        const task = allTasks.find(tk => tk.id === taskId);
        if (!task) return prev;
        const k   = checkKey(task.id, getPeriodKey(task, game, now));
        const was = !!prev[k];
        next[k]   = !was;
        if (!was) {
          const allAfter = dailyTasks.every(tk => {
            const tk2 = checkKey(tk.id, getPeriodKey(tk, game, now));
            return tk2 === k ? true : !!prev[tk2];
          });
          if (allAfter && DAILY_TYPES.has(task.type)) playAllDoneSound(); else playCheckSound();
        }
      }
      saveChecks(next);
      return next;
    });
  }, [now, getDailyTasks]);

  const showConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn });

  if (!games) return html`
    <div style=${{ background:'#0d1117', color:'#8b949e', height:'100vh',
                   display:'flex', alignItems:'center', justifyContent:'center' }}>
      ${t('loading')}
    </div>
  `;

  return html`
    <div style=${{ minHeight:'100vh',
                   background:'linear-gradient(135deg,#0d1117 0%,#161b22 50%,#0d1117 100%)',
                   color:'#e6edf3' }}>

      <header style=${{
        background:'rgba(22,27,34,0.95)', backdropFilter:'blur(10px)',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
        padding:'13px 18px', display:'flex', alignItems:'center',
        justifyContent:'space-between', position:'sticky', top:0, zIndex:100,
      }}>
        <div style=${{ display:'flex', alignItems:'center', gap:10 }}>
          <span style=${{
            fontSize:17, fontWeight:800,
            background:'linear-gradient(90deg,#58a6ff,#bc8cff)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>${t('appTitle')}</span>
          <span style=${{ fontSize:11, color:'#8b949e', fontFamily:'monospace' }}>
            ${now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
          </span>
        </div>
        <div style=${{ display:'flex', gap:8 }}>
          <button onClick=${() => setShowCalendar(true)} style=${btnStyle('#21262d','#58a6ff')}>
            📅 ${t('record')}
          </button>
          <button onClick=${() => setShowSettings(true)} style=${btnStyle('#21262d','#bc8cff')}>
            ⚙️ ${t('settings')}
          </button>
        </div>
      </header>

      <main style=${{ padding:`12px ${L.PAGE_M}px 24px`, maxWidth:740, margin:'0 auto' }}>
        ${sorted.map(game => {
          const dropTarget = gameDrop?.id === game.id;
          return html`
            <div
              key=${game.id}
              draggable=${true}
              onMouseUp=${clearDragHandle}
              onDragStart=${(e) => onGameDragStart(e, game.id)}
              onDragOver=${(e) => onGameDragOver(e, game.id)}
              onDrop=${(e) => onGameDrop(e, game.id)}
              onDragEnd=${onGameDragEnd}
              onDragLeave=${(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setGameDrop(prev => prev?.id === game.id ? null : prev);
                }
              }}
              style=${{
                transition: 'box-shadow 0.1s',
                boxShadow: dropTarget
                  ? `inset 0 ${gameDrop.before ? '3' : '-3'}px 0 #58a6ff`
                  : 'none',
              }}
            >
              <${GameCard}
                game=${game}
                checks=${checks}
                now=${now}
                onToggle=${toggle}
                allDone=${isAllDone(game)}
                dailyTasks=${getDailyTasks(game)}
                cd=${cd}
                onReorderTasks=${reorderTasks}
              />
            </div>
          `;
        })}
        ${games.length === 0 && html`
          <div style=${{ textAlign:'center', padding:'60px 20px', color:'#8b949e' }}>
            ${t('noGames')}
          </div>
        `}
      </main>

      ${showSettings && html`
        <${SettingsModal}
          games=${games}
          setGames=${setGames}
          onClose=${() => setShowSettings(false)}
          showConfirm=${showConfirm}
        />
      `}
      ${showCalendar && html`
        <${CalendarModal}
          games=${games}
          checks=${checks}
          now=${now}
          onClose=${() => setShowCalendar(false)}
        />
      `}
      ${confirm && html`
        <${ConfirmDialog}
          message=${confirm.message}
          onConfirm=${() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel=${() => setConfirm(null)}
        />
      `}
    </div>
  `;
}
