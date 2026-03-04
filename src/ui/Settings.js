import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useRef } from 'react';
import { t } from '../util/i18n.js';
import { uid, utcToLocalHHMM, localToUtcHHMM } from '../constants.js';
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
          jsx('span', { className: 'dt-task-extra-lbl', children: t('resetLbl') }),
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
          jsx('span', { className: 'dt-task-extra-lbl', children: t('resetDay') }),
          jsx('input', {
            type: 'number', min: '1', max: '28',
            value: task.monthlyResetDay ?? 1,
            onChange: (e) => onChange('monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1))),
            style: { ...IS, width: 52, fontFamily: 'monospace', textAlign: 'center' },
          }),
          jsx('span', { className: 'dt-task-extra-lbl', children: t('dayUnit') }),
        ],
      }),
    ],
  });
}

export function SettingsModal({ games, setGames, onClose, showConfirm }) {
  const [newGame, setNewGame] = useState({ name: '', color: '#4a9eff', resetTime: '00:00' });
  const [showNG,  setShowNG]  = useState(false);
  const [newTask, setNewTask] = useState({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 });
  const [addTo,   setAddTo]   = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const importRef = useRef(null);

  // Animate out an item then remove it from state
  const animateDelete = (id, doDelete) => {
    setDeletingIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    setTimeout(() => {
      doDelete();
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }, 190);
  };

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const json = JSON.stringify({ games }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `daily-tracker-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ────────────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const imported = parsed.games ?? parsed; // accept {games:[]} or bare []
        if (!Array.isArray(imported)) throw new Error('invalid');
        // Re-assign fresh IDs to avoid collisions with existing data
        const fresh = imported.map((g) => ({
          ...g,
          id: uid(),
          tasks: (g.tasks ?? []).map((tk) => ({ ...tk, id: uid() })),
        }));
        showConfirm(t('importConfirm', { n: fresh.length }), () => setGames(fresh));
      } catch {
        alert(t('importError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';   // allow re-importing same file
  };

  // ── Drag state ──────────────────────────────────────────────────────
  const [dgFrom, setDgFrom] = useState(null);
  const [dgOver, setDgOver] = useState(null);
  const [dtDrag, setDtDrag] = useState(null);

  // ── Game CRUD ────────────────────────────────────────────────────────
  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), () =>
    animateDelete(id, () => setGames((g) => g.filter((gm) => gm.id !== id))));
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), tasks: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '00:00' });
    setShowNG(false);
  };

  // ── Task CRUD ────────────────────────────────────────────────────────
  const upTask  = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid) =>
    animateDelete(tid, () => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm)));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 });
    setAddTo(null);
  };
  const openAddTask = (gid) => {
    setAddTo(gid);
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 });
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

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 };

  return jsx(Modal, {
    title: `⚙️ ${t('settings')}`,
    titleExtra: jsxs(Fragment, {
      children: [
        jsx('button', {
          onClick: handleExport,
          className: 'dt-btn dt-btn-add',
          title: t('exportSettings'),
          children: '📤',
        }),
        jsx('button', {
          onClick: () => importRef.current?.click(),
          className: 'dt-btn dt-btn-add',
          title: t('importSettings'),
          children: '📥',
        }),
        jsx('input', {
          ref: importRef,
          type: 'file',
          accept: '.json,application/json',
          style: { display: 'none' },
          onChange: handleImportFile,
        }),
      ],
    }),
    onClose,
    children: jsx('div', {
      className: 'dt-settings-list',
      children: [
        ...games.map((game, gi) => jsxs('div', {
          draggable: true,
          onDragStart: onGameDS(gi), onDragOver: onGameDO(gi),
          onDrop: onGameDrp(gi),    onDragEnd: onGameDE,
          className: `game-card dt-settings-item-enter${deletingIds.has(game.id) ? ' dt-settings-item-exit' : ''}`,
          style: {
            ...gameDrop(gi),
            border: `1px solid ${game.color}44`,
            marginBottom: 10,
            opacity: dgFrom === gi ? 0.4 : 1, transition: 'opacity 0.15s',
          },
          children: [
            jsxs('div', {
              className: 'dt-game-header',
              children: [
                DragHandle,
                jsx('input', { type: 'color', value: game.color, onChange: (e) => upGame(game.id, 'color', e.target.value), style: { width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 } }),
                jsx('input', { value: game.name, onChange: (e) => upGame(game.id, 'name', e.target.value), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur(), className: 'dt-game-name-input', style: IS, placeholder: t('gameName') }),
                jsx('span', { className: 'dt-game-reset-lbl', children: t('resetLbl') }),
                jsx('input', { type: 'time', value: utcToLocalHHMM(game.resetTime), onChange: (e) => upGame(game.id, 'resetTime', localToUtcHHMM(e.target.value)), style: { ...IS, width: 86, fontFamily: 'monospace', flexShrink: 0 } }),
                jsx('button', { onClick: () => delGame(game.id, game.name), className: 'dt-btn dt-btn-danger', children: '✕' }),
              ],
            }),
            jsxs('div', {
              className: 'dt-game-body',
              children: [
                ...game.tasks.map((task, ti) => jsxs('div', {
                  draggable: true,
                  onDragStart: onTaskDS(game.id, ti), onDragOver: onTaskDO(game.id, ti),
                  onDrop: onTaskDrp(game.id, ti),     onDragEnd: onTaskDE,
                  className: `dt-settings-item-enter${deletingIds.has(task.id) ? ' dt-settings-item-exit' : ''}`,
                  style: { ...taskDrop(game.id, ti), ...rowStyle, opacity: dtDrag?.gid === game.id && dtDrag.from === ti ? 0.4 : 1, transition: 'opacity 0.15s' },
                  children: [
                    DragHandle,
                    jsx(TypeSelect, { value: task.type, onChange: (e) => upTask(game.id, task.id, 'type', e.target.value), style: { width: 104 } }),
                    jsx('input', { value: task.name, onChange: (e) => upTask(game.id, task.id, 'name', e.target.value), style: { ...IS, flex: 1, minWidth: 0 }, placeholder: t(`types.${task.type}`) }),
                    jsx(TaskExtraFields, { task, onChange: (f, v) => upTask(game.id, task.id, f, v) }),
                    jsx('button', { onClick: () => delTask(game.id, task.id), className: 'dt-btn dt-btn-danger', children: '✕' }),
                  ],
                }, task.id)),
                addTo === game.id
                  ? jsxs('div', {
                      style: rowStyle,
                      children: [
                        jsx(TypeSelect, { value: newTask.type, onChange: (e) => setNewTask((p) => ({ ...p, type: e.target.value })), style: { width: 104 } }),
                        jsx('input', { value: newTask.name, onChange: (e) => setNewTask((p) => ({ ...p, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addTask(game.id), style: { ...IS, flex: 1, minWidth: 0 }, placeholder: t(`types.${newTask.type}`), autoFocus: true }),
                        jsx(TaskExtraFields, { task: newTask, onChange: (f, v) => setNewTask((p) => ({ ...p, [f]: v })) }),
                        jsx('button', { onClick: () => addTask(game.id),  className: 'dt-btn dt-btn-confirm', children: t('add') }),
                        jsx('button', { onClick: () => setAddTo(null),    className: 'dt-btn',               children: '✕' }),
                      ],
                    })
                  : jsx('button', { onClick: () => openAddTask(game.id), className: 'dt-btn dt-btn-add dt-add-task-btn', children: t('addTask') }),
              ],
            }),
          ],
        }, game.id)),

        showNG
          ? jsxs('div', {
              className: 'dt-new-game-box',
              children: [
                jsxs('div', {
                  className: 'dt-new-game-header',
                  children: [
                    jsx('input', { type: 'color', value: newGame.color, onChange: (e) => setNewGame((g) => ({ ...g, color: e.target.value })) }),
                    jsx('input', { value: newGame.name, onChange: (e) => setNewGame((g) => ({ ...g, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addGame(), style: { ...IS, flex: 1, minWidth: 0 }, placeholder: t('gameName'), autoFocus: true }),
                    jsx('span', { className: 'dt-game-reset-lbl', children: t('resetLbl') }),
                    jsx('input', { type: 'time', value: newGame.resetTime, onChange: (e) => setNewGame((g) => ({ ...g, resetTime: e.target.value })), style: { ...IS, width: 86, fontFamily: 'monospace' } }),
                  ],
                }),
                jsxs('div', {
                  className: 'dt-new-game-actions',
                  children: [
                    jsx('button', { onClick: addGame,               className: 'dt-btn dt-btn-confirm', children: t('add') }),
                    jsx('button', { onClick: () => setShowNG(false), className: 'dt-btn',               children: t('cancel') }),
                  ],
                }),
              ],
            })
          : jsx('button', { className: 'add-game-btn', onClick: () => setShowNG(true), children: t('addGame') }),
      ],
    }),
  });
}
