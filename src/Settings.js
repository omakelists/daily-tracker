import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { t } from './i18n.js';
import { uid } from './constants.js';
import { IS, SB, Modal } from './UI.js';

const TYPE_OPTS = ['daily', 'weekly', 'webdaily', 'monthly', 'halfmonthly'];

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
          jsx('span', { style: { fontSize: 10, color: '#8b949e', whiteSpace: 'nowrap' }, children: t('webReset') }),
          jsx('input', { type: 'time', value: task.webResetTime ?? '00:00', onChange: (e) => onChange('webResetTime', e.target.value), style: { ...IS, width: 84, fontFamily: 'monospace' } }),
        ],
      }),
      task.type === 'monthly' && jsxs(Fragment, {
        children: [
          jsx('span', { style: { fontSize: 10, color: '#8b949e', whiteSpace: 'nowrap' }, children: t('resetDay') }),
          jsx('input', { type: 'number', min: '1', max: '28', value: task.monthlyResetDay ?? 1, onChange: (e) => onChange('monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1))), style: { ...IS, width: 52, fontFamily: 'monospace', textAlign: 'center' } }),
          jsx('span', { style: { fontSize: 10, color: '#8b949e' }, children: t('dayUnit') }),
        ],
      }),
      jsx('input', { type: 'url', value: task.url ?? '', placeholder: t('taskUrl'), onChange: (e) => onChange('url', e.target.value), style: { ...IS, width: 130, minWidth: 0 } }),
    ],
  });
}

export function SettingsModal({ games, setGames, onClose, showConfirm }) {
  const [newGame, setNewGame] = useState({ name: '', color: '#4a9eff', resetTime: '05:00', launchUrl: '' });
  const [showNG,  setShowNG]  = useState(false);
  const [newTask, setNewTask] = useState({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1, url: '' });
  const [addTo,   setAddTo]   = useState(null);

  const upGame  = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }), () => setGames((g) => g.filter((gm) => gm.id !== id)));
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, tasks: [] }]);
    setNewGame({ name: '', color: '#4a9eff', resetTime: '05:00', launchUrl: '' });
    setShowNG(false);
  };
  const upTask  = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1, url: '' });
    setAddTo(null);
  };
  const openAddTask = (gid) => {
    setAddTo(gid);
    setNewTask({ name: '', type: 'daily', webResetTime: '00:00', monthlyResetDay: 1, url: '' });
  };

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' };

  return jsx(Modal, {
    title: `⚙️ ${t('settings')}`,
    onClose,
    children: jsx('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 12 },
      children: [
        ...games.map((game) => jsxs('div', {
          style: { background: '#161b22', border: `1px solid ${game.color}44`, borderRadius: 10, overflow: 'hidden' },
          children: [
            jsxs('div', {
              style: { padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' },
              children: [
                jsx('input', { type: 'color', value: game.color, onChange: (e) => upGame(game.id, 'color', e.target.value), style: { width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 } }),
                jsx('input', { value: game.name, onChange: (e) => upGame(game.id, 'name', e.target.value), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur(), style: { ...IS, flex: 1, minWidth: 80, fontWeight: 700 }, placeholder: t('gameName') }),
                jsx('span', { style: { fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap' }, children: t('resetLbl') }),
                jsx('input', { type: 'time', value: game.resetTime, onChange: (e) => upGame(game.id, 'resetTime', e.target.value), style: { ...IS, width: 86, fontFamily: 'monospace' } }),
                jsx('input', { type: 'url', value: game.launchUrl ?? '', placeholder: t('launchUrl'), onChange: (e) => upGame(game.id, 'launchUrl', e.target.value), style: { ...IS, flex: 1, minWidth: 100 } }),
                jsx('button', { onClick: () => delGame(game.id, game.name), style: { ...SB, color: '#f85149', borderColor: '#f8514944' }, children: t('delete') }),
              ],
            }),
            jsxs('div', {
              style: { padding: '8px 13px 10px' },
              children: [
                ...game.tasks.map((task) => jsxs('div', {
                  style: rowStyle,
                  children: [
                    jsx(TypeSelect, { value: task.type, onChange: (e) => upTask(game.id, task.id, 'type', e.target.value), style: { width: 104 } }),
                    jsx('input', { value: task.name, onChange: (e) => upTask(game.id, task.id, 'name', e.target.value), style: { ...IS, flex: 1, minWidth: 70 }, placeholder: t(`types.${task.type}`) }),
                    jsx(TaskExtraFields, { task, onChange: (f, v) => upTask(game.id, task.id, f, v) }),
                    jsx('button', { onClick: () => delTask(game.id, task.id), style: { ...SB, color: '#f85149' }, children: '✕' }),
                  ],
                }, task.id)),
                addTo === game.id
                  ? jsxs('div', {
                      style: rowStyle,
                      children: [
                        jsx(TypeSelect, { value: newTask.type, onChange: (e) => setNewTask((t2) => ({ ...t2, type: e.target.value })), style: { width: 104 } }),
                        jsx('input', { value: newTask.name, onChange: (e) => setNewTask((t2) => ({ ...t2, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addTask(game.id), style: { ...IS, flex: 1, minWidth: 70 }, placeholder: t(`types.${newTask.type}`), autoFocus: true }),
                        jsx(TaskExtraFields, { task: newTask, onChange: (f, v) => setNewTask((t2) => ({ ...t2, [f]: v })) }),
                        jsx('button', { onClick: () => addTask(game.id), style: { ...SB, color: '#3fb950', borderColor: '#3fb95044' }, children: t('add') }),
                        jsx('button', { onClick: () => setAddTo(null), style: SB, children: '✕' }),
                      ],
                    })
                  : jsx('button', { onClick: () => openAddTask(game.id), style: { ...SB, marginTop: 4, color: '#58a6ff', borderColor: '#58a6ff44' }, children: t('addTask') }),
              ],
            }),
          ],
        }, game.id)),
        showNG
          ? jsxs('div', {
              style: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '12px 13px' },
              children: [
                jsxs('div', {
                  style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
                  children: [
                    jsx('input', { type: 'color', value: newGame.color, onChange: (e) => setNewGame((g) => ({ ...g, color: e.target.value })), style: { width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer' } }),
                    jsx('input', { value: newGame.name, onChange: (e) => setNewGame((g) => ({ ...g, name: e.target.value })), onKeyDown: (e) => e.key === 'Enter' && addGame(), style: { ...IS, flex: 1, minWidth: 80 }, placeholder: t('gameName'), autoFocus: true }),
                    jsx('span', { style: { fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap' }, children: t('resetLbl') }),
                    jsx('input', { type: 'time', value: newGame.resetTime, onChange: (e) => setNewGame((g) => ({ ...g, resetTime: e.target.value })), style: { ...IS, width: 86, fontFamily: 'monospace' } }),
                    jsx('input', { type: 'url', value: newGame.launchUrl ?? '', placeholder: t('launchUrl'), onChange: (e) => setNewGame((g) => ({ ...g, launchUrl: e.target.value })), style: { ...IS, flex: 1, minWidth: 100 } }),
                  ],
                }),
                jsxs('div', {
                  style: { display: 'flex', gap: 8 },
                  children: [
                    jsx('button', { onClick: addGame, style: { ...SB, color: '#3fb950', borderColor: '#3fb95044' }, children: t('add') }),
                    jsx('button', { onClick: () => setShowNG(false), style: SB, children: t('cancel') }),
                  ],
                }),
              ],
            })
          : jsx('button', { className: 'add-game-btn', onClick: () => setShowNG(true), children: t('addGame') }),
      ],
    }),
  });
}
