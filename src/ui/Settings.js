import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useRef } from 'react';
import { css, cx, keyframes } from '@emotion/css';
import { t } from '../util/i18n.js';
import { uid, utcToLocalHHMM, localToUtcHHMM } from '../constants.js';
import { inputCls, Modal, sharedStyles as ss } from './UI.js';

// ── Keyframes ─────────────────────────────────────────────────────
const itemEnter = keyframes({ from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'translateY(0)' } });
const itemExit  = keyframes({ from: { opacity: 1, transform: 'translateY(0)',  maxHeight: '200px', marginBottom: '10px' }, to: { opacity: 0, transform: 'translateY(-4px)', maxHeight: '0', marginBottom: '0' } });

// ── Styles ────────────────────────────────────────────────────────
const s = {
  list:       css({ display: 'flex', flexDirection: 'column', gap: 0 }),
  gameItem:   css({ borderRadius: 10, overflow: 'hidden', background: 'var(--bg-surface)', marginBottom: 10, animation: `${itemEnter} 0.2s ease forwards` }),
  gameItemExit: css({ animation: `${itemExit} 0.2s ease forwards`, overflow: 'hidden', pointerEvents: 'none' }),
  gameHeader: css({ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }),
  colorInput: css({ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }),
  nameInput:  css({ flex: 1, minWidth: 0, fontWeight: 700 }),
  resetLbl:   css({ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }),
  gameBody:   css({ padding: '8px 13px 10px' }),
  taskItem:   css({ animation: `${itemEnter} 0.2s ease forwards` }),
  taskItemExit: css({ animation: `${itemExit} 0.2s ease forwards`, overflow: 'hidden', pointerEvents: 'none' }),
  extraLbl:   css({ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }),
  addTaskBtn: css({ marginTop: 4 }),
  newGameBox: css({ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 13px', marginBottom: 10 }),
  newGameHeader:  css({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }),
  newGameActions: css({ display: 'flex', gap: 8 }),
  addGameBtn: css({
    background: 'transparent', border: '2px dashed var(--border)', borderRadius: 10,
    color: 'var(--muted)', padding: 12, cursor: 'pointer', fontSize: 14, width: '100%',
    fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s',
    '&:hover': { borderColor: 'var(--link)', color: 'var(--link)' },
  }),
  dragHandle: css({ fontSize: 14, color: '#484f58', cursor: 'grab', lineHeight: 1, paddingRight: 2, flexShrink: 0, '&:active': { cursor: 'grabbing' } }),
};

const TYPE_OPTS = ['daily', 'weekly', 'webdaily', 'monthly', 'halfmonthly'];

const DragHandle = jsx('span', { className: s.dragHandle, children: '⠿' });

function TypeSelect({ value, onChange, style }) {
  return jsx('select', { value, onChange, className: inputCls, style, children: TYPE_OPTS.map((ty) => jsx('option', { value: ty, children: t(`types.${ty}`) }, ty)) });
}

function TaskExtraFields({ task, onChange }) {
  return jsxs(Fragment, { children: [
    task.type === 'webdaily' && jsxs(Fragment, { children: [
      jsx('span', { className: s.extraLbl, children: t('resetLbl') }),
      jsx('input', { type: 'time', value: utcToLocalHHMM(task.webResetTime ?? '00:00'), onChange: (e) => onChange('webResetTime', localToUtcHHMM(e.target.value)), className: inputCls, style: { width: 84, fontFamily: 'monospace' } }),
    ]}),
    task.type === 'monthly' && jsxs(Fragment, { children: [
      jsx('span', { className: s.extraLbl, children: t('resetDay') }),
      jsx('input', { type: 'number', min: '1', max: '28', value: task.monthlyResetDay ?? 1, onChange: (e) => onChange('monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1))), className: inputCls, style: { width: 52, fontFamily: 'monospace', textAlign: 'center' } }),
      jsx('span', { className: s.extraLbl, children: t('dayUnit') }),
    ]}),
  ]});
}

export function SettingsModal({ games, setGames, onClose, showConfirm }) {
  const [newGame,     setNewGame]     = useState({ name: '', color: '#4a9eff', resetTime: '00:00' });
  const [showNG,      setShowNG]      = useState(false);
  const [newTask,     setNewTask]     = useState({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 });
  const [addTo,       setAddTo]       = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const importRef = useRef(null);

  const animateDelete = (id, doDelete) => {
    setDeletingIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    setTimeout(() => { doDelete(); setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; }); }, 190);
  };

  const handleExport = () => {
    const json = JSON.stringify({ games }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `daily-tracker-settings-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed   = JSON.parse(ev.target.result);
        const imported = parsed.games ?? parsed;
        if (!Array.isArray(imported)) throw new Error('invalid');
        const fresh = imported.map((g) => ({ ...g, id: uid(), tasks: (g.tasks ?? []).map((tk) => ({ ...tk, id: uid() })) }));
        showConfirm(t('importConfirm', { n: fresh.length }), () => setGames(fresh));
      } catch { alert(t('importError')); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [dgFrom, setDgFrom] = useState(null);
  const [dgOver, setDgOver] = useState(null);
  const [dtDrag, setDtDrag] = useState(null);

  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), () => animateDelete(id, () => setGames((g) => g.filter((gm) => gm.id !== id))));
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), tasks: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '00:00' }); setShowNG(false);
  };

  const upTask  = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid) => animateDelete(tid, () => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm)));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 }); setAddTo(null);
  };
  const openAddTask = (gid) => { setAddTo(gid); setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 }); };

  const onGameDS  = (i)   => (e) => { setDgFrom(i); setDgOver(i); e.dataTransfer.effectAllowed = 'move'; };
  const onGameDO  = (i)   => (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dgFrom != null) setDgOver(i); };
  const onGameDrp = (i)   => (e) => { e.preventDefault(); if (dgFrom == null || dgFrom === i) { setDgFrom(null); setDgOver(null); return; } setGames((g) => { const a = [...g], [it] = a.splice(dgFrom, 1); a.splice(i, 0, it); return a; }); setDgFrom(null); setDgOver(null); };
  const onGameDE  = ()    => { setDgFrom(null); setDgOver(null); };

  const onTaskDS  = (gid, i) => (e) => { setDtDrag({ gid, from: i, over: i }); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); };
  const onTaskDO  = (gid, i) => (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dtDrag?.gid === gid) setDtDrag((p) => ({ ...p, over: i })); };
  const onTaskDrp = (gid, i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!dtDrag || dtDrag.gid !== gid || dtDrag.from === i) { setDtDrag(null); return; }
    const { from } = dtDrag;
    setGames((g) => g.map((gm) => { if (gm.id !== gid) return gm; const tasks = [...gm.tasks], [it] = tasks.splice(from, 1); tasks.splice(i, 0, it); return { ...gm, tasks }; }));
    setDtDrag(null);
  };
  const onTaskDE = () => setDtDrag(null);

  const gameDrop = (i)      => ({ borderTop: dgFrom != null && dgOver === i && dgFrom !== i ? '2px solid var(--link)' : '2px solid transparent', transition: 'border-color 0.12s' });
  const taskDrop = (gid, i) => ({ borderTop: dtDrag?.gid === gid && dtDrag.over === i && dtDrag.from !== i ? '2px solid var(--link)' : '2px solid transparent', transition: 'border-color 0.12s' });
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 };

  return jsx(Modal, {
    title: `⚙️ ${t('settings')}`,
    titleExtra: jsxs(Fragment, { children: [
      jsx('button', { onClick: handleExport,                   className: cx(ss.btn, ss.btnAdd), title: t('exportSettings'), children: '📤' }),
      jsx('button', { onClick: () => importRef.current?.click(), className: cx(ss.btn, ss.btnAdd), title: t('importSettings'), children: '📥' }),
      jsx('input', { ref: importRef, type: 'file', accept: '.json,application/json', style: { display: 'none' }, onChange: handleImportFile }),
    ]}),
    onClose,
    children: jsx('div', { className: s.list, children: [
      ...games.map((game, gi) => jsxs('div', {
        draggable: true,
        onDragStart: onGameDS(gi), onDragOver: onGameDO(gi), onDrop: onGameDrp(gi), onDragEnd: onGameDE,
        className: cx(s.gameItem, deletingIds.has(game.id) && s.gameItemExit),
        style: { ...gameDrop(gi), border: `1px solid ${game.color}44`, opacity: dgFrom === gi ? 0.4 : 1, transition: 'opacity 0.15s' },
        children: [
          jsxs('div', { className: s.gameHeader, children: [
            DragHandle,
            jsx('input', { type: 'color', value: game.color, onChange: (e) => upGame(game.id, 'color', e.target.value), className: s.colorInput }),
            jsx('input', { value: game.name, onChange: (e) => upGame(game.id, 'name', e.target.value), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur(), className: cx(s.nameInput, inputCls), placeholder: t('gameName') }),
            jsx('span', { className: s.resetLbl, children: t('resetLbl') }),
            jsx('input', { type: 'time', value: utcToLocalHHMM(game.resetTime), onChange: (e) => upGame(game.id, 'resetTime', localToUtcHHMM(e.target.value)), className: inputCls, style: { width: 86, fontFamily: 'monospace', flexShrink: 0 } }),
            jsx('button', { onClick: () => delGame(game.id, game.name), className: cx(ss.btn, ss.btnDanger), children: '✕' }),
          ]}),
          jsxs('div', { className: s.gameBody, children: [
            ...game.tasks.map((task, ti) => jsxs('div', {
              draggable: true,
              onDragStart: onTaskDS(game.id, ti), onDragOver: onTaskDO(game.id, ti), onDrop: onTaskDrp(game.id, ti), onDragEnd: onTaskDE,
              className: cx(s.taskItem, deletingIds.has(task.id) && s.taskItemExit),
              style: { ...taskDrop(game.id, ti), ...rowStyle, opacity: dtDrag?.gid === game.id && dtDrag.from === ti ? 0.4 : 1, transition: 'opacity 0.15s' },
              children: [
                DragHandle,
                jsx(TypeSelect, { value: task.type, onChange: (e) => upTask(game.id, task.id, 'type', e.target.value), style: { width: 104 } }),
                jsx('input', { value: task.name, onChange: (e) => upTask(game.id, task.id, 'name', e.target.value), className: inputCls, style: { flex: 1, minWidth: 0 }, placeholder: t(`types.${task.type}`) }),
                jsx(TaskExtraFields, { task, onChange: (f, v) => upTask(game.id, task.id, f, v) }),
                jsx('button', { onClick: () => delTask(game.id, task.id), className: cx(ss.btn, ss.btnDanger), children: '✕' }),
              ],
            }, task.id)),
            addTo === game.id
              ? jsxs('div', { style: rowStyle, children: [
                  jsx(TypeSelect, { value: newTask.type, onChange: (e) => setNewTask((p) => ({ ...p, type: e.target.value })), style: { width: 104 } }),
                  jsx('input', { value: newTask.name, onChange: (e) => setNewTask((p) => ({ ...p, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addTask(game.id), className: inputCls, style: { flex: 1, minWidth: 0 }, placeholder: t(`types.${newTask.type}`), autoFocus: true }),
                  jsx(TaskExtraFields, { task: newTask, onChange: (f, v) => setNewTask((p) => ({ ...p, [f]: v })) }),
                  jsx('button', { onClick: () => addTask(game.id),  className: cx(ss.btn, ss.btnConfirm), children: t('add') }),
                  jsx('button', { onClick: () => setAddTo(null),    className: ss.btn,                    children: '✕' }),
                ]})
              : jsx('button', { onClick: () => openAddTask(game.id), className: cx(ss.btn, ss.btnAdd, s.addTaskBtn), children: t('addTask') }),
          ]}),
        ],
      }, game.id)),

      showNG
        ? jsxs('div', { className: s.newGameBox, children: [
            jsxs('div', { className: s.newGameHeader, children: [
              jsx('input', { type: 'color', value: newGame.color, onChange: (e) => setNewGame((g) => ({ ...g, color: e.target.value })), className: s.colorInput }),
              jsx('input', { value: newGame.name, onChange: (e) => setNewGame((g) => ({ ...g, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addGame(), className: inputCls, style: { flex: 1, minWidth: 0 }, placeholder: t('gameName'), autoFocus: true }),
              jsx('span', { className: s.resetLbl, children: t('resetLbl') }),
              jsx('input', { type: 'time', value: newGame.resetTime, onChange: (e) => setNewGame((g) => ({ ...g, resetTime: e.target.value })), className: inputCls, style: { width: 86, fontFamily: 'monospace' } }),
            ]}),
            jsxs('div', { className: s.newGameActions, children: [
              jsx('button', { onClick: addGame,               className: cx(ss.btn, ss.btnConfirm), children: t('add') }),
              jsx('button', { onClick: () => setShowNG(false), className: ss.btn,                   children: t('cancel') }),
            ]}),
          ]})
        : jsx('button', { className: s.addGameBtn, onClick: () => setShowNG(true), children: t('addGame') }),
    ]}),
  });
}
