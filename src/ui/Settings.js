import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useRef } from 'react';
import { css, cx, keyframes } from '@emotion/css';
import { t } from '../util/i18n.js';
import { uid, utcToLocalHHMM, localToUtcHHMM } from '../constants.js';
import { imgGet, imgSet, imgDelete } from '../util/imageStorage.js';
import { inputCls, Modal, sharedStyles as ss } from './UI.js';
import { CropModal } from './CropModal.js';

// ── Keyframes ─────────────────────────────────────────────────────
const itemEnter = keyframes({ from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'translateY(0)' } });
const itemExit  = keyframes({ from: { opacity: 1, transform: 'translateY(0)', maxHeight: '200px', marginBottom: '10px' }, to: { opacity: 0, transform: 'translateY(-4px)', maxHeight: '0', marginBottom: '0' } });

// ── Styles ────────────────────────────────────────────────────────
const s = {
  list:          css({ display: 'flex', flexDirection: 'column', gap: 0 }),
  gameItem:      css({ borderRadius: 10, overflow: 'hidden', background: 'var(--bg-surface)', marginBottom: 10, animation: `${itemEnter} 0.2s ease forwards` }),
  gameItemExit:  css({ animation: `${itemExit} 0.2s ease forwards`, overflow: 'hidden', pointerEvents: 'none' }),
  gameHeader:    css({ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }),
  colorInput:    css({ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }),
  nameInput:     css({ flex: 1, minWidth: 0, fontWeight: 700 }),
  resetLbl:      css({ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }),
  gameBody:      css({ padding: '8px 13px 10px' }),
  taskItem:      css({ animation: `${itemEnter} 0.2s ease forwards` }),
  taskItemExit:  css({ animation: `${itemExit} 0.2s ease forwards`, overflow: 'hidden', pointerEvents: 'none' }),
  extraLbl:      css({ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }),
  addTaskBtn:    css({ marginTop: 4 }),
  newGameBox:    css({ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 13px', marginBottom: 10 }),
  newGameHeader: css({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }),
  newGameActions:css({ display: 'flex', gap: 8 }),
  addGameBtn:    css({
    background: 'transparent', border: '2px dashed var(--border)', borderRadius: 10,
    color: 'var(--muted)', padding: 12, cursor: 'pointer', fontSize: 14, width: '100%',
    fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s',
    '&:hover': { borderColor: 'var(--link)', color: 'var(--link)' },
  }),
  dragHandle: css({ fontSize: 14, color: '#484f58', cursor: 'grab', lineHeight: 1, paddingRight: 2, flexShrink: 0, '&:active': { cursor: 'grabbing' } }),

  // ── Image section (global app-bg) ────────────────────────────
  imgSection:    css({ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 13px', marginBottom: 14 }),
  imgSectionTitle: css({ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: 0.5 }),

  // Drop zone shared style
  dropZone:      css({
    border: '2px dashed var(--border)', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
    fontSize: 12, color: 'var(--muted)', fontFamily: 'inherit', background: 'transparent',
    '&:hover': { borderColor: 'var(--link)', color: 'var(--link)', background: 'rgba(88,166,255,0.05)' },
  }),
  dropZoneLarge: css({ padding: '14px 0', width: '100%' }),
  dropZoneOver:  css({ borderColor: 'var(--link)', background: 'rgba(88,166,255,0.08)', color: 'var(--link)' }),

  // Thumbnail row (when image is set)
  thumbRow:      css({ display: 'flex', alignItems: 'center', gap: 10 }),
  thumb:         css({ width: 72, height: 48, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }),
  thumbInfo:     css({ flex: 1, fontSize: 11, color: 'var(--muted)' }),

  // Compact image button for game header
  imgBtn: css({
    width: 32, height: 26, borderRadius: 5, border: '1px dashed var(--border)',
    background: 'transparent', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, color: 'var(--muted)', transition: 'border-color 0.15s',
    overflow: 'hidden', padding: 0,
    '&:hover': { borderColor: 'var(--link)' },
  }),
  imgBtnThumb: css({ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }),
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

// ── ImageDropZone ─────────────────────────────────────────────────
// mode: 'large' (app bg section) | 'compact' (game header btn)
function ImageDropZone({ currentDataUrl, onFile, onRemove, mode = 'large' }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault(); setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  };

  if (mode === 'compact') {
    // Small button in game header: shows thumbnail or camera icon
    return jsxs('div', { style: { position: 'relative', flexShrink: 0 }, children: [
      jsxs('button', {
        className: s.imgBtn,
        title: t('imgSetBg'),
        onClick: () => fileRef.current?.click(),
        onDragOver: (e) => { e.preventDefault(); setOver(true); },
        onDragLeave: () => setOver(false),
        onDrop: handleDrop,
        style: over ? { borderColor: 'var(--link)' } : undefined,
        children: [
          currentDataUrl
            ? jsx('img', { src: currentDataUrl, className: s.imgBtnThumb, draggable: false })
            : jsx('span', { children: '🖼️' }),
        ],
      }),
      currentDataUrl && jsx('button', {
        onClick: (e) => { e.stopPropagation(); onRemove(); },
        style: { position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: 'white', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
        children: '✕',
      }),
      jsx('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: (e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; } }),
    ]});
  }

  // Large drop zone (app bg section)
  return jsxs('div', { children: [
    currentDataUrl
      ? jsxs('div', { className: s.thumbRow, children: [
          jsx('img', { src: currentDataUrl, className: s.thumb, draggable: false }),
          jsx('span', { className: s.thumbInfo, children: t('appBgSet') }),
          jsx('button', {
            onClick: () => fileRef.current?.click(),
            className: cx(ss.btn, ss.btnAdd),
            children: t('imgChange'),
          }),
          jsx('button', { onClick: onRemove, className: cx(ss.btn, ss.btnDanger), children: t('delete') }),
        ]})
      : jsx('button', {
          className: cx(s.dropZone, s.dropZoneLarge, over && s.dropZoneOver),
          onClick: () => fileRef.current?.click(),
          onDragOver: (e) => { e.preventDefault(); setOver(true); },
          onDragLeave: () => setOver(false),
          onDrop: handleDrop,
          children: t('imgDrop'),
        }),
    jsx('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: (e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; } }),
  ]});
}

// ── SettingsModal ─────────────────────────────────────────────────
export function SettingsModal({ games, setGames, onClose, showConfirm, refreshImages }) {
  const [newGame,     setNewGame]     = useState({ name: '', color: '#4a9eff', resetTime: '00:00' });
  const [showNG,      setShowNG]      = useState(false);
  const [newTask,     setNewTask]     = useState({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 });
  const [addTo,       setAddTo]       = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const importRef = useRef(null);

  // Crop modal state
  const [cropFile,   setCropFile]   = useState(null);   // File being cropped
  const [cropTarget, setCropTarget] = useState(null);   // 'app-bg' | 'game-{id}'

  // Thumbnail cache for display in Settings (not from IndexedDB directly)
  const [appBgThumb,  setAppBgThumb]  = useState(null);
  const [gameBgThumbs, setGameBgThumbs] = useState({});  // {[id]: dataUrl}

  // Load thumbnails on mount
  useState(() => {
    imgGet('app-bg').then((v) => setAppBgThumb(v?.dataUrl ?? null));
    games.forEach((g) => imgGet(`game-${g.id}`).then((v) => {
      if (v) setGameBgThumbs((prev) => ({ ...prev, [g.id]: v.dataUrl }));
    }));
  });

  // ── Image handlers ────────────────────────────────────────────
  const openCrop = (target, file) => {
    setCropTarget(target);
    setCropFile(file);
  };

  const handleCropConfirm = async (dataUrl, opacity) => {
    if (!cropTarget) return;
    await imgSet(cropTarget, dataUrl, opacity);
    if (cropTarget === 'app-bg') {
      setAppBgThumb(dataUrl);
    } else {
      const id = cropTarget.replace('game-', '');
      setGameBgThumbs((prev) => ({ ...prev, [id]: dataUrl }));
    }
    setCropFile(null); setCropTarget(null);
    refreshImages();
  };

  const handleCropCancel = () => { setCropFile(null); setCropTarget(null); };

  const removeAppBg = async () => {
    await imgDelete('app-bg');
    setAppBgThumb(null);
    refreshImages();
  };

  const removeGameBg = async (gameId) => {
    await imgDelete(`game-${gameId}`);
    setGameBgThumbs((prev) => { const n = { ...prev }; delete n[gameId]; return n; });
    refreshImages();
  };

  // ── Export / Import ───────────────────────────────────────────
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

  // ── Drag state ────────────────────────────────────────────────
  const [dgFrom, setDgFrom] = useState(null);
  const [dgOver, setDgOver] = useState(null);
  const [dtDrag, setDtDrag] = useState(null);

  // ── Game CRUD ─────────────────────────────────────────────────
  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), async () => {
    await imgDelete(`game-${id}`);
    setGameBgThumbs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    animateDelete(id, () => setGames((g) => g.filter((gm) => gm.id !== id)));
    refreshImages();
  });
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), tasks: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '00:00' }); setShowNG(false);
  };

  // ── Task CRUD ─────────────────────────────────────────────────
  const upTask  = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid) => animateDelete(tid, () => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm)));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 }); setAddTo(null);
  };
  const openAddTask = (gid) => { setAddTo(gid); setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1 }); };

  // ── Drag handlers ─────────────────────────────────────────────
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

  return jsxs(Fragment, { children: [
    // ── Crop modal (rendered above everything) ─────────────────
    cropFile && jsx(CropModal, { file: cropFile, onConfirm: handleCropConfirm, onCancel: handleCropCancel }),

    jsx(Modal, {
      title: `⚙️ ${t('settings')}`,
      titleExtra: jsxs(Fragment, { children: [
        jsx('button', { onClick: handleExport,                     className: cx(ss.btn, ss.btnAdd), title: t('exportSettings'), children: '📤' }),
        jsx('button', { onClick: () => importRef.current?.click(), className: cx(ss.btn, ss.btnAdd), title: t('importSettings'), children: '📥' }),
        jsx('input', { ref: importRef, type: 'file', accept: '.json,application/json', style: { display: 'none' }, onChange: handleImportFile }),
      ]}),
      onClose,
      children: jsx('div', { className: s.list, children: [

        // ── App background image section ───────────────────────
        jsxs('div', { className: s.imgSection, children: [
          jsx('div', { className: s.imgSectionTitle, children: t('appBgImage') }),
          jsx(ImageDropZone, {
            currentDataUrl: appBgThumb,
            onFile: (file) => openCrop('app-bg', file),
            onRemove: removeAppBg,
            mode: 'large',
          }),
        ]}),

        // ── Game list ──────────────────────────────────────────
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
              // Game background image button
              jsx(ImageDropZone, {
                currentDataUrl: gameBgThumbs[game.id] || null,
                onFile: (file) => openCrop(`game-${game.id}`, file),
                onRemove: () => removeGameBg(game.id),
                mode: 'compact',
              }),
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
                    jsx('button', { onClick: () => setAddTo(null),    className: ss.btn,                   children: '✕' }),
                  ]})
                : jsx('button', { onClick: () => openAddTask(game.id), className: cx(ss.btn, ss.btnAdd, s.addTaskBtn), children: t('addTask') }),
            ]}),
          ],
        }, game.id)),

        // ── Add new game ───────────────────────────────────────
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
    }),
  ]});
}
