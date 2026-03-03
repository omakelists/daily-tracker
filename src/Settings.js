import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { t } from './i18n.js';
import { uid, utcToLocalHHMM, localToUtcHHMM } from './constants.js';
import { IS, Modal } from './UI.js';

const TYPE_OPTS = ['daily', 'weekly', 'webdaily', 'monthly', 'halfmonthly'];

// ── Drag handle (uses .dt-drag-handle from style.css) ────────────────
const DragHandle = jsx('span', { className: 'dt-drag-handle', children: '⠿' });

function TypeSelect({ value, onChange, style }) {
  return jsx('select', {
    value, onChange,
    style: { ...IS, ...style },
    children: TYPE_OPTS.map((ty) => jsx('option', { value: ty, children: t(`types.${ty}`) }, ty)),
  });
}

function TaskExtraFields({ task, onChange }) {
  return jsxs(Fragment, {
    children: [
      task.type === 'webdaily' && jsxs(Fragment, {
        children: [
          // Use 'resetLbl' (shorter "Reset") instead of 'webReset' ("Web reset")
          jsx('span', { style: { fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }, children: t('resetLbl') }),
          jsx('input', {
            type: 'time',
            value: utcToLocalHHMM(task.webResetTime ?? '00:00'),
            onChange: (e) => onChange('webResetTime', localToUtcHHMM(e.target.value)),
            style: { ...IS, width: 84, fontFamily: 'monospace' },
          }),
        ],
      }),
      task.type === 'monthly' && jsxs(Fragment, {
        children: [
          jsx('span', { style: { fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }, children: t('resetDay') }),
          jsx('input', {
            type: 'number', min: '1', max: '28',
            value: task.monthlyResetDay ?? 1,
            onChange: (e) => onChange('monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1))),
            style: { ...IS, width: 52, fontFamily: 'monospace', textAlign: 'center' },
          }),
          jsx('span', { style: { fontSize: 10, color: 'var(--muted)' }, children: t('dayUnit') }),
        ],
      }),
      jsx('input', {
        type: 'url', value: task.url ?? '', placeholder: t('taskUrl'),
        onChange: (e) => onChange('url', e.target.value),
        style: { ...IS, width: 130, minWidth: 0 },
      }),
    ],
  });
}

export function SettingsModal({ games, setGames, onClose, showConfirm }) {
  const [newGame, setNewGame] = useState({ name: '', color: '#4a9eff', resetTime: '00:00', launchUrl: '' });
  const [showNG,  setShowNG]  = useState(false);
  const [newTask, setNewTask] = useState({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1, url: '' });
  const [addTo,   setAddTo]   = useState(null);

  // ── Drag state ──────────────────────────────────────────────────────
  const [dgFrom, setDgFrom] = useState(null);
  const [dgOver, setDgOver] = useState(null);
  const [dtDrag, setDtDrag] = useState(null);

  // ── Game CRUD ────────────────────────────────────────────────────────
  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), () => setGames((g) => g.filter((gm) => gm.id !== id)));
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), tasks: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '00:00', launchUrl: '' });
    setShowNG(false);
  };

  // ── Task CRUD ────────────────────────────────────────────────────────
  const upTask  = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid)        => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1, url: '' });
    setAddTo(null);
  };
  const openAddTask = (gid) => {
    setAddTo(gid);
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1, url: '' });
  };

  // ── Game drag handlers ────────────────────────────────────────────────
  const onGameDS  = (i)   => (e) => { setDgFrom(i); setDgOver(i); e.dataTransfer.effectAllowed = 'move'; };
  const onGameDO  = (i)   => (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dgFrom != null) setDgOver(i); };
  const onGameDrp = (i)   => (e) => {
    e.preventDefault();
    if (dgFrom == null || dgFrom === i) { setDgFrom(null); setDgOver(null); return; }
    setGames((g) => { const a = [...g], [it] = a.splice(dgFrom, 1); a.splice(i, 0, it); return a; });
    setDgFrom(null); setDgOver(null);
  };
  const onGameDE  = ()    => { setDgFrom(null); setDgOver(null); };

  // ── Task drag handlers ────────────────────────────────────────────────
  const onTaskDS  = (gid, i) => (e) => { setDtDrag({ gid, from: i, over: i }); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); };
  const onTaskDO  = (gid, i) => (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dtDrag?.gid === gid) setDtDrag((p) => ({ ...p, over: i })); };
  const onTaskDrp = (gid, i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!dtDrag || dtDrag.gid !== gid || dtDrag.from === i) { setDtDrag(null); return; }
    const { from } = dtDrag;
    setGames((g) => g.map((gm) => {
      if (gm.id !== gid) return gm;
      const tasks = [...gm.tasks], [it] = tasks.splice(from, 1);
      tasks.splice(i, 0, it);
      return { ...gm, tasks };
    }));
    setDtDrag(null);
  };
  const onTaskDE  = () => setDtDrag(null);

  // ── Drop indicator helpers ────────────────────────────────────────────
  const gameDrop  = (i)      => ({ borderTop: dgFrom != null && dgOver === i && dgFrom !== i ? '2px solid var(--link)' : '2px solid transparent', transition: 'border-color 0.12s' });
  const taskDrop  = (gid, i) => ({ borderTop: dtDrag?.gid === gid && dtDrag.over === i && dtDrag.from !== i ? '2px solid var(--link)' : '2px solid transparent', transition: 'border-color 0.12s' });

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' };

  return jsx(Modal, {
    title: `⚙️ ${t('settings')}`,
    onClose,
    children: jsx('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 0 },
      children: [
        ...games.map((game, gi) => jsxs('div', {
          draggable: true,
          onDragStart: onGameDS(gi), onDragOver: onGameDO(gi),
          onDrop: onGameDrp(gi),    onDragEnd: onGameDE,
          style: {
            ...gameDrop(gi),
            background: 'var(--bg-surface)', border: `1px solid ${game.color}44`,
            borderRadius: 10, overflow: 'hidden', marginBottom: 10,
            opacity: dgFrom === gi ? 0.4 : 1, transition: 'opacity 0.15s',
          },
          children: [
            jsxs('div', {
              style: { padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' },
              children: [
                DragHandle,
                jsx('input', { type: 'color', value: game.color, onChange: (e) => upGame(game.id, 'color', e.target.value), style: { width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 } }),
                jsx('input', { value: game.name, onChange: (e) => upGame(game.id, 'name', e.target.value), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur(), style: { ...IS, flex: 1, minWidth: 80, fontWeight: 700 }, placeholder: t('gameName') }),
                jsx('span', { style: { fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }, children: t('resetLbl') }),
                jsx('input', { type: 'time', value: utcToLocalHHMM(game.resetTime), onChange: (e) => upGame(game.id, 'resetTime', localToUtcHHMM(e.target.value)), style: { ...IS, width: 86, fontFamily: 'monospace' } }),
                jsx('input', { type: 'url', value: game.launchUrl ?? '', placeholder: t('launchUrl'), onChange: (e) => upGame(game.id, 'launchUrl', e.target.value), style: { ...IS, flex: 1, minWidth: 100 } }),
                jsx('button', { onClick: () => delGame(game.id, game.name), className: 'dt-btn dt-btn-danger', children: t('delete') }),
              ],
            }),
            jsxs('div', {
              style: { padding: '8px 13px 10px' },
              children: [
                ...game.tasks.map((task, ti) => jsxs('div', {
                  draggable: true,
                  onDragStart: onTaskDS(game.id, ti), onDragOver: onTaskDO(game.id, ti),
                  onDrop: onTaskDrp(game.id, ti),     onDragEnd: onTaskDE,
                  style: { ...taskDrop(game.id, ti), ...rowStyle, opacity: dtDrag?.gid === game.id && dtDrag.from === ti ? 0.4 : 1, transition: 'opacity 0.15s' },
                  children: [
                    DragHandle,
                    jsx(TypeSelect, { value: task.type, onChange: (e) => upTask(game.id, task.id, 'type', e.target.value), style: { width: 104 } }),
                    jsx('input', { value: task.name, onChange: (e) => upTask(game.id, task.id, 'name', e.target.value), style: { ...IS, flex: 1, minWidth: 70 }, placeholder: t(`types.${task.type}`) }),
                    jsx(TaskExtraFields, { task, onChange: (f, v) => upTask(game.id, task.id, f, v) }),
                    jsx('button', { onClick: () => delTask(game.id, task.id), className: 'dt-btn dt-btn-danger', children: '✕' }),
                  ],
                }, task.id)),
                addTo === game.id
                  ? jsxs('div', {
                      style: rowStyle,
                      children: [
                        jsx(TypeSelect, { value: newTask.type, onChange: (e) => setNewTask((p) => ({ ...p, type: e.target.value })), style: { width: 104 } }),
                        jsx('input', { value: newTask.name, onChange: (e) => setNewTask((p) => ({ ...p, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addTask(game.id), style: { ...IS, flex: 1, minWidth: 70 }, placeholder: t(`types.${newTask.type}`), autoFocus: true }),
                        jsx(TaskExtraFields, { task: newTask, onChange: (f, v) => setNewTask((p) => ({ ...p, [f]: v })) }),
                        jsx('button', { onClick: () => addTask(game.id),  className: 'dt-btn dt-btn-confirm', children: t('add') }),
                        jsx('button', { onClick: () => setAddTo(null),    className: 'dt-btn',               children: '✕' }),
                      ],
                    })
                  : jsx('button', { onClick: () => openAddTask(game.id), className: 'dt-btn dt-btn-add', style: { marginTop: 4 }, children: t('addTask') }),
              ],
            }),
          ],
        }, game.id)),

        showNG
          ? jsxs('div', {
              style: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 13px', marginBottom: 10 },
              children: [
                jsxs('div', {
                  style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
                  children: [
                    jsx('input', { type: 'color', value: newGame.color, onChange: (e) => setNewGame((g) => ({ ...g, color: e.target.value })), style: { width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer' } }),
                    jsx('input', { value: newGame.name, onChange: (e) => setNewGame((g) => ({ ...g, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addGame(), style: { ...IS, flex: 1, minWidth: 80 }, placeholder: t('gameName'), autoFocus: true }),
                    jsx('span', { style: { fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }, children: t('resetLbl') }),
                    jsx('input', { type: 'time', value: newGame.resetTime, onChange: (e) => setNewGame((g) => ({ ...g, resetTime: e.target.value })), style: { ...IS, width: 86, fontFamily: 'monospace' } }),
                    jsx('input', { type: 'url', value: newGame.launchUrl ?? '', placeholder: t('launchUrl'), onChange: (e) => setNewGame((g) => ({ ...g, launchUrl: e.target.value })), style: { ...IS, flex: 1, minWidth: 100 } }),
                  ],
                }),
                jsxs('div', {
                  style: { display: 'flex', gap: 8 },
                  children: [
                    jsx('button', { onClick: addGame,          className: 'dt-btn dt-btn-confirm', children: t('add') }),
                    jsx('button', { onClick: () => setShowNG(false), className: 'dt-btn',          children: t('cancel') }),
                  ],
                }),
              ],
            })
          : jsx('button', { className: 'add-game-btn', onClick: () => setShowNG(true), children: t('addGame') }),
      ],
    }),
  });
}
